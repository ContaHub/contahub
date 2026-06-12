"use client";

import { useEffect, useRef, useState } from "react";
import {
  Upload, Download, Trash2, FileText, FileImage, FileSpreadsheet,
  File, FileCode, Eye, FileInput, CheckCircle, AlertTriangle,
  MessageSquare, X, Plus,
} from "lucide-react";
import {
  Card, Badge, Button, IconButton,
  EmptyState, PageHeader, Modal, ConfirmModal,
} from "@/components/ui";
import { MobileHeader, useMobileMenu } from "@/components/layout/mobile-menu";
import { UploadModal } from "@/components/documents/UploadModal";
import { getDocuments, getDownloadUrl, deleteDocument, sendForReview } from "@/lib/documents";
import { uploadNfeXml, formatValorNfe, NfeDocument } from "@/lib/nfe";
import { useAuth } from "@clerk/nextjs";
import { getClientDisplayName } from "@contahub/shared";

// ─── helpers ─────────────────────────────────────────────────

function formatBytes(bytes: number) {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("pt-BR");
}

/** FIX-2: usa description como título; name como fallback e subtítulo de extensão */
function docDisplayName(doc: any): string {
  return doc.description || doc.name || "Documento";
}

function docExtLabel(doc: any): string {
  return doc.name?.split(".").pop()?.toUpperCase() ?? "Arquivo";
}

// ─── DocTypeIcon ──────────────────────────────────────────────

function DocTypeIcon({ name }: { name: string }) {
  const ext = name?.split(".").pop()?.toLowerCase() ?? "";
  if (["jpg", "jpeg", "png", "webp"].includes(ext))
    return (
      <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center flex-shrink-0">
        <FileImage size={15} className="text-green-600" />
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

// ─── FIX-4: statusBadge sem emojis ───────────────────────────

function StatusBadge({ status, createdBy }: { status: string; createdBy?: string }) {
  const byClient = createdBy?.startsWith("client:");
  if ((status === "UPLOADED" || status === "SENT") && byClient)
    return <Badge variant="purple">Enviado pelo cliente</Badge>;
  if (status === "UPLOADED" || status === "SENT")
    return <Badge variant="info">Enviado</Badge>;
  if (status === "UNDER_REVIEW")
    return <Badge variant="review">Em revisão</Badge>;
  if (status === "APPROVED")
    return <Badge variant="success">Aprovado</Badge>;
  if (status === "REVISION_REQUESTED")
    return <Badge variant="warning">Revisão solicitada</Badge>;
  return <Badge variant="gray">{status}</Badge>;
}

// ─── FIX-5: Toast sem emoji ───────────────────────────────────

function Toast({ type, message, onClose }: { type: "success" | "warning"; message: string; onClose: () => void }) {
  const isSuccess = type === "success";
  return (
    <div className={`flex items-center justify-between text-[13px] px-4 py-3 rounded-lg mb-4 border ${
      isSuccess
        ? "bg-green-50 border-green-200 text-green-700"
        : "bg-amber-50 border-amber-200 text-amber-700"
    }`}>
      <div className="flex items-center gap-2">
        {isSuccess
          ? <CheckCircle size={15} className="flex-shrink-0" />
          : <AlertTriangle size={15} className="flex-shrink-0" />}
        <span className="font-medium">{message}</span>
      </div>
      <button onClick={onClose} className="ml-4 opacity-60 hover:opacity-100 transition-opacity">
        <X size={14} />
      </button>
    </div>
  );
}

// ─── NfeImportModal ───────────────────────────────────────────

function NfeImportModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: (msg: string) => void }) {
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
      const msg = err.message ?? "";
      if (msg === "Failed to fetch")
        setError("Não foi possível conectar ao servidor. Verifique se a API está rodando.");
      else if (msg.includes("infNFe") || msg.includes("não é uma NF-e") || msg.includes("inválido"))
        setError("Este arquivo não é uma NF-e válida. Envie apenas XMLs de Nota Fiscal Eletrônica (modelo 55 ou 65).");
      else if (msg.includes("já foi importada"))
        setError("Esta NF-e já foi importada anteriormente.");
      else
        setError(msg || "Erro ao importar NF-e. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md" role="dialog" aria-modal="true" aria-labelledby="nfe-modal-title">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h2 id="nfe-modal-title" className="text-[15px] font-bold text-slate-900">Importar NF-e XML</h2>
            <p className="text-[12px] text-slate-500 mt-0.5">Selecione o arquivo XML da Nota Fiscal Eletrônica</p>
          </div>
          <button onClick={onClose} aria-label="Fechar janela" className="text-slate-400 hover:text-slate-600 transition-colors">
            <X size={20} />
          </button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div
            onClick={() => inputRef.current?.click()}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); inputRef.current?.click(); } }}
            tabIndex={0}
            role="button"
            aria-label="Área de upload de XML. Pressione Enter para selecionar um arquivo."
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
              file ? "border-blue-300 bg-blue-50" : "border-slate-200 hover:border-blue-300 hover:bg-slate-50"
            }`}
          >
            <input ref={inputRef} type="file" accept=".xml" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            <FileCode size={32} className={`mx-auto mb-2 ${file ? "text-blue-500" : "text-slate-400"}`} aria-hidden="true" />
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
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3">
              <p className="text-[12px] text-red-700">{error}</p>
            </div>
          )}
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
        <div className="flex justify-end gap-2 px-6 py-4 border-t border-slate-100">
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button variant="primary" icon={Upload} onClick={handleImport} disabled={!file || loading}>
            {loading ? "Importando..." : "Importar NF-e"}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── NfeRow ───────────────────────────────────────────────────

function NfeRow({ nfe, onView, onDelete }: { nfe: NfeDocument; onView: (n: NfeDocument) => void; onDelete: (n: NfeDocument) => void }) {
  return (
    <div className="group grid grid-cols-[2fr_1.4fr_0.9fr_0.9fr_0.8fr_72px] gap-3 items-center px-4 py-3 border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors">
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
          <FileCode size={15} className="text-blue-600" />
        </div>
        <div className="min-w-0">
          <p className="text-[13px] font-semibold text-slate-900 truncate">NF-e nº {nfe.numero} — Série {nfe.serie}</p>
          <p className="text-[11px] text-slate-400 truncate">{nfe.naturezaOperacao}</p>
        </div>
      </div>
      <span className="text-[13px] text-slate-500 truncate">{nfe.client?.name ?? nfe.nomeDestinatario}</span>
      <span className="text-[13px] text-slate-500">{formatValorNfe(nfe.valorTotal)}</span>
      <span>{nfe.client ? <Badge variant="success">Vinculado</Badge> : <Badge variant="warning">Sem cliente</Badge>}</span>
      <span className="text-[13px] text-slate-500">{fmtDate(nfe.dataEmissao)}</span>
      <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <IconButton icon={Eye} label="Ver detalhes" onClick={() => onView(nfe)} />
        <IconButton icon={Trash2} variant="danger" label="Remover" onClick={() => onDelete(nfe)} />
      </div>
    </div>
  );
}

// ─── Preview components ───────────────────────────────────────

function ImagePreview({ doc }: { doc: any }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => { getDownloadUrl(doc.id).then((r) => { if (r.data?.url) setUrl(r.data.url); }); }, [doc.id]);
  if (!url) return <div className="flex flex-col items-center gap-2 text-slate-400"><div className="w-8 h-8 border-2 border-slate-300 border-t-blue-500 rounded-full animate-spin" /><p className="text-[12px]">Carregando preview...</p></div>;
  return <img src={url} alt={doc.name} className="max-w-full max-h-[55vh] object-contain rounded-lg shadow-sm" />;
}

function PdfPreview({ doc }: { doc: any }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => { getDownloadUrl(doc.id).then((r) => { if (r.data?.url) setUrl(r.data.url); }); }, [doc.id]);
  if (!url) return <div className="flex flex-col items-center gap-2 text-slate-400 py-8"><div className="w-8 h-8 border-2 border-slate-300 border-t-blue-500 rounded-full animate-spin" /><p className="text-[12px]">Carregando PDF...</p></div>;
  return <iframe src={url} className="w-full rounded-lg" style={{ height: "55vh", border: "none" }} title={doc.name} />;
}

function formatXml(xml: string): string {
  let formatted = ""; let indent = 0; const tab = "  ";
  xml.replace(/>\s*</g, ">\n<").split("\n").forEach((node) => {
    const trimmed = node.trim(); if (!trimmed) return;
    if (trimmed.startsWith("</")) indent--;
    formatted += tab.repeat(Math.max(0, indent)) + trimmed + "\n";
    if (!trimmed.startsWith("</") && !trimmed.endsWith("/>") && trimmed.includes("<") && !trimmed.includes("</")) indent++;
  });
  return formatted.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function XmlPreview({ doc }: { doc: any }) {
  const [content, setContent] = useState<string | null>(null);
  const [error, setError]     = useState(false);
  useEffect(() => {
    getDownloadUrl(doc.id).then(async (r) => {
      if (!r.data?.url) { setError(true); return; }
      try { const res = await fetch(r.data.url); const text = await res.text(); setContent(formatXml(text)); }
      catch { setError(true); }
    });
  }, [doc.id]);
  if (error) return <div className="text-center text-slate-400 py-8"><FileCode size={32} className="mx-auto mb-2 text-slate-300" /><p className="text-[13px]">Não foi possível carregar o arquivo.</p></div>;
  if (!content) return <div className="flex flex-col items-center gap-2 text-slate-400 py-8"><div className="w-8 h-8 border-2 border-slate-300 border-t-blue-500 rounded-full animate-spin" /><p className="text-[12px]">Carregando XML...</p></div>;
  return (
    <pre className="text-[11px] text-left font-mono text-slate-700 whitespace-pre overflow-auto w-full max-h-[55vh] leading-relaxed">
      {content.split("\n").map((line, i) => {
        const trimmed = line.trimStart(); const indentLen = line.length - trimmed.length;
        const colored = trimmed
          .replace(/(&lt;\/?)([\w:-]+)/g, (_, sl, tag) => `<span style="color:#2563eb">${sl}${tag}</span>`)
          .replace(/\s([\w:-]+=)(".*?")/g, (_, attr, val) => ` <span style="color:#7c3aed">${attr}</span><span style="color:#059669">${val}</span>`)
          .replace(/(&gt;)([^<]+)(&lt;)/g, (_, o, text, c) => `${o}<span style="color:#374151">${text}</span>${c}`);
        return <div key={i} dangerouslySetInnerHTML={{ __html: `<span style="color:#94a3b8;user-select:none;margin-right:12px">${String(i + 1).padStart(3, " ")}</span>${" ".repeat(indentLen)}${colored}` }} />;
      })}
    </pre>
  );
}

// ─── RevisionNote — nota de revisão sem emoji ─────────────────

function RevisionNote({ notes, reviewedAt }: { notes: string; reviewedAt?: string }) {
  return (
    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
      <div className="flex items-center gap-1.5 mb-2">
        <MessageSquare size={12} className="text-amber-500 flex-shrink-0" />
        <p className="text-[11px] font-bold text-amber-500 uppercase tracking-wide">
          Nota de revisão do cliente
        </p>
        {reviewedAt && (
          <span className="text-[10px] text-amber-400 ml-1">
            · {new Date(reviewedAt).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}
          </span>
        )}
      </div>
      <p className="text-[13px] text-amber-800 whitespace-pre-wrap break-words leading-relaxed max-h-[20vh] overflow-y-auto">
        {notes}
      </p>
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────

export default function DocumentsPage() {
  const openMenu     = useMobileMenu();
  const { getToken } = useAuth();

  const [docs, setDocs]   = useState<any[]>([]);
  const [nfes, setNfes]   = useState<NfeDocument[]>([]);
  const [search, setSearch]           = useState("");
  const [modalOpen, setModalOpen]     = useState(false);
  const [nfeModalOpen, setNfeModal]   = useState(false);
  const [activeTab, setActiveTab]     = useState<"docs" | "nfe">("docs");
  const [successMsg, setSuccessMsg]   = useState<string | null>(null);
  const [nfeDetail, setNfeDetail]     = useState<NfeDocument | null>(null);
  const [nfeToDelete, setNfeToDelete] = useState<NfeDocument | null>(null);
  const [docToDelete, setDocToDelete] = useState<any | null>(null);
  const [docDetail, setDocDetail]     = useState<any | null>(null);

  const loadDocs = () => getDocuments().then((r) => setDocs(r.data || [])).catch(() => {});

  const loadNfes = async () => {
    try {
      const token = await getToken();
      const res   = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3002"}/api/v1/nfe`, { headers: { Authorization: `Bearer ${token}` } });
      const json  = await res.json();
      setNfes(json.data ?? []);
    } catch {}
  };

  useEffect(() => { loadDocs(); loadNfes(); }, []);

  const filtered = docs.filter((d) => !search || d.name?.toLowerCase().includes(search.toLowerCase()));

  // Contagem de revisões solicitadas para o banner
  const revisionCount = docs.filter((d) => d.status === "REVISION_REQUESTED").length;

  async function handleDownload(id: string) {
    const r = await getDownloadUrl(id);
    if (r.data?.url) window.open(r.data.url, "_blank");
  }

  async function handleSendReview(id: string) {
    try {
      await sendForReview(id);
      setSuccessMsg("Documento enviado para revisão do cliente.");
      setTimeout(() => setSuccessMsg(null), 4000);
      loadDocs();
    } catch (err: any) {
      console.error("Erro ao enviar para revisão:", err);
    }
  }

  async function confirmDeleteDoc() {
    if (!docToDelete) return;
    try { await deleteDocument(docToDelete.id); setDocToDelete(null); loadDocs(); }
    catch (err) { console.error("Erro ao remover documento:", err); }
  }

  async function confirmDeleteNfe() {
    if (!nfeToDelete) return;
    try {
      const token = await getToken();
      await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3002"}/api/v1/nfe/${nfeToDelete.id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
      setNfeToDelete(null); loadNfes();
    } catch (err) { console.error("Erro ao remover NF-e:", err); }
  }

  function handleNfeSuccess(msg: string) {
    setNfeModal(false);
    setSuccessMsg(msg);
    loadNfes();
    setActiveTab("nfe");
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
            <Button variant="secondary" icon={FileCode} onClick={() => setNfeModal(true)}>Importar NF-e</Button>
            <Button variant="primary" icon={Upload} onClick={() => setModalOpen(true)}>Enviar documento</Button>
          </div>
        }
      />

      <div className="flex-1 overflow-y-auto p-4 sm:p-5 lg:p-6">

        {/* FIX-5: Toast sem emoji */}
        {successMsg && <Toast type="success" message={successMsg} onClose={() => setSuccessMsg(null)} />}

        {/* FIX-1 + FIX-3: Banner de revisão sem emoji */}
        {revisionCount > 0 && (
          <Toast
            type="warning"
            message={`${revisionCount} documento${revisionCount !== 1 ? "s" : ""} com revisão solicitada pelo cliente.`}
            onClose={() => {}}
          />
        )}

        {/* Tabs */}
        <div className="flex gap-1 mb-4 bg-slate-100 rounded-lg p-1 w-fit">
          {(["docs", "nfe"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-1.5 rounded-md text-[13px] font-medium transition-colors ${
                activeTab === tab ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {tab === "docs"
                ? `Documentos${docs.length > 0 ? ` (${docs.length})` : ""}`
                : `NF-e importadas${nfes.length > 0 ? ` (${nfes.length})` : ""}`}
            </button>
          ))}
        </div>

        {/* Tab: Documentos */}
        {activeTab === "docs" && (
          <Card>
            <div className="hidden md:block">
              <div className="grid grid-cols-[2fr_1.4fr_0.9fr_0.9fr_72px] gap-3 px-4 py-2.5 bg-slate-50 border-b border-slate-100">
                {["Documento", "Cliente", "Status", "Data", ""].map((h) => (
                  <span key={h} className="text-[11px] font-bold text-slate-500 uppercase tracking-[0.5px]">{h}</span>
                ))}
              </div>

              {filtered.length === 0 && (
                <EmptyState
                  icon={FileText}
                  title="Nenhum documento enviado"
                  description='Clique em "Enviar documento" para começar.'
                  action={<Button variant="primary" icon={Upload} onClick={() => setModalOpen(true)}>Enviar documento</Button>}
                />
              )}

              {filtered.map((d) => (
                <div key={d.id} className="group grid grid-cols-[2fr_1.4fr_0.9fr_0.9fr_72px] gap-3 items-center px-4 py-3 border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors">
                  {/* FIX-2: description como título, name como extensão */}
                  <div className="flex items-center gap-2.5 min-w-0">
                    <DocTypeIcon name={d.name} />
                    <div className="min-w-0">
                      <p className="text-[13px] font-semibold text-slate-900 truncate" title={d.name}>
                        {docDisplayName(d)}
                      </p>
                      <p className="text-[11px] text-slate-400">{docExtLabel(d)}</p>
                    </div>
                  </div>

                  <span className="text-[13px] text-slate-500 truncate">
                    {d.client ? getClientDisplayName(d.client) : d.clientId || "—"}
                  </span>

                  {/* FIX-4: StatusBadge sem emoji + nota de revisão com ícone */}
                  <div>
                    <StatusBadge status={d.status} createdBy={d.createdBy} />
                    {d.status === "REVISION_REQUESTED" && d.reviewNotes && (
                      <p className="flex items-center gap-1 text-[11px] text-amber-600 mt-1 max-w-[200px] truncate" title={d.reviewNotes}>
                        <MessageSquare size={10} className="flex-shrink-0" />
                        {d.reviewNotes}
                      </p>
                    )}
                  </div>

                  <span className="text-[13px] text-slate-500">{fmtDate(d.createdAt)}</span>

                  <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <IconButton
                      icon={Eye}
                      label="Visualizar"
                      onClick={() => {
                        const ext = d.name?.split(".").pop()?.toLowerCase() ?? "";
                        if (["jpg", "jpeg", "png", "webp"].includes(ext) || ext === "xml" || d.status === "REVISION_REQUESTED") {
                          setDocDetail(d);
                        } else {
                          handleDownload(d.id);
                        }
                      }}
                    />
                    {!d.createdBy?.startsWith("client:") && (d.status === "UPLOADED" || d.status === "SENT") && (
                      <IconButton icon={FileInput} label="Enviar para revisão" onClick={() => handleSendReview(d.id)} />
                    )}
                    {!d.createdBy?.startsWith("client:") && (
                      <IconButton icon={Trash2} variant="danger" label="Remover" onClick={() => setDocToDelete(d)} />
                    )}
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
                    <p className="text-[13px] font-semibold text-slate-900 truncate">{docDisplayName(d)}</p>
                    <p className="text-[12px] text-slate-500 truncate">{d.client ? getClientDisplayName(d.client) : "—"} · {formatBytes(d.size)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={d.status} />
                    <IconButton icon={Download} label="Baixar" size={13} onClick={() => handleDownload(d.id)} />
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Tab: NF-e */}
        {activeTab === "nfe" && (
          <Card>
            <div className="hidden md:block">
              <div className="grid grid-cols-[2fr_1.4fr_0.9fr_0.9fr_0.8fr_72px] gap-3 px-4 py-2.5 bg-slate-50 border-b border-slate-100">
                {["Nota Fiscal", "Cliente / Destinatário", "Valor", "Status", "Emissão", ""].map((h) => (
                  <span key={h} className="text-[11px] font-bold text-slate-500 uppercase tracking-[0.5px]">{h}</span>
                ))}
              </div>
              {nfes.length === 0 && (
                <EmptyState icon={FileCode} title="Nenhuma NF-e importada" description='Clique em "Importar NF-e" para começar.' action={<Button variant="primary" icon={FileCode} onClick={() => setNfeModal(true)}>Importar NF-e</Button>} />
              )}
              {nfes.map((nfe) => <NfeRow key={nfe.id} nfe={nfe} onView={(n) => setNfeDetail(n)} onDelete={(n) => setNfeToDelete(n)} />)}
            </div>
            <div className="md:hidden">
              {nfes.length === 0 && <EmptyState icon={FileCode} title="Nenhuma NF-e importada" />}
              {nfes.map((nfe) => (
                <div key={nfe.id} className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-100 last:border-0">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0"><FileCode size={16} className="text-blue-600" /></div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold text-slate-900 truncate">NF-e nº {nfe.numero}</p>
                    <p className="text-[12px] text-slate-500 truncate">{nfe.client?.name ?? nfe.nomeDestinatario} · {formatValorNfe(nfe.valorTotal)}</p>
                  </div>
                  <Badge variant={nfe.client ? "success" : "warning"}>{nfe.client ? "Vinculado" : "Sem cliente"}</Badge>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>

      {/* Modais */}
      {modalOpen && <UploadModal onClose={() => setModalOpen(false)} onSuccess={() => { setModalOpen(false); loadDocs(); }} />}
      {nfeModalOpen && <NfeImportModal onClose={() => setNfeModal(false)} onSuccess={handleNfeSuccess} />}

      {nfeDetail && (
        <Modal title={`NF-e nº ${nfeDetail.numero} — Série ${nfeDetail.serie}`} subtitle={nfeDetail.naturezaOperacao} onClose={() => setNfeDetail(null)} footer={<Button variant="secondary" onClick={() => setNfeDetail(null)}>Fechar</Button>}>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-50 rounded-lg p-3"><p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Emitente</p><p className="text-[13px] font-semibold text-slate-900">{nfeDetail.nomeEmitente}</p><p className="text-[11px] text-slate-500 font-mono">{nfeDetail.cnpjEmitente}</p></div>
              <div className="bg-slate-50 rounded-lg p-3"><p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Destinatário</p><p className="text-[13px] font-semibold text-slate-900">{nfeDetail.nomeDestinatario}</p><p className="text-[11px] text-slate-500 font-mono">{nfeDetail.cnpjDestinatario}</p></div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-slate-50 rounded-lg p-3"><p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Valor Total</p><p className="text-[14px] font-bold text-slate-900">{formatValorNfe(nfeDetail.valorTotal)}</p></div>
              <div className="bg-slate-50 rounded-lg p-3"><p className="text-[10px] font-bold text-slate-400 uppercase mb-1">ISS</p><p className="text-[14px] font-bold text-slate-900">{formatValorNfe(nfeDetail.valorIss ?? 0)}</p></div>
              <div className="bg-slate-50 rounded-lg p-3"><p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Emissão</p><p className="text-[13px] font-semibold text-slate-900">{fmtDate(nfeDetail.dataEmissao)}</p></div>
            </div>
            <div className="bg-slate-50 rounded-lg p-3"><p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Chave de Acesso</p><p className="text-[11px] text-slate-600 font-mono break-all">{nfeDetail.chaveAcesso}</p></div>
            <div className="bg-slate-50 rounded-lg p-3">
              <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Cliente vinculado</p>
              {nfeDetail.client
                ? <p className="text-[13px] font-semibold text-green-700 flex items-center gap-1"><CheckCircle size={13} /> {nfeDetail.client.name}</p>
                : <p className="text-[13px] text-amber-600 flex items-center gap-1"><AlertTriangle size={13} /> Nenhum cliente encontrado para os CNPJs da nota</p>
              }
            </div>
          </div>
        </Modal>
      )}

      {nfeToDelete && <ConfirmModal title="Remover NF-e" message={`Deseja remover a NF-e nº ${nfeToDelete.numero} (${nfeToDelete.nomeEmitente})? Esta ação não pode ser desfeita.`} confirmLabel="Remover" onConfirm={confirmDeleteNfe} onCancel={() => setNfeToDelete(null)} />}
      {docToDelete && <ConfirmModal title="Remover Documento" message={`Deseja remover o documento "${docToDelete.description || docToDelete.name}"? Esta ação não pode ser desfeita.`} confirmLabel="Remover" onConfirm={confirmDeleteDoc} onCancel={() => setDocToDelete(null)} />}

      {/* Modal de visualização */}
      {docDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={() => setDocDetail(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100">
              <div>
                <p className="text-[14px] font-semibold text-slate-900">{docDisplayName(docDetail)}</p>
                <p className="text-[11px] text-slate-400">{docDetail.client ? getClientDisplayName(docDetail.client) : "—"} · {fmtDate(docDetail.createdAt)}</p>
              </div>
              <button onClick={() => setDocDetail(null)} className="text-slate-400 hover:text-slate-600 transition-colors" aria-label="Fechar">
                <X size={20} />
              </button>
            </div>
            <div className="bg-slate-50 flex items-center justify-center p-4 min-h-[300px] max-h-[65vh] overflow-y-auto">
              {(() => {
                const ext = docDetail.name?.split(".").pop()?.toLowerCase() ?? "";
                if (["jpg", "jpeg", "png", "webp"].includes(ext))
                  return <div className="w-full flex flex-col gap-3 p-4"><div className="flex items-center justify-center"><ImagePreview doc={docDetail} /></div>{docDetail.reviewNotes && <RevisionNote notes={docDetail.reviewNotes} reviewedAt={docDetail.reviewedAt} />}</div>;
                if (ext === "xml") return <XmlPreview doc={docDetail} />;
                if (ext === "pdf")
                  return <div className="w-full flex flex-col gap-3"><PdfPreview doc={docDetail} />{docDetail.reviewNotes && <div className="mx-4 mb-2"><RevisionNote notes={docDetail.reviewNotes} reviewedAt={docDetail.reviewedAt} /></div>}</div>;
                if (docDetail.reviewNotes)
                  return <div className="w-full p-4"><RevisionNote notes={docDetail.reviewNotes} reviewedAt={docDetail.reviewedAt} /></div>;
                return null;
              })()}
            </div>
            <div className="flex justify-end gap-2 px-5 py-3.5 border-t border-slate-100">
              <Button variant="secondary" onClick={() => setDocDetail(null)}>Fechar</Button>
              <Button variant="primary" icon={Download} onClick={async () => {
                const r = await getDownloadUrl(docDetail.id);
                if (!r.data?.url) return;
                const ext = docDetail.name?.split(".").pop()?.toLowerCase() ?? "";
                if (ext === "xml") {
                  const res = await fetch(r.data.url); const blob = await res.blob();
                  const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = docDetail.name; a.click(); URL.revokeObjectURL(a.href);
                } else { window.open(r.data.url, "_blank"); }
              }}>Baixar arquivo</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}