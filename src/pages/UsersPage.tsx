import React, { useEffect, useState } from "react";
import { authApi } from "../services/api";
import { User } from "../types";
import {
  PlusIcon,
  TrashIcon,
  PencilIcon,
  UserGroupIcon,
  XMarkIcon,
  EyeIcon,
  EyeSlashIcon,
  ShieldCheckIcon,
  ShieldExclamationIcon,
  PaperAirplaneIcon,
  BellAlertIcon,
  BellSlashIcon,
} from "@heroicons/react/24/outline";

const ROLE_LABELS: Record<string, string> = {
  admin: "Administrador",
  gerente: "Gerente",
  configurador: "Configurador",
  visualizador: "Visualizador",
};

const ROLE_COLORS: Record<string, string> = {
  admin: "bg-red-100 text-red-700",
  gerente: "bg-purple-100 text-purple-700",
  configurador: "bg-yellow-100 text-yellow-700",
  visualizador: "bg-blue-100 text-blue-700",
};

const ROLE_AVATAR: Record<string, string> = {
  admin: "bg-red-500",
  gerente: "bg-purple-500",
  configurador: "bg-yellow-500",
  visualizador: "bg-blue-500",
};

const ROLE_DESCRIPTIONS: Record<string, string> = {
  gerente: "Acesso total, configura tudo e visualiza relatórios",
  configurador: "Pode ver câmeras, logs e gerenciar pessoas",
  visualizador: "Pode apenas ver câmeras e logs",
};

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [pageLoading, setPageLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formPassword, setFormPassword] = useState("");
  const [formRole, setFormRole] = useState("visualizador");
  const [formTelegramId, setFormTelegramId] = useState("");
  const [formTelegramActive, setFormTelegramActive] = useState(false);

  const load = () =>
    authApi.listUsers().then((r) => setUsers(r.data)).finally(() => setPageLoading(false));

  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setEditUser(null);
    setFormName(""); setFormEmail(""); setFormPassword("");
    setFormRole("visualizador");
    setFormTelegramId(""); setFormTelegramActive(false);
    setShowPassword(false); setError("");
    setShowForm(true);
  };

  const openEdit = (u: User) => {
    setEditUser(u);
    setFormName(u.name);
    setFormEmail(u.email);
    setFormPassword("");
    setFormRole(u.role);
    setFormTelegramId(u.telegram_chat_id ?? "");
    setFormTelegramActive(u.telegram_active);
    setShowPassword(false); setError("");
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      if (editUser) {
        await authApi.updateUser(editUser.id, {
          name: formName,
          role: formRole,
          telegram_chat_id: formTelegramId.trim() || undefined,
          telegram_active: formTelegramId.trim() ? formTelegramActive : false,
        });
      } else {
        await authApi.createUser({
          name: formName,
          email: formEmail,
          password: formPassword,
          role: formRole,
          telegram_chat_id: formTelegramId.trim() || undefined,
          telegram_active: formTelegramId.trim() ? formTelegramActive : false,
        });
      }
      setShowForm(false);
      load();
    } catch (err: any) {
      const detail = err.response?.data?.detail;
      if (typeof detail === "string") setError(detail);
      else if (Array.isArray(detail)) setError(detail.map((d: any) => d.msg).join(", "));
      else setError("Erro ao salvar");
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
    try { await authApi.deleteUser(id); load(); }
    catch (err: any) { alert(err.response?.data?.detail || "Erro ao remover"); }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Usuários</h1>
          <p className="text-slate-500 text-sm mt-1">Gerencie contas e notificações Telegram</p>
        </div>
        <button onClick={openCreate} className="btn-primary flex items-center gap-2">
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
              <li><strong>Gerente</strong> — acesso total, configura tudo e gera relatórios</li>
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
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold ${ROLE_AVATAR[u.role] ?? "bg-blue-500"}`}>
                  {u.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-800 truncate">
                    {u.name}
                    {!u.is_active && <span className="ml-2 text-xs text-red-500 font-normal">(desativado)</span>}
                  </p>
                  <div className="flex items-center gap-2">
                    <p className="text-xs text-slate-400 truncate">{u.email}</p>
                    {u.telegram_active && (
                      <span className="flex items-center gap-0.5 text-[10px] text-blue-600">
                        <PaperAirplaneIcon className="w-3 h-3" /> Telegram
                      </span>
                    )}
                  </div>
                </div>
                <span className={`text-xs font-semibold px-3 py-1 rounded-full ${ROLE_COLORS[u.role]}`}>
                  {ROLE_LABELS[u.role]}
                </span>
                {u.role !== "admin" && (
                  <div className="flex gap-1">
                    <button
                      onClick={() => openEdit(u)}
                      className="p-1.5 text-slate-400 hover:text-blue-600 rounded hover:bg-blue-50 transition-colors"
                      title="Editar"
                    >
                      <PencilIcon className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleToggle(u.id)}
                      className="p-1.5 text-slate-400 hover:text-yellow-600 rounded hover:bg-yellow-50 transition-colors"
                      title={u.is_active ? "Desativar" : "Ativar"}
                    >
                      {u.is_active ? <ShieldExclamationIcon className="w-4 h-4" /> : <ShieldCheckIcon className="w-4 h-4" />}
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

      {/* Create/Edit user modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 sticky top-0 bg-white rounded-t-2xl z-10">
              <h2 className="font-bold text-slate-800">
                {editUser ? "Editar Usuário" : "Novo Usuário"}
              </h2>
              <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600">
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>
              )}

              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nome completo</label>
                <input
                  className="input-field"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Nome do usuário"
                  required
                />
              </div>

              {/* Email (only on create) */}
              {!editUser && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                  <input
                    type="email"
                    className="input-field"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    placeholder="email@escola.com"
                    required
                  />
                </div>
              )}

              {/* Password (only on create) */}
              {!editUser && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Senha</label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      className="input-field pr-10"
                      value={formPassword}
                      onChange={(e) => setFormPassword(e.target.value)}
                      placeholder="Mínimo 6 caracteres"
                      required
                      minLength={6}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showPassword ? <EyeSlashIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              )}

              {/* Role */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Função</label>
                <select
                  className="input-field"
                  value={formRole}
                  onChange={(e) => setFormRole(e.target.value)}
                  disabled={editUser?.role === "admin"}
                >
                  <option value="visualizador">Visualizador</option>
                  <option value="configurador">Configurador</option>
                  <option value="gerente">Gerente</option>
                </select>
                <p className="text-xs text-slate-400 mt-1">{ROLE_DESCRIPTIONS[formRole]}</p>
              </div>

              {/* Telegram section */}
              <div className="border-t border-slate-100 pt-4">
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 mb-3">
                  <PaperAirplaneIcon className="w-4 h-4" />
                  Notificações Telegram
                </h3>

                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Chat ID do Telegram</label>
                    <input
                      className="input-field text-sm font-mono"
                      value={formTelegramId}
                      onChange={(e) => setFormTelegramId(e.target.value)}
                      placeholder="Ex: 6658075901"
                    />
                    <p className="text-xs text-slate-400 mt-1">
                      O usuário deve enviar <code>/start</code> para o @RecoFaceBot para obter seu Chat ID
                    </p>
                  </div>

                  <label className="flex items-center justify-between cursor-pointer">
                    <div>
                      <p className="text-sm font-medium text-slate-700">Receber alertas</p>
                      <p className="text-xs text-slate-400">Logs com foto, horário e descrição pelo Telegram</p>
                    </div>
                    <div className="relative">
                      <input
                        type="checkbox"
                        checked={formTelegramActive}
                        onChange={(e) => setFormTelegramActive(e.target.checked)}
                        disabled={!formTelegramId}
                        className="sr-only peer"
                      />
                      <div className={`w-11 h-6 rounded-full transition-colors ${formTelegramActive && formTelegramId ? "bg-blue-500" : "bg-slate-200"}`}>
                        <div className={`w-5 h-5 bg-white rounded-full shadow-sm transform transition-transform mt-0.5 ${formTelegramActive && formTelegramId ? "translate-x-[22px]" : "translate-x-0.5"}`} />
                      </div>
                    </div>
                  </label>

                  {formTelegramActive && formTelegramId && (
                    <div className="flex items-center gap-2 p-2 bg-green-50 border border-green-200 rounded-lg">
                      <BellAlertIcon className="w-4 h-4 text-green-600" />
                      <p className="text-xs text-green-700">Este usuário receberá alertas no Telegram</p>
                    </div>
                  )}

                  {formTelegramId && !formTelegramActive && (
                    <div className="flex items-center gap-2 p-2 bg-slate-50 border border-slate-200 rounded-lg">
                      <BellSlashIcon className="w-4 h-4 text-slate-400" />
                      <p className="text-xs text-slate-500">Telegram vinculado mas notificações pausadas</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={loading} className="btn-primary flex-1">
                  {loading ? "Salvando..." : editUser ? "Salvar Alterações" : "Criar Usuário"}
                </button>
                <button type="button" onClick={() => setShowForm(false)} className="btn-secondary flex-1">
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
