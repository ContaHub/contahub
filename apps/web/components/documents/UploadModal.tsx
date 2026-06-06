"use client";

import { useState, useRef } from "react";
import { uploadDocument } from "@/lib/documents";
import { getClients, Client } from "@/lib/clients";
import { useEffect } from "react";

interface UploadModalProps {
  preselectedClientId?: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function UploadModal({ preselectedClientId, onClose, onSuccess }: UploadModalProps) {
  const [clients, setClients] = useState<Client[]>([]);
  const [clientId, setClientId] = useState(preselectedClientId || "");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [progress, setProgress] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    getClients({ limit: 100 }).then((res) => setClients(res.data));
  }, []);

  function handleFileDrop(e: React.DragEvent) {
    e.preventDefault();
    const dropped = e.dataTransfer.files[0];
    if (dropped) setFile(dropped);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file || !clientId) return;
    setLoading(true);
    setError("");
    setProgress(30);

    try {
      setProgress(60);
      await uploadDocument(file, clientId, description || undefined);
      setProgress(100);
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || "Erro no upload");
    } finally {
      setLoading(false);
      setProgress(0);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div 
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-upload-title"
      >
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 id="modal-upload-title" className="text-lg font-semibold text-gray-900">Enviar Documento</h2>
          <button 
            onClick={onClose} 
            className="text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-lg p-1"
            aria-label="Fechar janela de upload"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg" role="alert">{error}</div>
          )}

          {/* Área de drop */}
          <div
            onDrop={handleFileDrop}
            onDragOver={(e) => e.preventDefault()}
            onClick={() => inputRef.current?.click()}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                inputRef.current?.click();
              }
            }}
            tabIndex={0}
            role="button"
            aria-label="Área de envio de arquivos. Pressione Enter ou Espaço para selecionar um arquivo do seu computador."
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              file ? "border-blue-300 bg-blue-50" : "border-gray-200 hover:border-blue-300 hover:bg-gray-50"
            }`}
          >
            <input
              ref={inputRef}
              type="file"
              className="hidden"
              accept=".pdf,.jpg,.jpeg,.png,.webp,.xls,.xlsx,.xml"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
            {file ? (
              <div>
                <p className="text-2xl mb-1" role="img" aria-hidden="true">📄</p>
                <p className="text-sm font-medium text-blue-700">{file.name}</p>
                <p className="text-xs text-gray-400">{(file.size / 1024).toFixed(1)} KB</p>
              </div>
            ) : (
              <div>
                <p className="text-3xl mb-2" role="img" aria-hidden="true">☁️</p>
                <p className="text-sm font-medium text-gray-600">Clique ou arraste o arquivo aqui</p>
                <p className="text-xs text-gray-400 mt-1">PDF, imagens, Excel, XML — máximo 10MB</p>
              </div>
            )}
          </div>

          {/* Cliente */}
          {!preselectedClientId && (
            <div>
              <label htmlFor="client-select" className="block text-sm font-medium text-gray-700 mb-1">Cliente *</label>
              <select
                id="client-select"
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Selecione um cliente</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>{c.tradeName}</option>
                ))}
              </select>
            </div>
          )}

          {/* Descrição */}
          <div>
            <label htmlFor="description-input" className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
            <input
              id="description-input"
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ex: DARF Maio/2026, Balanço Anual..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Barra de progresso */}
          {loading && (
            <div className="w-full bg-gray-100 rounded-full h-2" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-gray-400">
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || !file || !clientId}
              className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {loading ? "Enviando..." : "Enviar documento"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
