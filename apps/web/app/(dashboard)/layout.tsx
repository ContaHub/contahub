"use client";

import { useState } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { MobileMenuContext } from "@/components/layout/mobile-menu";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-slate-100">
      <Sidebar
        mobileOpen={mobileOpen}
        onClose={() => setMobileOpen(false)}
      />
      <main className="flex-1 flex flex-col overflow-hidden min-w-0">
        <MobileMenuContext.Provider value={() => setMobileOpen(true)}>
          {children}
        </MobileMenuContext.Provider>
      </main>
    </div>
  );
}
