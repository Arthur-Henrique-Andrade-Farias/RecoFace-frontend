import React, { useEffect, useState, useCallback } from "react";
import { logsApi, camerasApi, personsApi, getPhotoUrl, categoriesApi } from "../services/api";
import { RecognitionLog, Camera, Person, PersonCategory } from "../types";
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
  PencilIcon,
  MagnifyingGlassIcon,
  UserPlusIcon,
} from "@heroicons/react/24/outline";
import { useAuth } from "../context/AuthContext";

export default function LogsPage() {
  const { user } = useAuth();
  const canEdit = user?.role === "admin" || user?.role === "gerente" || user?.role === "configurador";

  const [logs, setLogs] = useState<RecognitionLog[]>([]);
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [persons, setPersons] = useState<Person[]>([]);
  const [categories, setCategories] = useState<PersonCategory[]>([]);

  const [filter, setFilter] = useState<"all" | "recognized" | "alert">("all");
  const [cameraFilter, setCameraFilter] = useState<number | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);

  // Edit log state
  const [editLog, setEditLog] = useState<RecognitionLog | null>(null);
  const [editPersonId, setEditPersonId] = useState<number | null>(null);
  const [editNotes, setEditNotes] = useState("");
  const [editSearch, setEditSearch] = useState("");
  const [editSaving, setEditSaving] = useState(false);

  // Create person from log state
  const [showNewPerson, setShowNewPerson] = useState(false);
  const [newPersonName, setNewPersonName] = useState("");
  const [newPersonRole, setNewPersonRole] = useState("student");
  const [newPersonAuthorized, setNewPersonAuthorized] = useState(true);
  const [newPersonSaving, setNewPersonSaving] = useState(false);

  const categoryLabels = Object.fromEntries(categories.map((c) => [c.key, c.label]));

  const load = useCallback(async () => {
    const params: Record<string, unknown> = { limit: 200 };
    if (filter === "recognized") params.recognized = true;
    if (filter === "alert") params.recognized = false;
    if (cameraFilter !== null) params.camera_id = cameraFilter;
    try {
      const res = await logsApi.list(params);
      setLogs(res.data);
    } finally {
      setPageLoading(false);
    }
  }, [filter, cameraFilter]);

  useEffect(() => {
    load();
    camerasApi.list().then((r) => setCameras(r.data)).catch(() => {});
    personsApi.list().then((r) => setPersons(r.data)).catch(() => {});
    categoriesApi.list().then((r) => setCategories(r.data)).catch(() => {});
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

  // ─── Edit log ──────────────────────────────────────────────────────────────

  const openEditLog = (log: RecognitionLog) => {
    setEditLog(log);
    setEditPersonId(log.person_id);
    setEditNotes(log.notes ?? "");
    setEditSearch("");
    setShowNewPerson(false);
    setNewPersonName("");
    setNewPersonRole(categories[0]?.key ?? "student");
    setNewPersonAuthorized(true);
  };

  const handleCreatePersonFromLog = async () => {
    if (!editLog || !newPersonName.trim()) return;
    setNewPersonSaving(true);
    try {
      await personsApi.createFromLog({
        log_id: editLog.id,
        name: newPersonName.trim(),
        role: newPersonRole,
        is_authorized: newPersonAuthorized,
      });
      // Refresh data
      personsApi.list().then((r) => setPersons(r.data)).catch(() => {});
      load();
      setEditLog(null);
    } catch (err: any) {
      alert(err.response?.data?.detail || "Erro ao cadastrar pessoa");
    } finally {
      setNewPersonSaving(false);
    }
  };

  const handleSaveLog = async () => {
    if (!editLog) return;
    setEditSaving(true);
    try {
      const data: { person_id?: number; notes?: string } = {};
      if (editPersonId !== editLog.person_id && editPersonId !== null) {
        data.person_id = editPersonId;
      }
      if (editNotes !== (editLog.notes ?? "")) {
        data.notes = editNotes;
      }
      if (Object.keys(data).length > 0) {
        await logsApi.update(editLog.id, data);
        load();
      }
      setEditLog(null);
    } finally {
      setEditSaving(false);
    }
  };

  const filteredPersons = editSearch
    ? persons.filter((p) => {
        const q = editSearch.toLowerCase();
        if (p.name.toLowerCase().includes(q)) return true;
        const cd = p.custom_data ?? {};
        return Object.values(cd).some((v) => v?.toLowerCase().includes(q));
      })
    : persons;

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
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
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

        {/* Camera filter */}
        <div className="sm:ml-auto">
          <select
            value={cameraFilter ?? ""}
            onChange={(e) => setCameraFilter(e.target.value ? Number(e.target.value) : null)}
            className="input-field text-sm py-1.5"
          >
            <option value="">Todas as câmeras</option>
            {cameras.map((cam) => (
              <option key={cam.id} value={cam.id}>
                {cam.name}
              </option>
            ))}
          </select>
        </div>
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
                  <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3">Status</th>
                  <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3">Pessoa</th>
                  <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3">Câmera</th>
                  <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3">Confiança</th>
                  <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3">Data/Hora</th>
                  <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3">Ações</th>
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
                          {categoryLabels[log.person_role] ?? log.person_role}
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
                      <div className="flex items-center gap-1">
                        {log.photo_path && (
                          <button
                            onClick={() => setSelectedPhoto(getPhotoUrl(log.photo_path!))}
                            className="p-1 text-navy-600 hover:text-navy-700 hover:bg-slate-100 rounded transition-colors"
                            title="Ver foto"
                          >
                            <PhotoIcon className="w-4 h-4" />
                          </button>
                        )}
                        {canEdit && (
                          <button
                            onClick={() => openEditLog(log)}
                            className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                            title="Editar registro"
                          >
                            <PencilIcon className="w-4 h-4" />
                          </button>
                        )}
                      </div>
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
            <img src={selectedPhoto} alt="Captura" className="w-full rounded-xl shadow-2xl" />
          </div>
        </div>
      )}

      {/* Edit log modal */}
      {editLog && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 sticky top-0 bg-white rounded-t-2xl z-10">
              <h2 className="font-bold text-slate-800">Editar Registro</h2>
              <button onClick={() => setEditLog(null)} className="text-slate-400 hover:text-slate-600">
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            <div className="px-6 py-4 space-y-4">
              {/* Log photo */}
              {editLog.photo_path && (
                <div className="rounded-xl overflow-hidden border border-slate-200">
                  <img
                    src={getPhotoUrl(editLog.photo_path)}
                    alt="Captura do log"
                    className="w-full h-48 object-cover"
                  />
                </div>
              )}

              {/* Current info */}
              <div className="flex items-center gap-3 text-sm text-slate-500">
                <span>
                  {format(new Date(editLog.timestamp), "dd/MM/yyyy 'às' HH:mm:ss", { locale: ptBR })}
                </span>
                <span>|</span>
                <span>{editLog.camera_name ?? "Câmera desconhecida"}</span>
              </div>

              {/* Person assignment */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  <UserPlusIcon className="w-4 h-4 inline mr-1" />
                  Vincular pessoa
                </label>

                <div className="relative mb-2">
                  <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    className="input-field pl-9 text-sm"
                    placeholder="Buscar por nome ou matrícula..."
                    value={editSearch}
                    onChange={(e) => setEditSearch(e.target.value)}
                  />
                </div>

                <div className="border border-slate-200 rounded-xl max-h-48 overflow-y-auto divide-y divide-slate-100">
                  <button
                    onClick={() => setEditPersonId(null)}
                    className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                      editPersonId === null
                        ? "bg-blue-50 text-blue-700 font-medium"
                        : "text-slate-500 hover:bg-slate-50"
                    }`}
                  >
                    Nenhuma pessoa (desconhecido)
                  </button>

                  {filteredPersons.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => setEditPersonId(p.id)}
                      className={`w-full text-left px-3 py-2 flex items-center gap-3 transition-colors ${
                        editPersonId === p.id
                          ? "bg-blue-50 text-blue-700"
                          : "hover:bg-slate-50"
                      }`}
                    >
                      {p.photo_path ? (
                        <img src={getPhotoUrl(p.photo_path)} alt="" className="w-8 h-8 rounded-full object-cover" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-400">
                          {p.name.charAt(0)}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{p.name}</p>
                        <p className="text-xs text-slate-400">
                          {categoryLabels[p.role] ?? p.role}
                        </p>
                      </div>
                      {editPersonId === p.id && (
                        <CheckCircleIcon className="w-5 h-5 text-blue-500 flex-shrink-0" />
                      )}
                    </button>
                  ))}

                  {filteredPersons.length === 0 && (
                    <p className="px-3 py-4 text-sm text-slate-400 text-center">Nenhuma pessoa encontrada</p>
                  )}
                </div>

                {/* Create new person button / form */}
                {editLog?.photo_path && !showNewPerson && (
                  <button
                    type="button"
                    onClick={() => setShowNewPerson(true)}
                    className="mt-2 w-full flex items-center justify-center gap-2 px-3 py-2 border-2 border-dashed border-slate-200 rounded-xl text-sm text-slate-500 hover:border-navy-400 hover:text-navy-600 transition-colors"
                  >
                    <UserPlusIcon className="w-4 h-4" />
                    Cadastrar nova pessoa com esta foto
                  </button>
                )}

                {showNewPerson && (
                  <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-xl space-y-3">
                    <p className="text-xs font-semibold text-blue-800">Nova pessoa (usando foto deste log)</p>
                    <input
                      className="input-field text-sm"
                      value={newPersonName}
                      onChange={(e) => setNewPersonName(e.target.value)}
                      placeholder="Nome completo *"
                      required
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <select
                        className="input-field text-sm"
                        value={newPersonRole}
                        onChange={(e) => setNewPersonRole(e.target.value)}
                      >
                        {categories.map((cat) => (
                          <option key={cat.key} value={cat.key}>{cat.label}</option>
                        ))}
                      </select>
                      <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={newPersonAuthorized}
                          onChange={(e) => setNewPersonAuthorized(e.target.checked)}
                          className="w-4 h-4 text-navy-600 rounded"
                        />
                        Autorizado
                      </label>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={handleCreatePersonFromLog}
                        disabled={newPersonSaving || !newPersonName.trim()}
                        className="btn-primary flex-1 text-sm py-1.5"
                      >
                        {newPersonSaving ? "Salvando..." : "Cadastrar e vincular"}
                      </button>
                      <button
                        onClick={() => setShowNewPerson(false)}
                        className="btn-secondary text-sm py-1.5 px-3"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Observações</label>
                <textarea
                  className="input-field text-sm"
                  rows={2}
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="Adicionar observação..."
                />
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button onClick={handleSaveLog} disabled={editSaving} className="btn-primary flex-1">
                  {editSaving ? "Salvando..." : "Salvar"}
                </button>
                <button onClick={() => setEditLog(null)} className="btn-secondary flex-1">
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
