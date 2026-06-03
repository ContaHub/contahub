"use client";

import { useEffect, useRef, useState } from "react";
import { Upload, Download, Trash2, FileText, Image, FileSpreadsheet, File, FileCode, Eye } from "lucide-react";
import {
  Card, Badge, Button, IconButton,
  FilterBar, SearchInput, SelectFilter,
  EmptyState, PageHeader, Modal, ConfirmModal,
} from "@/components/ui";
import { MobileHeader, useMobileMenu } from "@/components/layout/mobile-menu";
import { UploadModal } from "@/components/documents/UploadModal";
import { getDocuments, getDownloadUrl, deleteDocument } from "@/lib/documents";
import { uploadNfeXml, formatValorNfe, NfeDocument } from "@/lib/nfe";
import { useAuth } from "@clerk/nextjs";

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
  if (ext === "xml")
    return (
      <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
        <FileCode size={15} className="text-blue-600" />
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

// ── Modal de importação de NF-e XML ────────────────────────────────────────
function NfeImportModal({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: (msg: string) => void;
}) {
  const { getToken } = useAuth();
  const inputRef    = useRef<HTMLInputElement>(null);
  const [file, setFile]       = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  async function handleImport() {
    if (!file) return;
    setLoading(true);
    setError(null);
    try {
      const token  = await getToken();
      const result = await uploadNfeXml(file, token!);
      onSuccess(result.message);
    } catch (err: any) {
        const msg = err.message ?? '';
        if (msg === 'Failed to fetch') {
          setError('Não foi possível conectar ao servidor. Verifique se a API está rodando.');
        } else if (msg.includes('infNFe') || msg.includes('não é uma NF-e') || msg.includes('inválido')) {
          setError('Este arquivo não é uma NF-e válida. Envie apenas XMLs de Nota Fiscal Eletrônica (modelo 55 ou 65).');
        } else if (msg.includes('já foi importada')) {
          setError('Esta NF-e já foi importada anteriormente.');
        } else {
          setError(msg || 'Erro ao importar NF-e. Tente novamente.');
        }
      } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md"
        role="dialog"
        aria-modal="true"
        aria-labelledby="nfe-modal-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h2 id="nfe-modal-title" className="text-[15px] font-bold text-slate-900">
              Importar NF-e XML
            </h2>
            <p className="text-[12px] text-slate-500 mt-0.5">
              Selecione o arquivo XML da Nota Fiscal Eletrônica
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Fechar janela"
            className="text-slate-400 hover:text-slate-600 transition-colors"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          {/* Drop area */}
          <div
            onClick={() => inputRef.current?.click()}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); inputRef.current?.click(); }}}
            tabIndex={0}
            role="button"
            aria-label="Área de upload de XML. Pressione Enter para selecionar um arquivo."
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
              file
                ? 'border-blue-300 bg-blue-50'
                : 'border-slate-200 hover:border-blue-300 hover:bg-slate-50'
            }`}
          >
            <input
              ref={inputRef}
              type="file"
              accept=".xml"
              className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
            <FileCode size={32} className={`mx-auto mb-2 ${file ? 'text-blue-500' : 'text-slate-400'}`} aria-hidden="true" />
            {file ? (
              <div>
                <p className="text-[13px] font-semibold text-blue-700">{file.name}</p>
                <p className="text-[11px] text-blue-500 mt-0.5">{formatBytes(file.size)}</p>
              </div>
            ) : (
              <div>
                <p className="text-[13px] font-medium text-slate-600">Clique para selecionar o XML</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Apenas arquivos .xml</p>
              </div>
            )}
          </div>

          {/* Erro */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3">
              <p className="text-[12px] text-red-700">{error}</p>
            </div>
          )}

          {/* Info */}
          <div className="bg-slate-50 rounded-lg px-4 py-3 space-y-1">
            <p className="text-[11px] text-slate-500 font-medium">O sistema irá extrair automaticamente:</p>
            <ul className="text-[11px] text-slate-400 space-y-0.5 list-disc list-inside">
              <li>CNPJ emitente e destinatário</li>
              <li>Valor total, ICMS e ISS</li>
              <li>Data de emissão e chave de acesso</li>
              <li>Vinculação automática ao cliente pelo CNPJ</li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-6 py-4 border-t border-slate-100">
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button
            variant="primary"
            icon={Upload}
            onClick={handleImport}
            disabled={!file || loading}
          >
            {loading ? 'Importando...' : 'Importar NF-e'}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── NF-es importadas ───────────────────────────────────────────────────────
function NfeRow({ nfe, onView, onDelete }: {
  nfe: NfeDocument;
  onView: (nfe: NfeDocument) => void;
  onDelete: (nfe: NfeDocument) => void;
}) {
  return (
    <div className="group grid grid-cols-[2fr_1.4fr_0.8fr_0.9fr_0.9fr_72px] gap-3 items-center px-4 py-3 border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors">
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
          <FileCode size={15} className="text-blue-600" />
        </div>
        <div className="min-w-0">
          <p className="text-[13px] font-semibold text-slate-900 truncate">
            NF-e nº {nfe.numero} — Série {nfe.serie}
          </p>
          <p className="text-[11px] text-slate-400 truncate">{nfe.naturezaOperacao}</p>
        </div>
      </div>
      <span className="text-[13px] text-slate-500 truncate">
        {nfe.client?.name ?? nfe.nomeDestinatario}
      </span>
      <span className="text-[13px] text-slate-500">{formatValorNfe(nfe.valorTotal)}</span>
      <span>
        {nfe.client
          ? <Badge variant="success">Vinculado</Badge>
          : <Badge variant="warning">Sem cliente</Badge>
        }
      </span>
      <span className="text-[13px] text-slate-500">{fmtDate(nfe.dataEmissao)}</span>
      <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <IconButton
          icon={Eye}
          label="Ver detalhes"
          onClick={() => onView(nfe)}
        />
        <IconButton
          icon={Trash2}
          variant="danger"
          label="Remover"
          onClick={() => onDelete(nfe)}
        />
      </div>
    </div>
  );
}

// ── Página principal ───────────────────────────────────────────────────────
export default function DocumentsPage() {
  const openMenu        = useMobileMenu();
  const { getToken }    = useAuth();
  const [docs, setDocs] = useState<any[]>([]);
  const [nfes, setNfes] = useState<NfeDocument[]>([]);
  const [search, setSearch]         = useState("");
  const [modalOpen, setModalOpen]   = useState(false);
  const [nfeModalOpen, setNfeModal] = useState(false);
  const [activeTab, setActiveTab]   = useState<'docs' | 'nfe'>('docs');
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [nfeDetail, setNfeDetail]     = useState<NfeDocument | null>(null);
  const [nfeToDelete, setNfeToDelete] = useState<NfeDocument | null>(null);
  const [docToDelete, setDocToDelete] = useState<any | null>(null);

  const loadDocs = () =>
    getDocuments().then((r) => setDocs(r.data || [])).catch(() => {});

  const loadNfes = async () => {
    try {
      const token = await getToken();
      const res   = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002'}/api/v1/nfe`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      const json = await res.json();
      setNfes(json.data ?? []);
    } catch {}
  };

  useEffect(() => { loadDocs(); loadNfes(); }, []);

  const filtered = docs.filter((d) =>
    !search || d.name?.toLowerCase().includes(search.toLowerCase())
  );

  async function handleDownload(id: string) {
    const r = await getDownloadUrl(id);
    if (r.data?.url) window.open(r.data.url, "_blank");
  }

  async function confirmDeleteDoc() {
    if (!docToDelete) return;
    try {
      await deleteDocument(docToDelete.id);
      setDocToDelete(null);
      loadDocs();
    } catch (err) {
      console.error("Erro ao remover documento:", err);
    }
  }

async function confirmDeleteNfe() {
  if (!nfeToDelete) return;
  try {
    const token = await getToken();
    await fetch(
      `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002'}/api/v1/nfe/${nfeToDelete.id}`,
      { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } },
    );
    setNfeToDelete(null);
    loadNfes();
  } catch (err) {
    console.error('Erro ao remover NF-e:', err);
  }
}

  function handleNfeSuccess(msg: string) {
    setNfeModal(false);
    setSuccessMsg(msg);
    loadNfes();
    setActiveTab('nfe');
    setTimeout(() => setSuccessMsg(null), 5000);
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
          <div className="flex gap-2">
            <Button variant="secondary" icon={FileCode} onClick={() => setNfeModal(true)}>
              Importar NF-e
            </Button>
            <Button variant="primary" icon={Upload} onClick={() => setModalOpen(true)}>
              Enviar documento
            </Button>
          </div>
        }
      />

      <div className="flex-1 overflow-y-auto p-4 sm:p-5 lg:p-6">

        {/* Mensagem de sucesso */}
        {successMsg && (
          <div className="mb-4 bg-green-50 border border-green-200 rounded-lg px-4 py-3">
            <p className="text-[13px] text-green-700 font-medium">✅ {successMsg}</p>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 mb-4 bg-slate-100 rounded-lg p-1 w-fit">
          <button
            onClick={() => setActiveTab('docs')}
            className={`px-4 py-1.5 rounded-md text-[13px] font-medium transition-colors ${
              activeTab === 'docs'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Documentos {docs.length > 0 && `(${docs.length})`}
          </button>
          <button
            onClick={() => setActiveTab('nfe')}
            className={`px-4 py-1.5 rounded-md text-[13px] font-medium transition-colors ${
              activeTab === 'nfe'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            NF-e importadas {nfes.length > 0 && `(${nfes.length})`}
          </button>
        </div>

        {/* Tab: Documentos */}
        {activeTab === 'docs' && (
          <Card>
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
                    <IconButton icon={Download} label="Baixar" onClick={() => handleDownload(d.id)} />
                    <IconButton icon={Trash2} variant="danger" label="Remover" onClick={() => setDocToDelete(d)} />
                  </div>
                </div>
              ))}
            </div>

            {/* Mobile */}
            <div className="md:hidden">
              {filtered.length === 0 && <EmptyState icon={FileText} title="Nenhum documento" />}
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
                    <IconButton icon={Download} label="Baixar" size={13} onClick={() => handleDownload(d.id)} />
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Tab: NF-e */}
        {activeTab === 'nfe' && (
          <Card>
            <div className="hidden md:block">
              <div className="grid grid-cols-[2fr_1.4fr_0.8fr_0.9fr_0.9fr_72px] gap-3 px-4 py-2.5 bg-slate-50 border-b border-slate-100">
                {["Nota Fiscal","Cliente / Destinatário","Valor","Status","Emissão",""].map((h) => (
                  <span key={h} className="text-[11px] font-bold text-slate-500 uppercase tracking-[0.5px]">{h}</span>
                ))}
              </div>

              {nfes.length === 0 && (
                <EmptyState
                  icon={FileCode}
                  title="Nenhuma NF-e importada"
                  description='Clique em "Importar NF-e" para começar.'
                  action={
                    <Button variant="primary" icon={FileCode} onClick={() => setNfeModal(true)}>
                      Importar NF-e
                    </Button>
                  }
                />
              )}

              {nfes.map((nfe) => (
                <NfeRow
                  key={nfe.id}
                  nfe={nfe}
                  onView={(n) => setNfeDetail(n)}
                  onDelete={(n) => setNfeToDelete(n)}
                />
              ))}
            </div>

            {/* Mobile */}
            <div className="md:hidden">
              {nfes.length === 0 && <EmptyState icon={FileCode} title="Nenhuma NF-e importada" />}
              {nfes.map((nfe) => (
                <div key={nfe.id} className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-100 last:border-0">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
                    <FileCode size={16} className="text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold text-slate-900 truncate">NF-e nº {nfe.numero}</p>
                    <p className="text-[12px] text-slate-500 truncate">
                      {nfe.client?.name ?? nfe.nomeDestinatario} · {formatValorNfe(nfe.valorTotal)}
                    </p>
                  </div>
                  <Badge variant={nfe.client ? "success" : "warning"}>
                    {nfe.client ? "Vinculado" : "Sem cliente"}
                  </Badge>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>

      {modalOpen && (
        <UploadModal onClose={() => setModalOpen(false)} onSuccess={() => { setModalOpen(false); loadDocs(); }} />
      )}

      {nfeModalOpen && (
        <NfeImportModal onClose={() => setNfeModal(false)} onSuccess={handleNfeSuccess} />
      )}

      {nfeDetail && (
        <Modal
          title={`NF-e nº ${nfeDetail.numero} — Série ${nfeDetail.serie}`}
          subtitle={nfeDetail.naturezaOperacao}
          onClose={() => setNfeDetail(null)}
          footer={<Button variant="secondary" onClick={() => setNfeDetail(null)}>Fechar</Button>}
        >
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-50 rounded-lg p-3">
                <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Emitente</p>
                <p className="text-[13px] font-semibold text-slate-900">{nfeDetail.nomeEmitente}</p>
                <p className="text-[11px] text-slate-500 font-mono">{nfeDetail.cnpjEmitente}</p>
              </div>
              <div className="bg-slate-50 rounded-lg p-3">
                <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Destinatário</p>
                <p className="text-[13px] font-semibold text-slate-900">{nfeDetail.nomeDestinatario}</p>
                <p className="text-[11px] text-slate-500 font-mono">{nfeDetail.cnpjDestinatario}</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-slate-50 rounded-lg p-3">
                <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Valor Total</p>
                <p className="text-[14px] font-bold text-slate-900">{formatValorNfe(nfeDetail.valorTotal)}</p>
              </div>
              <div className="bg-slate-50 rounded-lg p-3">
                <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">ISS</p>
                <p className="text-[14px] font-bold text-slate-900">{formatValorNfe(nfeDetail.valorIss ?? 0)}</p>
              </div>
              <div className="bg-slate-50 rounded-lg p-3">
                <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Emissão</p>
                <p className="text-[13px] font-semibold text-slate-900">{fmtDate(nfeDetail.dataEmissao)}</p>
              </div>
            </div>
            <div className="bg-slate-50 rounded-lg p-3">
              <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Chave de Acesso</p>
              <p className="text-[11px] text-slate-600 font-mono break-all">{nfeDetail.chaveAcesso}</p>
            </div>
            <div className="bg-slate-50 rounded-lg p-3">
              <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Cliente vinculado</p>
              {nfeDetail.client
                ? <p className="text-[13px] font-semibold text-green-700">✓ {nfeDetail.client.name}</p>
                : <p className="text-[13px] text-amber-600">⚠️ Nenhum cliente encontrado para os CNPJs da nota</p>
              }
            </div>
          </div>
        </Modal>
      )}

      {nfeToDelete && (
        <ConfirmModal
          title="Remover NF-e"
          message={`Deseja remover a NF-e nº ${nfeToDelete.numero} (${nfeToDelete.nomeEmitente})? Esta ação não pode ser desfeita.`}
          confirmLabel="Remover"
          onConfirm={confirmDeleteNfe}
          onCancel={() => setNfeToDelete(null)}
        />
      )}

      {docToDelete && (
        <ConfirmModal
          title="Remover Documento"
          message={`Deseja remover o documento "${docToDelete.name}"? Esta ação não pode ser desfeita.`}
          confirmLabel="Remover"
          onConfirm={confirmDeleteDoc}
          onCancel={() => setDocToDelete(null)}
        />
      )}
    </div>
  );
}