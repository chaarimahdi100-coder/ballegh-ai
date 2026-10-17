"use client";

import React, { useState } from "react";
import { useI18n } from "@/lib/i18n/I18nContext";
import { DEMO_USERS } from "@/lib/demo/users";
import type { User, UserRole } from "@/lib/types";
import {
  Users,
  Shield,
  UserCheck,
  Building2,
  Search,
  PlusCircle,
  MoreVertical,
  CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function AdminUsersPage() {
  const { t, language } = useI18n();
  const [users, setUsers] = useState<User[]>([
    ...DEMO_USERS,
    {
      id: "usr_citizen_02",
      name: "Fatma Khelil",
      email: "fatma.khelil@gmail.tn",
      phone: "+216 22 567 890",
      role: "citizen",
      district: "Bab Souika",
    },
    {
      id: "usr_citizen_03",
      name: "Mourad Chaabane",
      email: "mourad.chaabane@topnet.tn",
      phone: "+216 55 123 456",
      role: "citizen",
      district: "Bab El Khadhra",
    },
    {
      id: "usr_agent_02",
      name: "M. Hichem Guesmi",
      email: "hichem.guesmi@commune-tunis.gov.tn",
      phone: "+216 71 340 210",
      role: "municipal_agent",
      district: "Direction DVRD",
      organization: "Commune de Tunis",
    },
  ]);

  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");

  React.useEffect(() => {
    async function fetchUsers() {
      try {
        const res = await fetch("/api/users");
        if (res.ok) {
          const data = await res.json();
          if (data.users && Array.isArray(data.users) && data.users.length > 0) {
            setUsers(data.users);
          }
        }
      } catch {
        // fallback to default list
      }
    }
    fetchUsers();
  }, []);

  const filtered = users.filter((u) => {
    const matchSearch =
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.district && u.district.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchRole = roleFilter === "all" || u.role === roleFilter;

    return matchSearch && matchRole;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
            {t("admin.userManagementTitle")}
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Comptes citoyens, agents municipaux habilités et administrateurs système
          </p>
        </div>

        <button
          type="button"
          onClick={() => alert("Simulation Phase 1 : L'ajout d'utilisateurs sera couplé à l'annuaire municipal en Phase 2.")}
          className="inline-flex items-center gap-2 rounded-xl bg-brand-navy-900 hover:bg-brand-navy-800 text-white px-4 py-2.5 text-xs sm:text-sm font-bold shadow-sm transition-colors"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Créer un utilisateur</span>
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
            <option value="all">Tous les rôles</option>
            <option value="citizen">Citoyens</option>
            <option value="municipal_agent">Agents Municipaux</option>
            <option value="admin">Administrateurs</option>
          </select>
        </div>
      </div>

      {/* Users Table */}
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
              {filtered.map((user) => (
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
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      <span>Actif</span>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
