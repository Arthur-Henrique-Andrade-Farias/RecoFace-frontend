import React, { useEffect, useState, useCallback } from "react";
import { logsApi, getPhotoUrl } from "../services/api";
import { RecognitionLog } from "../types";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  ClipboardDocumentListIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  TrashIcon,
  ArrowPathIcon,
  PhotoIcon,
  XMarkIcon,
  FunnelIcon,
} from "@heroicons/react/24/outline";
import { useAuth } from "../context/AuthContext";

const ROLE_LABELS: Record<string, string> = {
  student: "Aluno",
  teacher: "Professor(a)",
  staff: "Funcionário(a)",
  visitor: "Visitante",
};

export default function LogsPage() {
  const { user } = useAuth();
  const [logs, setLogs] = useState<RecognitionLog[]>([]);
  const [filter, setFilter] = useState<"all" | "recognized" | "alert">("all");
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);

  const load = useCallback(async () => {
    const params: Record<string, unknown> = { limit: 200 };
    if (filter === "recognized") params.recognized = true;
    if (filter === "alert") params.recognized = false;
    try {
      const res = await logsApi.list(params);
      setLogs(res.data);
    } finally {
      setPageLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(load, 4000);
    return () => clearInterval(interval);
  }, [autoRefresh, load]);

  const handleClear = async () => {
    if (!window.confirm("Limpar todos os logs? Esta ação não pode ser desfeita.")) return;
    setLoading(true);
    try {
      await logsApi.clear();
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  const totalAlerts = logs.filter((l) => !l.recognized).length;
  const totalRecognized = logs.filter((l) => l.recognized && l.is_authorized).length;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Logs de Reconhecimento</h1>
          <p className="text-slate-500 text-sm mt-1">
            Registro de todos os eventos de reconhecimento facial
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              autoRefresh
                ? "bg-green-100 text-green-700 hover:bg-green-200"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${autoRefresh ? "bg-green-500 animate-pulse" : "bg-slate-400"}`}
            />
            {autoRefresh ? "Atualização automática" : "Pausado"}
          </button>
          <button onClick={load} className="btn-secondary flex items-center gap-2">
            <ArrowPathIcon className="w-4 h-4" />
            Atualizar
          </button>
          {user?.role === "admin" && (
            <button
              onClick={handleClear}
              disabled={loading}
              className="btn-danger flex items-center gap-2"
            >
              <TrashIcon className="w-4 h-4" />
              Limpar
            </button>
          )}
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="card text-center py-4 border-l-4 border-slate-300">
          <p className="text-3xl font-bold text-slate-700">{logs.length}</p>
          <p className="text-xs text-slate-500 mt-1">Total de Eventos</p>
        </div>
        <div className="card text-center py-4 border-l-4 border-green-400">
          <p className="text-3xl font-bold text-green-600">{totalRecognized}</p>
          <p className="text-xs text-slate-500 mt-1">Reconhecidos</p>
        </div>
        <div className="card text-center py-4 border-l-4 border-red-400">
          <p className="text-3xl font-bold text-red-600">{totalAlerts}</p>
          <p className="text-xs text-slate-500 mt-1">Alertas</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2">
        <FunnelIcon className="w-4 h-4 text-slate-400" />
        {(["all", "recognized", "alert"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              filter === f
                ? "bg-navy-600 text-white"
                : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
            }`}
          >
            {f === "all" ? "Todos" : f === "recognized" ? "Reconhecidos" : "Alertas"}
          </button>
        ))}
      </div>

      {/* Logs table */}
      <div className="card p-0 overflow-hidden">
        {pageLoading ? (
          <div className="divide-y divide-slate-100">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="flex items-center gap-4 px-4 py-3 animate-pulse">
                <div className="w-20 h-5 bg-slate-200 rounded" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-4 w-32 bg-slate-200 rounded" />
                  <div className="h-3 w-20 bg-slate-100 rounded" />
                </div>
                <div className="w-16 h-3 bg-slate-100 rounded" />
                <div className="w-20 h-4 bg-slate-100 rounded" />
                <div className="w-5 h-5 bg-slate-100 rounded" />
              </div>
            ))}
          </div>
        ) : logs.length === 0 ? (
          <div className="py-16 text-center text-slate-400">
            <ClipboardDocumentListIcon className="w-16 h-16 mx-auto mb-3 opacity-30" />
            <p className="font-medium text-slate-600">Nenhum evento registrado</p>
            <p className="text-sm mt-1">Os eventos aparecerão aqui quando câmeras detectarem rostos</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3">
                    Status
                  </th>
                  <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3">
                    Pessoa
                  </th>
                  <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3">
                    Câmera
                  </th>
                  <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3">
                    Confiança
                  </th>
                  <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3">
                    Data/Hora
                  </th>
                  <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3">
                    Foto
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      {log.recognized && log.is_authorized ? (
                        <span className="flex items-center gap-1.5 text-xs font-medium text-green-700">
                          <CheckCircleIcon className="w-4 h-4 text-green-500" />
                          Autorizado
                        </span>
                      ) : log.recognized && !log.is_authorized ? (
                        <span className="flex items-center gap-1.5 text-xs font-medium text-yellow-700">
                          <ExclamationTriangleIcon className="w-4 h-4 text-yellow-500" />
                          Não Autorizado
                        </span>
                      ) : (
                        <span className="flex items-center gap-1.5 text-xs font-medium text-red-700">
                          <ExclamationTriangleIcon className="w-4 h-4 text-red-500" />
                          Desconhecido
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-slate-800">
                        {log.person_name ?? "Não identificado"}
                      </p>
                      {log.person_role && (
                        <p className="text-xs text-slate-400">
                          {ROLE_LABELS[log.person_role] ?? log.person_role}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-500">
                      {log.camera_name ?? `Câmera #${log.camera_id}` ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      {log.confidence != null ? (
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-slate-100 rounded-full h-1.5 w-16">
                            <div
                              className={`h-1.5 rounded-full ${
                                log.confidence >= 70
                                  ? "bg-green-500"
                                  : log.confidence >= 50
                                  ? "bg-yellow-500"
                                  : "bg-red-500"
                              }`}
                              style={{ width: `${Math.min(log.confidence, 100)}%` }}
                            />
                          </div>
                          <span className="text-xs text-slate-500 w-10 text-right">
                            {log.confidence.toFixed(0)}%
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-300 text-sm">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-500">
                      <span className="font-medium">
                        {format(new Date(log.timestamp), "dd/MM/yyyy", { locale: ptBR })}
                      </span>
                      <br />
                      <span className="text-xs">
                        {format(new Date(log.timestamp), "HH:mm:ss", { locale: ptBR })}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {log.photo_path ? (
                        <button
                          onClick={() => setSelectedPhoto(getPhotoUrl(log.photo_path!))}
                          className="text-navy-600 hover:text-navy-700 transition-colors"
                        >
                          <PhotoIcon className="w-5 h-5" />
                        </button>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Photo modal */}
      {selectedPhoto && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedPhoto(null)}
        >
          <div className="relative max-w-2xl w-full" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setSelectedPhoto(null)}
              className="absolute -top-3 -right-3 w-8 h-8 bg-white rounded-full flex items-center justify-center text-slate-600 hover:text-slate-800 shadow-lg z-10"
            >
              <XMarkIcon className="w-4 h-4" />
            </button>
            <img
              src={selectedPhoto}
              alt="Captura"
              className="w-full rounded-xl shadow-2xl"
            />
          </div>
        </div>
      )}
    </div>
  );
}
