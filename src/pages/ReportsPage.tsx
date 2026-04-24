import React, { useEffect, useState, useRef } from "react";
import { reportsApi, camerasApi, getPhotoUrl, categoriesApi } from "../services/api";
import TutorialButton from "../components/TutorialButton";
import { Camera, PersonCategory } from "../types";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  DocumentChartBarIcon,
  ArrowDownTrayIcon,
  MagnifyingGlassIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  UserGroupIcon,
  ClockIcon,
  PhotoIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";

interface PersonSeen {
  person_id: number;
  name: string;
  role: string;
  is_authorized: boolean;
  first_seen: string;
  last_seen: string;
  detection_count: number;
  avg_confidence: number;
}

interface UnrecognizedEvent {
  id: number;
  timestamp: string;
  photo_path: string | null;
  camera_name: string | null;
  notes: string | null;
}

interface HourlyData {
  hour: number;
  total: number;
  recognized: number;
  unrecognized: number;
}

interface DailyReport {
  date: string;
  camera: { id: number; name: string; location: string | null } | null;
  cameras_available: { id: number; name: string }[];
  summary: {
    total_detections: number;
    unique_persons: number;
    recognized: number;
    unrecognized: number;
    authorized: number;
    unauthorized: number;
  };
  persons_seen: PersonSeen[];
  unrecognized_events: UnrecognizedEvent[];
  hourly_breakdown: HourlyData[];
}

export default function ReportsPage() {
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [categories, setCategories] = useState<PersonCategory[]>([]);
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [selectedCamera, setSelectedCamera] = useState<number | undefined>();
  const [report, setReport] = useState<DailyReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const printRef = useRef<HTMLDivElement>(null);

  const catLabels = Object.fromEntries(categories.map((c) => [c.key, c.label]));

  useEffect(() => {
    camerasApi.list().then((r) => setCameras(r.data)).catch(() => {});
    categoriesApi.list().then((r) => setCategories(r.data)).catch(() => {});
  }, []);

  const generateReport = async () => {
    setLoading(true);
    setError("");
    setReport(null);
    try {
      const params: any = { report_date: selectedDate };
      if (selectedCamera) params.camera_id = selectedCamera;
      const res = await reportsApi.daily(params);
      setReport(res.data);
    } catch (err: any) {
      setError(err.response?.data?.detail || "Erro ao gerar relatório");
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const maxHourly = report
    ? Math.max(...report.hourly_breakdown.map((h) => h.total), 1)
    : 1;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header - hidden in print */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Relatórios</h1>
          <p className="text-slate-500 text-sm mt-1">
            Relatório diário de reconhecimento por câmera/setor
          </p>
        </div>
        <TutorialButton title="Relatórios" driveFileId="1eZU-uQ5VgAzwttomBW3lMR57t4R7O5rG" />
      </div>

      {/* Filters - hidden in print */}
      <div className="card print:hidden">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Data do relatório
            </label>
            <input
              type="date"
              className="input-field"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              max={new Date().toISOString().slice(0, 10)}
            />
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Câmera / Setor
            </label>
            <select
              className="input-field"
              value={selectedCamera ?? ""}
              onChange={(e) =>
                setSelectedCamera(e.target.value ? Number(e.target.value) : undefined)
              }
            >
              <option value="">Todas as câmeras</option>
              {cameras.map((cam) => (
                <option key={cam.id} value={cam.id}>
                  {cam.name} {cam.location && `(${cam.location})`}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={generateReport}
              disabled={loading}
              className="btn-primary flex items-center gap-2 h-10"
            >
              <MagnifyingGlassIcon className="w-4 h-4" />
              {loading ? "Gerando..." : "Gerar Relatório"}
            </button>
          </div>
        </div>
        {error && (
          <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {error}
          </div>
        )}
      </div>

      {/* Empty state */}
      {!report && !loading && (
        <div className="card text-center py-16 text-slate-400 print:hidden">
          <DocumentChartBarIcon className="w-16 h-16 mx-auto mb-3 opacity-30" />
          <p className="font-medium text-slate-600">Selecione uma data e clique em gerar</p>
          <p className="text-sm mt-1">O relatório mostrará todos os eventos do dia selecionado</p>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="card text-center py-16 print:hidden">
          <div className="w-10 h-10 border-4 border-navy-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-600 font-medium">Gerando relatório...</p>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* REPORT CONTENT                                                     */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {report && (
        <div ref={printRef} className="space-y-6">
          {/* Print header - visible only in print */}
          <div className="hidden print:block mb-8">
            <div className="flex items-center justify-between border-b-2 border-navy-600 pb-4">
              <div>
                <h1 className="text-2xl font-bold text-navy-600">RecoFace</h1>
                <p className="text-sm text-slate-500">Sistema de Reconhecimento Facial</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium">Relatório Diário</p>
                <p className="text-xs text-slate-500">
                  Gerado em {format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                </p>
              </div>
            </div>
          </div>

          {/* Report title */}
          <div className="card bg-navy-600 text-white print:bg-white print:text-slate-800 print:border print:border-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold">
                  Relatório — {format(new Date(report.date + "T12:00:00"), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                </h2>
                <p className="text-navy-200 print:text-slate-500 text-sm mt-1">
                  {report.camera
                    ? `${report.camera.name}${report.camera.location ? ` — ${report.camera.location}` : ""}`
                    : "Todas as câmeras"}
                </p>
              </div>
              <button
                onClick={handlePrint}
                className="btn-secondary bg-white/10 hover:bg-white/20 text-white border-white/20 flex items-center gap-2 print:hidden"
              >
                <ArrowDownTrayIcon className="w-4 h-4" />
                Baixar PDF
              </button>
            </div>
          </div>

          {/* Summary cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 print:grid-cols-6">
            {[
              { label: "Total de Detecções", value: report.summary.total_detections, color: "text-slate-700", border: "border-slate-300" },
              { label: "Pessoas Únicas", value: report.summary.unique_persons, color: "text-blue-600", border: "border-blue-400" },
              { label: "Reconhecidos", value: report.summary.recognized, color: "text-green-600", border: "border-green-400" },
              { label: "Não Reconhecidos", value: report.summary.unrecognized, color: "text-red-600", border: "border-red-400" },
              { label: "Autorizados", value: report.summary.authorized, color: "text-emerald-600", border: "border-emerald-400" },
              { label: "Não Autorizados", value: report.summary.unauthorized, color: "text-orange-600", border: "border-orange-400" },
            ].map(({ label, value, color, border }) => (
              <div key={label} className={`card text-center py-3 border-l-4 ${border}`}>
                <p className={`text-2xl font-bold ${color}`}>{value}</p>
                <p className="text-[10px] text-slate-500 mt-0.5 leading-tight">{label}</p>
              </div>
            ))}
          </div>

          {/* Hourly Activity Chart */}
          {report.hourly_breakdown.length > 0 && (
            <div className="card">
              <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
                <ClockIcon className="w-4 h-4" />
                Atividade por Hora
              </h3>
              <div className="flex items-end gap-1 h-32">
                {Array.from({ length: 24 }, (_, h) => {
                  const data = report.hourly_breakdown.find((d) => d.hour === h);
                  const total = data?.total ?? 0;
                  const recPct = total > 0 ? ((data?.recognized ?? 0) / total) * 100 : 0;
                  const heightPct = total > 0 ? (total / maxHourly) * 100 : 0;
                  return (
                    <div key={h} className="flex-1 flex flex-col items-center gap-0.5">
                      <span className="text-[9px] text-slate-400">{total || ""}</span>
                      <div className="w-full relative" style={{ height: `${Math.max(heightPct, 2)}%` }}>
                        <div
                          className="absolute bottom-0 w-full bg-green-400 rounded-t"
                          style={{ height: `${recPct}%` }}
                        />
                        <div
                          className="absolute top-0 w-full bg-red-300 rounded-t"
                          style={{ height: `${100 - recPct}%` }}
                        />
                      </div>
                      <span className="text-[9px] text-slate-400">{h}h</span>
                    </div>
                  );
                })}
              </div>
              <div className="flex gap-4 mt-3 text-xs text-slate-500">
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded bg-green-400" /> Reconhecidos
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded bg-red-300" /> Não reconhecidos
                </span>
              </div>
            </div>
          )}

          {/* Persons Seen */}
          <div className="card p-0 overflow-hidden">
            <div className="px-5 py-3 bg-slate-50 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <UserGroupIcon className="w-4 h-4" />
                Pessoas Identificadas ({report.persons_seen.length})
              </h3>
            </div>
            {report.persons_seen.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-sm">
                Nenhuma pessoa identificada neste período
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100">
                      <th className="text-left px-4 py-2 text-xs font-semibold text-slate-500 uppercase">Nome</th>
                      <th className="text-left px-4 py-2 text-xs font-semibold text-slate-500 uppercase">Função</th>
                      <th className="text-left px-4 py-2 text-xs font-semibold text-slate-500 uppercase">Status</th>
                      <th className="text-left px-4 py-2 text-xs font-semibold text-slate-500 uppercase">Primeira Detecção</th>
                      <th className="text-left px-4 py-2 text-xs font-semibold text-slate-500 uppercase">Última Detecção</th>
                      <th className="text-center px-4 py-2 text-xs font-semibold text-slate-500 uppercase">Detecções</th>
                      <th className="text-center px-4 py-2 text-xs font-semibold text-slate-500 uppercase">Confiança Média</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {report.persons_seen.map((p) => (
                      <tr key={p.person_id} className="hover:bg-slate-50">
                        <td className="px-4 py-2 font-medium text-slate-800">{p.name}</td>
                        <td className="px-4 py-2 text-slate-500">{catLabels[p.role] ?? p.role}</td>
                        <td className="px-4 py-2">
                          {p.is_authorized ? (
                            <span className="inline-flex items-center gap-1 text-xs text-green-700">
                              <CheckCircleIcon className="w-3.5 h-3.5" /> Autorizado
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs text-red-700">
                              <ExclamationTriangleIcon className="w-3.5 h-3.5" /> Não autorizado
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-2 text-slate-500 font-mono text-xs">{p.first_seen}</td>
                        <td className="px-4 py-2 text-slate-500 font-mono text-xs">{p.last_seen}</td>
                        <td className="px-4 py-2 text-center font-semibold">{p.detection_count}</td>
                        <td className="px-4 py-2 text-center">
                          <span className={`font-semibold ${p.avg_confidence >= 70 ? "text-green-600" : p.avg_confidence >= 50 ? "text-yellow-600" : "text-red-600"}`}>
                            {p.avg_confidence.toFixed(0)}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Unrecognized Events */}
          <div className="card p-0 overflow-hidden">
            <div className="px-5 py-3 bg-red-50 border-b border-red-100">
              <h3 className="text-sm font-bold text-red-800 flex items-center gap-2">
                <ExclamationTriangleIcon className="w-4 h-4" />
                Pessoas Não Identificadas ({report.unrecognized_events.length})
              </h3>
            </div>
            {report.unrecognized_events.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-sm">
                Nenhum evento de pessoa não identificada
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100">
                      <th className="text-left px-4 py-2 text-xs font-semibold text-slate-500 uppercase">Horário</th>
                      <th className="text-left px-4 py-2 text-xs font-semibold text-slate-500 uppercase">Câmera</th>
                      <th className="text-left px-4 py-2 text-xs font-semibold text-slate-500 uppercase">Observações</th>
                      <th className="text-center px-4 py-2 text-xs font-semibold text-slate-500 uppercase print:hidden">Foto</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {report.unrecognized_events.map((evt) => (
                      <tr key={evt.id} className="hover:bg-slate-50">
                        <td className="px-4 py-2 font-mono text-xs text-slate-600">{evt.timestamp}</td>
                        <td className="px-4 py-2 text-slate-500">{evt.camera_name ?? "—"}</td>
                        <td className="px-4 py-2 text-slate-500 text-xs">{evt.notes ?? "—"}</td>
                        <td className="px-4 py-2 text-center print:hidden">
                          {evt.photo_path && (
                            <button
                              onClick={() => setSelectedPhoto(getPhotoUrl(evt.photo_path!))}
                              className="text-navy-600 hover:text-navy-700"
                            >
                              <PhotoIcon className="w-4 h-4 inline" />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="text-center text-xs text-slate-400 py-4 border-t border-slate-200">
            <p>
              Relatório gerado pelo sistema RecoFace em{" "}
              {format(new Date(), "dd/MM/yyyy 'às' HH:mm:ss", { locale: ptBR })}
            </p>
            <p className="mt-1">
              Período: {format(new Date(report.date + "T12:00:00"), "dd/MM/yyyy", { locale: ptBR })} •{" "}
              {report.camera ? report.camera.name : "Todas as câmeras"} •{" "}
              {report.summary.total_detections} detecções totais
            </p>
          </div>
        </div>
      )}

      {/* Photo modal */}
      {selectedPhoto && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 print:hidden"
          onClick={() => setSelectedPhoto(null)}
        >
          <div className="relative max-w-2xl w-full" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setSelectedPhoto(null)}
              className="absolute -top-3 -right-3 w-8 h-8 bg-white rounded-full flex items-center justify-center text-slate-600 hover:text-slate-800 shadow-lg z-10"
            >
              <XMarkIcon className="w-4 h-4" />
            </button>
            <img src={selectedPhoto} alt="Captura" className="w-full rounded-xl shadow-2xl" />
          </div>
        </div>
      )}

      {/* Print styles */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          .print\\:block { display: block !important; }
          .print\\:hidden { display: none !important; }
          .print\\:grid-cols-6 { grid-template-columns: repeat(6, minmax(0, 1fr)) !important; }
          .print\\:bg-white { background-color: white !important; }
          .print\\:text-slate-800 { color: #1e293b !important; }
          .print\\:text-slate-500 { color: #64748b !important; }
          .print\\:border { border: 1px solid #e2e8f0 !important; }
          .print\\:border-slate-200 { border-color: #e2e8f0 !important; }
          #root, [class*="max-w-7xl"] { visibility: visible; position: absolute; left: 0; top: 0; width: 100%; }
          [class*="max-w-7xl"] * { visibility: visible; }
          aside, header, nav { display: none !important; }
          .card { break-inside: avoid; box-shadow: none !important; border: 1px solid #e2e8f0; }
          @page { margin: 1.5cm; size: A4 landscape; }
        }
      `}</style>
    </div>
  );
}
