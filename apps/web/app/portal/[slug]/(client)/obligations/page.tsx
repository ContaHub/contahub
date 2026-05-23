"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { useUser, useAuth } from "@clerk/nextjs";
import { getPortalObligations, PortalObligation, OBLIGATION_LABELS, STATUS_CONFIG, MONTHS } from "@/lib/portal";

export default function ClientObligationsPage() {
  const params = useParams();
  const slug = params.slug as string;
  const { user } = useUser();
  const { getToken } = useAuth();
  const [obligations, setObligations] = useState<PortalObligation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const email = user?.primaryEmailAddress?.emailAddress;
      if (!email) return;

      try {
        const token = await getToken();
        if (!token) return;

        const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3002";
        const res = await fetch(
          `${API_URL}/api/v1/portal/${slug}/client-by-email?email=${encodeURIComponent(email)}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (!res.ok) return;
        const { data } = await res.json();

        const obs = await getPortalObligations(slug, data.id, token);
        setObligations(obs.data);
      } finally {
        setLoading(false);
      }
    }
    if (user) load();
  }, [user, slug]);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Obrigações Fiscais</h1>
        <p className="mt-1 text-sm text-gray-500">
          Histórico de obrigações fiscais da sua empresa
        </p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : obligations.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-3xl mb-3">📋</p>
            <p className="text-gray-500">Nenhuma obrigação encontrada</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider py-3 pl-6">Obrigação</th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider py-3">Competência</th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider py-3">Vencimento</th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {obligations.map((ob) => {
                  const status = STATUS_CONFIG[ob.status];
                  return (
                    <tr key={ob.id} className="hover:bg-gray-50">
                      <td className="py-4 pl-6">
                        <p className="text-sm font-medium text-gray-900">{OBLIGATION_LABELS[ob.type] || ob.type}</p>
                      </td>
                      <td className="py-4">
                        <span className="text-sm text-gray-600">{MONTHS[ob.competenceMonth - 1]}/{ob.competenceYear}</span>
                      </td>
                      <td className="py-4">
                        <span className="text-sm text-gray-600">{new Date(ob.dueDate).toLocaleDateString("pt-BR")}</span>
                      </td>
                      <td className="py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${status?.class}`}>
                          {status?.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
