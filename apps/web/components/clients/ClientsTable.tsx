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
