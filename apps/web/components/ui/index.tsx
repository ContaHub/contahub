// apps/web/components/ui/index.tsx
// Biblioteca de componentes reutilizáveis do ContaHub

import { ReactNode } from "react";

// ─── Badge ───────────────────────────────────────────────────────────────────

type BadgeVariant = "success" | "warning" | "danger" | "info" | "gray" | "review" | "purple";

const badgeStyles: Record<BadgeVariant, string> = {
  success: "bg-green-50 text-green-700 border border-green-200",
  warning: "bg-amber-50 text-amber-700 border border-amber-200",
  danger:  "bg-red-50   text-red-600   border border-red-200",
  info:    "bg-blue-50  text-blue-700  border border-blue-200",
  gray:    "bg-slate-50 text-slate-600 border border-slate-200",
  review:  "bg-orange-50 text-orange-700 border border-orange-200",
  purple:  "bg-orange-50 text-orange-700 border border-orange-200",
};

export function Badge({
  variant = "gray",
  children,
}: {
  variant?: BadgeVariant;
  children: ReactNode;
}) {
  return (
    <span className={`inline-flex items-center text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${badgeStyles[variant]}`}>
      {children}
    </span>
  );
}

// ─── Card ─────────────────────────────────────────────────────────────────────

export function Card({
  children,
  className = "",
  hover = false,
}: {
  children: ReactNode;
  className?: string;
  hover?: boolean;
}) {
  return (
    <div className={`bg-white rounded-xl border border-slate-200 overflow-hidden ${hover ? "transition-all hover:shadow-md hover:-translate-y-px cursor-pointer" : ""} ${className}`}>
      {children}
    </div>
  );
}

// ─── MetricCard ───────────────────────────────────────────────────────────────

type MetricVariant = "blue" | "amber" | "red" | "green";

const metricStyles: Record<MetricVariant, { icon: string; hover: string }> = {
  blue: {
    icon: "bg-blue-50 text-blue-600 border border-blue-100",
    hover: "hover:border-blue-300 hover:shadow-[0_10px_25px_-5px_rgba(59,130,246,0.08)]",
  },
  amber: {
    icon: "bg-amber-50 text-amber-600 border border-amber-100",
    hover: "hover:border-amber-300 hover:shadow-[0_10px_25px_-5px_rgba(245,158,11,0.08)]",
  },
  red: {
    icon: "bg-red-50 text-red-600 border border-red-100",
    hover: "hover:border-red-300 hover:shadow-[0_10px_25px_-5px_rgba(239,68,68,0.08)]",
  },
  green: {
    icon: "bg-green-50 text-green-700 border border-green-100",
    hover: "hover:border-green-300 hover:shadow-[0_10px_25px_-5px_rgba(34,197,94,0.08)]",
  },
};

export function MetricCard({
  label,
  value,
  icon: Icon,
  variant = "blue",
  valueClass = "",
  onClick,
}: {
  label: string;
  value: string | number;
  icon: React.ElementType;
  variant?: MetricVariant;
  valueClass?: string;
  onClick?: () => void;
}) {
  const styles = metricStyles[variant];

  return (
    <div
      onClick={onClick}
      className={`group bg-white rounded-xl border border-slate-200 p-5 transition-all duration-300 hover:-translate-y-0.5 ${styles.hover} ${
        onClick ? "cursor-pointer" : ""
      }`}
    >
      <div className="flex items-center justify-between gap-4">
        <div className="space-y-1.5 min-w-0">
          <span className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-[0.5px] block truncate">
            {label}
          </span>
          <h3 className={`text-2xl sm:text-3xl font-extrabold text-slate-900 leading-none tracking-tight truncate ${valueClass}`}>
            {value}
          </h3>
        </div>
        <div className={`w-11 h-11 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm transition-transform duration-300 group-hover:scale-110 ${styles.icon}`}>
          <Icon size={20} className="transition-transform duration-300" />
        </div>
      </div>
    </div>
  );
}

// ─── Button ───────────────────────────────────────────────────────────────────

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

const btnStyles: Record<ButtonVariant, string> = {
  primary:   "bg-blue-600 text-white hover:bg-blue-700 border-transparent",
  secondary: "bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-50",
  ghost:     "bg-transparent text-slate-600 border-transparent hover:bg-slate-100",
  danger:    "bg-red-600 text-white hover:bg-red-700 border-transparent",
};

export function Button({
  children,
  variant = "secondary",
  size = "md",
  icon: Icon,
  onClick,
  disabled,
  className = "",
  type = "button",
}: {
  children?: ReactNode;
  variant?: ButtonVariant;
  size?: "sm" | "md";
  icon?: React.ElementType;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
  type?: "button" | "submit" | "reset";
}) {
  const sizeClass = size === "sm"
    ? "px-3 py-1.5 text-[12px] gap-1.5"
    : "px-4 py-[7px] text-[13px] gap-2";

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center font-semibold rounded-lg border transition-all ${sizeClass} ${btnStyles[variant]} disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
    >
      {Icon && <Icon size={size === "sm" ? 13 : 15} />}
      {children}
    </button>
  );
}

// ─── IconButton ───────────────────────────────────────────────────────────────

export function IconButton({
  icon: Icon,
  variant = "default",
  label,
  onClick,
  size = 14,
}: {
  icon: React.ElementType;
  variant?: "default" | "danger" | "success";
  label?: string;
  onClick?: () => void;
  size?: number;
}) {
  const variantClass = {
    default: "border-slate-200 text-slate-500 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50",
    danger:  "border-slate-200 text-slate-500 hover:border-red-400  hover:text-red-600  hover:bg-red-50",
    success: "border-slate-200 text-slate-500 hover:border-green-400 hover:text-green-600 hover:bg-green-50",
  }[variant];

  return (
    <button
      onClick={onClick}
      title={label}
      aria-label={label}
      className={`w-7 h-7 flex items-center justify-center rounded-[6px] border bg-white transition-all ${variantClass}`}
    >
      <Icon size={size} />
    </button>
  );
}

// ─── PageHeader ───────────────────────────────────────────────────────────────
// Topbar visível apenas em desktop (lg+). Mobile usa MobileHeader do Sidebar.tsx

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="hidden lg:flex items-center h-14 px-6 bg-white border-b border-slate-200 flex-shrink-0 gap-3">
      <div className="flex-1 min-w-0">
        <h1 className="text-[15px] font-bold text-slate-900 truncate">{title}</h1>
        {subtitle && <p className="text-[12px] text-slate-500 truncate">{subtitle}</p>}
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  );
}

// ─── FilterBar ────────────────────────────────────────────────────────────────

export function FilterBar({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap items-center gap-2 mb-3">{children}</div>;
}

export function SearchInput({
  placeholder,
  value,
  onChange,
}: {
  placeholder?: string;
  value?: string;
  onChange?: (v: string) => void;
}) {
  return (
    <div className="flex-1 min-w-[180px] flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-3 py-2 text-[13px]">
      <svg className="w-4 h-4 flex-shrink-0 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
      </svg>
      <input
        className="bg-transparent flex-1 outline-none text-slate-700 placeholder:text-slate-400"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
      />
    </div>
  );
}

export function SelectFilter({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-center gap-1.5 bg-white border border-slate-200 hover:border-slate-300 rounded-lg px-3 py-2 text-[13px] text-slate-600 cursor-pointer transition-colors whitespace-nowrap select-none">
      {children}
      <svg className="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
      </svg>
    </div>
  );
}

// ─── EmptyState ───────────────────────────────────────────────────────────────

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: React.ElementType;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <div className="w-14 h-14 bg-slate-100 border border-slate-200 rounded-xl flex items-center justify-center mb-3">
        <Icon size={26} className="text-slate-400" />
      </div>
      <p className="text-[14px] font-semibold text-slate-700 mb-1">{title}</p>
      {description && <p className="text-[13px] text-slate-500 max-w-xs">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

// ─── SectionHeader ────────────────────────────────────────────────────────────

export function SectionHeader({
  title,
  linkLabel,
  onLinkClick,
}: {
  title: string;
  linkLabel?: string;
  onLinkClick?: () => void;
}) {
  return (
    <div className="flex items-center justify-between mb-3">
      <h2 className="text-[14px] font-bold text-slate-900">{title}</h2>
      {linkLabel && (
        <button onClick={onLinkClick} className="text-[12px] font-semibold text-blue-600 hover:underline flex items-center gap-1">
          {linkLabel}
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      )}
    </div>
  );
}

// ─── Toggle ───────────────────────────────────────────────────────────────────

export function Toggle({
  enabled,
  onChange,
}: {
  enabled: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      onClick={() => onChange(!enabled)}
      className={`relative w-10 h-[22px] rounded-full transition-colors flex-shrink-0 ${enabled ? "bg-blue-600" : "bg-slate-300"}`}
      role="switch"
      aria-checked={enabled}
    >
      <span className={`absolute top-[2px] w-[18px] h-[18px] bg-white rounded-full shadow transition-all ${enabled ? "left-[20px]" : "left-[2px]"}`} />
    </button>
  );
}

// ─── Modal ────────────────────────────────────────────────────────────────────

export function Modal({
  title,
  subtitle,
  onClose,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md"
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h2 className="text-[15px] font-bold text-slate-900">{title}</h2>
            {subtitle && <p className="text-[12px] text-slate-500 mt-0.5">{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            aria-label="Fechar"
            className="text-slate-400 hover:text-slate-600 transition-colors"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
        {footer && (
          <div className="flex justify-end gap-2 px-6 py-4 border-t border-slate-100">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── ConfirmModal ─────────────────────────────────────────────────────────────

export function ConfirmModal({
  title,
  message,
  confirmLabel = "Confirmar",
  confirmVariant = "danger",
  onConfirm,
  onCancel,
}: {
  title: string;
  message: string;
  confirmLabel?: string;
  confirmVariant?: ButtonVariant;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Modal
      title={title}
      onClose={onCancel}
      footer={
        <>
          <Button variant="secondary" onClick={onCancel}>Cancelar</Button>
          <Button variant={confirmVariant} onClick={onConfirm}>{confirmLabel}</Button>
        </>
      }
    >
      <p className="text-[14px] text-slate-600">{message}</p>
    </Modal>
  );
}