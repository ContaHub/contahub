"use client";

import { useEffect, useState } from "react";
import { Upload, Download, Trash2, FileText, Image, FileSpreadsheet, File } from "lucide-react";
import {
  Card, Badge, Button, IconButton,
  FilterBar, SearchInput, SelectFilter,
  EmptyState, PageHeader,
} from "@/components/ui";
import { MobileHeader, useMobileMenu } from "@/components/layout/mobile-menu";
import { UploadModal } from "@/components/documents/UploadModal";
import { getDocuments, getDownloadUrl, deleteDocument } from "@/lib/documents";

function formatBytes(bytes: number) {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("pt-BR");
}

function DocTypeIcon({ name }: { name: string }) {
  const ext = name?.split(".").pop()?.toLowerCase() ?? "";
  if (["jpg", "jpeg", "png", "webp"].includes(ext))
    return (
      <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center flex-shrink-0">
        <Image size={15} className="text-green-600" />
      </div>
    );
  if (ext === "pdf")
    return (
      <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center flex-shrink-0">
        <FileText size={15} className="text-red-600" />
      </div>
    );
  if (["xls", "xlsx"].includes(ext))
    return (
      <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center flex-shrink-0">
        <FileSpreadsheet size={15} className="text-green-700" />
      </div>
    );
  return (
    <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
      <File size={15} className="text-slate-500" />
    </div>
  );
}

function statusBadge(s: string) {
  if (s === "UPLOADED" || s === "SENT") return <Badge variant="info">Enviado</Badge>;
  if (s === "UNDER_REVIEW") return <Badge variant="review">Em revisão</Badge>;
  if (s === "APPROVED") return <Badge variant="success">Aprovado</Badge>;
  if (s === "REVISION_REQUESTED") return <Badge variant="warning">Revisão</Badge>;
  return <Badge variant="gray">{s}</Badge>;
}

export default function DocumentsPage() {
  const openMenu = useMobileMenu();
  const [docs, setDocs] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);

  const load = () =>
    getDocuments().then((r) => setDocs(r.data || [])).catch(() => {});

  useEffect(() => { load(); }, []);

  const filtered = docs.filter((d) =>
    !search || d.name?.toLowerCase().includes(search.toLowerCase())
  );

  async function handleDownload(id: string, name: string) {
    const r = await getDownloadUrl(id);
    if (r.data?.url) window.open(r.data.url, "_blank");
  }

  async function handleDelete(id: string) {
    if (!confirm("Remover este documento?")) return;
    await deleteDocument(id);
    load();
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <MobileHeader
        onMenuClick={openMenu}
        title="Documentos"
        subtitle={`${docs.length} documento${docs.length !== 1 ? "s" : ""}`}
        action={
          <Button variant="primary" size="sm" icon={Upload} onClick={() => setModalOpen(true)}>
            Enviar
          </Button>
        }
      />
      <PageHeader
        title="Documentos"
        subtitle={`${docs.length} documento${docs.length !== 1 ? "s" : ""}`}
        action={
          <Button variant="primary" icon={Upload} onClick={() => setModalOpen(true)}>
            Enviar documento
          </Button>
        }
      />

      <div className="flex-1 overflow-y-auto p-4 sm:p-5 lg:p-6">
        <FilterBar>
          <SearchInput placeholder="Buscar por nome..." value={search} onChange={setSearch} />
          <SelectFilter>Todos os clientes</SelectFilter>
          <SelectFilter>Todos os status</SelectFilter>
        </FilterBar>

        <Card>
          {/* Desktop */}
          <div className="hidden md:block">
            <div className="grid grid-cols-[2fr_1.4fr_0.8fr_0.9fr_0.9fr_72px] gap-3 px-4 py-2.5 bg-slate-50 border-b border-slate-100">
              {["Documento","Cliente","Tamanho","Status","Data",""].map((h) => (
                <span key={h} className="text-[11px] font-bold text-slate-500 uppercase tracking-[0.5px]">{h}</span>
              ))}
            </div>

            {filtered.length === 0 && (
              <EmptyState
                icon={FileText}
                title="Nenhum documento enviado"
                description='Clique em "Enviar documento" para começar.'
                action={
                  <Button variant="primary" icon={Upload} onClick={() => setModalOpen(true)}>
                    Enviar documento
                  </Button>
                }
              />
            )}

            {filtered.map((d) => (
              <div
                key={d.id}
                className="group grid grid-cols-[2fr_1.4fr_0.8fr_0.9fr_0.9fr_72px] gap-3 items-center px-4 py-3 border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <DocTypeIcon name={d.name} />
                  <div className="min-w-0">
                    <p className="text-[13px] font-semibold text-slate-900 truncate">{d.name}</p>
                    <p className="text-[11px] text-slate-400 capitalize">
                      {d.name?.split(".").pop()?.toUpperCase() ?? "Arquivo"}
                    </p>
                  </div>
                </div>
                <span className="text-[13px] text-slate-500 truncate">{d.client?.name || d.clientId || "—"}</span>
                <span className="text-[13px] text-slate-500">{formatBytes(d.size)}</span>
                <span>{statusBadge(d.status)}</span>
                <span className="text-[13px] text-slate-500">{fmtDate(d.createdAt)}</span>
                <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <IconButton icon={Download} label="Baixar" onClick={() => handleDownload(d.id, d.name)} />
                  <IconButton icon={Trash2} variant="danger" label="Remover" onClick={() => handleDelete(d.id)} />
                </div>
              </div>
            ))}
          </div>

          {/* Mobile */}
          <div className="md:hidden">
            {filtered.length === 0 && (
              <EmptyState icon={FileText} title="Nenhum documento" />
            )}
            {filtered.map((d) => (
              <div key={d.id} className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-100 last:border-0">
                <DocTypeIcon name={d.name} />
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold text-slate-900 truncate">{d.name}</p>
                  <p className="text-[12px] text-slate-500 truncate">
                    {d.client?.name || "—"} · {formatBytes(d.size)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {statusBadge(d.status)}
                  <IconButton icon={Download} label="Baixar" size={13} onClick={() => handleDownload(d.id, d.name)} />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {modalOpen && (
        <UploadModal onClose={() => setModalOpen(false)} onSuccess={() => { setModalOpen(false); load(); }} />
      )}
    </div>
  );
}
