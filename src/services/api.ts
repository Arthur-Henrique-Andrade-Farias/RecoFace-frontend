import axios from "axios";

const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:8000";

const api = axios.create({ baseURL: API_BASE });

// Attach token automatically
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("recoface_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Redirect to login on 401
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem("recoface_token");
      window.location.href = "/login";
    }
    return Promise.reject(err);
  }
);

// ─── Auth ────────────────────────────────────────────────────────────────────
export const authApi = {
  login: (email: string, password: string) =>
    api.post("/api/auth/login", { email, password }),
  me: () => api.get("/api/auth/me"),
  branding: () => api.get("/api/auth/branding"),
  updateBranding: (data: { brand_name?: string; brand_subtitle?: string }) =>
    api.put("/api/auth/branding", data),
  uploadLogo: (formData: FormData) =>
    api.post("/api/auth/branding/logo", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }),
  listUsers: () => api.get("/api/auth/users"),
  createUser: (data: { name: string; email: string; password: string; role: string; telegram_chat_id?: string; telegram_active?: boolean }) =>
    api.post("/api/auth/users", data),
  updateUser: (id: number, data: { name?: string; role?: string; telegram_chat_id?: string; telegram_active?: boolean }) =>
    api.put(`/api/auth/users/${id}`, data),
  toggleUser: (id: number) => api.patch(`/api/auth/users/${id}/toggle`),
  deleteUser: (id: number) => api.delete(`/api/auth/users/${id}`),
};

// ─── Categories ──────────────────────────────────────────────────────────────
export const categoriesApi = {
  list: () => api.get("/api/categories/"),
  create: (data: { key: string; label: string; color: string; sort_order?: number }) =>
    api.post("/api/categories/", data),
  update: (id: number, data: { key: string; label: string; color: string; sort_order?: number }) =>
    api.put(`/api/categories/${id}`, data),
  delete: (id: number) => api.delete(`/api/categories/${id}`),
};

// ─── Person Fields ───────────────────────────────────────────────────────────
export const fieldsApi = {
  list: () => api.get("/api/fields/"),
  create: (data: { key: string; label: string; required?: boolean; sort_order?: number }) =>
    api.post("/api/fields/", data),
  update: (id: number, data: { key: string; label: string; required?: boolean; sort_order?: number }) =>
    api.put(`/api/fields/${id}`, data),
  delete: (id: number) => api.delete(`/api/fields/${id}`),
};

// ─── Cameras ─────────────────────────────────────────────────────────────────
export const camerasApi = {
  list: () => api.get("/api/cameras/"),
  create: (data: object) => api.post("/api/cameras/", data),
  update: (id: number, data: object) => api.put(`/api/cameras/${id}`, data),
  delete: (id: number) => api.delete(`/api/cameras/${id}`),
  toggle: (id: number) => api.patch(`/api/cameras/${id}/toggle`),
};

// ─── Persons ─────────────────────────────────────────────────────────────────
export const personsApi = {
  list: () => api.get("/api/persons/"),
  create: (formData: FormData) =>
    api.post("/api/persons/", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }),
  update: (id: number, formData: FormData) =>
    api.put(`/api/persons/${id}`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }),
  delete: (id: number) => api.delete(`/api/persons/${id}`),
  reloadEncodings: () => api.post("/api/persons/reload-encodings"),
  createFromLog: (data: { log_id: number; name: string; role: string; is_authorized: boolean; custom_data?: Record<string, string> }) =>
    api.post("/api/persons/from-log", data),
  listPhotos: (personId: number) => api.get(`/api/persons/${personId}/photos`),
  addPhoto: (personId: number, formData: FormData) =>
    api.post(`/api/persons/${personId}/photos`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }),
  deletePhoto: (personId: number, photoId: number) =>
    api.delete(`/api/persons/${personId}/photos/${photoId}`),
};

// ─── Logs ────────────────────────────────────────────────────────────────────
export const logsApi = {
  list: (params?: { skip?: number; limit?: number; camera_id?: number; recognized?: boolean }) =>
    api.get("/api/logs/", { params }),
  update: (id: number, data: { person_id?: number; notes?: string }) =>
    api.patch(`/api/logs/${id}`, data),
  stats: () => api.get("/api/logs/stats"),
  clear: () => api.delete("/api/logs/clear"),
};

// ─── Telegram ────────────────────────────────────────────────────────────────
export const telegramApi = {
  getConfig: () => api.get("/api/telegram/config"),
  updateConfig: (data: { bot_token?: string; notify_unrecognized?: boolean; notify_recognized?: boolean }) =>
    api.put("/api/telegram/config", data),
  test: () => api.post("/api/telegram/test"),
  getMe: () => api.get("/api/telegram/me"),
  link: (chat_id: string) => api.post("/api/telegram/link", { chat_id }),
  unlink: () => api.post("/api/telegram/unlink"),
  toggle: () => api.patch("/api/telegram/toggle"),
};

// ─── Reports ─────────────────────────────────────────────────────────────────
export const reportsApi = {
  daily: (params: { report_date: string; camera_id?: number }) =>
    api.get("/api/reports/daily", { params }),
};

export const getPhotoUrl = (path: string) => `${API_BASE}/${path}`;
export const WS_BASE = process.env.REACT_APP_WS_URL || "ws://localhost:8000";

export default api;
