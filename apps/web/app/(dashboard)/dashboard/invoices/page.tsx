"use client";

import { useEffect, useState } from "react";
import { Receipt, CheckCircle, Clock, AlertTriangle, XCircle, CreditCard, QrCode } from "lucide-react";
import { PageHeader, Card, Badge, EmptyState } from "@/components/ui";
import { MobileHeader, useMobileMenu } from "@/components/layout/mobile-menu";

// ── types ─────────────────────────────────────────────────────────────────────

interface Invoice {
  id: string;
  asaasPaymentId: string | null;
  amount: number;       // centavos
  status: string;
  dueDate: string;
  paidAt: string | null;
  paymentMethod: string | null;
  createdAt: string;
}

// ── helpers ───────────────────────────────────────────────────────────────────

function formatCurrency(centavos: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
    .format(centavos / 100);
}

function formatDate(date: string | null) {
  if (!date) return '—';
  return new Date(date).toLocaleDateString('pt-BR');
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; variant: any; icon: React.ElementType }> = {
    PAID:     { label: 'Pago',     variant: 'success', icon: CheckCircle },
    PENDING:  { label: 'Pendente', variant: 'warning', icon: Clock },
    OVERDUE:  { label: 'Vencido',  variant: 'danger',  icon: AlertTriangle },
    CANCELED: { label: 'Cancelado',variant: 'gray',    icon: XCircle },
  };
  const cfg = map[status] ?? { label: status, variant: 'gray', icon: Clock };
  const Icon = cfg.icon;
  return (
    <Badge variant={cfg.variant}>
      <span className="flex items-center gap-1">
        <Icon size={11} />
        {cfg.label}
      </span>
    </Badge>
  );
}

function PaymentMethodIcon({ method }: { method: string | null }) {
  if (!method) return <span className="text-slate-400">—</span>;
  if (method === 'PIX') return (
    <span className="inline-flex items-center gap-1 text-[11px] text-teal-600 font-medium">
      <QrCode size={12} /> PIX
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1 text-[11px] text-blue-600 font-medium">
      <CreditCard size={12} /> Cartão
    </span>
  );
}

// ── page ──────────────────────────────────────────────────────────────────────

export default function InvoicesPage() {
  const openMenu = useMobileMenu();

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    fetch('/api/asaas/invoices')
      .then((r) => r.json())
      .then((json) => setInvoices(json.data ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <MobileHeader onMenuClick={openMenu} title="Faturas" subtitle="Histórico de pagamentos" />

      <PageHeader
        title="Faturas"
        subtitle="Histórico de pagamentos da sua assinatura"
      />

      <div className="flex-1 overflow-y-auto p-4 sm:p-5 lg:p-6 bg-slate-50">

        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          </div>
        ) : (
          <Card>
            {/* Header da tabela */}
            <div className="hidden md:grid grid-cols-[1fr_140px_120px_120px_120px] gap-3 px-4 py-2.5 bg-slate-50 border-b border-slate-100">
              {['Fatura', 'Vencimento', 'Pagamento', 'Método', 'Status'].map((h) => (
                <span key={h} className="text-[11px] font-bold text-slate-500 uppercase tracking-[0.5px]">
                  {h}
                </span>
              ))}
            </div>

            {invoices.length === 0 && (
              <EmptyState
                icon={Receipt}
                title="Nenhuma fatura encontrada"
                description="Suas faturas aparecerão aqui após a primeira cobrança."
              />
            )}

            {invoices.map((inv) => (
              <div
                key={inv.id}
                className="grid grid-cols-1 md:grid-cols-[1fr_140px_120px_120px_120px] gap-2 md:gap-3 items-center px-4 py-3.5 border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors"
              >
                {/* Fatura */}
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                    <Receipt size={15} className="text-blue-600" />
                  </div>
                  <div>
                    <p className="text-[13px] font-semibold text-slate-900">
                      {formatCurrency(inv.amount)}
                    </p>
                    <p className="text-[11px] text-slate-400 font-mono">
                      {inv.asaasPaymentId ?? inv.id.slice(0, 8)}
                    </p>
                  </div>
                </div>

                {/* Vencimento */}
                <span className="text-[12px] text-slate-600">{formatDate(inv.dueDate)}</span>

                {/* Data pagamento */}
                <span className="text-[12px] text-slate-600">{formatDate(inv.paidAt)}</span>

                {/* Método */}
                <PaymentMethodIcon method={inv.paymentMethod} />

                {/* Status */}
                <StatusBadge status={inv.status} />
              </div>
            ))}
          </Card>
        )}

        {/* Card informativo */}
        {!loading && (
          <div className="mt-4 bg-white border border-slate-200 rounded-2xl p-4">
            <p className="text-[12px] text-slate-500">
              Faturas geradas automaticamente pelo Asaas. Em caso de dúvidas sobre cobranças, entre em contato pelo suporte.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
