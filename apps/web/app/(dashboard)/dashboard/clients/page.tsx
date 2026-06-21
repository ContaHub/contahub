"use client";

import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, Users, Search, Loader, KeyRound, ShieldAlert, Mail, Phone, AlertTriangle, CheckCircle2, Hash } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  Card, Badge, Button, IconButton,
  FilterBar, SearchInput, SelectFilter,
  EmptyState, PageHeader, ConfirmModal,
} from "@/components/ui";
import { MobileHeader, useMobileMenu } from "@/components/layout/mobile-menu";
import { ClientModal } from "@/components/clients/ClientModal";
import CertificateModal from "@/components/certificates/CertificateModal";
import { getClients, deleteClient } from "@/lib/clients";
import { useAuth } from "@clerk/nextjs";
import { consultarCnpjStatus } from "@/lib/cnpj";
import { getClientDisplayName } from "@contahub/shared";
import { ClientModalFree } from "@/components/clients/ClientModalFree";

// ── helpers ──────────────────────────────────────────────────────────────────

function clientInitials(name: string) {
  return name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();
}

const avatarColors = [
  "bg-blue-50 text-blue-700",
  "bg-green-50 text-green-700",
  "bg-amber-50 text-amber-700",
  "bg-purple-50 text-purple-700",
  "bg-rose-50 text-rose-700",
];

function avatarColor(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return avatarColors[Math.abs(h) % avatarColors.length];
}

// FIX-1: Formata enums do Prisma para exibição legível
const TAX_REGIME_LABELS: Record<string, string> = {
  SIMPLES_NACIONAL:      "Simples Nacional",
  LUCRO_PRESUMIDO:       "Lucro Presumido",
  LUCRO_REAL:            "Lucro Real",
  MEI:                   "MEI",
  ISENTO:                "Isento",
};

function formatTaxRegime(regime: string | null | undefined): string {
  if (!regime) return "—";
  return TAX_REGIME_LABELS[regime] ?? regime;
}

// FIX-2: Pill de regime com cor semântica
function RegimePill({ regime }: { regime: string | null | undefined }) {
  const label = formatTaxRegime(regime);
  const colorClass =
    regime === "SIMPLES_NACIONAL" || regime === "MEI"
      ? "bg-blue-50 text-blue-700 border-blue-100"
      : regime === "LUCRO_PRESUMIDO"
      ? "bg-amber-50 text-amber-700 border-amber-100"
      : regime === "LUCRO_REAL"
      ? "bg-purple-50 text-purple-700 border-purple-100"
      : "bg-slate-100 text-slate-600 border-slate-200";

  return (
    <span className={`inline-flex items-center text-[11px] font-medium px-2 py-0.5 rounded-md border ${colorClass}`}>
      {label}
    </span>
  );
}

// FIX-3: Badge de situação CNPJ — discreto, sem caixa alta, sem banner
function CnpjStatusBadge({ status }: { status: string }) {
  if (status === "ATIVA") {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-medium text-green-600 bg-green-50 px-2 py-0.5 rounded-full w-fit">
        <CheckCircle2 size={10} />
        Ativa
      </span>
    );
  }
  const colorClass =
    status === "INAPTA"         ? "bg-red-50 text-red-600" :
    status === "BAIXADA"        ? "bg-slate-100 text-slate-500" :
    status === "SUSPENSA"       ? "bg-orange-50 text-orange-600" :
    status === "NÃO ENCONTRADO" ? "bg-yellow-50 text-yellow-700" :
                                  "bg-red-50 text-red-600";
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full w-fit ${colorClass}`}>
      <AlertTriangle size={10} />
      {status === "NÃO ENCONTRADO" ? "CNPJ inválido" : status.charAt(0) + status.slice(1).toLowerCase()}
    </span>
  );
}

// ── page ─────────────────────────────────────────────────────────────────────

export default function ClientsPage() {
  const openMenu = useMobileMenu();
  const router = useRouter();
  const { getToken } = useAuth();

  const [clients, setClients] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [showFreeModal, setShowFreeModal] = useState(false);
  const [editClient, setEditClient] = useState<any>(null);
  const [checkingId, setCheckingId] = useState<string | null>(null);
  const [certClient, setCertClient] = useState<any>(null);
  const [clientToDelete, setClientToDelete] = useState<any | null>(null);

  const load = async () => {
    const r = await getClients();
    setClients(r.data || []);
  };

  useEffect(() => { load(); }, []);

  const filtered = clients.filter((c) => {
    const q = search.toLowerCase();
    const matchSearch =
      !q || c.tradeName?.toLowerCase().includes(q) || c.cnpj?.includes(q);
    const matchStatus =
      statusFilter === "all" || c.status?.toLowerCase() === statusFilter;
    return matchSearch && matchStatus;
  });

  async function confirmDeleteClient() {
    if (!clientToDelete) return;
    try {
      await deleteClient(clientToDelete.id);
      setClientToDelete(null);
      load();
    } catch (err) {
      console.error("Erro ao remover cliente:", err);
    }
  }

  async function handleVerificarCnpj(client: any) {
    if (!client.cnpj) return;
    setCheckingId(client.id);
    try {
      const token = await getToken();
      const result = await consultarCnpjStatus(client.cnpj, client.id, token!);
      setClients((prev) =>
        prev.map((c) => c.id === client.id ? { ...c, cnpjStatus: result.status } : c)
      );
    } catch (err) {
      console.error("Erro ao verificar CNPJ:", err);
    } finally {
      setCheckingId(null);
    }
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Mobile topbar */}
      <MobileHeader
        onMenuClick={openMenu}
        title="Clientes"
        subtitle={`${clients.length} cadastrados`}
        action={
          <Button variant="primary" size="sm" icon={Plus} onClick={() => { setEditClient(null); setModalOpen(true); }}>
            Novo
          </Button>
        }
      />

      {/* Desktop topbar */}
      <PageHeader
        title="Clientes"
        subtitle={`${clients.length} clientes cadastrados`}
        action={
          <div className="relative flex">
            <button
              onClick={() => { setEditClient(null); setModalOpen(true); }}
              className="flex items-center gap-2 px-4 py-2 rounded-l-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              <Plus size={16} />
              Novo Cliente
            </button>
          </div>
        }
      />

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-5 lg:p-6">
        <FilterBar>
          <SearchInput
            placeholder="Buscar por nome ou CNPJ..."
            value={search}
            onChange={setSearch}
          />
        {/*<SelectFilter>Todos os status</SelectFilter>
          <SelectFilter>Todos os regimes</SelectFilter>
          */}
        </FilterBar>

        <Card>
          {/* Desktop table */}
          <div className="hidden md:block">
            <div className="grid grid-cols-[2fr_1.4fr_1.1fr_0.8fr_1.5fr_120px] gap-3 px-4 py-2.5 bg-slate-50 border-b border-slate-100">
              {["Cliente", "CNPJ", "Regime", "Status", "Contato", ""].map((h) => (
                <span key={h} className="text-[11px] font-bold text-slate-500 uppercase tracking-[0.5px]">
                  {h}
                </span>
              ))}
            </div>

            {filtered.length === 0 && (
              <EmptyState
                icon={Users}
                title="Nenhum cliente encontrado"
                description="Adicione clientes ou ajuste os filtros."
                action={
                  <Button variant="primary" icon={Plus} onClick={() => { setEditClient(null); setModalOpen(true); }}>
                    Novo cliente
                  </Button>
                }
              />
            )}

            {filtered.map((c) => (
              <div
                key={c.id}
                className="group grid grid-cols-[2fr_1.4fr_1.1fr_0.8fr_1.5fr_120px] gap-3 items-center px-4 py-3 border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors"
              >
                {/* Nome + Avatar */}
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-[11px] font-extrabold flex-shrink-0 ${avatarColor(c.name)}`}>
                    {clientInitials(c.name)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-[13px] font-semibold text-slate-900 truncate">{getClientDisplayName(c)}</p>
                    <p className="text-[11px] text-slate-400">{c.cpf && !c.cnpj ? "Pessoa Física" : "Pessoa Jurídica"}</p>
                  </div>
                </div>

                {/* FIX-3: CNPJ + badge de situação discreto */}
                <div className="flex flex-col gap-1">
                  <span className="text-[12px] font-mono text-slate-500 truncate">{c.cnpj || c.cpf || "—"}</span>
                  {c.cnpjStatus && <CnpjStatusBadge status={c.cnpjStatus} />}
                  {c.ecacAlertCount > 0 && (
                    <span
                      onClick={() => router.push(`/dashboard/clients/${c.id}/ecac`)}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium w-fit bg-red-50 text-red-600 cursor-pointer hover:bg-red-100 transition-colors"
                      title="Ver pendências na Receita Federal"
                    >
                      <AlertTriangle size={10} />
                      {c.ecacAlertCount} RF
                    </span>
                  )}
                </div>

                {/* FIX-1 + FIX-2: Regime formatado com pill colorida */}
                <span>
                  <RegimePill regime={c.taxRegime} />
                </span>

                {/* Status */}
                <span>
                  <Badge variant={c.status === "ACTIVE" ? "success" : "gray"}>
                    {c.status === "ACTIVE" ? "Ativo" : "Inativo"}
                  </Badge>
                </span>

                {/* FIX-4: Contato com ícones de e-mail e telefone */}
                <div className="min-w-0 flex flex-col gap-0.5">
                  {c.email ? (
                    <p className="text-[12px] text-slate-500 truncate flex items-center gap-1">
                      <Mail size={11} className="flex-shrink-0 text-slate-400" />
                      {c.email}
                    </p>
                  ) : (
                    <p className="text-[12px] text-slate-400">—</p>
                  )}
                  {(c.phone || c.whatsapp) && (
                    <p className="text-[11px] text-slate-400 flex items-center gap-1">
                      <Phone size={11} className="flex-shrink-0 text-slate-300" />
                      {c.phone || c.whatsapp}
                    </p>
                  )}
                </div>

                {/* Ações — sem alteração */}
                <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <IconButton
                    icon={checkingId === c.id ? Loader : Search}
                    label="Verificar CNPJ"
                    onClick={() => checkingId !== c.id && handleVerificarCnpj(c)}
                  />
                  <IconButton
                    icon={ShieldAlert}
                    label="Ver e-CAC"
                    onClick={() => router.push(`/dashboard/clients/${c.id}/ecac`)}
                  />
                  <IconButton
                    icon={KeyRound}
                    label="Certificado digital A1"
                    onClick={() => setCertClient(c)}
                  />
                  <IconButton icon={Pencil} label="Editar" onClick={() => { setEditClient(c); setModalOpen(true); }} />
                  <IconButton icon={Trash2} variant="danger" label="Remover" onClick={() => setClientToDelete(c)} />
                </div>
              </div>
            ))}
          </div>

          {/* Mobile card list — sem alteração */}
          <div className="md:hidden">
            {filtered.length === 0 && (
              <EmptyState icon={Users} title="Nenhum cliente" description="Adicione clientes para começar." />
            )}
            {filtered.map((c) => (
              <div key={c.id} className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-100 last:border-0">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-[12px] font-extrabold flex-shrink-0 ${avatarColor(c.name)}`}>
                  {clientInitials(c.name)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold text-slate-900 truncate">{getClientDisplayName(c)}</p>
                  <p className="text-[12px] text-slate-500 truncate">{c.cnpj || c.cpf} · {formatTaxRegime(c.taxRegime)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={c.status === "ACTIVE" ? "success" : "gray"}>
                    {c.status === "ACTIVE" ? "Ativo" : "Inativo"}
                  </Badge>
                  <IconButton icon={KeyRound} label="Certificado" size={13} onClick={() => setCertClient(c)} />
                  <IconButton icon={Pencil} label="Editar" size={13} onClick={() => { setEditClient(c); setModalOpen(true); }} />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Modais — sem alteração */}
      {modalOpen && (
        <ClientModal
          client={editClient}
          onClose={() => setModalOpen(false)}
          onSuccess={() => { setModalOpen(false); load(); }}
        />
      )}

      {showFreeModal && (
        <ClientModalFree
          onClose={() => setShowFreeModal(false)}
          onSuccess={() => {
            setShowFreeModal(false);
            load(); // substitua pelo nome da função que recarrega a lista na sua página
          }}
        />
      )}

      {certClient && (
        <CertificateModal
          clientId={certClient.id}
          clientName={certClient.name}
          onClose={() => setCertClient(null)}
        />
      )}

      {clientToDelete && (
        <ConfirmModal
          title="Inativar Cliente"
          message={`Deseja inativar o cliente "${clientToDelete.name}"? Esta ação não pode ser desfeita.`}
          confirmLabel="Inativar"
          onConfirm={confirmDeleteClient}
          onCancel={() => setClientToDelete(null)}
        />
      )}
    </div>
  );
}