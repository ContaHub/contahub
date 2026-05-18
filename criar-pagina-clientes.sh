#!/bin/bash
# ContaHub — Cria a página de Clientes completa
# Execute na raiz do projeto: bash criar-pagina-clientes.sh

set -e
BASE="apps/web"

mkdir -p "$BASE/app/(dashboard)/dashboard/clients"
mkdir -p "$BASE/components/clients"
mkdir -p "$BASE/lib"

echo "📁 Pastas criadas..."

# ================================================================
# lib/api.ts — Cliente HTTP centralizado
# ================================================================
cat > "$BASE/lib/api.ts" << 'EOF'
// Cliente HTTP centralizado para o ContaHub
// Todas as chamadas à API passam por aqui — facilita trocar a URL base
// e adicionar headers de autenticação em um só lugar

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3002";

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const res = await fetch(`${API_URL}/api/v1${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: "Erro desconhecido" }));
    throw new Error(error.message || `Erro ${res.status}`);
  }

  return res.json();
}
EOF

# ================================================================
# lib/clients.ts — Funções de acesso à API de clientes
# ================================================================
cat > "$BASE/lib/clients.ts" << 'EOF'
import { apiFetch } from "./api";

export interface Client {
  id: string;
  name: string;
  tradeName?: string;
  cnpj: string;
  taxRegime: string;
  status: "ACTIVE" | "INACTIVE" | "SUSPENDED";
  email?: string;
  phone?: string;
  whatsapp?: string;
  tags: string[];
  createdAt: string;
}

export interface ClientsResponse {
  data: Client[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface CreateClientData {
  name: string;
  cnpj: string;
  taxRegime: string;
  email?: string;
  phone?: string;
  whatsapp?: string;
  notes?: string;
  tags?: string[];
}

// Busca lista de clientes com paginação e busca
export async function getClients(params?: {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
}): Promise<ClientsResponse> {
  const query = new URLSearchParams();
  if (params?.page) query.set("page", String(params.page));
  if (params?.limit) query.set("limit", String(params.limit));
  if (params?.search) query.set("search", params.search);
  if (params?.status) query.set("status", params.status);

  return apiFetch<ClientsResponse>(`/clients?${query.toString()}`);
}

// Cria um novo cliente
export async function createClient(data: CreateClientData): Promise<{ data: Client; message: string }> {
  return apiFetch("/clients", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

// Atualiza um cliente existente
export async function updateClient(
  id: string,
  data: Partial<CreateClientData>
): Promise<{ data: Client; message: string }> {
  return apiFetch(`/clients/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

// Inativa um cliente (soft delete)
export async function deleteClient(id: string): Promise<void> {
  return apiFetch(`/clients/${id}`, { method: "DELETE" });
}

// Labels em PT-BR para regime tributário
export const TAX_REGIME_LABELS: Record<string, string> = {
  SIMPLES_NACIONAL: "Simples Nacional",
  LUCRO_PRESUMIDO: "Lucro Presumido",
  LUCRO_REAL: "Lucro Real",
  MEI: "MEI",
  ISENTO: "Isento",
};

// Formata CNPJ: 12345678000190 → 12.345.678/0001-90
export function formatCnpj(cnpj: string): string {
  const clean = cnpj.replace(/\D/g, "");
  return clean.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5");
}
EOF

# ================================================================
# components/clients/ClientModal.tsx — Modal de cadastro/edição
# ================================================================
cat > "$BASE/components/clients/ClientModal.tsx" << 'EOF'
"use client";

import { useState } from "react";
import { createClient, updateClient, Client, TAX_REGIME_LABELS } from "@/lib/clients";

interface ClientModalProps {
  client?: Client; // Se passar um client, é edição. Se não, é criação.
  onClose: () => void;
  onSuccess: () => void;
}

export function ClientModal({ client, onClose, onSuccess }: ClientModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    name: client?.name || "",
    cnpj: client?.cnpj || "",
    taxRegime: client?.taxRegime || "SIMPLES_NACIONAL",
    email: client?.email || "",
    phone: client?.phone || "",
    whatsapp: client?.whatsapp || "",
  });

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      if (client) {
        await updateClient(client.id, form);
      } else {
        await createClient(form);
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || "Erro ao salvar cliente");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">
            {client ? "Editar Cliente" : "Novo Cliente"}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Razão Social *
              </label>
              <input
                name="name"
                value={form.name}
                onChange={handleChange}
                required
                placeholder="Ex: Padaria São João Ltda"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                CNPJ *
              </label>
              <input
                name="cnpj"
                value={form.cnpj}
                onChange={handleChange}
                required
                placeholder="00.000.000/0000-00"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Regime Tributário *
              </label>
              <select
                name="taxRegime"
                value={form.taxRegime}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {Object.entries(TAX_REGIME_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                E-mail
              </label>
              <input
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
                placeholder="financeiro@empresa.com.br"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Telefone
              </label>
              <input
                name="phone"
                value={form.phone}
                onChange={handleChange}
                placeholder="11999990000"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                WhatsApp
              </label>
              <input
                name="whatsapp"
                value={form.whatsapp}
                onChange={handleChange}
                placeholder="11999990000"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Footer */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
            >
              {loading ? "Salvando..." : client ? "Salvar alterações" : "Cadastrar cliente"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
EOF

# ================================================================
# components/clients/ClientsTable.tsx — Tabela de clientes
# ================================================================
cat > "$BASE/components/clients/ClientsTable.tsx" << 'EOF'
"use client";

import { Client, TAX_REGIME_LABELS, formatCnpj } from "@/lib/clients";

interface ClientsTableProps {
  clients: Client[];
  onEdit: (client: Client) => void;
}

const STATUS_CONFIG = {
  ACTIVE: { label: "Ativo", class: "bg-green-100 text-green-700" },
  INACTIVE: { label: "Inativo", class: "bg-gray-100 text-gray-600" },
  SUSPENDED: { label: "Suspenso", class: "bg-red-100 text-red-700" },
};

// Gera iniciais do nome para o avatar
function getInitials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();
}

// Gera uma cor de fundo baseada no nome (consistente)
function getAvatarColor(name: string): string {
  const colors = [
    "bg-blue-500", "bg-purple-500", "bg-green-500",
    "bg-orange-500", "bg-pink-500", "bg-teal-500",
  ];
  const index = name.charCodeAt(0) % colors.length;
  return colors[index];
}

export function ClientsTable({ clients, onEdit }: ClientsTableProps) {
  if (clients.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="text-4xl mb-3">🏢</div>
        <p className="text-gray-500 font-medium">Nenhum cliente encontrado</p>
        <p className="text-gray-400 text-sm mt-1">Cadastre o primeiro cliente para começar</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-100">
            <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider pb-3 pl-4">Cliente</th>
            <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider pb-3">CNPJ</th>
            <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider pb-3">Regime</th>
            <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider pb-3">Status</th>
            <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider pb-3">Contato</th>
            <th className="pb-3"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {clients.map((client) => {
            const status = STATUS_CONFIG[client.status] || STATUS_CONFIG.ACTIVE;
            return (
              <tr key={client.id} className="hover:bg-gray-50 transition-colors group">
                {/* Nome + Avatar */}
                <td className="py-4 pl-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-full ${getAvatarColor(client.name)} flex items-center justify-center text-white text-xs font-bold flex-shrink-0`}>
                      {getInitials(client.name)}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 text-sm">{client.name}</p>
                      {client.tradeName && (
                        <p className="text-xs text-gray-400">{client.tradeName}</p>
                      )}
                    </div>
                  </div>
                </td>

                {/* CNPJ */}
                <td className="py-4">
                  <span className="text-sm text-gray-600 font-mono">{formatCnpj(client.cnpj)}</span>
                </td>

                {/* Regime */}
                <td className="py-4">
                  <span className="text-sm text-gray-600">
                    {TAX_REGIME_LABELS[client.taxRegime] || client.taxRegime}
                  </span>
                </td>

                {/* Status */}
                <td className="py-4">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${status.class}`}>
                    {status.label}
                  </span>
                </td>

                {/* Contato */}
                <td className="py-4">
                  <div className="text-sm text-gray-500">
                    {client.email && <p className="truncate max-w-[180px]">{client.email}</p>}
                    {client.whatsapp && <p className="text-xs text-gray-400">{client.whatsapp}</p>}
                  </div>
                </td>

                {/* Ações */}
                <td className="py-4 pr-4">
                  <button
                    onClick={() => onEdit(client)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity text-xs font-medium text-blue-600 hover:text-blue-700 px-3 py-1.5 rounded-lg hover:bg-blue-50"
                  >
                    Editar
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
EOF

# ================================================================
# app/(dashboard)/dashboard/clients/page.tsx — Página principal
# ================================================================
cat > "$BASE/app/(dashboard)/dashboard/clients/page.tsx" << 'EOF'
"use client";

import { useState, useEffect, useCallback } from "react";
import { getClients, Client, ClientsResponse } from "@/lib/clients";
import { ClientsTable } from "@/components/clients/ClientsTable";
import { ClientModal } from "@/components/clients/ClientModal";

export default function ClientsPage() {
  const [data, setData] = useState<ClientsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Filtros
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);

  // Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | undefined>();

  // Busca clientes da API
  const fetchClients = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await getClients({ page, search: search || undefined, status: status || undefined });
      setData(result);
    } catch (err: any) {
      setError(err.message || "Erro ao carregar clientes");
    } finally {
      setLoading(false);
    }
  }, [page, search, status]);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  // Debounce na busca — espera 400ms antes de chamar a API
  const [searchInput, setSearchInput] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  function handleEdit(client: Client) {
    setEditingClient(client);
    setModalOpen(true);
  }

  function handleNew() {
    setEditingClient(undefined);
    setModalOpen(true);
  }

  function handleModalClose() {
    setModalOpen(false);
    setEditingClient(undefined);
  }

  return (
    <div>
      {/* Header da página */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Clientes</h1>
          <p className="mt-1 text-sm text-gray-500">
            {data ? `${data.meta.total} cliente${data.meta.total !== 1 ? "s" : ""} cadastrado${data.meta.total !== 1 ? "s" : ""}` : "Carregando..."}
          </p>
        </div>
        <button
          onClick={handleNew}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Novo cliente
        </button>
      </div>

      {/* Filtros */}
      <div className="flex gap-3 mb-6">
        <div className="relative flex-1 max-w-sm">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Buscar por nome ou CNPJ..."
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <select
          value={status}
          onChange={(e) => { setStatus(e.target.value); setPage(1); }}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-600"
        >
          <option value="">Todos os status</option>
          <option value="ACTIVE">Ativos</option>
          <option value="INACTIVE">Inativos</option>
          <option value="SUSPENDED">Suspensos</option>
        </select>
      </div>

      {/* Conteúdo */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {error && (
          <div className="bg-red-50 border-b border-red-100 px-6 py-4">
            <p className="text-sm text-red-700">{error}</p>
            <button onClick={fetchClients} className="text-sm text-red-600 underline mt-1">
              Tentar novamente
            </button>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <ClientsTable
            clients={data?.data || []}
            onEdit={handleEdit}
          />
        )}

        {/* Paginação */}
        {data && data.meta.totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100">
            <p className="text-sm text-gray-500">
              Página {data.meta.page} de {data.meta.totalPages}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50 transition-colors"
              >
                Anterior
              </button>
              <button
                onClick={() => setPage((p) => Math.min(data.meta.totalPages, p + 1))}
                disabled={page === data.meta.totalPages}
                className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50 transition-colors"
              >
                Próxima
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      {modalOpen && (
        <ClientModal
          client={editingClient}
          onClose={handleModalClose}
          onSuccess={fetchClients}
        />
      )}
    </div>
  );
}
EOF

echo ""
echo "✅ Página de Clientes criada com sucesso!"
echo ""
echo "Arquivos gerados:"
echo "  apps/web/lib/api.ts"
echo "  apps/web/lib/clients.ts"
echo "  apps/web/components/clients/ClientModal.tsx"
echo "  apps/web/components/clients/ClientsTable.tsx"
echo "  apps/web/app/(dashboard)/dashboard/clients/page.tsx"
echo ""
echo "Acesse: http://localhost:3010/dashboard/clients"
