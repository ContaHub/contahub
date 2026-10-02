"use client";

import { ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

export function AsyncState({
  status,
  isEmpty,
  onRetry,
  errorMessage = "Não foi possível carregar os dados.",
  emptyFallback,
  size = "md",
  children,
}: {
  status: "loading" | "error" | "ready";
  isEmpty?: boolean;
  onRetry?: () => void;
  errorMessage?: string;
  emptyFallback?: ReactNode;
  size?: "sm" | "md" | "lg";
  children: ReactNode;
}) {
  const padding = { sm: "py-6", md: "py-12", lg: "py-16" }[size];
  const spinnerSize = { sm: "h-5 w-5", md: "h-8 w-8", lg: "h-8 w-8" }[size];

  if (status === "loading") {
    return (
      <div className={`flex items-center justify-center ${padding}`}>
        <div className={`animate-spin rounded-full ${spinnerSize} border-b-2 border-blue-600`} />
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className={`flex flex-col items-center justify-center ${padding} gap-3 text-center px-4`}>
        <AlertTriangle size={26} className="text-red-500" />
        <p className="text-[13px] text-slate-600">{errorMessage}</p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="inline-flex items-center gap-1.5 text-[12px] font-medium text-blue-600 hover:text-blue-700"
          >
            <RefreshCw size={12} />
            Tentar novamente
          </button>
        )}
      </div>
    );
  }

  if (isEmpty && emptyFallback) {
    return <>{emptyFallback}</>;
  }

  return <>{children}</>;
}