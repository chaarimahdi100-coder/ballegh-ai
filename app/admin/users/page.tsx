"use client";

import React, { useState, useEffect } from "react";
import { useI18n } from "@/lib/i18n/I18nContext";
import { DEMO_USERS } from "@/lib/demo/users";
import type {
  User,
  UserRole,
  MunicipalAccessRequest,
  AdminInvitation,
} from "@/lib/types";
import {
  Users,
  Shield,
  UserCheck,
  Building2,
  Search,
  PlusCircle,
  CheckCircle2,
  Loader2,
  AlertCircle,
  X,
  Clock,
  Check,
  XCircle,
  Copy,
  Send,
  RefreshCw,
  Trash2,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";

type TabType = "users" | "municipal_requests" | "admin_invitations";

export default function AdminUsersPage() {
  const { t, language } = useI18n();
  const [activeTab, setActiveTab] = useState<TabType>("users");

  // Tab 1: Users
  const [users, setUsers] = useState<User[]>(DEMO_USERS);
  const [isUsersLoading, setIsUsersLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isSubmittingUser, setIsSubmittingUser] = useState(false);
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
    phone: "",
    district: "Bab Souika",
    role: "citizen" as UserRole,
  });

  // Tab 2: Municipal Access Requests
  const [requests, setRequests] = useState<MunicipalAccessRequest[]>([]);
  const [isRequestsLoading, setIsRequestsLoading] = useState<boolean>(false);
  const [requestFilter, setRequestFilter] = useState<string>("all");
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [rejectionModalRequest, setRejectionModalRequest] = useState<MunicipalAccessRequest | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");

  // Tab 3: Admin Invitations
  const [invitations, setInvitations] = useState<AdminInvitation[]>([]);
  const [isInvitationsLoading, setIsInvitationsLoading] = useState<boolean>(false);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [isInviting, setIsInviting] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteFullName, setInviteFullName] = useState("");
  const [inviteDepartment, setInviteDepartment] = useState("Direction des Systèmes d'Information");
  const [generatedInviteLink, setGeneratedInviteLink] = useState<string | null>(null);
  const [generatedRawToken, setGeneratedRawToken] = useState<string | null>(null);
  const [generatedExpiresAt, setGeneratedExpiresAt] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedToken, setCopiedToken] = useState(false);

  // Common notifications
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const showSuccess = (msg: string) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(null), 4500);
  };

  // 1. Fetch Users
  const fetchUsers = async () => {
    setIsUsersLoading(true);
    try {
      const res = await fetch("/api/users");
      if (res.ok) {
        const data = await res.json();
        if (data.users && Array.isArray(data.users)) {
          setUsers(data.users);
        }
      }
    } catch {
      // fallback
    } finally {
      setIsUsersLoading(false);
    }
  };

  // 2. Fetch Municipal Requests
  const fetchRequests = async () => {
    setIsRequestsLoading(true);
    try {
      const res = await fetch("/api/admin/requests");
      if (res.ok) {
        const data = await res.json();
        if (data.requests && Array.isArray(data.requests)) {
          setRequests(data.requests);
        }
      }
    } catch {
      // fallback
    } finally {
      setIsRequestsLoading(false);
    }
  };

  // 3. Fetch Admin Invitations
  const fetchInvitations = async () => {
    setIsInvitationsLoading(true);
    try {
      const res = await fetch("/api/admin/invitations");
      if (res.ok) {
        const data = await res.json();
        if (data.invitations && Array.isArray(data.invitations)) {
          setInvitations(data.invitations);
        }
      }
    } catch {
      // fallback
    } finally {
      setIsInvitationsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchRequests();
    fetchInvitations();
  }, []);

  // Handlers for Tab 1: Create User
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingUser(true);
    setErrorMessage(null);
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Échec de création de l'utilisateur");
      }
      showSuccess(`Utilisateur "${formData.fullName}" enregistré avec succès.`);
      setIsCreateModalOpen(false);
      setFormData({
        fullName: "",
        email: "",
        password: "",
        phone: "",
        district: "Bab Souika",
        role: "citizen",
      });
      await fetchUsers();
    } catch (err: any) {
      setErrorMessage(err.message || "Erreur de création de compte");
    } finally {
      setIsSubmittingUser(false);
    }
  };

  // Handlers for Tab 2: Approve / Reject Request
  const handleReviewRequest = async (
    requestId: string,
    decision: "APPROVED" | "REJECTED",
    reason?: string
  ) => {
    setReviewingId(requestId);
    setErrorMessage(null);
    try {
      const res = await fetch(`/api/admin/requests/${requestId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision, rejectionReason: reason }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Erreur lors du traitement de la demande");
      }
      showSuccess(
        decision === "APPROVED"
          ? "Demande approuvée. Le compte agent municipal a été créé et activé."
          : "Demande rejetée avec succès."
      );
      setRejectionModalRequest(null);
      setRejectionReason("");
      await fetchRequests();
      await fetchUsers();
    } catch (err: any) {
      setErrorMessage(err.message || "Erreur de traitement");
    } finally {
      setReviewingId(null);
    }
  };

  // Handlers for Tab 3: Create Admin Invitation
  const handleCreateInvitation = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsInviting(true);
    setErrorMessage(null);
    try {
      const res = await fetch("/api/admin/invitations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: inviteEmail,
          fullName: inviteFullName,
          department: inviteDepartment,
          expiresInHours: 48,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Échec de la génération de l'invitation");
      }
      setGeneratedInviteLink(data.invitationLink);
      setGeneratedRawToken(data.rawToken || data.invitation?.token || null);
      setGeneratedExpiresAt(data.invitation?.expiresAt || null);
      showSuccess("Invitation générée avec succès.");
      await fetchInvitations();
    } catch (err: any) {
      setErrorMessage(err.message || "Erreur de création de l'invitation");
    } finally {
      setIsInviting(false);
    }
  };

  // Revoke Admin Invitation
  const handleRevokeInvitation = async (invId: string) => {
    if (!confirm("Êtes-vous sûr de vouloir révoquer cette invitation administrateur ?")) return;
    try {
      const res = await fetch(`/api/admin/invitations/${invId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Échec de révocation de l'invitation");
      }
      showSuccess("Invitation révoquée avec succès.");
      await fetchInvitations();
    } catch (err: any) {
      setErrorMessage(err.message || "Erreur lors de la révocation");
    }
  };

  const copyLinkToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const copyTokenToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedToken(true);
    setTimeout(() => setCopiedToken(false), 2500);
  };

  // Pending counts
  const pendingRequestsCount = requests.filter((r) => r.status === "pending").length;
  const pendingInvitationsCount = invitations.filter((i) => i.status === "pending").length;

  // Filtered Users
  const filteredUsers = users.filter((u) => {
    const matchSearch =
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.district && u.district.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchRole = roleFilter === "all" || u.role === roleFilter;
    return matchSearch && matchRole;
  });

  // Filtered Requests
  const filteredRequests = requests.filter((r) => {
    if (requestFilter === "all") return true;
    return r.status === requestFilter;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
            {language === "ar" ? "إدارة الحسابات والتصاريح" : "Gestion des Comptes & Accès"}
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            {language === "ar"
              ? "مراقبة حسابات المنظومة، مراجعة طلبات الأعوان وإصدار دعوات المشرفين"
              : "Comptes utilisateurs, examen des candidatures municipales et invitations administrateurs"}
          </p>
        </div>

        {/* Global Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setErrorMessage(null);
              setGeneratedInviteLink(null);
              setGeneratedRawToken(null);
              setGeneratedExpiresAt(null);
              setInviteEmail("");
              setInviteFullName("");
              setIsInviteModalOpen(true);
            }}
            className="inline-flex items-center gap-2 rounded-xl bg-purple-700 hover:bg-purple-800 text-white px-4 py-2.5 text-xs sm:text-sm font-bold shadow-sm transition-colors cursor-pointer"
            title="Générer un jeton d'invitation administrateur sécurisé (48h)"
          >
            <Send className="w-4 h-4" />
            <span>{language === "ar" ? "دعوة مسؤول جديد" : "Inviter un Administrateur"}</span>
          </button>

          {activeTab === "users" && (
            <button
              type="button"
              onClick={() => {
                setErrorMessage(null);
                setIsCreateModalOpen(true);
              }}
              className="inline-flex items-center gap-2 rounded-xl bg-brand-navy-900 hover:bg-brand-navy-800 text-white px-4 py-2.5 text-xs sm:text-sm font-bold shadow-sm transition-colors cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>{language === "ar" ? "إضافة مستخدم" : "Créer un utilisateur"}</span>
            </button>
          )}
        </div>
      </div>

      {/* Global Alerts */}
      {successMessage && (
        <div className="flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-xs font-bold text-emerald-800 dark:bg-emerald-950 dark:border-emerald-800 dark:text-emerald-300">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="flex items-center gap-2 rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs font-bold text-rose-800 dark:bg-rose-950 dark:border-rose-800 dark:text-rose-300">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* 3 Tabs Bar */}
      <div className="flex items-center gap-2 p-1 bg-slate-100 rounded-2xl dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold">
        <button
          type="button"
          onClick={() => setActiveTab("users")}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl transition-all cursor-pointer",
            activeTab === "users"
              ? "bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white"
              : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
          )}
        >
          <Users className="w-4 h-4 text-brand-teal-600" />
          <span>{language === "ar" ? "حسابات المستخدمين" : "Comptes Utilisateurs"}</span>
          <span className="ml-1 text-[11px] font-mono bg-slate-200 dark:bg-slate-600 px-2 py-0.5 rounded-full">
            {users.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("municipal_requests")}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl transition-all cursor-pointer",
            activeTab === "municipal_requests"
              ? "bg-white text-blue-700 shadow-sm dark:bg-slate-700 dark:text-blue-300"
              : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
          )}
        >
          <Building2 className="w-4 h-4 text-blue-600" />
          <span>{language === "ar" ? "طلبات وصول الأعوان" : "Demandes d'accès Municipal"}</span>
          {pendingRequestsCount > 0 ? (
            <span className="ml-1 text-[11px] font-bold bg-amber-500 text-white px-2 py-0.5 rounded-full animate-pulse">
              {pendingRequestsCount}
            </span>
          ) : (
            <span className="ml-1 text-[11px] font-mono bg-slate-200 dark:bg-slate-600 px-2 py-0.5 rounded-full">
              {requests.length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("admin_invitations")}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl transition-all cursor-pointer",
            activeTab === "admin_invitations"
              ? "bg-white text-purple-700 shadow-sm dark:bg-slate-700 dark:text-purple-300"
              : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
          )}
        >
          <Shield className="w-4 h-4 text-purple-600" />
          <span>{language === "ar" ? "دعوات الإدارة" : "Invitations Administrateur"}</span>
          <span className="ml-1 text-[11px] font-mono bg-slate-200 dark:bg-slate-600 px-2 py-0.5 rounded-full">
            {invitations.length}
          </span>
        </button>
      </div>

      {/* ======================================================== */}
      {/* TAB 1: USERS LIST */}
      {/* ======================================================== */}
      {activeTab === "users" && (
        <div className="space-y-4">
          {/* Quick Admin Invitation Banner */}
          <div className="rounded-2xl border border-purple-200 bg-gradient-to-r from-purple-50/90 via-white to-purple-50/60 p-4 shadow-xs dark:border-purple-900/60 dark:bg-purple-950/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-purple-100 text-purple-700 dark:bg-purple-900/60 dark:text-purple-300 shrink-0">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-purple-950 dark:text-purple-200">
                  {language === "ar" ? "توسيع فريق الإدارة المركزية" : "Habilitation d'un nouvel Administrateur"}
                </p>
                <p className="text-[11px] text-purple-700/90 dark:text-purple-300/80">
                  {language === "ar"
                    ? "لا توجد استمارة تسجيل عامة للمشرفين. يجب توليد رمز دعوة تشفيري ذو استخدام واحد صالح 48 ساعة."
                    : "L'inscription publique d'administrateurs est strictement fermée. Générez un jeton cryptographique d'invitation à usage unique (validité 48h)."}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setErrorMessage(null);
                setGeneratedInviteLink(null);
                setGeneratedRawToken(null);
                setGeneratedExpiresAt(null);
                setInviteEmail("");
                setInviteFullName("");
                setIsInviteModalOpen(true);
              }}
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold shadow-xs transition-colors shrink-0 cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{language === "ar" ? "إصدار دعوة جديدة" : "Inviter un Administrateur"}</span>
            </button>
          </div>

          {/* Filter Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 rtl:left-auto rtl:right-3 top-3 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher par nom, e-mail ou quartier..."
                className="w-full rounded-lg border border-slate-300 pl-9 rtl:pl-3 rtl:pr-9 pr-3 py-2 text-xs text-slate-900 focus:border-brand-teal-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>

            <div>
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-900 focus:border-brand-teal-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              >
                <option value="all">Tous les rôles ({users.length})</option>
                <option value="citizen">Citoyens</option>
                <option value="municipal_agent">Agents Municipaux</option>
                <option value="admin">Administrateurs</option>
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-xs dark:border-slate-800 dark:bg-slate-900">
            <div className="overflow-x-auto">
              <table className="w-full text-left rtl:text-right border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-800/60">
                    <th className="py-3.5 px-4">Utilisateur</th>
                    <th className="py-3.5 px-4">Rôle</th>
                    <th className="py-3.5 px-4">Affectation / Quartier</th>
                    <th className="py-3.5 px-4">Contact</th>
                    <th className="py-3.5 px-4">Statut</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                  {isUsersLoading ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-slate-400">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <Loader2 className="w-6 h-6 animate-spin text-brand-teal-600" />
                          <span>Chargement des comptes utilisateurs...</span>
                        </div>
                      </td>
                    </tr>
                  ) : filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-slate-400">
                        Aucun utilisateur trouvé selon ces critères.
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((user) => (
                      <tr
                        key={user.id}
                        className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors"
                      >
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-xs uppercase dark:bg-slate-700 dark:text-slate-300">
                              {user.name.slice(0, 2)}
                            </div>
                            <div>
                              <p className="font-bold text-slate-900 dark:text-white">
                                {user.name}
                              </p>
                              <p className="text-[11px] text-slate-500 font-mono">{user.email}</p>
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          {user.role === "citizen" && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-teal-800 bg-teal-100 px-2.5 py-0.5 rounded-full dark:bg-teal-950 dark:text-teal-300">
                              <Users className="w-3 h-3" />
                              <span>Citoyen</span>
                            </span>
                          )}
                          {user.role === "municipal_agent" && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-800 bg-blue-100 px-2.5 py-0.5 rounded-full dark:bg-blue-950 dark:text-blue-300">
                              <Building2 className="w-3 h-3" />
                              <span>Agent Municipal</span>
                            </span>
                          )}
                          {user.role === "admin" && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-purple-800 bg-purple-100 px-2.5 py-0.5 rounded-full dark:bg-purple-950 dark:text-purple-300">
                              <Shield className="w-3 h-3" />
                              <span>Administrateur</span>
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300">
                          <p className="font-semibold">{user.organization || "Ville de Tunis"}</p>
                          <p className="text-[11px] text-slate-400">{user.district || "Arrondissement Central"}</p>
                        </td>

                        <td className="py-3.5 px-4 font-mono text-slate-600 dark:text-slate-300 text-[11px]">
                          {user.phone}
                        </td>

                        <td className="py-3.5 px-4">
                          {user.status === "pending" ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200">
                              <Clock className="w-3 h-3" />
                              <span>En attente</span>
                            </span>
                          ) : user.status === "suspended" ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200">
                              <XCircle className="w-3 h-3" />
                              <span>Suspendu</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              <span>Actif</span>
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 2: MUNICIPAL ACCESS REQUESTS */}
      {/* ======================================================== */}
      {activeTab === "municipal_requests" && (
        <div className="space-y-4">
          {/* Sub Header & Filter */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 dark:bg-slate-900 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                {language === "ar" ? "تصفية الطلبات :" : "Filtrer :"}
              </span>
              <div className="flex items-center gap-1">
                {(["all", "pending", "approved", "rejected"] as const).map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setRequestFilter(st)}
                    className={cn(
                      "px-2.5 py-1 text-xs font-bold rounded-lg transition-colors cursor-pointer",
                      requestFilter === st
                        ? "bg-blue-600 text-white"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
                    )}
                  >
                    {st === "all"
                      ? "Tous"
                      : st === "pending"
                      ? `En attente (${pendingRequestsCount})`
                      : st === "approved"
                      ? "Approuvés"
                      : "Rejetés"}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={fetchRequests}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white cursor-pointer"
            >
              <RefreshCw className={cn("w-3.5 h-3.5", isRequestsLoading && "animate-spin")} />
              <span>Actualiser</span>
            </button>
          </div>

          {/* Requests Table */}
          <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-xs dark:border-slate-800 dark:bg-slate-900">
            <div className="overflow-x-auto">
              <table className="w-full text-left rtl:text-right border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-800/60">
                    <th className="py-3.5 px-4">Candidat</th>
                    <th className="py-3.5 px-4">Municipalité & Service</th>
                    <th className="py-3.5 px-4">Fonction</th>
                    <th className="py-3.5 px-4">Téléphone</th>
                    <th className="py-3.5 px-4">Date soumission</th>
                    <th className="py-3.5 px-4">Statut</th>
                    <th className="py-3.5 px-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                  {isRequestsLoading ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                          <span>Chargement des demandes d'accès municipal...</span>
                        </div>
                      </td>
                    </tr>
                  ) : filteredRequests.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400">
                        Aucune demande d'accès trouvée.
                      </td>
                    </tr>
                  ) : (
                    filteredRequests.map((req) => (
                      <tr
                        key={req.id}
                        className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors"
                      >
                        <td className="py-3.5 px-4">
                          <p className="font-bold text-slate-900 dark:text-white">{req.fullName}</p>
                          <p className="text-[11px] text-slate-500 font-mono">{req.email}</p>
                        </td>

                        <td className="py-3.5 px-4">
                          <p className="font-semibold text-slate-800 dark:text-slate-200">{req.municipality}</p>
                          <p className="text-[11px] text-slate-500">{req.department}</p>
                        </td>

                        <td className="py-3.5 px-4 text-slate-700 dark:text-slate-300">
                          {req.jobTitle}
                        </td>

                        <td className="py-3.5 px-4 font-mono text-[11px] text-slate-600 dark:text-slate-400">
                          {req.phone}
                        </td>

                        <td className="py-3.5 px-4 text-slate-500 text-[11px]">
                          {new Date(req.createdAt).toLocaleDateString("fr-TN", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })}
                        </td>

                        <td className="py-3.5 px-4">
                          {req.status === "pending" && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-800 bg-amber-100 px-2.5 py-0.5 rounded-full dark:bg-amber-950 dark:text-amber-300">
                              <Clock className="w-3 h-3" />
                              <span>En attente</span>
                            </span>
                          )}
                          {req.status === "approved" && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full dark:bg-emerald-950 dark:text-emerald-300">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Approuvée</span>
                            </span>
                          )}
                          {req.status === "rejected" && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-800 bg-rose-100 px-2.5 py-0.5 rounded-full dark:bg-rose-950 dark:text-rose-300">
                              <XCircle className="w-3 h-3" />
                              <span>Rejetée</span>
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-center">
                          {req.status === "pending" ? (
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                type="button"
                                disabled={reviewingId === req.id}
                                onClick={() => handleReviewRequest(req.id, "APPROVED")}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                                title="Approuver la demande et créer le compte Agent Municipal"
                              >
                                {reviewingId === req.id ? (
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                ) : (
                                  <Check className="w-3 h-3" />
                                )}
                                <span>Approuver</span>
                              </button>

                              <button
                                type="button"
                                disabled={reviewingId === req.id}
                                onClick={() => setRejectionModalRequest(req)}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-rose-100 hover:bg-rose-200 text-rose-700 font-bold text-[11px] transition-colors cursor-pointer disabled:opacity-50 dark:bg-rose-950/60 dark:text-rose-300"
                                title="Rejeter la demande"
                              >
                                <X className="w-3 h-3" />
                                <span>Rejeter</span>
                              </button>
                            </div>
                          ) : (
                            <span className="text-[11px] text-slate-400 italic">
                              {req.status === "approved" ? "Compte créé" : req.rejectionReason || "Rejetée"}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 3: ADMIN INVITATIONS */}
      {/* ======================================================== */}
      {activeTab === "admin_invitations" && (
        <div className="space-y-4">
          {/* Info Card with Direct Link */}
          <div className="rounded-2xl border border-purple-200 bg-purple-50/80 p-4 text-xs text-purple-950 dark:border-purple-800 dark:bg-purple-950/30 dark:text-purple-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <Shield className="w-5 h-5 text-purple-700 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-bold">
                  {language === "ar" ? "بروتوكول تزويد المشرفين المقيد (صلاحية 48 ساعة)" : "Protocole d'invitation sécurisé (Usage unique • Validité 48h)"}
                </p>
                <p className="opacity-90 leading-relaxed text-[11px]">
                  {language === "ar"
                    ? "لا يمكن التسجيل كمدير للمنظومة مباشرة. كل مسؤول جديد يتطلب رابط دعوة تشفيري ذو استخدام واحد وصالح لمدة 48 ساعة فقط. يتم تخزين بصمة SHA-256 فقط في قاعدة البيانات."
                    : "Aucune inscription publique d'administrateur n'est autorisée. Tout nouvel accès nécessite un jeton cryptographique aléatoire de 32 octets, à usage unique, expirant sous 48 heures. Seule l'empreinte SHA-256 est conservée."}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <a
                href="/admin/accept-invitation"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-purple-300 text-purple-700 font-bold text-xs hover:bg-purple-50 transition-colors shadow-xs dark:bg-slate-800 dark:border-purple-700 dark:text-purple-300"
              >
                <span>{language === "ar" ? "صفحة تفعيل الدعوة" : "Page d'activation"}</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>

              <button
                type="button"
                onClick={() => {
                  setErrorMessage(null);
                  setGeneratedInviteLink(null);
                  setGeneratedRawToken(null);
                  setGeneratedExpiresAt(null);
                  setInviteEmail("");
                  setInviteFullName("");
                  setIsInviteModalOpen(true);
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{language === "ar" ? "دعوة جديدة" : "Nouvelle invitation"}</span>
              </button>
            </div>
          </div>

          {/* Invitations Table */}
          <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-xs dark:border-slate-800 dark:bg-slate-900">
            <div className="overflow-x-auto">
              <table className="w-full text-left rtl:text-right border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-800/60">
                    <th className="py-3.5 px-4">Destinataire</th>
                    <th className="py-3.5 px-4">Direction / Service</th>
                    <th className="py-3.5 px-4">Date création</th>
                    <th className="py-3.5 px-4">Date expiration</th>
                    <th className="py-3.5 px-4">Statut</th>
                    <th className="py-3.5 px-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                  {isInvitationsLoading ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <Loader2 className="w-6 h-6 animate-spin text-purple-600" />
                          <span>Chargement des invitations administrateur...</span>
                        </div>
                      </td>
                    </tr>
                  ) : invitations.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400">
                        Aucune invitation émise pour le moment.
                      </td>
                    </tr>
                  ) : (
                    invitations.map((inv) => (
                      <tr
                        key={inv.id}
                        className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors"
                      >
                        <td className="py-3.5 px-4">
                          <p className="font-bold text-slate-900 dark:text-white">
                            {inv.fullName || "Administrateur invité"}
                          </p>
                          <p className="text-[11px] text-slate-500 font-mono">{inv.email}</p>
                        </td>

                        <td className="py-3.5 px-4 text-slate-700 dark:text-slate-300">
                          {inv.department || "Direction des Systèmes d'Information"}
                        </td>

                        <td className="py-3.5 px-4 text-slate-500 text-[11px]">
                          {new Date(inv.createdAt).toLocaleString("fr-TN", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </td>

                        <td className="py-3.5 px-4 text-slate-500 text-[11px]">
                          {new Date(inv.expiresAt).toLocaleString("fr-TN", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </td>

                        <td className="py-3.5 px-4">
                          {inv.status === "pending" && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-800 bg-amber-100 px-2.5 py-0.5 rounded-full dark:bg-amber-950 dark:text-amber-300">
                              <Clock className="w-3 h-3" />
                              <span>En attente (48h)</span>
                            </span>
                          )}
                          {inv.status === "accepted" && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full dark:bg-emerald-950 dark:text-emerald-300">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Acceptée</span>
                            </span>
                          )}
                          {inv.status === "expired" && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-600 bg-slate-100 px-2.5 py-0.5 rounded-full dark:bg-slate-800 dark:text-slate-400">
                              <span>Expirée</span>
                            </span>
                          )}
                          {inv.status === "revoked" && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-800 bg-rose-100 px-2.5 py-0.5 rounded-full dark:bg-rose-950 dark:text-rose-300">
                              <span>Révoquée</span>
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-center">
                          {inv.status === "pending" ? (
                            <div className="flex items-center justify-center gap-2">
                              <button
                                type="button"
                                onClick={() => handleRevokeInvitation(inv.id)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 text-[11px] font-semibold dark:bg-rose-950/50 dark:text-rose-300 cursor-pointer"
                                title="Révoquer l'invitation"
                              >
                                <Trash2 className="w-3 h-3" />
                                <span>Révoquer</span>
                              </button>
                            </div>
                          ) : (
                            <span className="text-[11px] text-slate-400 italic">—</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 1: CREATE USER (TAB 1) */}
      {/* ======================================================== */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 dark:bg-slate-900 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-brand-teal-600" />
                <span>Créer un nouvel utilisateur</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {errorMessage && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-center gap-2 dark:bg-rose-950 dark:border-rose-800 dark:text-rose-300">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleCreateUser} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Nom et Prénom *
                </label>
                <input
                  type="text"
                  required
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  placeholder="Ex: Mohamed Salah"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-900 focus:border-brand-teal-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Adresse e-mail officielle *
                </label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="Ex: m.salah@commune-tunis.gov.tn"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-900 focus:border-brand-teal-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Mot de passe temporaire *
                </label>
                <input
                  type="password"
                  required
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="Minimum 8 caractères"
                  minLength={8}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-900 focus:border-brand-teal-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Téléphone *
                  </label>
                  <input
                    type="tel"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+216 XX XXX XXX"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-900 focus:border-brand-teal-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Rôle d'accès *
                  </label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-900 focus:border-brand-teal-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  >
                    <option value="citizen">Citoyen</option>
                    <option value="municipal_agent">Agent Municipal</option>
                    <option value="admin">Administrateur</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Quartier / Direction de rattachement
                </label>
                <input
                  type="text"
                  value={formData.district}
                  onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                  placeholder="Ex: Bab Souika, Montplaisir, DVRD..."
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-900 focus:border-brand-teal-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  disabled={isSubmittingUser}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingUser}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-brand-teal-600 hover:bg-brand-teal-700 text-white px-4 py-2 text-xs font-bold shadow-sm transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {isSubmittingUser && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Enregistrer l'utilisateur</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 2: REJECTION REASON (TAB 2) */}
      {/* ======================================================== */}
      {rejectionModalRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 dark:bg-slate-900 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <XCircle className="w-5 h-5 text-rose-600" />
                <span>Rejeter la demande d'accès</span>
              </h3>
              <button
                type="button"
                onClick={() => setRejectionModalRequest(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300">
              Vous êtes sur le point de rejeter la demande d'accès de{" "}
              <strong>{rejectionModalRequest.fullName}</strong> ({rejectionModalRequest.email}).
            </p>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Motif de rejet (obligatoire) *
              </label>
              <textarea
                rows={3}
                required
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Ex: Justificatif professionnel insuffisant ou rattachement municipal non vérifié..."
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-900 focus:border-rose-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setRejectionModalRequest(null)}
                className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="button"
                disabled={!rejectionReason.trim() || reviewingId === rejectionModalRequest.id}
                onClick={() =>
                  handleReviewRequest(rejectionModalRequest.id, "REJECTED", rejectionReason.trim())
                }
                className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 text-xs font-bold shadow-sm transition-colors disabled:opacity-50 cursor-pointer"
              >
                {reviewingId === rejectionModalRequest.id && (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                )}
                <span>Confirmer le rejet</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 3: INVITE ADMIN (TAB 3) */}
      {/* ======================================================== */}
      {isInviteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 dark:bg-slate-900 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Shield className="w-5 h-5 text-purple-600" />
                <span>Inviter un Administrateur</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsInviteModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {!generatedInviteLink ? (
              <form onSubmit={handleCreateInvitation} className="space-y-3.5">
                <p className="text-xs text-slate-500">
                  Générez un lien d'invitation sécurisé à usage unique. Le futur administrateur pourra
                  définir son mot de passe directement lors de l'activation.
                </p>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Adresse e-mail institutionnelle *
                  </label>
                  <input
                    type="email"
                    required
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="Ex: direction.it@ballegh.tn"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-900 focus:border-purple-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Nom et Prénom du collaborateur
                  </label>
                  <input
                    type="text"
                    value={inviteFullName}
                    onChange={(e) => setInviteFullName(e.target.value)}
                    placeholder="Ex: Karim Mansour"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-900 focus:border-purple-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Direction / Entité de rattachement
                  </label>
                  <input
                    type="text"
                    value={inviteDepartment}
                    onChange={(e) => setInviteDepartment(e.target.value)}
                    placeholder="Ex: DSI — Ville de Tunis"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-900 focus:border-purple-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setIsInviteModalOpen(false)}
                    disabled={isInviting}
                    className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 cursor-pointer"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={isInviting}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-purple-700 hover:bg-purple-800 text-white px-4 py-2 text-xs font-bold shadow-sm transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    {isInviting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    <span>Générer le lien d'invitation (48h)</span>
                  </button>
                </div>
              </form>
            ) : (
              /* Success Generated Link Screen with Raw Token and One-Time Warning */
              <div className="space-y-4 py-2">
                <div className="flex items-center gap-2 text-emerald-600 font-bold text-sm">
                  <CheckCircle2 className="w-5 h-5 shrink-0" />
                  <span>Jeton d'invitation administrateur généré avec succès !</span>
                </div>

                {/* ONE-TIME DISPLAY WARNING (AMBER) */}
                <div className="rounded-xl bg-amber-50 border border-amber-200 p-3.5 text-xs text-amber-900 dark:bg-amber-950/40 dark:border-amber-800 dark:text-amber-200 flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="font-extrabold uppercase tracking-wide text-[11px] text-amber-800 dark:text-amber-300">
                      ⚠️ Sécurité : Affichage unique du jeton en clair
                    </p>
                    <p className="text-[11px] leading-relaxed">
                      Ce jeton brut ne sera <strong>plus JAMAIS affiché ni récupérable</strong> après la fermeture de cette fenêtre.
                      Seule son empreinte <strong>SHA-256</strong> irréversible est conservée en base de données.
                      Copiez le jeton ou transmettez le lien d'activation immédiatement au collaborateur.
                    </p>
                  </div>
                </div>

                {/* 1. RAW TOKEN BOX */}
                {generatedRawToken && (
                  <div className="rounded-xl bg-slate-50 p-3.5 border border-slate-200 dark:bg-slate-800/80 dark:border-slate-700 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                        1. Jeton cryptographique brut (Token 32 octets / 64 hex) :
                      </span>
                      <span className="text-[10px] text-purple-700 dark:text-purple-300 font-semibold">
                        Usage unique strict
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        readOnly
                        value={generatedRawToken}
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-mono text-purple-900 dark:border-slate-600 dark:bg-slate-900 dark:text-purple-200 select-all font-bold"
                      />
                      <button
                        type="button"
                        onClick={() => copyTokenToClipboard(generatedRawToken)}
                        className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer"
                        title="Copier le jeton brut dans le presse-papier"
                      >
                        {copiedToken ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                        <span>{copiedToken ? "Copié !" : "Copier le jeton"}</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* 2. FULL INVITATION LINK */}
                <div className="rounded-xl bg-slate-50 p-3.5 border border-slate-200 dark:bg-slate-800/80 dark:border-slate-700 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                      2. Lien d'activation direct à transmettre :
                    </span>
                    {generatedExpiresAt && (
                      <span className="text-[10px] text-slate-500 font-mono">
                        Expire le : {new Date(generatedExpiresAt).toLocaleString("fr-TN", {
                          day: "2-digit",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={generatedInviteLink || ""}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-mono text-slate-800 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 select-all"
                    />
                    <button
                      type="button"
                      onClick={() => generatedInviteLink && copyLinkToClipboard(generatedInviteLink)}
                      className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer dark:bg-slate-700 dark:hover:bg-slate-600"
                      title="Copier le lien complet dans le presse-papier"
                    >
                      {copiedLink ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      <span>{copiedLink ? "Copié !" : "Copier le lien"}</span>
                    </button>
                  </div>
                </div>

                {/* INSTRUCTIONS & DIRECT LINK */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1 text-[11px] text-slate-500">
                  <p>
                    Validité : <strong>48 heures</strong>. Transmettez ce lien par voie confidentielle.
                  </p>
                  <a
                    href="/admin/accept-invitation"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-purple-700 hover:underline font-semibold dark:text-purple-300 shrink-0"
                  >
                    <span>Ouvrir la page d'activation</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>

                <div className="flex justify-end pt-3 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => {
                      setIsInviteModalOpen(false);
                      setGeneratedInviteLink(null);
                      setGeneratedRawToken(null);
                      setGeneratedExpiresAt(null);
                    }}
                    className="px-5 py-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold cursor-pointer"
                  >
                    Fermer la fenêtre
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
