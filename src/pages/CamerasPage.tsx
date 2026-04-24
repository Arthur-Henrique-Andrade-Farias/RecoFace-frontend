import React, { useEffect, useState } from "react";
import { camerasApi } from "../services/api";
import TutorialButton from "../components/TutorialButton";
import { Camera } from "../types";
import CameraFeed from "../components/CameraFeed";
import { useAuth } from "../context/AuthContext";
import {
  PlusIcon,
  TrashIcon,
  PencilIcon,
  VideoCameraIcon,
  WifiIcon,
  DevicePhoneMobileIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";

const CAMERA_TYPE_LABELS: Record<string, string> = {
  webcam: "Webcam",
  ip_camera: "Câmera IP",
  phone: "Celular",
};

const CAMERA_TYPE_ICONS: Record<string, React.ElementType> = {
  webcam: VideoCameraIcon,
  ip_camera: WifiIcon,
  phone: DevicePhoneMobileIcon,
};

interface FormState {
  name: string;
  camera_type: string;
  url: string;
  description: string;
  location: string;
}

const emptyForm: FormState = {
  name: "",
  camera_type: "webcam",
  url: "",
  description: "",
  location: "",
};

export default function CamerasPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editCamera, setEditCamera] = useState<Camera | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [activeFeeds, setActiveFeeds] = useState<Set<number>>(new Set());

  const load = () => camerasApi.list().then((r) => setCameras(r.data)).finally(() => setPageLoading(false));

  useEffect(() => {
    load();
  }, []);

  const openCreate = () => {
    setEditCamera(null);
    setForm(emptyForm);
    setShowForm(true);
  };

  const openEdit = (cam: Camera) => {
    setEditCamera(cam);
    setForm({
      name: cam.name,
      camera_type: cam.camera_type,
      url: cam.url ?? "",
      description: cam.description ?? "",
      location: cam.location ?? "",
    });
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        ...form,
        url: form.url || null,
        description: form.description || null,
        location: form.location || null,
      };
      if (editCamera) {
        await camerasApi.update(editCamera.id, payload);
      } else {
        await camerasApi.create(payload);
      }
      setShowForm(false);
      load();
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("Remover esta câmera?")) return;
    await camerasApi.delete(id);
    load();
  };

  const toggleFeed = (id: number) => {
    setActiveFeeds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Câmeras</h1>
          <p className="text-slate-500 text-sm mt-1">
            Gerencie e monitore as câmeras cadastradas
          </p>
        </div>
        <div className="flex items-center gap-2">
          <TutorialButton title="Câmeras" driveFileId="1YQcbxJVCygAEdz9FAooi2HRpi5HVWsmw" />
          {isAdmin && (
            <button onClick={openCreate} className="btn-primary flex items-center gap-2">
              <PlusIcon className="w-4 h-4" />
              Nova Câmera
            </button>
          )}
        </div>
      </div>

      {/* Camera grid */}
      {pageLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="card p-0 overflow-hidden animate-pulse">
              <div className="h-48 bg-slate-200" />
              <div className="p-4 space-y-2">
                <div className="h-5 w-32 bg-slate-200 rounded" />
                <div className="h-3 w-24 bg-slate-100 rounded" />
                <div className="flex gap-2 mt-3">
                  <div className="h-8 w-20 bg-slate-100 rounded-lg" />
                  <div className="h-8 w-20 bg-slate-100 rounded-lg" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : cameras.length === 0 ? (
        <div className="card text-center py-16 text-slate-400">
          <VideoCameraIcon className="w-16 h-16 mx-auto mb-3 opacity-30" />
          <p className="font-semibold text-slate-600 mb-1">Nenhuma câmera cadastrada</p>
          <p className="text-sm mb-4">Adicione uma câmera para começar o monitoramento</p>
          <button onClick={openCreate} className="btn-primary inline-flex items-center gap-2">
            <PlusIcon className="w-4 h-4" />
            Adicionar Câmera
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {cameras.map((cam) => {
            const TypeIcon = CAMERA_TYPE_ICONS[cam.camera_type] ?? VideoCameraIcon;
            const isFeedOpen = activeFeeds.has(cam.id);
            return (
              <div key={cam.id} className="card p-0 overflow-hidden">
                {/* Camera info header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-navy-50 rounded-lg flex items-center justify-center">
                      <TypeIcon className="w-4 h-4 text-navy-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-800 text-sm">{cam.name}</p>
                      <p className="text-xs text-slate-400">
                        {CAMERA_TYPE_LABELS[cam.camera_type]}
                        {cam.location && ` · ${cam.location}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => toggleFeed(cam.id)}
                      className={`text-xs px-3 py-1 rounded-full font-medium transition-colors ${
                        isFeedOpen
                          ? "bg-navy-600 text-white"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      {isFeedOpen ? "Fechar" : "Ver Feed"}
                    </button>
                    <button
                      onClick={() => openEdit(cam)}
                      className="p-1.5 text-slate-400 hover:text-navy-600 rounded-lg hover:bg-slate-50 transition-colors"
                    >
                      <PencilIcon className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(cam.id)}
                      className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {cam.description && (
                  <p className="px-4 py-2 text-xs text-slate-500 bg-slate-50 border-b border-slate-100">
                    {cam.description}
                  </p>
                )}

                {/* Live feed */}
                {isFeedOpen && (
                  <div className="p-4">
                    <CameraFeed camera={cam} />
                  </div>
                )}

                {!isFeedOpen && (
                  <div
                    className="flex items-center justify-center bg-slate-900 text-slate-600 cursor-pointer hover:text-slate-400 transition-colors"
                    style={{ aspectRatio: "16/9" }}
                    onClick={() => toggleFeed(cam.id)}
                  >
                    <div className="text-center">
                      <VideoCameraIcon className="w-12 h-12 mx-auto mb-2 opacity-20" />
                      <p className="text-xs opacity-40">Clique para ver o feed</p>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h2 className="font-bold text-slate-800">
                {editCamera ? "Editar Câmera" : "Nova Câmera"}
              </h2>
              <button
                onClick={() => setShowForm(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Nome *
                </label>
                <input
                  className="input-field"
                  placeholder="Ex: Entrada Principal"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Tipo *
                </label>
                <select
                  className="input-field"
                  value={form.camera_type}
                  onChange={(e) => setForm({ ...form, camera_type: e.target.value })}
                >
                  <option value="webcam">Webcam do Computador</option>
                  <option value="ip_camera">Câmera IP / Segurança</option>
                  <option value="phone">Câmera de Celular</option>
                </select>
              </div>
              {form.camera_type === "ip_camera" && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    URL (RTSP / HTTP)
                  </label>
                  <input
                    className="input-field"
                    placeholder="rtsp://usuario:senha@192.168.1.100/stream"
                    value={form.url}
                    onChange={(e) => setForm({ ...form, url: e.target.value })}
                  />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Localização
                </label>
                <input
                  className="input-field"
                  placeholder="Ex: Portaria, Corredor B"
                  value={form.location}
                  onChange={(e) => setForm({ ...form, location: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Descrição
                </label>
                <textarea
                  className="input-field resize-none"
                  rows={2}
                  placeholder="Descrição opcional..."
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={loading} className="btn-primary flex-1">
                  {loading ? "Salvando..." : editCamera ? "Atualizar" : "Cadastrar"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="btn-secondary flex-1"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
