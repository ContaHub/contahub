"use client";

import { useEffect, useRef, useState } from "react";
import {
  getCertificateStatus,
  uploadCertificate,
  deleteCertificate,
  CertificateStatus,
} from "@/lib/certificates";

interface Props {
  clientId: string;
  clientName: string;
  onClose: () => void;
}

export default function CertificateModal({ clientId, clientName, onClose }: Props) {
  const [cert, setCert] = useState<CertificateStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    getCertificateStatus(clientId)
      .then(setCert)
      .finally(() => setLoading(false));
  }, [clientId]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const ext = f.name.split(".").pop()?.toLowerCase();
    if (!["pfx", "p12"].includes(ext || "")) {
      setError("Apenas arquivos .pfx ou .p12 são aceitos");
      return;
    }
    setFile(f);
    setError("");
  };

  const handleUpload = async () => {
    if (!file) return setError("Selecione um arquivo .pfx");
    if (!password) return setError("Digite a senha do certificado");

    setUploading(true);
    setError("");
    setSuccess("");

    try {
      await uploadCertificate(clientId, file, password);
      setSuccess("Certificado enviado com sucesso!");
      setFile(null);
      setPassword("");
      // Recarregar status
      const updated = await getCertificateStatus(clientId);
      setCert(updated);
    } catch (err: any) {
      setError(err.message || "Erro ao enviar certificado");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Tem certeza que deseja remover o certificado?")) return;
    setDeleting(true);
    setError("");
    try {
      await deleteCertificate(clientId);
      setCert(null);
      setSuccess("Certificado removido.");
    } catch (err: any) {
      setError(err.message || "Erro ao remover");
    } finally {
      setDeleting(false);
    }
  };

  const statusConfig = {
    ACTIVE: { label: "Válido", color: "bg-green-100 text-green-800", icon: "✓" },
    EXPIRED: { label: "Vencido", color: "bg-red-100 text-red-800", icon: "✗" },
    INVALID: { label: "Inválido", color: "bg-red-100 text-red-800", icon: "✗" },
    REVOKED: { label: "Revogado", color: "bg-gray-100 text-gray-800", icon: "✗" },
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cert-modal-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 id="cert-modal-title" className="text-lg font-semibold text-gray-900">
              🔐 Certificado Digital A1
            </h2>
            <p className="text-sm text-gray-500 mt-0.5">{clientName}</p>
          </div>
          <button
            onClick={onClose}
            aria-label="Fechar modal"
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Status atual */}
          {loading ? (
            <div className="flex items-center justify-center py-6">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
            </div>
          ) : cert ? (
            <div className="rounded-xl border border-gray-200 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Status</span>
                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${statusConfig[cert.status].color}`}>
                  {statusConfig[cert.status].icon} {statusConfig[cert.status].label}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Validade</span>
                <span className={`text-sm font-medium ${cert.status === "EXPIRED" ? "text-red-600" : cert.expiringSoon ? "text-yellow-600" : "text-gray-900"}`}>
                  {new Date(cert.expiresAt).toLocaleDateString("pt-BR")}
                  {cert.expiringSoon && (
                    <span className="ml-1 text-yellow-600">⚠ Vence em {cert.daysUntilExpiry}d</span>
                  )}
                  {cert.status === "EXPIRED" && (
                    <span className="ml-1 text-red-600">(Vencido)</span>
                  )}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Cadastrado em</span>
                <span className="text-sm text-gray-600">
                  {new Date(cert.createdAt).toLocaleDateString("pt-BR")}
                </span>
              </div>

              <button
                onClick={handleDelete}
                disabled={deleting}
                className="w-full mt-2 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 py-2 rounded-lg transition-colors disabled:opacity-50"
              >
                {deleting ? "Removendo..." : "🗑 Remover certificado"}
              </button>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-gray-300 p-4 text-center">
              <p className="text-sm text-gray-500">Nenhum certificado cadastrado</p>
            </div>
          )}

          {/* Formulário de upload */}
          <div className="space-y-3">
            <p className="text-sm font-medium text-gray-700">
              {cert ? "Substituir certificado" : "Enviar certificado"}
            </p>

            {/* Upload do arquivo */}
            <div
              onClick={() => inputRef.current?.click()}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") inputRef.current?.click(); }}
              tabIndex={0}
              role="button"
              aria-label="Clique para selecionar o arquivo .pfx ou .p12"
              className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-colors ${
                file ? "border-blue-400 bg-blue-50" : "border-gray-200 hover:border-blue-300"
              }`}
            >
              <input
                ref={inputRef}
                type="file"
                accept=".pfx,.p12"
                onChange={handleFileChange}
                className="hidden"
              />
              {file ? (
                <div>
                  <p className="text-sm font-medium text-blue-700">📄 {file.name}</p>
                  <p className="text-xs text-blue-500 mt-0.5">
                    {(file.size / 1024).toFixed(1)} KB
                  </p>
                </div>
              ) : (
                <div>
                  <p className="text-sm text-gray-500">Clique para selecionar o arquivo</p>
                  <p className="text-xs text-gray-400 mt-0.5">.pfx ou .p12 — máximo 5MB</p>
                </div>
              )}
            </div>

            {/* Senha */}
            <div>
              <label htmlFor="cert-password" className="block text-sm font-medium text-gray-700 mb-1">
                Senha do certificado
              </label>
              <div className="relative">
                <input
                  id="cert-password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Digite a senha do .pfx"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                >
                  {showPassword ? "🙈" : "👁"}
                </button>
              </div>
            </div>

            {/* Feedback */}
            {error && (
              <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
                {error}
              </div>
            )}
            {success && (
              <div className="rounded-lg bg-green-50 border border-green-200 px-3 py-2 text-sm text-green-700">
                {success}
              </div>
            )}

            {/* Botão enviar */}
            <button
              onClick={handleUpload}
              disabled={uploading || !file || !password}
              className="w-full bg-blue-600 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {uploading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                  Validando e enviando...
                </span>
              ) : (
                "🔐 Enviar certificado"
              )}
            </button>
          </div>

          {/* Aviso de segurança */}
          <p className="text-xs text-gray-400 text-center">
            O arquivo é criptografado com AES-256 antes de ser armazenado.
            A senha nunca é salva em texto puro.
          </p>
        </div>
      </div>
    </div>
  );
}
