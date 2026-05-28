import { ReactNode } from "react";
import { LucideIcon } from "lucide-react";

// ─── Badge ──────────────────────────────────────────────────────────────────

type BadgeVariant = "success" | "warning" | "danger" | "info" | "gray" | "review";

const badgeStyles: Record<BadgeVariant, string> = {
  success: "bg-green-50 text-green-700 border border-green-200",
  warning: "bg-amber-50 text-amber-700 border border-amber-200",
  danger:  "bg-red-50  text-red-600   border border-red-200",
  info:    "bg-blue-50 text-blue-700  border border-blue-200",
  gray:    "bg-slate-50 text-slate-600 border border-slate-200",
  review:  "bg-orange-50 text-orange-700 border border-orange-200",
};

export function Badge({
  variant = "gray",
  children,
}: {
  variant?: BadgeVariant;
  children: ReactNode;
}) {
  return (
    <span
      className={`inline-flex items-center text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${badgeStyles[variant]}`}
    >
      {children}
    </span>
  );
}

// ─── Card ────────────────────────────────────────────────────────────────────

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
    <div
      className={`bg-white rounded-xl border border-slate-200 overflow-hidden ${
        hover ? "transition-all hover:shadow-md hover:-translate-y-px cursor-pointer" : ""
      } ${className}`}
    >
      {children}
    </div>
  );
}

// ─── MetricCard ──────────────────────────────────────────────────────────────

type MetricVariant = "blue" | "amber" | "red" | "green";

const metricIconStyles: Record<MetricVariant, string> = {
  blue:  "bg-blue-50  text-blue-600",
  amber: "bg-amber-50 text-amber-600",
  red:   "bg-red-50   text-red-600",
  green: "bg-green-50 text-green-700",
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
  icon: LucideIcon;
  variant?: MetricVariant;
  valueClass?: string;
  onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-xl border border-slate-200 p-4 sm:p-5 transition-all hover:shadow-md hover:-translate-y-px ${
        onClick ? "cursor-pointer" : ""
      }`}
    >
      <div
        className={`w-9 h-9 sm:w-10 sm:h-10 rounded-[9px] flex items-center justify-center mb-3 sm:mb-4 ${metricIconStyles[variant]}`}
      >
        <Icon size={19} />
      </div>
      <div
        className={`text-2xl sm:text-[28px] font-extrabold text-slate-900 leading-none mb-1 ${valueClass}`}
      >
        {value}
      </div>
      <div className="text-[12px] text-slate-500 font-medium">{label}</div>
    </div>
  );
}

// ─── Button ──────────────────────────────────────────────────────────────────

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
  iconRight: IconRight,
  onClick,
  disabled,
  className = "",
  type = "button",
}: {
  children?: ReactNode;
  variant?: ButtonVariant;
  size?: "sm" | "md";
  icon?: LucideIcon;
  iconRight?: LucideIcon;
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
      {IconRight && <IconRight size={size === "sm" ? 13 : 15} />}
    </button>
  );
}

// ─── IconButton ──────────────────────────────────────────────────────────────

export function IconButton({
  icon: Icon,
  variant = "default",
  label,
  onClick,
  size = 14,
}: {
  icon: LucideIcon;
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

// ─── PageHeader ──────────────────────────────────────────────────────────────

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
        {subtitle && (
          <p className="text-[12px] text-slate-500 truncate">{subtitle}</p>
        )}
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  );
}

// ─── FilterBar ───────────────────────────────────────────────────────────────

export function FilterBar({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-2 mb-3">{children}</div>
  );
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
    <div className="flex-1 min-w-[180px] flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-3 py-2 text-[13px] text-slate-400">
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

export function SelectFilter({
  children,
  value,
  onChange,
}: {
  children: ReactNode;
  value?: string;
  onChange?: (v: string) => void;
}) {
  return (
    <div className="flex items-center gap-1.5 bg-white border border-slate-200 hover:border-slate-300 rounded-lg px-3 py-2 text-[13px] text-slate-600 cursor-pointer transition-colors whitespace-nowrap select-none">
      {children}
      <svg className="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
      </svg>
    </div>
  );
}

// ─── EmptyState ──────────────────────────────────────────────────────────────

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
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
      {description && (
        <p className="text-[13px] text-slate-500 max-w-xs">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

// ─── SectionHeader ───────────────────────────────────────────────────────────

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
        <button
          onClick={onLinkClick}
          className="text-[12px] font-semibold text-blue-600 hover:underline flex items-center gap-1"
        >
          {linkLabel}
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      )}
    </div>
  );
}

// ─── Toggle ──────────────────────────────────────────────────────────────────

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
      className={`relative w-10 h-[22px] rounded-full transition-colors flex-shrink-0 ${
        enabled ? "bg-blue-600" : "bg-slate-300"
      }`}
      role="switch"
      aria-checked={enabled}
    >
      <span
        className={`absolute top-[2px] w-[18px] h-[18px] bg-white rounded-full shadow transition-all ${
          enabled ? "left-[20px]" : "left-[2px]"
        }`}
      />
    </button>
  );
}
