export interface User {
  id: number;
  name: string;
  email: string;
  role: "admin" | "configurador" | "visualizador";
  is_active: boolean;
  org_name: string | null;
  created_at: string;
}

export interface PersonCategory {
  id: number;
  key: string;
  label: string;
  color: string;
  sort_order: number;
}

export interface PersonField {
  id: number;
  key: string;
  label: string;
  required: boolean;
  sort_order: number;
}

export interface Person {
  id: number;
  name: string;
  role: string;
  photo_path: string | null;
  is_authorized: boolean;
  has_face_encoding: boolean;
  custom_data: Record<string, string>;
  photo_count: number;
  created_at: string;
}

export interface PersonPhoto {
  id: number;
  person_id: number;
  photo_path: string;
  has_face_encoding: boolean;
  label: string | null;
  created_at: string;
}

export interface Camera {
  id: number;
  name: string;
  camera_type: string;
  url: string | null;
  description: string | null;
  location: string | null;
  is_active: boolean;
  created_at: string;
}

export interface RecognitionLog {
  id: number;
  camera_id: number | null;
  camera_name: string | null;
  person_id: number | null;
  person_name: string | null;
  person_role: string | null;
  recognized: boolean;
  is_authorized: boolean;
  confidence: number | null;
  photo_path: string | null;
  notes: string | null;
  timestamp: string;
}

export interface Stats {
  total_detections: number;
  recognized: number;
  authorized: number;
  alerts: number;
  total_persons: number;
  total_cameras: number;
  active_cameras: number;
}

export interface FaceResult {
  location: { top: number; right: number; bottom: number; left: number };
  recognized: boolean;
  person_id: number | null;
  person_name: string;
  is_authorized: boolean;
  confidence: number;
}
