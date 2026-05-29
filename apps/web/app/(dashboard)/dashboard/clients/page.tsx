"use client";

import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, Users, Search, Loader } from "lucide-react";
import {
  Card, Badge, Button, IconButton,
  FilterBar, SearchInput, SelectFilter,
  EmptyState, PageHeader,
} from "@/components/ui";
import { MobileHeader, useMobileMenu } from "@/components/layout/mobile-menu";
import { ClientModal } from "@/components/clients/ClientModal";
import { getClients, deleteClient } from "@/lib/clients";
import { useAuth } from "@clerk/nextjs";
import { consultarCnpjStatus } from "@/lib/cnpj";

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

export default function ClientsPage() {
  const openMenu = useMobileMenu();
  const { getToken } = useAuth();

  const [clients, setClients] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [editClient, setEditClient] = useState<any>(null);
  const [checkingId, setCheckingId] = useState<string | null>(null);

  const load = async () => {
    const r = await getClients();
    setClients(r.data || []);
  };

  useEffect(() => { load(); }, []);

  const filtered = clients.filter((c) => {
    const q = search.toLowerCase();
    const matchSearch =
      !q || c.name?.toLowerCase().includes(q) || c.cnpj?.includes(q);
    const matchStatus =
      statusFilter === "all" || c.status?.toLowerCase() === statusFilter;
    return matchSearch && matchStatus;
  });

  async function handleDelete(id: string) {
    if (!confirm("Remover este cliente?")) return;
    await deleteClient(id);
    load();
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
          <Button variant="primary" icon={Plus} onClick={() => { setEditClient(null); setModalOpen(true); }}>
            Novo cliente
          </Button>
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
          <SelectFilter>Todos os status</SelectFilter>
          <SelectFilter>Todos os regimes</SelectFilter>
        </FilterBar>

        <Card>
          {/* Desktop table */}
          <div className="hidden md:block">
            <div className="grid grid-cols-[2fr_1.4fr_1.1fr_0.8fr_1.5fr_96px] gap-3 px-4 py-2.5 bg-slate-50 border-b border-slate-100">
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
                className="group grid grid-cols-[2fr_1.4fr_1.1fr_0.8fr_1.5fr_96px] gap-3 items-center px-4 py-3 border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors"
              >
                {/* Nome + Avatar */}
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-[11px] font-extrabold flex-shrink-0 ${avatarColor(c.name)}`}>
                    {clientInitials(c.name)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-[13px] font-semibold text-slate-900 truncate">{c.name}</p>
                    <p className="text-[11px] text-slate-400">{c.type === "PF" ? "Pessoa Física" : "Pessoa Jurídica"}</p>
                  </div>
                </div>

                {/* CNPJ + badge situação cadastral */}
                <div className="flex flex-col gap-1">
                  <span className="text-[12px] font-mono text-slate-500 truncate">{c.cnpj || c.cpf || "—"}</span>
                  {c.cnpjStatus && c.cnpjStatus !== "ATIVA" && (
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium w-fit ${
                      c.cnpjStatus === "INAPTA"        ? "bg-red-100 text-red-700" :
                      c.cnpjStatus === "BAIXADA"       ? "bg-gray-100 text-gray-700" :
                      c.cnpjStatus === "SUSPENSA"      ? "bg-orange-100 text-orange-700" :
                      c.cnpjStatus === "NÃO ENCONTRADO" ? "bg-yellow-100 text-yellow-700" :
                      "bg-red-100 text-red-700"
                    }`}>
                      ⚠️ {c.cnpjStatus}
                    </span>
                  )}
                  {c.cnpjStatus === "ATIVA" && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium w-fit bg-green-50 text-green-600">
                      ✓ Ativa
                    </span>
                  )}
                </div>

                {/* Regime */}
                <span>
                  <span className="text-[11px] text-slate-600 bg-slate-100 border border-slate-200 rounded-md px-2 py-0.5 font-medium">
                    {c.taxRegime || "—"}
                  </span>
                </span>

                {/* Status */}
                <span>
                  <Badge variant={c.status === "ACTIVE" ? "success" : "gray"}>
                    {c.status === "ACTIVE" ? "Ativo" : "Inativo"}
                  </Badge>
                </span>

                {/* Contato */}
                <div className="min-w-0">
                  <p className="text-[12px] text-slate-500 truncate">{c.email || "—"}</p>
                  <p className="text-[11px] text-slate-400">{c.phone || c.whatsapp || ""}</p>
                </div>

                {/* Ações */}
                <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <IconButton
                    icon={checkingId === c.id ? Loader : Search}
                    label="Verificar CNPJ"
                    onClick={() => checkingId !== c.id && handleVerificarCnpj(c)}
                  />
                  <IconButton icon={Pencil} label="Editar" onClick={() => { setEditClient(c); setModalOpen(true); }} />
                  <IconButton icon={Trash2} variant="danger" label="Remover" onClick={() => handleDelete(c.id)} />
                </div>
              </div>
            ))}
          </div>

          {/* Mobile card list */}
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
                  <p className="text-[13px] font-semibold text-slate-900 truncate">{c.name}</p>
                  <p className="text-[12px] text-slate-500 truncate">{c.cnpj || c.cpf} · {c.taxRegime}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={c.status === "ACTIVE" ? "success" : "gray"}>
                    {c.status === "ACTIVE" ? "Ativo" : "Inativo"}
                  </Badge>
                  <IconButton icon={Pencil} label="Editar" size={13} onClick={() => { setEditClient(c); setModalOpen(true); }} />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {modalOpen && (
        <ClientModal
          client={editClient}
          onClose={() => setModalOpen(false)}
          onSuccess={() => { setModalOpen(false); load(); }}
        />
      )}
    </div>
  );
}