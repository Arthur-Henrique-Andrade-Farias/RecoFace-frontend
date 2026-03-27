import React, { useEffect, useState } from "react";
import { authApi } from "../services/api";
import { User } from "../types";
import {
  PlusIcon,
  TrashIcon,
  UserGroupIcon,
  XMarkIcon,
  EyeIcon,
  EyeSlashIcon,
  ShieldCheckIcon,
  ShieldExclamationIcon,
} from "@heroicons/react/24/outline";

const ROLE_LABELS: Record<string, string> = {
  admin: "Administrador",
  configurador: "Configurador",
  visualizador: "Visualizador",
};

const ROLE_COLORS: Record<string, string> = {
  admin: "bg-red-100 text-red-700",
  configurador: "bg-yellow-100 text-yellow-700",
  visualizador: "bg-blue-100 text-blue-700",
};

const ROLE_DESCRIPTIONS: Record<string, string> = {
  configurador: "Pode ver câmeras, logs e gerenciar pessoas",
  visualizador: "Pode apenas ver câmeras e logs",
};

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [pageLoading, setPageLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "visualizador",
  });
  const [error, setError] = useState("");

  const load = () =>
    authApi
      .listUsers()
      .then((r) => setUsers(r.data))
      .finally(() => setPageLoading(false));

  useEffect(() => {
    load();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await authApi.createUser(form);
      setShowForm(false);
      setForm({ name: "", email: "", password: "", role: "visualizador" });
      load();
    } catch (err: any) {
      const detail = err.response?.data?.detail;
      if (typeof detail === "string") setError(detail);
      else if (Array.isArray(detail)) setError(detail.map((d: any) => d.msg).join(", "));
      else setError("Erro ao criar usuário");
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (id: number) => {
    await authApi.toggleUser(id);
    load();
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("Remover este usuário permanentemente?")) return;
    try {
      await authApi.deleteUser(id);
      load();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Erro ao remover");
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Usuários</h1>
          <p className="text-slate-500 text-sm mt-1">
            Gerencie contas de vigias e porteiros
          </p>
        </div>
        <button
          onClick={() => {
            setShowForm(true);
            setError("");
          }}
          className="btn-primary flex items-center gap-2"
        >
          <PlusIcon className="w-4 h-4" />
          Novo Usuário
        </button>
      </div>

      {/* Info */}
      <div className="card bg-blue-50 border border-blue-200">
        <div className="flex gap-3">
          <ShieldCheckIcon className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-800">
            <p className="font-semibold">Tipos de conta</p>
            <ul className="mt-1 space-y-0.5 text-blue-700">
              <li><strong>Administrador</strong> — acesso total (criado apenas pelo banco de dados)</li>
              <li><strong>Configurador</strong> — visualiza câmeras/logs, gerencia pessoas e edita logs</li>
              <li><strong>Visualizador</strong> — visualiza câmeras e logs (somente leitura)</li>
            </ul>
          </div>
        </div>
      </div>

      {/* User list */}
      <div className="card p-0 overflow-hidden">
        {pageLoading ? (
          <div className="divide-y divide-slate-100">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-4 px-6 py-4 animate-pulse">
                <div className="w-10 h-10 bg-slate-200 rounded-full" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-40 bg-slate-200 rounded" />
                  <div className="h-3 w-28 bg-slate-100 rounded" />
                </div>
                <div className="h-6 w-20 bg-slate-100 rounded-full" />
              </div>
            ))}
          </div>
        ) : users.length === 0 ? (
          <div className="py-16 text-center text-slate-400">
            <UserGroupIcon className="w-16 h-16 mx-auto mb-3 opacity-30" />
            <p className="font-medium text-slate-600">Nenhum usuário cadastrado</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {users.map((u) => (
              <div
                key={u.id}
                className={`flex items-center gap-4 px-6 py-4 transition-colors ${
                  !u.is_active ? "opacity-50 bg-slate-50" : "hover:bg-slate-50"
                }`}
              >
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold ${
                    u.role === "admin"
                      ? "bg-red-500"
                      : u.role === "configurador"
                      ? "bg-yellow-500"
                      : "bg-blue-500"
                  }`}
                >
                  {u.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-800 truncate">
                    {u.name}
                    {!u.is_active && (
                      <span className="ml-2 text-xs text-red-500 font-normal">(desativado)</span>
                    )}
                  </p>
                  <p className="text-xs text-slate-400 truncate">{u.email}</p>
                </div>
                <span
                  className={`text-xs font-semibold px-3 py-1 rounded-full ${ROLE_COLORS[u.role]}`}
                >
                  {ROLE_LABELS[u.role]}
                </span>
                {u.role !== "admin" && (
                  <div className="flex gap-1">
                    <button
                      onClick={() => handleToggle(u.id)}
                      className="p-1.5 text-slate-400 hover:text-yellow-600 rounded hover:bg-yellow-50 transition-colors"
                      title={u.is_active ? "Desativar" : "Ativar"}
                    >
                      {u.is_active ? (
                        <ShieldExclamationIcon className="w-4 h-4" />
                      ) : (
                        <ShieldCheckIcon className="w-4 h-4" />
                      )}
                    </button>
                    <button
                      onClick={() => handleDelete(u.id)}
                      className="p-1.5 text-slate-400 hover:text-red-600 rounded hover:bg-red-50 transition-colors"
                      title="Remover"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create user modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h2 className="font-bold text-slate-800">Novo Usuário</h2>
              <button
                onClick={() => setShowForm(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Nome completo
                </label>
                <input
                  className="input-field"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Nome do usuário"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  className="input-field"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="email@escola.com"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Senha
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    className="input-field pr-10"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    placeholder="Mínimo 6 caracteres"
                    required
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? (
                      <EyeSlashIcon className="w-4 h-4" />
                    ) : (
                      <EyeIcon className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Função
                </label>
                <select
                  className="input-field"
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                >
                  <option value="visualizador">Visualizador</option>
                  <option value="configurador">Configurador</option>
                </select>
                <p className="text-xs text-slate-400 mt-1">
                  {ROLE_DESCRIPTIONS[form.role]}
                </p>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={loading} className="btn-primary flex-1">
                  {loading ? "Criando..." : "Criar Usuário"}
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
