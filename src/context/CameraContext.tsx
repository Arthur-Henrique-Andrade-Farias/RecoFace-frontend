import React, { createContext, useContext, useRef, useState, useCallback, useEffect, ReactNode } from "react";
import { FaceResult, Camera } from "../types";
import { WS_BASE, camerasApi } from "../services/api";

const FRAME_INTERVAL_MS = 300;

interface CameraState {
  status: "idle" | "connecting" | "active" | "error";
  faces: FaceResult[];
  wsMessage: string;
  error: string;
  stream: MediaStream | null;
  rtspFrame: string | null;  // base64 JPEG for RTSP cameras
}

interface CameraContextType {
  getState: (cameraId: number) => CameraState;
  startCamera: (cameraId: number) => void;
  stopCamera: (cameraId: number) => void;
  subscribe: (cameraId: number, cb: () => void) => () => void;
}

const DEFAULT_STATE: CameraState = {
  status: "idle",
  faces: [],
  wsMessage: "",
  error: "",
  stream: null,
  rtspFrame: null,
};

const CameraContext = createContext<CameraContextType | null>(null);

interface ActiveCamera {
  stream: MediaStream | null;
  ws: WebSocket;
  interval: NodeJS.Timeout | null;
  videoEl: HTMLVideoElement | null;
  canvasEl: HTMLCanvasElement | null;
  isRtsp: boolean;
}

export function CameraProvider({ children }: { children: ReactNode }) {
  const camerasRef = useRef<Map<number, ActiveCamera>>(new Map());
  const statesRef = useRef<Map<number, CameraState>>(new Map());
  const listenersRef = useRef<Map<number, Set<() => void>>>(new Map());
  const cameraListRef = useRef<Camera[]>([]);

  // Load camera list once
  useEffect(() => {
    camerasApi.list().then((r) => { cameraListRef.current = r.data; }).catch(() => {});
  }, []);

  const notify = useCallback((cameraId: number) => {
    listenersRef.current.get(cameraId)?.forEach((cb) => cb());
  }, []);

  const updateState = useCallback((cameraId: number, patch: Partial<CameraState>) => {
    const prev = statesRef.current.get(cameraId) || { ...DEFAULT_STATE };
    const next = { ...prev, ...patch };
    statesRef.current.set(cameraId, next);
    notify(cameraId);
  }, [notify]);

  const getState = useCallback((cameraId: number): CameraState => {
    return statesRef.current.get(cameraId) || { ...DEFAULT_STATE };
  }, []);

  const subscribe = useCallback((cameraId: number, cb: () => void) => {
    if (!listenersRef.current.has(cameraId)) {
      listenersRef.current.set(cameraId, new Set());
    }
    listenersRef.current.get(cameraId)!.add(cb);
    return () => {
      listenersRef.current.get(cameraId)?.delete(cb);
    };
  }, []);

  const stopCamera = useCallback((cameraId: number) => {
    const active = camerasRef.current.get(cameraId);
    if (active) {
      if (active.interval) clearInterval(active.interval);
      if (active.isRtsp) {
        // Send stop signal for RTSP
        try { active.ws.send(JSON.stringify({ type: "stop" })); } catch {}
      }
      active.ws.close();
      if (active.stream) active.stream.getTracks().forEach((t) => t.stop());
      if (active.videoEl) active.videoEl.remove();
      if (active.canvasEl) active.canvasEl.remove();
      camerasRef.current.delete(cameraId);
    }
    updateState(cameraId, { status: "idle", faces: [], stream: null, rtspFrame: null, wsMessage: "", error: "" });
  }, [updateState]);

  // ─── Start RTSP camera (server-side processing) ──────────────────────────
  const startRtspCamera = useCallback((cameraId: number) => {
    if (camerasRef.current.has(cameraId)) return;
    updateState(cameraId, { status: "connecting", error: "" });

    const ws = new WebSocket(`${WS_BASE}/ws/rtsp/${cameraId}`);

    ws.onopen = () => {
      updateState(cameraId, { status: "active" });
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === "connected") {
        updateState(cameraId, { wsMessage: data.message, status: "active" });
      } else if (data.type === "rtsp_frame") {
        updateState(cameraId, { rtspFrame: data.frame, faces: data.faces || [] });
      } else if (data.type === "error") {
        updateState(cameraId, { error: data.message, status: "error" });
        stopCamera(cameraId);
      }
    };

    ws.onerror = () => {
      updateState(cameraId, { error: "Falha na conexão com o servidor.", status: "error" });
      stopCamera(cameraId);
    };

    ws.onclose = () => {
      if (camerasRef.current.has(cameraId)) stopCamera(cameraId);
    };

    const active: ActiveCamera = { stream: null, ws, interval: null, videoEl: null, canvasEl: null, isRtsp: true };
    camerasRef.current.set(cameraId, active);
  }, [updateState, stopCamera]);

  // ─── Start webcam (client-side capture) ──────────────────────────────────
  const startWebcam = useCallback(async (cameraId: number) => {
    if (camerasRef.current.has(cameraId)) return;
    updateState(cameraId, { status: "connecting", error: "" });

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user" },
      });

      const videoEl = document.createElement("video");
      videoEl.muted = true;
      videoEl.playsInline = true;
      videoEl.style.cssText = "position:absolute;top:-9999px;left:-9999px;width:1px;height:1px";
      document.body.appendChild(videoEl);
      videoEl.srcObject = stream;
      await videoEl.play();

      const canvasEl = document.createElement("canvas");
      canvasEl.style.display = "none";
      document.body.appendChild(canvasEl);
      const ctx = canvasEl.getContext("2d")!;

      const ws = new WebSocket(`${WS_BASE}/ws/camera/${cameraId}`);

      ws.onopen = () => {
        updateState(cameraId, { status: "active", stream });
      };

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === "connected") {
          updateState(cameraId, { wsMessage: data.message });
        } else if (data.type === "result") {
          updateState(cameraId, { faces: data.faces });
        }
      };

      ws.onerror = () => {
        updateState(cameraId, { error: "Falha na conexão com o servidor.", status: "error" });
        stopCamera(cameraId);
      };

      ws.onclose = () => {
        if (camerasRef.current.has(cameraId)) stopCamera(cameraId);
      };

      const interval = setInterval(() => {
        if (ws.readyState !== WebSocket.OPEN || videoEl.videoWidth === 0) return;
        canvasEl.width = videoEl.videoWidth || 640;
        canvasEl.height = videoEl.videoHeight || 480;
        ctx.drawImage(videoEl, 0, 0, canvasEl.width, canvasEl.height);
        const frameData = canvasEl.toDataURL("image/jpeg", 0.7);
        ws.send(JSON.stringify({ type: "frame", frame: frameData }));
      }, FRAME_INTERVAL_MS);

      const active: ActiveCamera = { stream, ws, interval, videoEl, canvasEl, isRtsp: false };
      camerasRef.current.set(cameraId, active);

    } catch (err: any) {
      updateState(cameraId, {
        error: err?.message || "Não foi possível acessar a câmera.",
        status: "error",
      });
    }
  }, [updateState, stopCamera]);

  // ─── Main start function (auto-detects type) ─────────────────────────────
  const startCamera = useCallback((cameraId: number) => {
    const cam = cameraListRef.current.find((c) => c.id === cameraId);
    if (cam && cam.camera_type === "ip_camera" && cam.url) {
      startRtspCamera(cameraId);
    } else {
      startWebcam(cameraId);
    }
  }, [startRtspCamera, startWebcam]);

  useEffect(() => {
    return () => {
      camerasRef.current.forEach((_, id) => stopCamera(id));
    };
  }, [stopCamera]);

  return (
    <CameraContext.Provider value={{ getState, startCamera, stopCamera, subscribe }}>
      {children}
    </CameraContext.Provider>
  );
}

export function useCameraContext() {
  const ctx = useContext(CameraContext);
  if (!ctx) throw new Error("useCameraContext must be used within CameraProvider");
  return ctx;
}

export function useCameraState(cameraId: number): CameraState {
  const { getState, subscribe } = useCameraContext();
  const [, forceRender] = useState(0);

  useEffect(() => {
    return subscribe(cameraId, () => forceRender((n) => n + 1));
  }, [cameraId, subscribe]);

  return getState(cameraId);
}
