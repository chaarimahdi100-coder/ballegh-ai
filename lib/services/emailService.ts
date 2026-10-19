/**
 * BALLEGH AI — Service de Transmission Officielle & Notifications
 *
 * Ce service gère l'acheminement des courriels officiels validés par les agents municipaux.
 * Aucune transmission n'est autorisée sans approbation humaine préalable.
 *
 * Fournisseurs pris en charge :
 * 1. Resend (via RESEND_API_KEY et EMAIL_FROM / RESEND_FROM_EMAIL) avec politique de retry
 * 2. Serveur SMTP standard (via SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS / SMTP_PASSWORD, SMTP_FROM)
 *
 * En l'absence d'identifiants de transport, le système fonctionne en mode SIMULATION / BROUILLON
 * avec le statut PENDING_SMTP_CONFIG consigné de manière transparente dans la piste d'audit.
 */

import nodemailer from "nodemailer";
import { z } from "zod";
import type { Report } from "@/lib/types";

export type EmailTransportStatus =
  | "ACCEPTED_BY_PROVIDER"
  | "SENT"
  | "PENDING_SMTP_CONFIG"
  | "DUPLICATE_BLOCKED"
  | "FAILED"
  | "QUEUED";

export type EmailDeliveryState =
  | "simulated"
  | "queued"
  | "accepted_by_provider"
  | "delivered"
  | "failed"
  | "duplicate_blocked";

export interface EmailDispatchResult {
  success: boolean;
  messageId: string;
  recipientEmail: string;
  subject: string;
  deliveredAt: string;
  isSimulated: boolean;
  provider: "resend" | "smtp" | "simulated";
  transportStatus: EmailTransportStatus;
  deliveryState: EmailDeliveryState;
  attempts: number;
  providerMessageId?: string;
  providerResponse?: {
    id?: string;
    statusCode?: number;
    errorType?: string;
  };
  notes: string;
  error?: string;
}

const emailRecipientSchema = z.string().email("Adresse email de destination invalide");

// Mock hook for isolated regression testing without sending real emails
let mockEmailTransport: ((params: {
  to: string;
  subject: string;
  body: string;
}) => Promise<{
  messageId: string;
  transportStatus?: EmailTransportStatus;
  deliveryState?: EmailDeliveryState;
  attempts?: number;
} | null>) | null = null;

export function _setMockEmailTransport(
  mock: ((params: { to: string; subject: string; body: string }) => Promise<{
    messageId: string;
    transportStatus?: EmailTransportStatus;
    deliveryState?: EmailDeliveryState;
    attempts?: number;
  } | null>) | null
): void {
  mockEmailTransport = mock;
}

export function _resetMockEmailTransport(): void {
  mockEmailTransport = null;
}

/**
 * Assainit les messages d'erreur pour éviter toute fuite de secret dans les logs ou les réponses
 */
export function sanitizeError(msg: string): string {
  if (!msg) return "";
  let clean = msg;
  clean = clean.replace(/Bearer\s+[A-Za-z0-9_\-\.]+/gi, "Bearer [REDACTED]");
  clean = clean.replace(/re_[A-Za-z0-9_-]+/gi, "re_[REDACTED]");
  if (process.env.RESEND_API_KEY) {
    clean = clean.split(process.env.RESEND_API_KEY).join("[REDACTED_API_KEY]");
  }
  if (process.env.SMTP_PASS) {
    clean = clean.split(process.env.SMTP_PASS).join("[REDACTED_PASS]");
  }
  if (process.env.SMTP_PASSWORD) {
    clean = clean.split(process.env.SMTP_PASSWORD).join("[REDACTED_PASS]");
  }
  return clean;
}

/**
 * Envoi sécurisé via Resend API avec gestion d'annulation et réessais exponentiels sur erreurs serveur (5xx)
 */
async function sendWithResend(
  apiKey: string,
  payload: { from: string; to: string[]; subject: string; text: string; html: string },
  maxRetries: number = 2
): Promise<{ success: boolean; id?: string; error?: string; attempts: number; statusCode?: number }> {
  let attempts = 0;
  let lastError = "";
  let lastStatus = 0;

  while (attempts <= maxRetries) {
    attempts++;
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      lastStatus = res.status;

      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        return {
          success: true,
          id: data.id || `re_${Date.now()}`,
          attempts,
          statusCode: res.status,
        };
      }

      const errorData = await res.json().catch(() => ({}));
      const errMessage = errorData.message || `HTTP ${res.status}`;
      lastError = errMessage;

      // Ne pas réessayer les erreurs 4xx (client / auth / domaine invalide)
      if (res.status >= 400 && res.status < 500) {
        return {
          success: false,
          error: sanitizeError(errMessage),
          attempts,
          statusCode: res.status,
        };
      }

      // Erreur serveur 5xx : attendre avec backoff avant retry
      if (attempts <= maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, attempts * 500));
      }
    } catch (err: any) {
      lastError = err.message || "Erreur de connexion réseau Resend";
      if (attempts <= maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, attempts * 500));
      }
    }
  }

  return {
    success: false,
    error: sanitizeError(lastError),
    attempts,
    statusCode: lastStatus,
  };
}

export function getEmailServiceStatus(): {
  provider: "resend" | "smtp" | "not_configured";
  configured: boolean;
  fromAddress: string;
  details: string;
} {
  const hasResend = Boolean(
    process.env.RESEND_API_KEY &&
    !process.env.RESEND_API_KEY.includes("placeholder") &&
    process.env.RESEND_API_KEY.trim().length > 0
  );
  const hasSmtp = Boolean(
    process.env.SMTP_HOST &&
    !process.env.SMTP_HOST.includes("placeholder") &&
    process.env.SMTP_HOST.trim().length > 0
  );

  const fromAddress =
    process.env.EMAIL_FROM ||
    process.env.RESEND_FROM_EMAIL ||
    process.env.SMTP_FROM ||
    "Ballegh AI <notifications@ballegh.tn>";

  if (hasResend) {
    return {
      provider: "resend",
      configured: true,
      fromAddress,
      details: "Fournisseur Resend API configuré via RESEND_API_KEY.",
    };
  }

  if (hasSmtp) {
    return {
      provider: "smtp",
      configured: true,
      fromAddress,
      details: `Passerelle SMTP configurée (${process.env.SMTP_HOST}:${process.env.SMTP_PORT || 587}).`,
    };
  }

  return {
    provider: "not_configured",
    configured: false,
    fromAddress,
    details: "Aucune clé RESEND_API_KEY ni passerelle SMTP_HOST configurée dans .env.local (Mode simulation actif).",
  };
}

export async function dispatchOfficialEmail(params: {
  report: Report;
  agentName: string;
  agentRole: string;
  customSubject?: string;
  customBody?: string;
  forceResend?: boolean;
  maxRetries?: number;
}): Promise<EmailDispatchResult> {
  const now = new Date().toISOString();

  // 1. Contrôle d'éligibilité et approbation humaine obligatoire sur le serveur
  const isAgent = params.agentRole === "municipal_agent" || params.agentRole === "admin";
  if (!isAgent) {
    throw new Error("Sécurité : Seul un agent municipal habilité ou un administrateur peut autoriser une transmission officielle.");
  }

  const isApproved =
    params.report.status === "human_validated" ||
    params.report.status === "forwarded" ||
    params.report.status === "in_progress" ||
    params.report.status === "resolved";

  if (!isApproved) {
    throw new Error("Gating : Transmission impossible sans validation humaine préalable par un agent municipal.");
  }

  const draft = params.report.aiAnalysis?.generatedEmailDraft;
  if (!draft) {
    throw new Error("Le signalement ne comporte pas de projet de courriel technique généré.");
  }

  // 2. Validation du destinataire et du contenu
  const recipient = draft.recipientEmail?.trim() || "";
  const parsedEmail = emailRecipientSchema.safeParse(recipient);
  if (!parsedEmail.success) {
    throw new Error(`Adresse de destination invalide pour le service technique : "${recipient}"`);
  }

  const subject = (params.customSubject || draft.subject).trim();
  if (subject.length < 5) {
    throw new Error("L'objet du message officiel doit comporter au moins 5 caractères.");
  }

  const body = (params.customBody || draft.body).trim();
  if (body.length < 10) {
    throw new Error("Le corps du message officiel doit comporter au moins 10 caractères.");
  }

  // 3. Détection du mode de transport
  const hasTransport = Boolean(
    (process.env.RESEND_API_KEY && !process.env.RESEND_API_KEY.includes("placeholder") && process.env.RESEND_API_KEY.trim().length > 0) ||
    (process.env.SMTP_HOST && !process.env.SMTP_HOST.includes("placeholder") && process.env.SMTP_HOST.trim().length > 0)
  );

  // Si aucun serveur SMTP ni transport de test n'est configuré, rester en mode simulation transparent
  if (!hasTransport && !mockEmailTransport) {
    return {
      success: true,
      messageId: `msg-sim-${Date.now()}`,
      recipientEmail: recipient,
      subject,
      deliveredAt: now,
      isSimulated: true,
      provider: "simulated",
      transportStatus: "PENDING_SMTP_CONFIG",
      deliveryState: "simulated",
      attempts: 0,
      notes: `Transmission officielle approuvée par ${params.agentName} (${params.agentRole}). Enregistrée en piste d'audit (Serveur SMTP non configuré dans .env.local).`,
    };
  }

  // 4. Prévention des envois dupliqués (Idempotence pour expédition réelle ou mock)
  if (params.report.officialEmailSent && !params.forceResend) {
    return {
      success: false,
      messageId: `dup-${params.report.id}`,
      recipientEmail: recipient,
      subject,
      deliveredAt: now,
      isSimulated: false,
      provider: mockEmailTransport ? "resend" : process.env.RESEND_API_KEY ? "resend" : "smtp",
      transportStatus: "DUPLICATE_BLOCKED",
      deliveryState: "duplicate_blocked",
      attempts: 0,
      notes: "Transmission officielle déjà effectuée pour ce signalement. Réexpédition bloquée par mesure d'idempotence.",
    };
  }

  // 4. Test Mock Transport Override (pour tests unitaires et intégration sans coûts externes)
  if (mockEmailTransport) {
    try {
      const mockResult = await mockEmailTransport({ to: recipient, subject, body });
      if (mockResult) {
        const transStatus: EmailTransportStatus = mockResult.transportStatus || "SENT";
        const delivState: EmailDeliveryState = mockResult.deliveryState || "accepted_by_provider";
        const atts = mockResult.attempts || 1;
        return {
          success: true,
          messageId: mockResult.messageId,
          providerMessageId: mockResult.messageId,
          recipientEmail: recipient,
          subject,
          deliveredAt: now,
          isSimulated: false,
          provider: "resend",
          transportStatus: transStatus,
          deliveryState: delivState,
          attempts: atts,
          notes: `Courriel officiel accepté par le fournisseur pour le service (${draft.recipientDepartment}) [Mock Verified]. L'acceptation par le fournisseur n'équivaut pas à la remise garantie en boîte de réception.`,
        };
      }
    } catch (mockErr: any) {
      const cleanErr = sanitizeError(mockErr.message);
      return {
        success: false,
        messageId: `err-${Date.now()}`,
        recipientEmail: recipient,
        subject,
        deliveredAt: now,
        isSimulated: false,
        provider: "resend",
        transportStatus: "FAILED",
        deliveryState: "failed",
        attempts: mockErr.attempts || 1,
        notes: `Échec du transport : ${cleanErr}`,
        error: cleanErr,
      };
    }
  }

  // 5. Option A : Expédition via Resend API
  const resendApiKey = process.env.RESEND_API_KEY;
  if (resendApiKey && !resendApiKey.includes("placeholder") && resendApiKey.trim().length > 0) {
    const fromAddress =
      process.env.EMAIL_FROM ||
      process.env.RESEND_FROM_EMAIL ||
      "Ballegh AI <notifications@ballegh.tn>";

    const result = await sendWithResend(
      resendApiKey,
      {
        from: fromAddress,
        to: [recipient],
        subject,
        text: body,
        html: `<div style="font-family: sans-serif; line-height: 1.6; color: #1e293b;">
          <div style="background-color: #059669; color: white; padding: 12px 20px; border-radius: 6px 6px 0 0;">
            <h2 style="margin: 0; font-size: 18px;">بلّغ AI — Transmission Municipale Officielle</h2>
          </div>
          <div style="border: 1px solid #e2e8f0; border-top: none; padding: 20px; border-radius: 0 0 6px 6px;">
            <p><strong>Dossier N° :</strong> ${params.report.referenceNumber}</p>
            <p><strong>Arrondissement :</strong> ${params.report.location.district}</p>
            <p><strong>Agent validateur :</strong> ${params.agentName} (${params.agentRole})</p>
            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 15px 0;" />
            <div style="white-space: pre-wrap;">${body}</div>
          </div>
        </div>`,
      },
      params.maxRetries ?? 2
    );

    if (!result.success) {
      console.error("[emailService] Échec Resend API:", result.error);
      return {
        success: false,
        messageId: `err-${Date.now()}`,
        recipientEmail: recipient,
        subject,
        deliveredAt: now,
        isSimulated: false,
        provider: "resend",
        transportStatus: "FAILED",
        deliveryState: "failed",
        attempts: result.attempts,
        providerResponse: {
          statusCode: result.statusCode,
        },
        notes: `Échec d'acceptation Resend API: ${result.error}`,
        error: result.error,
      };
    }

    return {
      success: true,
      messageId: result.id || `re_${Date.now()}`,
      providerMessageId: result.id,
      recipientEmail: recipient,
      subject,
      deliveredAt: now,
      isSimulated: false,
      provider: "resend",
      transportStatus: "ACCEPTED_BY_PROVIDER",
      deliveryState: "accepted_by_provider",
      attempts: result.attempts,
      providerResponse: {
        id: result.id,
        statusCode: result.statusCode,
      },
      notes: `Courriel officiel accepté par le fournisseur Resend (ID: ${result.id}). L'acceptation par le fournisseur n'équivaut pas à la remise garantie en boîte de réception.`,
    };
  }

  // 6. Option B : Expédition via Serveur SMTP (Nodemailer)
  const smtpHost = process.env.SMTP_HOST;
  if (smtpHost && !smtpHost.includes("placeholder") && smtpHost.trim().length > 0) {
    const smtpPort = Number(process.env.SMTP_PORT) || 587;
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS || process.env.SMTP_PASSWORD;
    const fromAddress = process.env.SMTP_FROM || process.env.EMAIL_FROM || "Ballegh AI <notifications@ballegh.tn>";

    try {
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpPort === 465,
        auth: smtpUser && smtpPass ? { user: smtpUser, pass: smtpPass } : undefined,
        connectionTimeout: 8000,
      });

      const info = await transporter.sendMail({
        from: fromAddress,
        to: recipient,
        subject,
        text: body,
      });

      return {
        success: true,
        messageId: info.messageId,
        providerMessageId: info.messageId,
        recipientEmail: recipient,
        subject,
        deliveredAt: now,
        isSimulated: false,
        provider: "smtp",
        transportStatus: "SENT",
        deliveryState: "accepted_by_provider",
        attempts: 1,
        notes: `Courriel officiel relayé via SMTP (${smtpHost}) au service (${draft.recipientDepartment}). L'acceptation par le serveur relais n'équivaut pas à la remise garantie en boîte de réception.`,
      };
    } catch (err: any) {
      const cleanErr = sanitizeError(err.message);
      console.error("[emailService] Erreur SMTP:", cleanErr);
      return {
        success: false,
        messageId: `err-${Date.now()}`,
        recipientEmail: recipient,
        subject,
        deliveredAt: now,
        isSimulated: false,
        provider: "smtp",
        transportStatus: "FAILED",
        deliveryState: "failed",
        attempts: 1,
        notes: `Échec d'expédition SMTP (${smtpHost}): ${cleanErr}`,
        error: cleanErr,
      };
    }
  }

  // 7. Mode Démo / Simulation transparente quand aucun fournisseur n'est configuré
  return {
    success: true,
    messageId: `msg-sim-${Date.now()}`,
    recipientEmail: recipient,
    subject,
    deliveredAt: now,
    isSimulated: true,
    provider: "simulated",
    transportStatus: "PENDING_SMTP_CONFIG",
    deliveryState: "simulated",
    attempts: 0,
    notes: `Transmission officielle approuvée par ${params.agentName} (${params.agentRole}). Enregistrée en piste d'audit (Serveur SMTP non configuré dans .env.local).`,
  };
}
