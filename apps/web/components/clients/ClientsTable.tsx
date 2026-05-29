"use client";

import { useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { Client, TAX_REGIME_LABELS, formatCnpj } from "@/lib/clients";
import { consultarCnpjStatus, getCnpjAlertConfig } from "@/lib/cnpj";

interface ClientsTableProps {
  clients: Client[];
  onEdit: (client: Client) => void;
}

const STATUS_CONFIG = {
  ACTIVE:    { label: "Ativo",    class: "bg-green-100 text-green-700" },
  INACTIVE:  { label: "Inativo",  class: "bg-gray-100 text-gray-600"  },
  SUSPENDED: { label: "Suspenso", class: "bg-red-100 text-red-700"    },
};

function getInitials(name: string): string {
  return name.split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase();
}

function getAvatarColor(name: string): string {
  const colors = [
    "bg-blue-500", "bg-purple-500", "bg-green-500",
    "bg-orange-500", "bg-pink-500", "bg-teal-500",
  ];
  return colors[name.charCodeAt(0) % colors.length];
}

export function ClientsTable({ clients, onEdit }: ClientsTableProps) {
  const { getToken } = useAuth();

  // Estado local: cnpjStatus por clientId — sobrescreve o valor vindo do servidor
  // quando o contador clica em "Verificar" manualmente
  const [cnpjStatuses, setCnpjStatuses] = useState<Record<string, string | null>>(
    () => Object.fromEntries(clients.map((c) => [c.id, c.cnpjStatus ?? null]))
  );
  const [checking, setChecking] = useState<string | null>(null);

  async function handleVerificarCnpj(client: Client) {
    setChecking(client.id);
    try {
      const token = await getToken();
      const result = await consultarCnpjStatus(client.cnpj, client.id, token!);
      setCnpjStatuses((prev) => ({ ...prev, [client.id]: result.status }));
    } catch (err) {
      console.error('Erro ao verificar CNPJ:', err);
    } finally {
      setChecking(null);
    }
  }

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
            const status     = STATUS_CONFIG[client.status] || STATUS_CONFIG.ACTIVE;
            const cnpjStatus = cnpjStatuses[client.id];
            const alertCfg   = getCnpjAlertConfig(cnpjStatus);
            const isChecking = checking === client.id;

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

                {/* CNPJ + badge de situação cadastral */}
                <td className="py-4">
                  <div className="flex flex-col gap-1">
                    <span className="text-sm text-gray-600 font-mono">{formatCnpj(client.cnpj)}</span>
                    {alertCfg && (
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium w-fit ${alertCfg.class}`}>
                        {alertCfg.icon} {alertCfg.label}
                      </span>
                    )}
                    {cnpjStatus === 'ATIVA' && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium w-fit bg-green-50 text-green-600">
                        ✓ Ativa
                      </span>
                    )}
                  </div>
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
                    {client.email    && <p className="truncate max-w-[180px]">{client.email}</p>}
                    {client.whatsapp && <p className="text-xs text-gray-400">{client.whatsapp}</p>}
                  </div>
                </td>

                {/* Ações */}
                <td className="py-4 pr-4">
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleVerificarCnpj(client)}
                      disabled={isChecking}
                      className="text-xs font-medium text-gray-500 hover:text-gray-700 px-3 py-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-50"
                      title="Verificar situação do CNPJ na Receita Federal"
                    >
                      {isChecking ? '⏳' : '🔍'} Verificar
                    </button>
                    <button
                      onClick={() => onEdit(client)}
                      className="text-xs font-medium text-blue-600 hover:text-blue-700 px-3 py-1.5 rounded-lg hover:bg-blue-50"
                    >
                      Editar
                    </button>
                  </div>
                </td>

              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}