import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { logsApi, camerasApi } from "../services/api";
import { Stats, RecognitionLog, Camera } from "../types";
import {
  UsersIcon,
  VideoCameraIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ShieldCheckIcon,
  ClockIcon,
} from "@heroicons/react/24/outline";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import CameraFeed from "../components/CameraFeed";

function StatCard({
  title,
  value,
  icon: Icon,
  color,
  sub,
}: {
  title: string;
  value: number | string;
  icon: React.ElementType;
  color: string;
  sub?: string;
}) {
  return (
    <div className="card flex items-center gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
        <Icon className="w-6 h-6 text-white" />
      </div>
      <div>
        <p className="text-2xl font-bold text-slate-800">{value}</p>
        <p className="text-sm text-slate-500">{title}</p>
        {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

function StatCardSkeleton() {
  return (
    <div className="card flex items-center gap-4 animate-pulse">
      <div className="w-12 h-12 rounded-xl bg-slate-200 flex-shrink-0" />
      <div className="space-y-2">
        <div className="h-6 w-16 bg-slate-200 rounded" />
        <div className="h-4 w-24 bg-slate-100 rounded" />
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [recentLogs, setRecentLogs] = useState<RecognitionLog[]>([]);
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [pageLoading, setPageLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      logsApi.stats().then((r) => setStats(r.data)),
      logsApi.list({ limit: 10 }).then((r) => setRecentLogs(r.data)),
      camerasApi.list().then((r) => setCameras(r.data)),
    ]).finally(() => setPageLoading(false));

    const interval = setInterval(() => {
      logsApi.stats().then((r) => setStats(r.data));
      logsApi.list({ limit: 10 }).then((r) => setRecentLogs(r.data));
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const activeCameras = cameras.filter((c) => c.is_active);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Painel de Controle</h1>
        <p className="text-slate-500 text-sm mt-1">
          Visão geral do sistema de reconhecimento facial
        </p>
      </div>

      {/* Stats */}
      {pageLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => <StatCardSkeleton key={i} />)}
        </div>
      ) : stats ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <StatCard
            title="Total de Detecções"
            value={stats.total_detections}
            icon={ShieldCheckIcon}
            color="bg-navy-600"
          />
          <StatCard
            title="Reconhecidos"
            value={stats.recognized}
            icon={CheckCircleIcon}
            color="bg-green-500"
            sub={`${stats.authorized} autorizados`}
          />
          <StatCard
            title="Alertas"
            value={stats.alerts}
            icon={ExclamationTriangleIcon}
            color="bg-red-500"
            sub="Não identificados"
          />
          <StatCard
            title="Câmeras"
            value={`${stats.active_cameras}/${stats.total_cameras}`}
            icon={VideoCameraIcon}
            color="bg-blue-500"
            sub="ativas"
          />
        </div>
      ) : null}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Camera feeds */}
        <div className="xl:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-slate-700">Câmeras Ativas</h2>
            <Link to="/cameras" className="text-sm text-navy-600 hover:underline font-medium">
              Gerenciar →
            </Link>
          </div>
          {pageLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[1, 2].map((i) => (
                <div key={i} className="card p-0 overflow-hidden animate-pulse">
                  <div className="h-48 bg-slate-200" />
                  <div className="p-3 space-y-2">
                    <div className="h-4 w-32 bg-slate-200 rounded" />
                    <div className="h-3 w-20 bg-slate-100 rounded" />
                  </div>
                </div>
              ))}
            </div>
          ) : cameras.length === 0 ? (
            <div className="card text-center py-10 text-slate-400">
              <VideoCameraIcon className="w-12 h-12 mx-auto mb-2 opacity-30" />
              <p className="font-medium">Nenhuma câmera cadastrada</p>
              <Link to="/cameras" className="mt-3 btn-primary inline-block text-sm">
                Adicionar Câmera
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {cameras.slice(0, 4).map((cam) => (
                <CameraFeed key={cam.id} camera={cam} />
              ))}
            </div>
          )}
        </div>

        {/* Recent logs */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-slate-700">Eventos Recentes</h2>
            <Link to="/logs" className="text-sm text-navy-600 hover:underline font-medium">
              Ver todos →
            </Link>
          </div>
          <div className="card p-0 overflow-hidden">
            {pageLoading ? (
              <div className="divide-y divide-slate-100">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="flex items-start gap-3 px-4 py-3 animate-pulse">
                    <div className="mt-0.5 w-2 h-2 rounded-full bg-slate-200 flex-shrink-0" />
                    <div className="flex-1 space-y-1.5">
                      <div className="h-4 w-28 bg-slate-200 rounded" />
                      <div className="h-3 w-20 bg-slate-100 rounded" />
                    </div>
                    <div className="h-3 w-14 bg-slate-100 rounded" />
                  </div>
                ))}
              </div>
            ) : recentLogs.length === 0 ? (
              <div className="py-10 text-center text-slate-400">
                <ClockIcon className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm">Nenhum evento registrado</p>
              </div>
            ) : (
              <ul className="divide-y divide-slate-100">
                {recentLogs.map((log) => (
                  <li key={log.id} className="flex items-start gap-3 px-4 py-3">
                    <div
                      className={`mt-0.5 w-2 h-2 rounded-full flex-shrink-0 ${
                        log.recognized && log.is_authorized
                          ? "bg-green-500"
                          : log.recognized && !log.is_authorized
                          ? "bg-yellow-500"
                          : "bg-red-500"
                      }`}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">
                        {log.person_name ?? "Desconhecido"}
                      </p>
                      <p className="text-xs text-slate-400 truncate">
                        {log.camera_name ?? "Câmera desconhecida"}
                        {log.person_role && ` · ${log.person_role}`}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <span
                        className={`text-xs font-medium ${
                          log.recognized && log.is_authorized
                            ? "text-green-600"
                            : "text-red-600"
                        }`}
                      >
                        {log.recognized
                          ? log.is_authorized
                            ? "Autorizado"
                            : "Não Aut."
                          : "Alerta"}
                      </span>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {format(new Date(log.timestamp), "HH:mm:ss", { locale: ptBR })}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
