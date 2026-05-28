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
