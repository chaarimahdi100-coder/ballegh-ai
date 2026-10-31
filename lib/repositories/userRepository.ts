import { prisma, getIsDatabaseConfigured } from "@/lib/db";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { DEMO_USERS } from "@/lib/demo/users";
import type {
  User,
  UserRole,
  AccountStatus,
  MunicipalAccessRequest,
  AdminInvitation,
  RequestStatus,
  InvitationStatus,
} from "@/lib/types";

// In-memory shadow store for development/demo when Prisma DB is not yet connected
const inMemoryUsers: (User & { passwordHash: string })[] = [
  {
    id: "usr_citizen_01",
    name: "Yassine Ben Amor",
    email: "citoyen@tunis.tn",
    phone: "+216 98 421 890",
    role: "citizen",
    status: "active",
    district: "Bab Souika",
    organization: "Citoyen de Tunis",
    passwordHash: "$2a$10$e7K5.VpCvyR5b2L0Yn1lfe/YjJzK5a7M9P0R1S2T3U4V5W6X7Y8Z9", // dummy non-matching hash
  },
  {
    id: "usr_agent_01",
    name: "Ing. Samira Trabelsi",
    email: "agent@commune-tunis.gov.tn",
    phone: "+216 71 345 678",
    role: "municipal_agent",
    status: "active",
    district: "Direction de la Voirie et Travaux",
    organization: "Commune de Tunis",
    passwordHash: "$2a$10$e7K5.VpCvyR5b2L0Yn1lfe/YjJzK5a7M9P0R1S2T3U4V5W6X7Y8Z9",
  },
  {
    id: "usr_admin_01",
    name: "Karim Mansour",
    email: "admin@commune-tunis.gov.tn",
    phone: "+216 71 890 123",
    role: "admin",
    status: "active",
    district: "Arrondissement Central",
    organization: "Direction des Systèmes d'Information — Ville de Tunis",
    passwordHash: "$2a$10$e7K5.VpCvyR5b2L0Yn1lfe/YjJzK5a7M9P0R1S2T3U4V5W6X7Y8Z9",
  },
  {
    id: "usr_admin_02",
    name: "Karim Mansour (Alias)",
    email: "admin@ballegh.tn",
    phone: "+216 71 890 123",
    role: "admin",
    status: "active",
    district: "Arrondissement Central",
    organization: "Direction des Systèmes d'Information — Ville de Tunis",
    passwordHash: "$2a$10$e7K5.VpCvyR5b2L0Yn1lfe/YjJzK5a7M9P0R1S2T3U4V5W6X7Y8Z9",
  },
];

const inMemoryMunicipalRequests: (MunicipalAccessRequest & { passwordHash: string })[] = [];
const inMemoryAdminInvitations: AdminInvitation[] = [];

export async function findUserByEmail(email: string): Promise<(User & { passwordHash: string }) | null> {
  const normalized = email.trim().toLowerCase();

  // If database is configured, strictly query PostgreSQL
  if (getIsDatabaseConfigured()) {
    try {
      const user = await prisma.user.findUnique({
        where: { email: normalized },
      });
      if (user) {
        return {
          id: user.id,
          name: user.fullName,
          email: user.email,
          phone: user.phone,
          role: user.role.toLowerCase() as UserRole,
          status: (user.status ? user.status.toLowerCase() : "active") as AccountStatus,
          district: user.district || undefined,
          organization: user.organization || undefined,
          avatarUrl: user.avatarUrl || undefined,
          passwordHash: user.passwordHash,
        };
      }
      return null;
    } catch (err: any) {
      console.error("[userRepository] Database error in findUserByEmail:", err.message);
      throw new Error(`Database error while retrieving user: ${err.message}`);
    }
  }

  // Fallback to in-memory store ONLY when database is not configured
  const found = inMemoryUsers.find((u) => u.email.toLowerCase() === normalized);
  return found || null;
}

export async function findUserById(id: string): Promise<User | null> {
  if (getIsDatabaseConfigured()) {
    try {
      const user = await prisma.user.findUnique({
        where: { id },
      });
      if (user) {
        return {
          id: user.id,
          name: user.fullName,
          email: user.email,
          phone: user.phone,
          role: user.role.toLowerCase() as UserRole,
          status: (user.status ? user.status.toLowerCase() : "active") as AccountStatus,
          district: user.district || undefined,
          organization: user.organization || undefined,
          avatarUrl: user.avatarUrl || undefined,
        };
      }
      return null;
    } catch (err: any) {
      console.error("[userRepository] Database error in findUserById:", err.message);
      throw new Error(`Database error while retrieving user by ID: ${err.message}`);
    }
  }

  const found = inMemoryUsers.find((u) => u.id === id);
  if (!found) return null;
  return {
    id: found.id,
    name: found.name,
    email: found.email,
    phone: found.phone,
    role: found.role,
    status: found.status || "active",
    district: found.district,
    organization: found.organization,
    avatarUrl: found.avatarUrl,
  };
}

export async function createUser(data: {
  fullName: string;
  email: string;
  password?: string;
  passwordHash?: string;
  phone: string;
  district?: string;
  organization?: string;
  role?: UserRole;
  status?: AccountStatus;
}): Promise<User> {
  const normalized = data.email.trim().toLowerCase();
  const passwordHash = data.passwordHash || (data.password ? await bcrypt.hash(data.password, 12) : "");
  if (!passwordHash) {
    throw new Error("Un mot de passe ou un hachage valide est requis pour la création de compte.");
  }
  const role = data.role || "citizen";
  const status = data.status || "active";

  if (getIsDatabaseConfigured()) {
    try {
      const created = await prisma.user.create({
        data: {
          fullName: data.fullName,
          email: normalized,
          passwordHash,
          phone: data.phone,
          district: data.district,
          organization: data.organization,
          role: role.toUpperCase() as "CITIZEN" | "MUNICIPAL_AGENT" | "ADMIN",
          status: status.toUpperCase() as "ACTIVE" | "PENDING" | "SUSPENDED" | "REJECTED",
        },
      });

      return {
        id: created.id,
        name: created.fullName,
        email: created.email,
        phone: created.phone,
        role: created.role.toLowerCase() as UserRole,
        status: created.status.toLowerCase() as AccountStatus,
        district: created.district || undefined,
        organization: created.organization || undefined,
      };
    } catch (err: any) {
      console.error("[userRepository] Database error in createUser:", err.message);
      throw new Error(`Database error while creating user: ${err.message}`);
    }
  }

  // In-memory fallback ONLY when database is not configured
  const newUser: User & { passwordHash: string } = {
    id: `usr_${Date.now()}`,
    name: data.fullName,
    email: normalized,
    phone: data.phone,
    role,
    status,
    district: data.district,
    organization: data.organization,
    passwordHash,
  };
  inMemoryUsers.push(newUser);
  return {
    id: newUser.id,
    name: newUser.name,
    email: newUser.email,
    phone: newUser.phone,
    role: newUser.role,
    status: newUser.status,
    district: newUser.district,
    organization: newUser.organization,
  };
}

export async function listAllUsers(): Promise<User[]> {
  if (getIsDatabaseConfigured()) {
    try {
      const users = await prisma.user.findMany({
        orderBy: { createdAt: "desc" },
      });
      return users.map((u) => ({
        id: u.id,
        name: u.fullName,
        email: u.email,
        phone: u.phone,
        role: u.role.toLowerCase() as UserRole,
        status: (u.status ? u.status.toLowerCase() : "active") as AccountStatus,
        district: u.district || undefined,
        organization: u.organization || undefined,
        avatarUrl: u.avatarUrl || undefined,
      }));
    } catch (err: any) {
      console.error("[userRepository] Database error in listAllUsers:", err.message);
      throw new Error(`Database error while listing users: ${err.message}`);
    }
  }

  return inMemoryUsers.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    phone: u.phone,
    role: u.role,
    status: u.status || "active",
    district: u.district,
    organization: u.organization,
  }));
}

export async function authenticateUser(email: string, password: string): Promise<User | null> {
  const user = await findUserByEmail(email);
  if (!user) return null;
  const isMatch = await bcrypt.compare(password, user.passwordHash);
  if (!isMatch) return null;
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    status: user.status,
    district: user.district,
    organization: user.organization,
    avatarUrl: user.avatarUrl,
  };
}

export async function registerUser(data: {
  name: string;
  email: string;
  password: string;
  phone: string;
  district?: string;
}): Promise<User> {
  const existing = await findUserByEmail(data.email);
  if (existing) {
    throw new Error("Cet e-mail existe déjà.");
  }
  return createUser({
    fullName: data.name,
    email: data.email,
    password: data.password,
    phone: data.phone,
    district: data.district,
    role: "citizen",
  });
}

// -------------------------------------------------------------
// Municipal Access Request Management
// -------------------------------------------------------------

export async function createMunicipalAccessRequest(data: {
  fullName: string;
  email: string;
  phone: string;
  municipality: string;
  department: string;
  jobTitle: string;
  password: string;
  notes?: string;
}): Promise<MunicipalAccessRequest> {
  const normalized = data.email.trim().toLowerCase();

  // Check if a user already exists with this email
  const existingUser = await findUserByEmail(normalized);
  if (existingUser) {
    throw new Error("Un compte utilisateur existe déjà avec cette adresse e-mail.");
  }

  const passwordHash = await bcrypt.hash(data.password, 12);

  if (getIsDatabaseConfigured()) {
    try {
      // Check if an existing request exists
      const existingReq = await prisma.municipalAccessRequest.findUnique({
        where: { email: normalized },
      });
      if (existingReq) {
        if (existingReq.status === "PENDING") {
          throw new Error("Une demande d'accès est déjà en cours d'examen pour cet e-mail.");
        }
        if (existingReq.status === "APPROVED") {
          throw new Error("Une demande pour cet e-mail a déjà été approuvée. Veuillez vous connecter.");
        }
        // If previous request was REJECTED, allow re-submitting by updating
        const updated = await prisma.municipalAccessRequest.update({
          where: { email: normalized },
          data: {
            fullName: data.fullName,
            phone: data.phone,
            municipality: data.municipality,
            department: data.department,
            jobTitle: data.jobTitle,
            passwordHash,
            notes: data.notes,
            status: "PENDING",
            rejectionReason: null,
            reviewedById: null,
            reviewedAt: null,
          },
        });
        return {
          id: updated.id,
          fullName: updated.fullName,
          email: updated.email,
          phone: updated.phone,
          municipality: updated.municipality,
          department: updated.department,
          jobTitle: updated.jobTitle,
          notes: updated.notes || undefined,
          status: updated.status.toLowerCase() as RequestStatus,
          rejectionReason: updated.rejectionReason || undefined,
          reviewedById: updated.reviewedById || undefined,
          reviewedAt: updated.reviewedAt ? updated.reviewedAt.toISOString() : undefined,
          createdAt: updated.createdAt.toISOString(),
          updatedAt: updated.updatedAt.toISOString(),
        };
      }

      const created = await prisma.municipalAccessRequest.create({
        data: {
          fullName: data.fullName,
          email: normalized,
          phone: data.phone,
          municipality: data.municipality,
          department: data.department,
          jobTitle: data.jobTitle,
          passwordHash,
          notes: data.notes,
          status: "PENDING",
        },
      });

      return {
        id: created.id,
        fullName: created.fullName,
        email: created.email,
        phone: created.phone,
        municipality: created.municipality,
        department: created.department,
        jobTitle: created.jobTitle,
        notes: created.notes || undefined,
        status: created.status.toLowerCase() as RequestStatus,
        rejectionReason: created.rejectionReason || undefined,
        reviewedById: created.reviewedById || undefined,
        reviewedAt: created.reviewedAt ? created.reviewedAt.toISOString() : undefined,
        createdAt: created.createdAt.toISOString(),
        updatedAt: created.updatedAt.toISOString(),
      };
    } catch (err: any) {
      console.error("[userRepository] Error creating municipal access request:", err.message);
      throw err;
    }
  }

  // Fallback in-memory
  const newReq: MunicipalAccessRequest & { passwordHash: string } = {
    id: `req_${Date.now()}`,
    fullName: data.fullName,
    email: normalized,
    phone: data.phone,
    municipality: data.municipality,
    department: data.department,
    jobTitle: data.jobTitle,
    notes: data.notes,
    status: "pending",
    passwordHash,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  inMemoryMunicipalRequests.push(newReq);
  return newReq;
}

export async function listMunicipalAccessRequests(
  statusFilter?: "PENDING" | "APPROVED" | "REJECTED"
): Promise<MunicipalAccessRequest[]> {
  if (getIsDatabaseConfigured()) {
    try {
      const requests = await prisma.municipalAccessRequest.findMany({
        where: statusFilter ? { status: statusFilter } : undefined,
        orderBy: { createdAt: "desc" },
      });

      return requests.map((r) => ({
        id: r.id,
        fullName: r.fullName,
        email: r.email,
        phone: r.phone,
        municipality: r.municipality,
        department: r.department,
        jobTitle: r.jobTitle,
        notes: r.notes || undefined,
        status: r.status.toLowerCase() as RequestStatus,
        rejectionReason: r.rejectionReason || undefined,
        reviewedById: r.reviewedById || undefined,
        reviewedAt: r.reviewedAt ? r.reviewedAt.toISOString() : undefined,
        createdAt: r.createdAt.toISOString(),
        updatedAt: r.updatedAt.toISOString(),
      }));
    } catch (err: any) {
      console.error("[userRepository] Error listing municipal access requests:", err.message);
      throw err;
    }
  }

  return inMemoryMunicipalRequests
    .filter((r) => (statusFilter ? r.status === statusFilter.toLowerCase() : true))
    .map((r) => ({
      id: r.id,
      fullName: r.fullName,
      email: r.email,
      phone: r.phone,
      municipality: r.municipality,
      department: r.department,
      jobTitle: r.jobTitle,
      notes: r.notes,
      status: r.status,
      rejectionReason: r.rejectionReason,
      reviewedById: r.reviewedById,
      reviewedAt: r.reviewedAt,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    }));
}

export async function reviewMunicipalAccessRequest(params: {
  requestId: string;
  reviewerId: string;
  decision: "APPROVED" | "REJECTED";
  rejectionReason?: string;
}): Promise<{ request: MunicipalAccessRequest; createdUser?: User }> {
  if (getIsDatabaseConfigured()) {
    try {
      const targetRequest = await prisma.municipalAccessRequest.findUnique({
        where: { id: params.requestId },
      });

      if (!targetRequest) {
        throw new Error("Demande d'accès introuvable.");
      }

      if (targetRequest.status !== "PENDING") {
        throw new Error(`Cette demande a déjà été traitée (statut: ${targetRequest.status}).`);
      }

      const now = new Date();

      if (params.decision === "APPROVED") {
        // 1. Create the official municipal agent user with the hashed password
        const newUser = await prisma.user.create({
          data: {
            fullName: targetRequest.fullName,
            email: targetRequest.email,
            phone: targetRequest.phone,
            passwordHash: targetRequest.passwordHash,
            role: "MUNICIPAL_AGENT",
            status: "ACTIVE",
            district: targetRequest.department,
            organization: targetRequest.municipality,
          },
        });

        // 2. Mark request as APPROVED
        const updatedReq = await prisma.municipalAccessRequest.update({
          where: { id: params.requestId },
          data: {
            status: "APPROVED",
            reviewedById: params.reviewerId,
            reviewedAt: now,
          },
        });

        return {
          request: {
            id: updatedReq.id,
            fullName: updatedReq.fullName,
            email: updatedReq.email,
            phone: updatedReq.phone,
            municipality: updatedReq.municipality,
            department: updatedReq.department,
            jobTitle: updatedReq.jobTitle,
            notes: updatedReq.notes || undefined,
            status: "approved",
            reviewedById: updatedReq.reviewedById || undefined,
            reviewedAt: updatedReq.reviewedAt ? updatedReq.reviewedAt.toISOString() : undefined,
            createdAt: updatedReq.createdAt.toISOString(),
            updatedAt: updatedReq.updatedAt.toISOString(),
          },
          createdUser: {
            id: newUser.id,
            name: newUser.fullName,
            email: newUser.email,
            phone: newUser.phone,
            role: "municipal_agent",
            status: "active",
            district: newUser.district || undefined,
            organization: newUser.organization || undefined,
          },
        };
      } else {
        // REJECTED
        const updatedReq = await prisma.municipalAccessRequest.update({
          where: { id: params.requestId },
          data: {
            status: "REJECTED",
            rejectionReason: params.rejectionReason || "Critères d'habilitation non satisfaits.",
            reviewedById: params.reviewerId,
            reviewedAt: now,
          },
        });

        return {
          request: {
            id: updatedReq.id,
            fullName: updatedReq.fullName,
            email: updatedReq.email,
            phone: updatedReq.phone,
            municipality: updatedReq.municipality,
            department: updatedReq.department,
            jobTitle: updatedReq.jobTitle,
            notes: updatedReq.notes || undefined,
            status: "rejected",
            rejectionReason: updatedReq.rejectionReason || undefined,
            reviewedById: updatedReq.reviewedById || undefined,
            reviewedAt: updatedReq.reviewedAt ? updatedReq.reviewedAt.toISOString() : undefined,
            createdAt: updatedReq.createdAt.toISOString(),
            updatedAt: updatedReq.updatedAt.toISOString(),
          },
        };
      }
    } catch (err: any) {
      console.error("[userRepository] Error reviewing municipal access request:", err.message);
      throw err;
    }
  }

  // In-memory fallback
  const idx = inMemoryMunicipalRequests.findIndex((r) => r.id === params.requestId);
  if (idx === -1) throw new Error("Demande d'accès introuvable.");
  const req = inMemoryMunicipalRequests[idx];
  if (req.status !== "pending") throw new Error("Cette demande a déjà été traitée.");

  const now = new Date().toISOString();
  if (params.decision === "APPROVED") {
    req.status = "approved";
    req.reviewedById = params.reviewerId;
    req.reviewedAt = now;
    const newUser = await createUser({
      fullName: req.fullName,
      email: req.email,
      passwordHash: req.passwordHash,
      phone: req.phone,
      district: req.department,
      organization: req.municipality,
      role: "municipal_agent",
      status: "active",
    });
    return { request: req, createdUser: newUser };
  } else {
    req.status = "rejected";
    req.rejectionReason = params.rejectionReason;
    req.reviewedById = params.reviewerId;
    req.reviewedAt = now;
    return { request: req };
  }
}

// -------------------------------------------------------------
// Admin Invitation Management
// -------------------------------------------------------------

// Helper: SHA-256 token hashing for security at rest
function hashInvitationToken(token: string): string {
  return crypto.createHash("sha256").update(token.trim()).digest("hex");
}

export async function createAdminInvitation(params: {
  email: string;
  fullName?: string;
  department?: string;
  invitedById: string;
  expiresInHours?: number;
}): Promise<AdminInvitation> {
  const normalized = params.email.trim().toLowerCase();

  // Check if a user already exists with this email
  const existingUser = await findUserByEmail(normalized);
  if (existingUser) {
    throw new Error("Un compte utilisateur existe déjà avec cette adresse e-mail.");
  }

  // 32 cryptographically secure random bytes = 64 hex characters
  const rawToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = hashInvitationToken(rawToken);
  const hours = params.expiresInHours || 48;
  const expiresAt = new Date(Date.now() + hours * 60 * 60 * 1000);

  if (getIsDatabaseConfigured()) {
    try {
      // Check existing invitation
      const existingInv = await prisma.adminInvitation.findUnique({
        where: { email: normalized },
      });

      if (existingInv && existingInv.status === "PENDING" && existingInv.expiresAt > new Date()) {
        throw new Error("Une invitation active est déjà en cours pour cette adresse e-mail.");
      }

      // If exists but was expired or revoked, replace it with fresh invitation
      if (existingInv) {
        const updated = await prisma.adminInvitation.update({
          where: { email: normalized },
          data: {
            tokenHash,
            fullName: params.fullName,
            department: params.department,
            status: "PENDING",
            expiresAt,
            invitedById: params.invitedById,
            acceptedAt: null,
          },
        });

        return {
          id: updated.id,
          email: updated.email,
          tokenHash: updated.tokenHash,
          token: rawToken, // Transient return for generation link
          fullName: updated.fullName || undefined,
          department: updated.department || undefined,
          status: "pending",
          expiresAt: updated.expiresAt.toISOString(),
          invitedById: updated.invitedById,
          createdAt: updated.createdAt.toISOString(),
          updatedAt: updated.updatedAt.toISOString(),
        };
      }

      const created = await prisma.adminInvitation.create({
        data: {
          email: normalized,
          tokenHash,
          fullName: params.fullName,
          department: params.department,
          status: "PENDING",
          expiresAt,
          invitedById: params.invitedById,
        },
      });

      return {
        id: created.id,
        email: created.email,
        tokenHash: created.tokenHash,
        token: rawToken, // Transient return for generation link
        fullName: created.fullName || undefined,
        department: created.department || undefined,
        status: "pending",
        expiresAt: created.expiresAt.toISOString(),
        invitedById: created.invitedById,
        createdAt: created.createdAt.toISOString(),
        updatedAt: created.updatedAt.toISOString(),
      };
    } catch (err: any) {
      console.error("[userRepository] Error creating admin invitation:", err.message);
      throw err;
    }
  }

  // In-memory fallback
  const newInv: AdminInvitation = {
    id: `inv_${Date.now()}`,
    email: normalized,
    tokenHash,
    token: rawToken,
    fullName: params.fullName,
    department: params.department,
    status: "pending",
    expiresAt: expiresAt.toISOString(),
    invitedById: params.invitedById,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  inMemoryAdminInvitations.push(newInv);
  return newInv;
}

export async function findAdminInvitationByToken(rawToken: string): Promise<AdminInvitation | null> {
  const tokenHash = hashInvitationToken(rawToken);

  if (getIsDatabaseConfigured()) {
    try {
      const inv = await prisma.adminInvitation.findUnique({
        where: { tokenHash },
      });

      if (!inv) return null;

      // Auto-expire if pending and past expiry
      if (inv.status === "PENDING" && inv.expiresAt < new Date()) {
        await prisma.adminInvitation.update({
          where: { id: inv.id },
          data: { status: "EXPIRED" },
        });
        inv.status = "EXPIRED";
      }

      return {
        id: inv.id,
        email: inv.email,
        tokenHash: inv.tokenHash,
        fullName: inv.fullName || undefined,
        department: inv.department || undefined,
        status: inv.status.toLowerCase() as InvitationStatus,
        expiresAt: inv.expiresAt.toISOString(),
        invitedById: inv.invitedById,
        acceptedAt: inv.acceptedAt ? inv.acceptedAt.toISOString() : undefined,
        createdAt: inv.createdAt.toISOString(),
        updatedAt: inv.updatedAt.toISOString(),
      };
    } catch (err: any) {
      console.error("[userRepository] Error finding admin invitation by token:", err.message);
      throw err;
    }
  }

  const found = inMemoryAdminInvitations.find((i) => i.tokenHash === tokenHash);
  if (!found) return null;
  if (found.status === "pending" && new Date(found.expiresAt) < new Date()) {
    found.status = "expired";
  }
  return found;
}

export async function listAdminInvitations(): Promise<AdminInvitation[]> {
  if (getIsDatabaseConfigured()) {
    try {
      const list = await prisma.adminInvitation.findMany({
        orderBy: { createdAt: "desc" },
      });

      return list.map((inv) => ({
        id: inv.id,
        email: inv.email,
        tokenHash: inv.tokenHash,
        fullName: inv.fullName || undefined,
        department: inv.department || undefined,
        status: inv.status.toLowerCase() as InvitationStatus,
        expiresAt: inv.expiresAt.toISOString(),
        invitedById: inv.invitedById,
        acceptedAt: inv.acceptedAt ? inv.acceptedAt.toISOString() : undefined,
        createdAt: inv.createdAt.toISOString(),
        updatedAt: inv.updatedAt.toISOString(),
      }));
    } catch (err: any) {
      console.error("[userRepository] Error listing admin invitations:", err.message);
      throw err;
    }
  }

  return inMemoryAdminInvitations;
}

export async function acceptAdminInvitation(params: {
  token: string;
  password: string;
  phone?: string;
}): Promise<{ invitation: AdminInvitation; user: User }> {
  const inv = await findAdminInvitationByToken(params.token);
  if (!inv) {
    throw new Error("Invitation introuvable ou jeton invalide.");
  }

  if (inv.status === "accepted") {
    throw new Error("Cette invitation a déjà été utilisée.");
  }

  if (inv.status === "expired" || new Date(inv.expiresAt) < new Date()) {
    throw new Error("Cette invitation a expiré. Veuillez solliciter une nouvelle invitation.");
  }

  if (inv.status === "revoked") {
    throw new Error("Cette invitation a été révoquée par un administrateur.");
  }

  const passwordHash = await bcrypt.hash(params.password, 12);
  const now = new Date();

  if (getIsDatabaseConfigured()) {
    try {
      // 1. Create Admin User
      const user = await prisma.user.create({
        data: {
          fullName: inv.fullName || "Administrateur Système",
          email: inv.email,
          phone: params.phone || "+216 71 890 123",
          passwordHash,
          role: "ADMIN",
          status: "ACTIVE",
          district: "Arrondissement Central",
          organization: inv.department || "Direction des Systèmes d'Information — Ville de Tunis",
        },
      });

      // 2. Mark Invitation as ACCEPTED
      const updatedInv = await prisma.adminInvitation.update({
        where: { id: inv.id },
        data: {
          status: "ACCEPTED",
          acceptedAt: now,
        },
      });

      return {
        invitation: {
          ...inv,
          status: "accepted",
          acceptedAt: now.toISOString(),
        },
        user: {
          id: user.id,
          name: user.fullName,
          email: user.email,
          phone: user.phone,
          role: "admin",
          status: "active",
          district: user.district || undefined,
          organization: user.organization || undefined,
        },
      };
    } catch (err: any) {
      console.error("[userRepository] Error accepting admin invitation:", err.message);
      throw err;
    }
  }

  // In-memory fallback
  inv.status = "accepted";
  inv.acceptedAt = now.toISOString();
  const user = await createUser({
    fullName: inv.fullName || "Administrateur Système",
    email: inv.email,
    passwordHash,
    phone: params.phone || "+216 71 890 123",
    role: "admin",
    status: "active",
    district: "Arrondissement Central",
    organization: inv.department || "Direction des Systèmes d'Information",
  });
  return { invitation: inv, user };
}

export async function revokeAdminInvitation(invitationId: string): Promise<AdminInvitation> {
  if (getIsDatabaseConfigured()) {
    try {
      const updated = await prisma.adminInvitation.update({
        where: { id: invitationId },
        data: { status: "REVOKED" },
      });

      return {
        id: updated.id,
        email: updated.email,
        tokenHash: updated.tokenHash,
        fullName: updated.fullName || undefined,
        department: updated.department || undefined,
        status: "revoked",
        expiresAt: updated.expiresAt.toISOString(),
        invitedById: updated.invitedById,
        acceptedAt: updated.acceptedAt ? updated.acceptedAt.toISOString() : undefined,
        createdAt: updated.createdAt.toISOString(),
        updatedAt: updated.updatedAt.toISOString(),
      };
    } catch (err: any) {
      console.error("[userRepository] Error revoking admin invitation:", err.message);
      throw err;
    }
  }

  const found = inMemoryAdminInvitations.find((i) => i.id === invitationId);
  if (!found) throw new Error("Invitation introuvable.");
  found.status = "revoked";
  return found;
}


