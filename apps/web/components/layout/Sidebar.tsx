"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import {
  LayoutDashboard,
  Users,
  FileText,
  Files,
  Bell,
  Settings,
  Layers,
  Calculator,
  X,
} from "lucide-react";

interface NavItemData {
  href: string;
  label: string;
  icon: React.ComponentType<any>;
  badge?: string;
  badgeVariant?: "danger" | "info";
  external?: boolean;
}

const NAV_MAIN: NavItemData[] = [
  { href: "/dashboard",           label: "Dashboard",  icon: LayoutDashboard },
  { href: "/dashboard/clients",   label: "Clientes",   icon: Users },
  { href: "/dashboard/fiscal",    label: "Fiscal",     icon: FileText, badge: "2", badgeVariant: "danger" },
  { href: "/dashboard/documents", label: "Documentos", icon: Files },
];
const NAV_COMMS: NavItemData[] = [
  { href: "/dashboard/notifications", label: "Notificações", icon: Bell },
];
const NAV_SYSTEM: NavItemData[] = [
  { href: "/dashboard/settings",         label: "Configurações", icon: Settings },
  { href: "http://localhost:3003/queues", label: "Filas",         icon: Layers, external: true, badge: "↗", badgeVariant: "info" },
];

function NavItem({
  href, label, icon: Icon, badge, badgeVariant, external, active, onClick,
}: {
  href: string; label: string; icon: React.ElementType;
  badge?: string; badgeVariant?: "danger" | "info";
  external?: boolean; active?: boolean; onClick?: () => void;
}) {
  const base =
    "flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13.5px] transition-all cursor-pointer select-none group";
  const cls = active
    ? `${base} bg-blue-600/20 text-white`
    : `${base} text-slate-400 hover:bg-slate-800 hover:text-slate-200`;

  const inner = (
    <>
      <Icon
        size={17}
        className={`flex-shrink-0 transition-colors ${
          active ? "text-blue-400" : "text-slate-500 group-hover:text-slate-400"
        }`}
      />
      <span className="flex-1 truncate">{label}</span>
      {badge && (
        <span
          className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
            badgeVariant === "danger"
              ? "bg-red-600 text-white"
              : "bg-blue-400/20 text-blue-400"
          }`}
        >
          {badge}
        </span>
      )}
    </>
  );

  if (external) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={cls} onClick={onClick}>
        {inner}
      </a>
    );
  }
  return (
    <Link href={href} className={cls} onClick={onClick}>
      {inner}
    </Link>
  );
}

export function Sidebar({
  mobileOpen,
  onClose,
}: {
  mobileOpen: boolean;
  onClose: () => void;
}) {
  const pathname = usePathname();
  const isActive = (href: string) =>
    href === "/dashboard"
      ? pathname === "/dashboard"
      : pathname.startsWith(href);

  const content = (
    <div className="flex flex-col h-full bg-[#0F172A] w-56">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-3.5 py-[18px] border-b border-white/[0.06] flex-shrink-0">
        <div className="w-[34px] h-[34px] bg-blue-600 rounded-[9px] flex items-center justify-center flex-shrink-0">
          <Calculator size={17} className="text-white" />
        </div>
        <span className="text-[15px] font-bold text-slate-50 tracking-tight flex-1">
          ContaHub
        </span>
        <button
          onClick={onClose}
          className="p-1 text-slate-500 hover:text-slate-300 lg:hidden"
          aria-label="Fechar menu"
        >
          <X size={18} />
        </button>
      </div>

      {/* Navegação */}
      <nav className="flex-1 px-2 py-3 overflow-y-auto space-y-0.5">
        <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-[0.8px] px-2 pt-2 pb-1">
          Principal
        </p>
        {NAV_MAIN.map((item) => (
          <NavItem key={item.href} {...item} active={isActive(item.href)} onClick={onClose} />
        ))}

        <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-[0.8px] px-2 pt-4 pb-1">
          Comunicação
        </p>
        {NAV_COMMS.map((item) => (
          <NavItem key={item.href} {...item} active={isActive(item.href)} onClick={onClose} />
        ))}

        <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-[0.8px] px-2 pt-4 pb-1">
          Sistema
        </p>
        {NAV_SYSTEM.map((item) => (
          <NavItem key={item.href} {...item} active={isActive(item.href)} onClick={onClose} />
        ))}
      </nav>

      {/* Footer */}
      <div className="px-2 py-3 border-t border-white/[0.06] flex-shrink-0">
        <div className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-slate-800 cursor-pointer transition-colors">
          <UserButton afterSignOutUrl="/" />
          <div className="min-w-0">
            <p className="text-[13px] text-slate-300 font-medium truncate leading-tight">
              Minha conta
            </p>
            <p className="text-[11px] text-slate-500 truncate">Configurar perfil</p>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop — sempre visível */}
      <aside className="hidden lg:flex flex-col h-full w-56 flex-shrink-0">
        {content}
      </aside>

      {/* Mobile — drawer com overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />
          <aside className="absolute left-0 top-0 bottom-0 w-56 flex flex-col shadow-2xl">
            {content}
          </aside>
        </div>
      )}
    </>
  );
}
