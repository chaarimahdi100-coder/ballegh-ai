"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useI18n } from "@/lib/i18n/I18nContext";
import { useDemo } from "@/lib/demo/DemoStore";
import {
  LayoutDashboard,
  FileText,
  MapPin,
  Settings,
  Users,
  ShieldAlert,
  Bot,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface SidebarProps {
  role: "municipal" | "admin";
}

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
}

export function Sidebar({ role }: SidebarProps) {
  const { t } = useI18n();
  const { reports } = useDemo();
  const pathname = usePathname();

  // Count pending reviews for badge
  const pendingCount = reports.filter((r) => r.status === "ai_analyzed").length;

  const municipalNavItems: NavItem[] = [
    {
      title: t("nav.dashboard"),
      href: "/municipal/dashboard",
      icon: LayoutDashboard,
    },
    {
      title: t("nav.reportsQueue"),
      href: "/municipal/reports",
      icon: FileText,
      badge: pendingCount > 0 ? pendingCount : undefined,
    },
    {
      title: t("nav.mapView"),
      href: "/municipal/map",
      icon: MapPin,
    },
  ];

  const adminNavItems: NavItem[] = [
    {
      title: t("nav.dashboard"),
      href: "/admin/dashboard",
      icon: LayoutDashboard,
    },
    {
      title: t("nav.users"),
      href: "/admin/users",
      icon: Users,
    },
    {
      title: t("nav.settings"),
      href: "/admin/settings",
      icon: Settings,
    },
  ];

  const items = role === "municipal" ? municipalNavItems : adminNavItems;

  return (
    <aside className="w-64 shrink-0 hidden lg:block border-r border-slate-200 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-900/50 min-h-[calc(100vh-80px)]">
      <div className="space-y-6">
        <div>
          <h2 className="px-3 text-xs font-bold uppercase tracking-wider text-slate-400">
            {role === "municipal" ? t("nav.municipalPortal") : t("nav.adminPortal")}
          </h2>
          <nav className="mt-2 space-y-1">
            {items.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "group flex items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-brand-navy-900 text-white font-semibold dark:bg-brand-teal-500 dark:text-slate-950"
                      : "text-slate-600 hover:bg-slate-200/60 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <Icon
                      className={cn(
                        "h-4 w-4 shrink-0 transition-colors",
                        isActive
                          ? "text-brand-teal-400 dark:text-slate-950"
                          : "text-slate-400 group-hover:text-slate-600 dark:text-slate-400 dark:group-hover:text-white"
                      )}
                    />
                    <span>{item.title}</span>
                  </div>
                  {item.badge !== undefined && (
                    <span
                      className={cn(
                        "inline-flex items-center justify-center rounded-full px-2 py-0.5 text-xs font-bold",
                        isActive
                          ? "bg-brand-teal-400 text-brand-navy-950 font-black"
                          : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                      )}
                    >
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Quick Info Box */}
        <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-white">
            <Bot className="h-4 w-4 text-brand-teal-600" />
            <span>Ballegh AI Engine</span>
          </div>
          <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
            Module actif : <strong className="text-slate-700 dark:text-slate-300">Infrastructure (Tunis)</strong>. Faux positifs réduits via filtrage photo.
          </p>
          <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500">
            <span>Contrôle humain :</span>
            <span className="font-bold text-emerald-600 dark:text-emerald-400">Actif (100%)</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
