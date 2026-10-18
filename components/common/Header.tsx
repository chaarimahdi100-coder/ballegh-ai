"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useI18n } from "@/lib/i18n/I18nContext";
import { useDemo } from "@/lib/demo/DemoStore";
import { Logo } from "@/components/brand/Logo";
import { LanguageSwitcher } from "@/components/common/LanguageSwitcher";
import {
  Menu,
  X,
  PlusCircle,
  FileText,
  LayoutDashboard,
  MapPin,
  Users,
  Settings,
  LogIn,
  LogOut,
  Shield,
  Building2,
  User,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface HeaderProps {
  roleMode?: "public" | "citizen" | "municipal" | "admin";
}

export function Header({ roleMode }: HeaderProps) {
  const { t, language } = useI18n();
  const { activeUser } = useDemo();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch (err) {
      console.error("Logout request failed:", err);
    }
    localStorage.removeItem("ballegh_active_role");
    window.location.href = "/login";
  };

  // Infer mode from pathname if not provided
  const mode =
    roleMode ||
    (pathname.startsWith("/municipal")
      ? "municipal"
      : pathname.startsWith("/admin")
      ? "admin"
      : pathname.startsWith("/citizen")
      ? "citizen"
      : "public");

  const publicLinks = [
    { href: "/#how-it-works", label: t("nav.howItWorks") },
    { href: "/#categories", label: t("nav.issueTypes") },
    { href: "/#workflow", label: t("nav.aiWorkflow") },
  ];

  const citizenLinks = [
    { href: "/citizen/dashboard", label: t("nav.dashboard"), icon: LayoutDashboard },
    { href: "/citizen/reports/new", label: t("nav.newReport"), icon: PlusCircle },
    { href: "/citizen/reports", label: t("nav.myReports"), icon: FileText },
  ];

  const municipalLinks = [
    { href: "/municipal/dashboard", label: t("nav.dashboard"), icon: LayoutDashboard },
    { href: "/municipal/reports", label: t("nav.reportsQueue"), icon: FileText },
    { href: "/municipal/map", label: t("nav.mapView"), icon: MapPin },
  ];

  const adminLinks = [
    { href: "/admin/dashboard", label: t("nav.dashboard"), icon: LayoutDashboard },
    { href: "/admin/users", label: t("nav.users"), icon: Users },
    { href: "/admin/settings", label: t("nav.settings"), icon: Settings },
  ];

  const activeLinks =
    mode === "citizen"
      ? citizenLinks
      : mode === "municipal"
      ? municipalLinks
      : mode === "admin"
      ? adminLinks
      : publicLinks;

  return (
    <header className="sticky top-[29px] z-40 w-full border-b border-slate-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80 dark:border-slate-800 dark:bg-slate-900/95">
      <div className="max-w-7xl mx-auto flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand Logo */}
        <div className="flex items-center gap-6">
          <Logo href={mode === "public" ? "/" : `/${mode}/dashboard`} />

          {/* Context Badge */}
          {mode !== "public" && (
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
              {mode === "citizen" && <User className="w-3.5 h-3.5 text-brand-teal-600" />}
              {mode === "municipal" && <Building2 className="w-3.5 h-3.5 text-blue-600" />}
              {mode === "admin" && <Shield className="w-3.5 h-3.5 text-purple-600" />}
              <span>
                {mode === "citizen" && t("nav.citizenPortal")}
                {mode === "municipal" && t("nav.municipalPortal")}
                {mode === "admin" && t("nav.adminPortal")}
              </span>
            </div>
          )}
        </div>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-1 lg:gap-2">
          {activeLinks.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "px-3 py-2 text-sm font-medium rounded-lg transition-colors",
                  isActive
                    ? "bg-brand-teal-50 text-brand-teal-800 font-semibold dark:bg-brand-teal-950/60 dark:text-brand-teal-300"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-300 dark:hover:text-white dark:hover:bg-slate-800"
                )}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* Right Action Controls */}
        <div className="flex items-center gap-3">
          <LanguageSwitcher />

          {mode === "public" ? (
            <div className="hidden sm:flex items-center gap-2">
              <Link
                href="/login"
                className="px-3.5 py-2 text-sm font-semibold text-slate-700 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition-colors dark:text-slate-200 dark:hover:text-white dark:hover:bg-slate-800"
              >
                {t("nav.login")}
              </Link>
              <Link
                href="/citizen/reports/new"
                className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-brand-teal-600 hover:bg-brand-teal-700 rounded-lg shadow-sm transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-teal-500"
              >
                <PlusCircle className="w-4 h-4" />
                <span>{t("landing.ctaReport")}</span>
              </Link>
            </div>
          ) : (
            <div className="hidden sm:flex items-center gap-3 border-l border-slate-200 pl-3 dark:border-slate-800">
              <div className="flex flex-col text-right">
                <span className="text-xs font-bold text-slate-900 dark:text-white">
                  {activeUser.name}
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  {language === "ar"
                    ? activeUser.role === "citizen"
                      ? "مواطن"
                      : activeUser.role === "municipal_agent"
                      ? "عون بلدي"
                      : "مدير"
                    : activeUser.role === "citizen"
                    ? "Citoyen"
                    : activeUser.role === "municipal_agent"
                    ? "Agent Municipal"
                    : "Administrateur"}
                </span>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                title={t("nav.logout")}
                className="p-2 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Mobile Menu Button */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100 dark:text-slate-300 dark:hover:text-white dark:hover:bg-slate-800"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-200 bg-white px-4 pt-3 pb-6 space-y-3 dark:border-slate-800 dark:bg-slate-900 shadow-xl">
          <div className="space-y-1">
            {activeLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className={cn(
                  "block px-3 py-2 rounded-lg text-base font-medium transition-colors",
                  pathname === link.href
                    ? "bg-brand-teal-50 text-brand-teal-800 font-semibold dark:bg-brand-teal-950 dark:text-brand-teal-300"
                    : "text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                )}
              >
                {link.label}
              </Link>
            ))}
          </div>

          <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-2">
            {mode === "public" ? (
              <>
                <Link
                  href="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-lg border border-slate-300 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200"
                >
                  <LogIn className="w-4 h-4" />
                  <span>{t("nav.login")}</span>
                </Link>
                <Link
                  href="/citizen/reports/new"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-lg bg-brand-teal-600 text-sm font-semibold text-white hover:bg-brand-teal-700 shadow-sm"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>{t("landing.ctaReport")}</span>
                </Link>
              </>
            ) : (
              <div className="flex items-center justify-between px-2 py-1">
                <div>
                  <p className="text-sm font-bold text-slate-900 dark:text-white">
                    {activeUser.name}
                  </p>
                  <p className="text-xs text-slate-500">{activeUser.email}</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    handleLogout();
                  }}
                  className="inline-flex items-center gap-1 text-xs text-rose-600 font-semibold"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>{t("nav.logout")}</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
