import React, { useEffect, useState, useRef } from "react";
import { categoriesApi, fieldsApi, authApi, telegramApi } from "../services/api";
import { PersonCategory, PersonField } from "../types";
import { useAuth } from "../context/AuthContext";
import {
  PlusIcon,
  TrashIcon,
  PencilIcon,
  XMarkIcon,
  TagIcon,
  Squares2X2Icon,
  CheckIcon,
  SwatchIcon,
  PaintBrushIcon,
  ShieldCheckIcon,
  PaperAirplaneIcon,
  LinkIcon,
  BellAlertIcon,
  BellSlashIcon,
} from "@heroicons/react/24/outline";

const COLORS = [
  { value: "blue", label: "Azul", bg: "bg-blue-500" },
  { value: "green", label: "Verde", bg: "bg-green-500" },
  { value: "yellow", label: "Amarelo", bg: "bg-yellow-500" },
  { value: "red", label: "Vermelho", bg: "bg-red-500" },
  { value: "purple", label: "Roxo", bg: "bg-purple-500" },
  { value: "pink", label: "Rosa", bg: "bg-pink-500" },
  { value: "indigo", label: "Índigo", bg: "bg-indigo-500" },
];

type Tab = "branding" | "categories" | "fields" | "telegram";

export default function SettingsPage() {
  const { branding, refreshBranding } = useAuth();
  const [tab, setTab] = useState<Tab>("branding");

  // ─── Branding ──────────────────────────────────────────────────────────────
  const [brandName, setBrandName] = useState(branding.brand_name);
  const [brandSubtitle, setBrandSubtitle] = useState(branding.brand_subtitle);
  const [brandSaving, setBrandSaving] = useState(false);
  const [brandSuccess, setBrandSuccess] = useState("");
  const [logoUploading, setLogoUploading] = useState(false);
  const logoRef = useRef<HTMLInputElement>(null);

  const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:8000";
  const logoUrl = branding.brand_logo_url ? `${API_BASE}${branding.brand_logo_url}` : null;

  useEffect(() => {
    setBrandName(branding.brand_name);
    setBrandSubtitle(branding.brand_subtitle);
  }, [branding]);

  const handleBrandingSave = async () => {
    setBrandSaving(true);
    setBrandSuccess("");
    try {
      await authApi.updateBranding({ brand_name: brandName, brand_subtitle: brandSubtitle });
      await refreshBranding();
      setBrandSuccess("Configurações salvas!");
      setTimeout(() => setBrandSuccess(""), 3000);
    } catch {
      alert("Erro ao salvar");
    } finally {
      setBrandSaving(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoUploading(true);
    try {
      const fd = new FormData();
      fd.append("logo", file);
      await authApi.uploadLogo(fd);
      await refreshBranding();
    } catch {
      alert("Erro ao enviar logo");
    } finally {
      setLogoUploading(false);
      if (logoRef.current) logoRef.current.value = "";
    }
  };

  // ─── Telegram ──────────────────────────────────────────────────────────────
  const [tgConfig, setTgConfig] = useState<{
    bot_token_set: boolean; bot_username: string | null;
    notify_unrecognized: boolean; notify_recognized: boolean;
  } | null>(null);
  const [tgMe, setTgMe] = useState<{ telegram_chat_id: string | null; telegram_active: boolean } | null>(null);
  const [tgToken, setTgToken] = useState("");
  const [tgChatId, setTgChatId] = useState("");
  const [tgSaving, setTgSaving] = useState(false);
  const [tgMsg, setTgMsg] = useState("");

  const loadTelegram = () => {
    telegramApi.getConfig().then((r) => setTgConfig(r.data)).catch(() => {});
    telegramApi.getMe().then((r) => setTgMe(r.data)).catch(() => {});
  };

  useEffect(() => { loadTelegram(); }, []);

  const handleTgSaveToken = async () => {
    setTgSaving(true); setTgMsg("");
    try {
      const res = await telegramApi.updateConfig({ bot_token: tgToken });
      setTgConfig(res.data);
      setTgToken("");
      setTgMsg("Bot configurado!");
    } catch (err: any) {
      setTgMsg(err.response?.data?.detail || "Erro");
    } finally { setTgSaving(false); }
  };

  const handleTgLink = async () => {
    setTgSaving(true); setTgMsg("");
    try {
      const res = await telegramApi.link(tgChatId);
      setTgMe(res.data);
      setTgChatId("");
      setTgMsg("Telegram vinculado!");
    } catch (err: any) {
      setTgMsg(err.response?.data?.detail || "Erro ao vincular");
    } finally { setTgSaving(false); }
  };

  const handleTgUnlink = async () => {
    const res = await telegramApi.unlink();
    setTgMe(res.data);
    setTgMsg("Telegram desvinculado");
  };

  const handleTgToggle = async () => {
    const res = await telegramApi.toggle();
    setTgMe(res.data);
  };

  const handleTgTest = async () => {
    setTgMsg("");
    try {
      await telegramApi.test();
      setTgMsg("Mensagem de teste enviada!");
    } catch (err: any) {
      setTgMsg(err.response?.data?.detail || "Erro ao enviar teste");
    }
  };

  const handleTgNotifyToggle = async (field: "notify_unrecognized" | "notify_recognized", value: boolean) => {
    const res = await telegramApi.updateConfig({ [field]: value });
    setTgConfig(res.data);
  };

  // ─── Categories ────────────────────────────────────────────────────────────
  const [categories, setCategories] = useState<PersonCategory[]>([]);
  const [catLoading, setCatLoading] = useState(true);
  const [catForm, setCatForm] = useState({ key: "", label: "", color: "blue", sort_order: 0 });
  const [catEdit, setCatEdit] = useState<PersonCategory | null>(null);
  const [catShow, setCatShow] = useState(false);
  const [catSaving, setCatSaving] = useState(false);
  const [catError, setCatError] = useState("");

  const loadCategories = () =>
    categoriesApi.list().then((r) => { setCategories(r.data); setCatLoading(false); }).catch(() => setCatLoading(false));

  useEffect(() => { loadCategories(); }, []);

  const openCatCreate = () => {
    setCatEdit(null);
    setCatForm({ key: "", label: "", color: "blue", sort_order: categories.length });
    setCatError("");
    setCatShow(true);
  };

  const openCatEdit = (c: PersonCategory) => {
    setCatEdit(c);
    setCatForm({ key: c.key, label: c.label, color: c.color, sort_order: c.sort_order });
    setCatError("");
    setCatShow(true);
  };

  const handleCatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCatSaving(true);
    setCatError("");
    try {
      if (catEdit) {
        await categoriesApi.update(catEdit.id, catForm);
      } else {
        await categoriesApi.create(catForm);
      }
      setCatShow(false);
      loadCategories();
    } catch (err: any) {
      setCatError(err.response?.data?.detail || "Erro ao salvar");
    } finally {
      setCatSaving(false);
    }
  };

  const handleCatDelete = async (id: number) => {
    if (!window.confirm("Remover esta categoria?")) return;
    try {
      await categoriesApi.delete(id);
      loadCategories();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Erro ao remover");
    }
  };

  // ─── Fields ────────────────────────────────────────────────────────────────
  const [fields, setFields] = useState<PersonField[]>([]);
  const [fldLoading, setFldLoading] = useState(true);
  const [fldForm, setFldForm] = useState({ key: "", label: "", required: false, sort_order: 0 });
  const [fldEdit, setFldEdit] = useState<PersonField | null>(null);
  const [fldShow, setFldShow] = useState(false);
  const [fldSaving, setFldSaving] = useState(false);
  const [fldError, setFldError] = useState("");

  const loadFields = () =>
    fieldsApi.list().then((r) => { setFields(r.data); setFldLoading(false); }).catch(() => setFldLoading(false));

  useEffect(() => { loadFields(); }, []);

  const openFldCreate = () => {
    setFldEdit(null);
    setFldForm({ key: "", label: "", required: false, sort_order: fields.length });
    setFldError("");
    setFldShow(true);
  };

  const openFldEdit = (f: PersonField) => {
    setFldEdit(f);
    setFldForm({ key: f.key, label: f.label, required: f.required, sort_order: f.sort_order });
    setFldError("");
    setFldShow(true);
  };

  const handleFldSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFldSaving(true);
    setFldError("");
    try {
      if (fldEdit) {
        await fieldsApi.update(fldEdit.id, fldForm);
      } else {
        await fieldsApi.create(fldForm);
      }
      setFldShow(false);
      loadFields();
    } catch (err: any) {
      setFldError(err.response?.data?.detail || "Erro ao salvar");
    } finally {
      setFldSaving(false);
    }
  };

  const handleFldDelete = async (id: number) => {
    if (!window.confirm("Remover este campo?")) return;
    try {
      await fieldsApi.delete(id);
      loadFields();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Erro ao remover");
    }
  };

  // Auto-generate key from label
  const autoKey = (label: string) =>
    label
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_|_$/g, "");

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Configurações</h1>
        <p className="text-slate-500 text-sm mt-1">
          Configure categorias de pessoas e campos do formulário de cadastro
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
        <button
          onClick={() => setTab("branding")}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
            tab === "branding" ? "bg-white text-navy-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
          }`}
        >
          <PaintBrushIcon className="w-4 h-4" />
          Aparência
        </button>
        <button
          onClick={() => setTab("categories")}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
            tab === "categories" ? "bg-white text-navy-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
          }`}
        >
          <TagIcon className="w-4 h-4" />
          Categorias
        </button>
        <button
          onClick={() => setTab("fields")}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
            tab === "fields" ? "bg-white text-navy-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
          }`}
        >
          <Squares2X2Icon className="w-4 h-4" />
          Campos
        </button>
        <button
          onClick={() => setTab("telegram")}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
            tab === "telegram" ? "bg-white text-navy-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
          }`}
        >
          <PaperAirplaneIcon className="w-4 h-4" />
          Telegram
        </button>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* BRANDING TAB                                                          */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {tab === "branding" && (
        <div className="space-y-4">
          <p className="text-sm text-slate-500">
            Personalize o nome, subtítulo e logo que aparecem na sidebar e na interface
          </p>

          <div className="card space-y-5">
            {/* Logo */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Logo</label>
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-xl bg-slate-100 border-2 border-dashed border-slate-200 flex items-center justify-center overflow-hidden flex-shrink-0">
                  {logoUrl ? (
                    <img src={logoUrl} alt="Logo" className="w-full h-full object-cover rounded-xl" />
                  ) : (
                    <ShieldCheckIcon className="w-8 h-8 text-slate-300" />
                  )}
                </div>
                <div>
                  <button
                    type="button"
                    onClick={() => logoRef.current?.click()}
                    disabled={logoUploading}
                    className="btn-secondary text-sm"
                  >
                    {logoUploading ? "Enviando..." : "Alterar logo"}
                  </button>
                  <p className="text-xs text-slate-400 mt-1">PNG, JPG, SVG - Recomendado: 200x200px</p>
                  <input ref={logoRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                </div>
              </div>
            </div>

            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Nome do sistema</label>
              <input
                className="input-field"
                value={brandName}
                onChange={(e) => setBrandName(e.target.value)}
                placeholder="RecoFace"
              />
              <p className="text-xs text-slate-400 mt-1">Aparece na sidebar e no topo das páginas</p>
            </div>

            {/* Subtitle */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Subtítulo</label>
              <input
                className="input-field"
                value={brandSubtitle}
                onChange={(e) => setBrandSubtitle(e.target.value)}
                placeholder="Monitorando vidas"
              />
              <p className="text-xs text-slate-400 mt-1">Aparece abaixo do nome na sidebar</p>
            </div>

            {/* Preview */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Pré-visualização</label>
              <div className="bg-navy-600 rounded-xl p-4 flex items-center gap-3 max-w-xs">
                {logoUrl ? (
                  <img src={logoUrl} alt="" className="w-10 h-10 rounded-xl object-cover" />
                ) : (
                  <div className="w-10 h-10 bg-blue-400 rounded-xl flex items-center justify-center flex-shrink-0">
                    <ShieldCheckIcon className="w-6 h-6 text-white" />
                  </div>
                )}
                <div>
                  <p className="text-white text-lg font-bold">{brandName || "RecoFace"}</p>
                  <p className="text-navy-200 text-xs">{brandSubtitle || "Monitorando vidas"}</p>
                </div>
              </div>
            </div>

            {/* Save */}
            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={handleBrandingSave}
                disabled={brandSaving}
                className="btn-primary"
              >
                {brandSaving ? "Salvando..." : "Salvar alterações"}
              </button>
              {brandSuccess && (
                <span className="text-sm text-green-600 font-medium flex items-center gap-1">
                  <CheckIcon className="w-4 h-4" /> {brandSuccess}
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* CATEGORIES TAB                                                        */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {tab === "categories" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-500">
              Defina as funções disponíveis ao cadastrar pessoas (ex: Aluno, Professor, Funcionário)
            </p>
            <button onClick={openCatCreate} className="btn-primary flex items-center gap-2">
              <PlusIcon className="w-4 h-4" />
              Nova Categoria
            </button>
          </div>

          <div className="card p-0 overflow-hidden">
            {catLoading ? (
              <div className="divide-y divide-slate-100">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-4 px-6 py-4 animate-pulse">
                    <div className="w-4 h-4 bg-slate-200 rounded-full" />
                    <div className="flex-1 space-y-1">
                      <div className="h-4 w-32 bg-slate-200 rounded" />
                      <div className="h-3 w-20 bg-slate-100 rounded" />
                    </div>
                  </div>
                ))}
              </div>
            ) : categories.length === 0 ? (
              <div className="py-12 text-center text-slate-400">
                <TagIcon className="w-12 h-12 mx-auto mb-2 opacity-30" />
                <p className="font-medium text-slate-600">Nenhuma categoria</p>
                <button onClick={openCatCreate} className="mt-3 btn-primary inline-flex items-center gap-2 text-sm">
                  <PlusIcon className="w-4 h-4" />
                  Criar primeira categoria
                </button>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {categories.map((cat) => (
                  <div key={cat.id} className="flex items-center gap-4 px-6 py-3 hover:bg-slate-50 transition-colors">
                    <span className={`w-3.5 h-3.5 rounded-full ${COLORS.find((c) => c.value === cat.color)?.bg ?? "bg-blue-500"}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800">{cat.label}</p>
                      <p className="text-xs text-slate-400">Chave: {cat.key}</p>
                    </div>
                    <span className="text-xs text-slate-400">Ordem: {cat.sort_order}</span>
                    <div className="flex gap-1">
                      <button
                        onClick={() => openCatEdit(cat)}
                        className="p-1.5 text-slate-400 hover:text-blue-600 rounded hover:bg-blue-50 transition-colors"
                      >
                        <PencilIcon className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleCatDelete(cat.id)}
                        className="p-1.5 text-slate-400 hover:text-red-600 rounded hover:bg-red-50 transition-colors"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* FIELDS TAB                                                            */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {tab === "fields" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">
                Campos extras que aparecem no formulário de cadastro de pessoas
              </p>
              <p className="text-xs text-slate-400 mt-0.5">
                Nome, Foto, Função e Autorização são campos fixos e sempre aparecem
              </p>
            </div>
            <button onClick={openFldCreate} className="btn-primary flex items-center gap-2">
              <PlusIcon className="w-4 h-4" />
              Novo Campo
            </button>
          </div>

          <div className="card p-0 overflow-hidden">
            {fldLoading ? (
              <div className="divide-y divide-slate-100">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-4 px-6 py-4 animate-pulse">
                    <div className="flex-1 space-y-1">
                      <div className="h-4 w-32 bg-slate-200 rounded" />
                      <div className="h-3 w-20 bg-slate-100 rounded" />
                    </div>
                  </div>
                ))}
              </div>
            ) : fields.length === 0 ? (
              <div className="py-12 text-center text-slate-400">
                <Squares2X2Icon className="w-12 h-12 mx-auto mb-2 opacity-30" />
                <p className="font-medium text-slate-600">Nenhum campo extra</p>
                <p className="text-sm mt-1">O formulário mostrará apenas Nome, Foto, Função e Autorização</p>
                <button onClick={openFldCreate} className="mt-3 btn-primary inline-flex items-center gap-2 text-sm">
                  <PlusIcon className="w-4 h-4" />
                  Criar primeiro campo
                </button>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {fields.map((field) => (
                  <div key={field.id} className="flex items-center gap-4 px-6 py-3 hover:bg-slate-50 transition-colors">
                    <Squares2X2Icon className="w-4 h-4 text-slate-300" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800">
                        {field.label}
                        {field.required && <span className="ml-1 text-red-500 text-xs">*</span>}
                      </p>
                      <p className="text-xs text-slate-400">Chave: {field.key}</p>
                    </div>
                    <span className="text-xs text-slate-400">Ordem: {field.sort_order}</span>
                    {field.required && (
                      <span className="text-[10px] bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-medium">
                        Obrigatório
                      </span>
                    )}
                    <div className="flex gap-1">
                      <button
                        onClick={() => openFldEdit(field)}
                        className="p-1.5 text-slate-400 hover:text-blue-600 rounded hover:bg-blue-50 transition-colors"
                      >
                        <PencilIcon className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleFldDelete(field.id)}
                        className="p-1.5 text-slate-400 hover:text-red-600 rounded hover:bg-red-50 transition-colors"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* TELEGRAM TAB                                                          */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {tab === "telegram" && (
        <div className="space-y-4">
          <p className="text-sm text-slate-500">
            Configure notificações via Telegram para receber alertas de reconhecimento em tempo real
          </p>

          {tgMsg && (
            <div className={`p-3 rounded-lg text-sm ${
              tgMsg.includes("Erro") || tgMsg.includes("inválido") || tgMsg.includes("Falha")
                ? "bg-red-50 border border-red-200 text-red-700"
                : "bg-green-50 border border-green-200 text-green-700"
            }`}>
              {tgMsg}
            </div>
          )}

          {/* Bot Config (admin/gerente) */}
          <div className="card space-y-4">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <PaperAirplaneIcon className="w-4 h-4" />
              Configuração do Bot
            </h3>

            {tgConfig?.bot_token_set ? (
              <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-xl">
                <CheckIcon className="w-5 h-5 text-green-600 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-green-800">Bot conectado</p>
                  <p className="text-xs text-green-600">@{tgConfig.bot_username}</p>
                </div>
                <button
                  onClick={() => { setTgToken(""); handleTgSaveToken(); }}
                  className="text-xs text-red-500 hover:text-red-700"
                >
                  Remover
                </button>
              </div>
            ) : (
              <div>
                <p className="text-xs text-slate-500 mb-2">
                  1. Abra o Telegram e fale com <strong>@BotFather</strong><br />
                  2. Envie <code>/newbot</code> e siga as instruções<br />
                  3. Cole o token abaixo
                </p>
                <div className="flex gap-2">
                  <input
                    className="input-field flex-1 text-sm font-mono"
                    value={tgToken}
                    onChange={(e) => setTgToken(e.target.value)}
                    placeholder="Cole o token do bot aqui"
                  />
                  <button
                    onClick={handleTgSaveToken}
                    disabled={tgSaving || !tgToken.trim()}
                    className="btn-primary text-sm"
                  >
                    {tgSaving ? "..." : "Salvar"}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Notification preferences */}
          {tgConfig?.bot_token_set && (
            <div className="card space-y-3">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <BellAlertIcon className="w-4 h-4" />
                Tipos de Notificação
              </h3>
              <label className="flex items-center justify-between py-2 cursor-pointer">
                <div>
                  <p className="text-sm font-medium text-slate-700">Pessoas não identificadas</p>
                  <p className="text-xs text-slate-400">Alertar quando uma pessoa desconhecida for detectada</p>
                </div>
                <input
                  type="checkbox"
                  checked={tgConfig.notify_unrecognized}
                  onChange={(e) => handleTgNotifyToggle("notify_unrecognized", e.target.checked)}
                  className="w-5 h-5 text-navy-600 rounded"
                />
              </label>
              <label className="flex items-center justify-between py-2 cursor-pointer border-t border-slate-100 pt-3">
                <div>
                  <p className="text-sm font-medium text-slate-700">Pessoas identificadas</p>
                  <p className="text-xs text-slate-400">Notificar quando uma pessoa conhecida for reconhecida</p>
                </div>
                <input
                  type="checkbox"
                  checked={tgConfig.notify_recognized}
                  onChange={(e) => handleTgNotifyToggle("notify_recognized", e.target.checked)}
                  className="w-5 h-5 text-navy-600 rounded"
                />
              </label>
            </div>
          )}

          {/* User's own Telegram link */}
          {tgConfig?.bot_token_set && (
            <div className="card space-y-4">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <LinkIcon className="w-4 h-4" />
                Seu Telegram
              </h3>

              {tgMe?.telegram_chat_id ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-xl">
                    <div className="flex items-center gap-2">
                      {tgMe.telegram_active ? (
                        <BellAlertIcon className="w-5 h-5 text-blue-600" />
                      ) : (
                        <BellSlashIcon className="w-5 h-5 text-slate-400" />
                      )}
                      <div>
                        <p className="text-sm font-medium text-blue-800">
                          {tgMe.telegram_active ? "Notificações ativas" : "Notificações pausadas"}
                        </p>
                        <p className="text-xs text-blue-600">Chat ID: {tgMe.telegram_chat_id}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={handleTgToggle} className="btn-secondary text-xs py-1 px-2">
                        {tgMe.telegram_active ? "Pausar" : "Ativar"}
                      </button>
                      <button onClick={handleTgUnlink} className="text-xs text-red-500 hover:text-red-700 px-2">
                        Desvincular
                      </button>
                    </div>
                  </div>
                  <button onClick={handleTgTest} className="btn-secondary text-sm w-full">
                    Enviar mensagem de teste
                  </button>
                </div>
              ) : (
                <div>
                  <p className="text-xs text-slate-500 mb-2">
                    1. Abra o Telegram e procure por <strong>@{tgConfig.bot_username}</strong><br />
                    2. Envie <code>/start</code> para o bot<br />
                    3. O bot vai responder com seu <strong>Chat ID</strong><br />
                    4. Cole o Chat ID abaixo
                  </p>
                  <div className="flex gap-2">
                    <input
                      className="input-field flex-1 text-sm font-mono"
                      value={tgChatId}
                      onChange={(e) => setTgChatId(e.target.value)}
                      placeholder="Seu Chat ID (ex: 123456789)"
                    />
                    <button
                      onClick={handleTgLink}
                      disabled={tgSaving || !tgChatId.trim()}
                      className="btn-primary text-sm"
                    >
                      {tgSaving ? "..." : "Vincular"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ─── Category Modal ─── */}
      {catShow && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h2 className="font-bold text-slate-800">
                {catEdit ? "Editar Categoria" : "Nova Categoria"}
              </h2>
              <button onClick={() => setCatShow(false)} className="text-slate-400 hover:text-slate-600">
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCatSubmit} className="px-6 py-4 space-y-4">
              {catError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{catError}</div>
              )}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nome da categoria *</label>
                <input
                  className="input-field"
                  value={catForm.label}
                  onChange={(e) => {
                    const label = e.target.value;
                    setCatForm({
                      ...catForm,
                      label,
                      key: catEdit ? catForm.key : autoKey(label),
                    });
                  }}
                  placeholder="Ex: Aluno, Professor, Visitante"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Chave interna *</label>
                <input
                  className="input-field font-mono text-sm"
                  value={catForm.key}
                  onChange={(e) => setCatForm({ ...catForm, key: e.target.value.replace(/[^a-z0-9_]/g, "") })}
                  placeholder="ex: student"
                  required
                />
                <p className="text-xs text-slate-400 mt-1">Identificador único (sem espaços ou acentos)</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Cor</label>
                <div className="flex gap-2 flex-wrap">
                  {COLORS.map((c) => (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() => setCatForm({ ...catForm, color: c.value })}
                      className={`w-8 h-8 rounded-full ${c.bg} flex items-center justify-center transition-transform ${
                        catForm.color === c.value ? "ring-2 ring-offset-2 ring-navy-500 scale-110" : "hover:scale-105"
                      }`}
                    >
                      {catForm.color === c.value && <CheckIcon className="w-4 h-4 text-white" />}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Ordem de exibição</label>
                <input
                  type="number"
                  className="input-field w-24"
                  value={catForm.sort_order}
                  onChange={(e) => setCatForm({ ...catForm, sort_order: Number(e.target.value) })}
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={catSaving} className="btn-primary flex-1">
                  {catSaving ? "Salvando..." : "Salvar"}
                </button>
                <button type="button" onClick={() => setCatShow(false)} className="btn-secondary flex-1">
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── Field Modal ─── */}
      {fldShow && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h2 className="font-bold text-slate-800">
                {fldEdit ? "Editar Campo" : "Novo Campo"}
              </h2>
              <button onClick={() => setFldShow(false)} className="text-slate-400 hover:text-slate-600">
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleFldSubmit} className="px-6 py-4 space-y-4">
              {fldError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{fldError}</div>
              )}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nome do campo *</label>
                <input
                  className="input-field"
                  value={fldForm.label}
                  onChange={(e) => {
                    const label = e.target.value;
                    setFldForm({
                      ...fldForm,
                      label,
                      key: fldEdit ? fldForm.key : autoKey(label),
                    });
                  }}
                  placeholder="Ex: Matrícula, Departamento, Cargo"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Chave interna *</label>
                <input
                  className="input-field font-mono text-sm"
                  value={fldForm.key}
                  onChange={(e) => setFldForm({ ...fldForm, key: e.target.value.replace(/[^a-z0-9_]/g, "") })}
                  placeholder="ex: registration_number"
                  required
                />
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="field-required"
                  checked={fldForm.required}
                  onChange={(e) => setFldForm({ ...fldForm, required: e.target.checked })}
                  className="w-4 h-4 text-navy-600 rounded"
                />
                <label htmlFor="field-required" className="text-sm font-medium text-slate-700">
                  Campo obrigatório
                </label>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Ordem de exibição</label>
                <input
                  type="number"
                  className="input-field w-24"
                  value={fldForm.sort_order}
                  onChange={(e) => setFldForm({ ...fldForm, sort_order: Number(e.target.value) })}
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={fldSaving} className="btn-primary flex-1">
                  {fldSaving ? "Salvando..." : "Salvar"}
                </button>
                <button type="button" onClick={() => setFldShow(false)} className="btn-secondary flex-1">
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
