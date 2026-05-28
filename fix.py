#!/usr/bin/env python3
"""
ContaHub — Script de correção definitiva do redesign responsivo.
Executa da raiz do projeto: ~/Desktop/Projeto SaaS
"""

import os
import sys

# ─── Localizar a raiz do projeto ─────────────────────────────────────────────

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
# Tenta encontrar a raiz pelo marcador turbo.json
ROOT = None
for candidate in [
    os.path.expanduser("~/Desktop/Projeto SaaS"),
    os.path.expanduser("~/Desktop/Projeto\ SaaS"),
    SCRIPT_DIR,
    os.getcwd(),
]:
    if os.path.exists(os.path.join(candidate, "turbo.json")):
        ROOT = candidate
        break

if not ROOT:
    print("❌  Raiz do projeto não encontrada.")
    print("    Execute este script da pasta ~/Desktop/Projeto SaaS")
    sys.exit(1)

WEB = os.path.join(ROOT, "apps", "web")
LAYOUT_DIR = os.path.join(WEB, "components", "layout")
DASHBOARD_DIR = os.path.join(WEB, "app", "(dashboard)")

print(f"\n✅  Raiz encontrada: {ROOT}")
print(f"✅  Web app: {WEB}\n")

errors = []

# ─── Utilitário de escrita ────────────────────────────────────────────────────

def write(path, content):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)
    print(f"  ✅  Escrito: {path.replace(ROOT, '')}")

def read(path):
    with open(path, "r", encoding="utf-8") as f:
        return f.read()

# ─── 1. mobile-menu.tsx ───────────────────────────────────────────────────────
# Arquivo único com: MobileMenuContext + useMobileMenu + MobileHeader

MOBILE_MENU = '''\
"use client";
import { createContext, useContext } from "react";
import { Menu } from "lucide-react";

// Contexto para abrir o drawer mobile a partir de qualquer page filha
export const MobileMenuContext = createContext<() => void>(() => {});
export const useMobileMenu = () => useContext(MobileMenuContext);

// Header mobile com botão de hamburguer — visível apenas em telas < lg
export function MobileHeader({
  onMenuClick,
  title,
  subtitle,
  action,
}: {
  onMenuClick: () => void;
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-center h-14 px-4 bg-white border-b border-slate-200 lg:hidden flex-shrink-0">
      <button
        onClick={onMenuClick}
        className="p-1.5 -ml-1.5 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
        aria-label="Abrir menu"
      >
        <Menu size={20} />
      </button>
      <div className="ml-3 flex-1 min-w-0">
        <p className="text-[14px] font-bold text-slate-900 truncate">{title}</p>
        {subtitle && (
          <p className="text-[11px] text-slate-500 truncate">{subtitle}</p>
        )}
      </div>
      {action && <div className="ml-2 flex-shrink-0">{action}</div>}
    </div>
  );
}
'''

write(os.path.join(LAYOUT_DIR, "mobile-menu.tsx"), MOBILE_MENU)

# ─── 2. Sidebar.tsx ───────────────────────────────────────────────────────────
# Reescrita completa — sem MobileHeader aqui (evita duplicata)

SIDEBAR = '''\
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

const NAV_MAIN = [
  { href: "/dashboard",           label: "Dashboard",  icon: LayoutDashboard },
  { href: "/dashboard/clients",   label: "Clientes",   icon: Users },
  { href: "/dashboard/fiscal",    label: "Fiscal",     icon: FileText, badge: "2", badgeVariant: "danger" as const },
  { href: "/dashboard/documents", label: "Documentos", icon: Files },
];
const NAV_COMMS = [
  { href: "/dashboard/notifications", label: "Notificações", icon: Bell },
];
const NAV_SYSTEM = [
  { href: "/dashboard/settings",         label: "Configurações", icon: Settings },
  { href: "http://localhost:3003/queues", label: "Filas",         icon: Layers, external: true, badge: "↗", badgeVariant: "info" as const },
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
'''

write(os.path.join(LAYOUT_DIR, "Sidebar.tsx"), SIDEBAR)

# ─── 3. layout.tsx ────────────────────────────────────────────────────────────
# Sem exports de componentes — só o default export do layout

LAYOUT = '''\
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
'''

write(os.path.join(DASHBOARD_DIR, "layout.tsx"), LAYOUT)

# ─── 4. Corrigir imports nas pages ────────────────────────────────────────────
# Cada page importa MobileHeader e useMobileMenu de @/components/layout/mobile-menu

OLD_IMPORTS = [
    'from "@/app/(dashboard)/layout"',
    "from '@/app/(dashboard)/layout'",
]
NEW_IMPORT = 'from "@/components/layout/mobile-menu"'

pages_fixed = []
pages_skipped = []

for root, dirs, files in os.walk(DASHBOARD_DIR):
    # Pular subpastas que não são pages (portal, etc)
    dirs[:] = [d for d in dirs if not d.startswith(".")]
    for fname in files:
        if fname != "page.tsx":
            continue
        fpath = os.path.join(root, fname)
        content = read(fpath)

        changed = False
        for old in OLD_IMPORTS:
            if old in content:
                content = content.replace(old, NEW_IMPORT)
                changed = True

        if changed:
            write(fpath, content)
            pages_fixed.append(fpath.replace(ROOT, ""))
        else:
            pages_skipped.append(fpath.replace(ROOT, ""))

# ─── 5. Verificação final ─────────────────────────────────────────────────────

print("\n" + "="*60)
print("🔍  VERIFICAÇÃO FINAL")
print("="*60)

checks = {
    "mobile-menu.tsx existe": os.path.join(LAYOUT_DIR, "mobile-menu.tsx"),
    "Sidebar.tsx existe":     os.path.join(LAYOUT_DIR, "Sidebar.tsx"),
    "layout.tsx existe":      os.path.join(DASHBOARD_DIR, "layout.tsx"),
}

all_ok = True
for label, path in checks.items():
    if os.path.exists(path):
        print(f"  ✅  {label}")
    else:
        print(f"  ❌  {label} — NÃO ENCONTRADO")
        all_ok = False

# Verificar que mobile-menu exporta os 3 símbolos necessários
mm_content = read(os.path.join(LAYOUT_DIR, "mobile-menu.tsx"))
for symbol in ["MobileMenuContext", "useMobileMenu", "MobileHeader"]:
    if f"export" in mm_content and symbol in mm_content:
        print(f"  ✅  mobile-menu.tsx exporta {symbol}")
    else:
        print(f"  ❌  mobile-menu.tsx NÃO exporta {symbol}")
        all_ok = False

# Verificar que Sidebar.tsx NÃO tem MobileHeader duplicado
sidebar_content = read(os.path.join(LAYOUT_DIR, "Sidebar.tsx"))
count = sidebar_content.count("export function MobileHeader")
if count == 0:
    print("  ✅  Sidebar.tsx não tem MobileHeader (correto)")
elif count == 1:
    print("  ⚠️   Sidebar.tsx tem 1 MobileHeader — pode causar conflito, remova manualmente")
    all_ok = False
else:
    print(f"  ❌  Sidebar.tsx tem {count} definições de MobileHeader — duplicata!")
    all_ok = False

# Verificar que layout.tsx não exporta MobileHeader/useMobileMenu
layout_content = read(os.path.join(DASHBOARD_DIR, "layout.tsx"))
for symbol in ["export function MobileHeader", "export const useMobileMenu", "export const MobileMenuContext"]:
    if symbol in layout_content:
        print(f"  ❌  layout.tsx exporta '{symbol}' — isso causa problema no Next.js!")
        all_ok = False
print("  ✅  layout.tsx não tem exports problemáticos")

# Verificar imports nas pages
print(f"\n  📄  Pages corrigidas ({len(pages_fixed)}):")
for p in pages_fixed:
    print(f"       {p}")

if pages_skipped:
    print(f"\n  📄  Pages sem import antigo ({len(pages_skipped)}) — OK:")
    for p in pages_skipped:
        print(f"       {p}")

# Verificar se alguma page ainda tem o import antigo
print("\n  🔎  Checando imports restantes nas pages...")
remaining_old = []
for root, dirs, files in os.walk(DASHBOARD_DIR):
    dirs[:] = [d for d in dirs if not d.startswith(".")]
    for fname in files:
        if fname != "page.tsx":
            continue
        fpath = os.path.join(root, fname)
        content = read(fpath)
        for old in OLD_IMPORTS:
            if old in content:
                remaining_old.append(fpath.replace(ROOT, ""))

if remaining_old:
    print(f"  ❌  Ainda com import antigo:")
    for p in remaining_old:
        print(f"       {p}")
    all_ok = False
else:
    print("  ✅  Nenhuma page com import antigo")

print("\n" + "="*60)
if all_ok:
    print("🎉  TUDO OK! Rode: pnpm dev")
else:
    print("⚠️   Alguns problemas encontrados acima — verifique antes de rodar.")
print("="*60 + "\n")
