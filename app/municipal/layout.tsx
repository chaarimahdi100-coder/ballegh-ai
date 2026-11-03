"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { Header } from "@/components/common/Header";
import { Sidebar } from "@/components/common/Sidebar";

export default function MunicipalLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // /municipal/request-access is a public standalone onboarding page: bypass dashboard header and sidebar
  if (pathname?.startsWith("/municipal/request-access")) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950">
      <Header roleMode="municipal" />
      <div className="flex-1 flex w-full">
        <Sidebar role="municipal" />
        <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
