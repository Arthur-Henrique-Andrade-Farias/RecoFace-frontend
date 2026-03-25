import React, { useEffect, useState, useRef } from "react";
import { personsApi, getPhotoUrl } from "../services/api";
import { Person, PersonPhoto } from "../types";
import {
  PlusIcon,
  TrashIcon,
  PencilIcon,
  UsersIcon,
  CheckCircleIcon,
  XCircleIcon,
  XMarkIcon,
  FaceSmileIcon,
  ExclamationTriangleIcon,
  MagnifyingGlassIcon,
  PhotoIcon,
  CameraIcon,
} from "@heroicons/react/24/outline";

const ROLE_LABELS: Record<string, string> = {
  student: "Aluno",
  teacher: "Professor(a)",
  staff: "Funcionário(a)",
  visitor: "Visitante",
};

const ROLE_COLORS: Record<string, string> = {
  student: "badge-blue",
  teacher: "badge-green",
  staff: "badge-yellow",
  visitor: "badge-red",
};

interface FormState {
  name: string;
  role: string;
  department: string;
  is_authorized: boolean;
  registration_number: string;
  photo: File | null;
}

const emptyForm: FormState = {
  name: "",
  role: "student",
  department: "",
  is_authorized: true,
  registration_number: "",
  photo: null,
};

export default function PersonsPage() {
  const [persons, setPersons] = useState<Person[]>([]);
  const [filtered, setFiltered] = useState<Person[]>([]);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editPerson, setEditPerson] = useState<Person | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const fileRef = useRef<HTMLInputElement>(null);

  // Multi-photo state
  const [photoPerson, setPhotoPerson] = useState<Person | null>(null);
  const [personPhotos, setPersonPhotos] = useState<PersonPhoto[]>([]);
  const [photosLoading, setPhotosLoading] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoLabel, setPhotoLabel] = useState("");
  const multiFileRef = useRef<HTMLInputElement>(null);

  const load = () =>
    personsApi.list().then((r) => {
      setPersons(r.data);
      setFiltered(r.data);
      setPageLoading(false);
    }).catch(() => setPageLoading(false));

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    const q = search.toLowerCase();
    setFiltered(
      persons.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.department ?? "").toLowerCase().includes(q) ||
          (p.registration_number ?? "").toLowerCase().includes(q)
      )
    );
  }, [search, persons]);

  const openCreate = () => {
    setEditPerson(null);
    setForm(emptyForm);
    setPreview(null);
    setShowForm(true);
  };

  const openEdit = (p: Person) => {
    setEditPerson(p);
    setForm({
      name: p.name,
      role: p.role,
      department: p.department ?? "",
      is_authorized: p.is_authorized,
      registration_number: p.registration_number ?? "",
      photo: null,
    });
    setPreview(p.photo_path ? getPhotoUrl(p.photo_path) : null);
    setShowForm(true);
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setForm({ ...form, photo: file });
    setPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append("name", form.name);
      fd.append("role", form.role);
      fd.append("department", form.department);
      fd.append("is_authorized", String(form.is_authorized));
      fd.append("registration_number", form.registration_number);
      if (form.photo) fd.append("photo", form.photo);

      if (editPerson) {
        await personsApi.update(editPerson.id, fd);
      } else {
        await personsApi.create(fd);
      }
      setShowForm(false);
      load();
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("Remover esta pessoa do sistema?")) return;
    await personsApi.delete(id);
    load();
  };

  // ─── Multi-Photo Functions ──────────────────────────────────────────────

  const openPhotos = async (person: Person) => {
    setPhotoPerson(person);
    setPhotosLoading(true);
    setPhotoLabel("");
    try {
      const res = await personsApi.listPhotos(person.id);
      setPersonPhotos(res.data);
    } catch {
      setPersonPhotos([]);
    } finally {
      setPhotosLoading(false);
    }
  };

  const handleAddPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !photoPerson) return;

    setUploadingPhoto(true);
    try {
      for (let i = 0; i < files.length; i++) {
        const fd = new FormData();
        fd.append("photo", files[i]);
        fd.append("label", photoLabel || `Foto ${personPhotos.length + i + 1}`);
        await personsApi.addPhoto(photoPerson.id, fd);
      }
      // Reload photos
      const res = await personsApi.listPhotos(photoPerson.id);
      setPersonPhotos(res.data);
      load(); // Refresh person list to update photo_count
    } finally {
      setUploadingPhoto(false);
      setPhotoLabel("");
      if (multiFileRef.current) multiFileRef.current.value = "";
    }
  };

  const handleDeletePhoto = async (photoId: number) => {
    if (!photoPerson) return;
    if (!window.confirm("Remover esta foto?")) return;
    await personsApi.deletePhoto(photoPerson.id, photoId);
    const res = await personsApi.listPhotos(photoPerson.id);
    setPersonPhotos(res.data);
    load();
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Pessoas</h1>
          <p className="text-slate-500 text-sm mt-1">
            Base de dados de alunos, professores e funcionários
          </p>
        </div>
        <button onClick={openCreate} className="btn-primary flex items-center gap-2">
          <PlusIcon className="w-4 h-4" />
          Cadastrar Pessoa
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          className="input-field pl-9"
          placeholder="Buscar por nome, turma ou matrícula..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Stats row */}
      {pageLoading ? (
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="card text-center py-4 animate-pulse">
              <div className="h-9 w-16 bg-slate-200 rounded mx-auto mb-1" />
              <div className="h-3 w-20 bg-slate-100 rounded mx-auto" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Total", value: persons.length, color: "text-navy-600" },
            {
              label: "Autorizados",
              value: persons.filter((p) => p.is_authorized).length,
              color: "text-green-600",
            },
            {
              label: "Com Foto",
              value: persons.filter((p) => p.has_face_encoding).length,
              color: "text-blue-600",
            },
          ].map(({ label, value, color }) => (
            <div key={label} className="card text-center py-4">
              <p className={`text-3xl font-bold ${color}`}>{value}</p>
              <p className="text-xs text-slate-500 mt-1">{label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Grid */}
      {pageLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} className="card p-0 overflow-hidden animate-pulse">
              <div className="h-40 bg-slate-200" />
              <div className="p-3 space-y-2">
                <div className="h-4 w-3/4 bg-slate-200 rounded" />
                <div className="h-3 w-1/2 bg-slate-100 rounded" />
                <div className="h-5 w-16 bg-slate-100 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="card text-center py-16 text-slate-400">
          <UsersIcon className="w-16 h-16 mx-auto mb-3 opacity-30" />
          <p className="font-semibold text-slate-600 mb-1">
            {search ? "Nenhum resultado encontrado" : "Nenhuma pessoa cadastrada"}
          </p>
          {!search && (
            <button onClick={openCreate} className="mt-3 btn-primary inline-flex items-center gap-2">
              <PlusIcon className="w-4 h-4" />
              Cadastrar Pessoa
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((person) => (
            <div key={person.id} className="card p-0 overflow-hidden hover:shadow-md transition-shadow">
              {/* Photo */}
              <div className="relative h-40 bg-slate-100">
                {person.photo_path ? (
                  <img
                    src={getPhotoUrl(person.photo_path)}
                    alt={person.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-300">
                    <FaceSmileIcon className="w-16 h-16" />
                  </div>
                )}
                {/* Authorized badge */}
                <div className="absolute top-2 right-2">
                  {person.is_authorized ? (
                    <span className="flex items-center gap-1 bg-green-500 text-white text-xs px-2 py-0.5 rounded-full font-medium">
                      <CheckCircleIcon className="w-3 h-3" />
                      Ativo
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 bg-red-500 text-white text-xs px-2 py-0.5 rounded-full font-medium">
                      <XCircleIcon className="w-3 h-3" />
                      Inativo
                    </span>
                  )}
                </div>
                {/* Photo count badge */}
                {person.photo_count > 0 && (
                  <div className="absolute top-2 left-2">
                    <span className="flex items-center gap-1 bg-blue-500 text-white text-xs px-2 py-0.5 rounded-full font-medium">
                      <PhotoIcon className="w-3 h-3" />
                      {person.photo_count}
                    </span>
                  </div>
                )}
                {/* Encoding warning */}
                {!person.has_face_encoding && (
                  <div className="absolute bottom-2 left-2">
                    <span className="flex items-center gap-1 bg-yellow-500 text-white text-xs px-2 py-0.5 rounded-full">
                      <ExclamationTriangleIcon className="w-3 h-3" />
                      Sem rosto
                    </span>
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-800 text-sm truncate">{person.name}</p>
                    {person.registration_number && (
                      <p className="text-xs text-slate-400 truncate">
                        Mat: {person.registration_number}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <button
                      onClick={() => openPhotos(person)}
                      className="p-1 text-slate-400 hover:text-blue-600 rounded hover:bg-blue-50 transition-colors"
                      title="Gerenciar fotos"
                    >
                      <CameraIcon className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => openEdit(person)}
                      className="p-1 text-slate-400 hover:text-navy-600 rounded hover:bg-slate-50 transition-colors"
                    >
                      <PencilIcon className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(person.id)}
                      className="p-1 text-slate-400 hover:text-red-600 rounded hover:bg-red-50 transition-colors"
                    >
                      <TrashIcon className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  <span className={ROLE_COLORS[person.role] ?? "badge-blue"}>
                    {ROLE_LABELS[person.role] ?? person.role}
                  </span>
                  {person.department && (
                    <span className="text-xs text-slate-400 truncate">{person.department}</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ─── Create/Edit Modal ─── */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 sticky top-0 bg-white rounded-t-2xl">
              <h2 className="font-bold text-slate-800">
                {editPerson ? "Editar Pessoa" : "Cadastrar Pessoa"}
              </h2>
              <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600">
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
              {/* Photo upload */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Foto principal (para reconhecimento)
                </label>
                <div
                  className="border-2 border-dashed border-slate-200 rounded-xl p-4 text-center cursor-pointer hover:border-navy-400 transition-colors"
                  onClick={() => fileRef.current?.click()}
                >
                  {preview ? (
                    <img
                      src={preview}
                      alt="preview"
                      className="w-32 h-32 object-cover rounded-xl mx-auto"
                    />
                  ) : (
                    <div className="text-slate-400">
                      <FaceSmileIcon className="w-12 h-12 mx-auto mb-2 opacity-40" />
                      <p className="text-sm">Clique para enviar uma foto</p>
                      <p className="text-xs mt-1">JPG, PNG</p>
                    </div>
                  )}
                </div>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handlePhotoChange}
                />
                {editPerson && (
                  <p className="text-xs text-slate-400 mt-2">
                    Use o botão de camera no card da pessoa para adicionar mais fotos de diferentes ângulos.
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Nome completo *</label>
                  <input
                    className="input-field"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="Ex: João da Silva"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Função *</label>
                  <select
                    className="input-field"
                    value={form.role}
                    onChange={(e) => setForm({ ...form, role: e.target.value })}
                  >
                    <option value="student">Aluno</option>
                    <option value="teacher">Professor(a)</option>
                    <option value="staff">Funcionário(a)</option>
                    <option value="visitor">Visitante</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Matrícula</label>
                  <input
                    className="input-field"
                    value={form.registration_number}
                    onChange={(e) => setForm({ ...form, registration_number: e.target.value })}
                    placeholder="Ex: 2024001"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Turma / Departamento
                  </label>
                  <input
                    className="input-field"
                    value={form.department}
                    onChange={(e) => setForm({ ...form, department: e.target.value })}
                    placeholder="Ex: 3° Ano A, Secretaria"
                  />
                </div>
                <div className="col-span-2 flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="authorized"
                    checked={form.is_authorized}
                    onChange={(e) => setForm({ ...form, is_authorized: e.target.checked })}
                    className="w-4 h-4 text-navy-600 rounded"
                  />
                  <label htmlFor="authorized" className="text-sm font-medium text-slate-700">
                    Autorizado a frequentar o ambiente
                  </label>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={loading} className="btn-primary flex-1">
                  {loading ? "Salvando..." : editPerson ? "Atualizar" : "Cadastrar"}
                </button>
                <button type="button" onClick={() => setShowForm(false)} className="btn-secondary flex-1">
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── Multi-Photo Modal ─── */}
      {photoPerson && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 sticky top-0 bg-white rounded-t-2xl z-10">
              <div>
                <h2 className="font-bold text-slate-800">Fotos de {photoPerson.name}</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Adicione fotos de diferentes ângulos para melhorar o reconhecimento
                </p>
              </div>
              <button onClick={() => setPhotoPerson(null)} className="text-slate-400 hover:text-slate-600">
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            <div className="px-6 py-4 space-y-4">
              {/* Upload area */}
              <div className="border-2 border-dashed border-slate-200 rounded-xl p-6 text-center">
                <CameraIcon className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                <p className="text-sm font-medium text-slate-600 mb-1">Adicionar novas fotos</p>
                <p className="text-xs text-slate-400 mb-3">
                  Envie fotos frontais, de perfil e em diferentes ângulos
                </p>
                <div className="flex items-center gap-2 justify-center mb-3">
                  <input
                    type="text"
                    value={photoLabel}
                    onChange={(e) => setPhotoLabel(e.target.value)}
                    placeholder="Descrição (ex: Perfil esquerdo)"
                    className="input-field text-sm max-w-xs"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => multiFileRef.current?.click()}
                  disabled={uploadingPhoto}
                  className="btn-primary inline-flex items-center gap-2"
                >
                  <PlusIcon className="w-4 h-4" />
                  {uploadingPhoto ? "Enviando..." : "Selecionar fotos"}
                </button>
                <input
                  ref={multiFileRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={handleAddPhoto}
                />
              </div>

              {/* Photo grid */}
              {photosLoading ? (
                <div className="text-center py-8 text-slate-400">Carregando fotos...</div>
              ) : personPhotos.length === 0 ? (
                <div className="text-center py-8 text-slate-400">
                  <PhotoIcon className="w-12 h-12 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Nenhuma foto cadastrada</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {personPhotos.map((photo) => (
                    <div
                      key={photo.id}
                      className="relative group rounded-xl overflow-hidden border border-slate-200"
                    >
                      <img
                        src={getPhotoUrl(photo.photo_path)}
                        alt={photo.label || "Foto"}
                        className="w-full h-32 object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = "";
                          (e.target as HTMLImageElement).className = "w-full h-32 bg-slate-100";
                        }}
                      />
                      {/* Encoding status */}
                      <div className="absolute top-1.5 left-1.5">
                        {photo.has_face_encoding ? (
                          <span className="bg-green-500 text-white text-[10px] px-1.5 py-0.5 rounded-full font-medium flex items-center gap-0.5">
                            <CheckCircleIcon className="w-2.5 h-2.5" />
                            OK
                          </span>
                        ) : (
                          <span className="bg-yellow-500 text-white text-[10px] px-1.5 py-0.5 rounded-full font-medium flex items-center gap-0.5">
                            <ExclamationTriangleIcon className="w-2.5 h-2.5" />
                            Sem rosto
                          </span>
                        )}
                      </div>
                      {/* Delete button */}
                      <button
                        onClick={() => handleDeletePhoto(photo.id)}
                        className="absolute top-1.5 right-1.5 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                      >
                        <TrashIcon className="w-3 h-3" />
                      </button>
                      {/* Label */}
                      <div className="px-2 py-1.5 bg-white">
                        <p className="text-xs text-slate-600 truncate">
                          {photo.label || "Sem descrição"}
                        </p>
                        <p className="text-[10px] text-slate-400">
                          {new Date(photo.created_at).toLocaleDateString("pt-BR")}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Summary */}
              {personPhotos.length > 0 && (
                <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
                  <span>
                    {personPhotos.length} foto(s) · {personPhotos.filter((p) => p.has_face_encoding).length} com rosto detectado
                  </span>
                  <span className="text-slate-400">
                    Mais fotos = melhor reconhecimento
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
