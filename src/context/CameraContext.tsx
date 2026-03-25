import React, { createContext, useContext, useRef, useState, useCallback, useEffect, ReactNode } from "react";
import { FaceResult } from "../types";
import { WS_BASE } from "../services/api";

const FRAME_INTERVAL_MS = 300;

interface CameraState {
  status: "idle" | "connecting" | "active" | "error";
  faces: FaceResult[];
  wsMessage: string;
  error: string;
  stream: MediaStream | null;
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
};

const CameraContext = createContext<CameraContextType | null>(null);

interface ActiveCamera {
  stream: MediaStream;
  ws: WebSocket;
  interval: NodeJS.Timeout;
  videoEl: HTMLVideoElement;
  canvasEl: HTMLCanvasElement;
  state: CameraState;
}

export function CameraProvider({ children }: { children: ReactNode }) {
  const camerasRef = useRef<Map<number, ActiveCamera>>(new Map());
  const statesRef = useRef<Map<number, CameraState>>(new Map());
  const listenersRef = useRef<Map<number, Set<() => void>>>(new Map());

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
      clearInterval(active.interval);
      active.ws.close();
      active.stream.getTracks().forEach((t) => t.stop());
      active.videoEl.remove();
      active.canvasEl.remove();
      camerasRef.current.delete(cameraId);
    }
    updateState(cameraId, { status: "idle", faces: [], stream: null, wsMessage: "", error: "" });
  }, [updateState]);

  const startCamera = useCallback(async (cameraId: number) => {
    // If already active, do nothing
    if (camerasRef.current.has(cameraId)) return;

    updateState(cameraId, { status: "connecting", error: "" });

    try {
      // 1. Get webcam stream
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user" },
      });

      // 2. Create hidden video element for frame capture
      const videoEl = document.createElement("video");
      videoEl.muted = true;
      videoEl.playsInline = true;
      videoEl.style.position = "absolute";
      videoEl.style.top = "-9999px";
      videoEl.style.left = "-9999px";
      videoEl.style.width = "1px";
      videoEl.style.height = "1px";
      document.body.appendChild(videoEl);
      videoEl.srcObject = stream;
      await videoEl.play();

      // 3. Create hidden canvas for frame capture
      const canvasEl = document.createElement("canvas");
      canvasEl.style.display = "none";
      document.body.appendChild(canvasEl);
      const ctx = canvasEl.getContext("2d")!;

      // 4. Open WebSocket
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
        updateState(cameraId, {
          error: "Falha na conexão com o servidor.",
          status: "error",
        });
        stopCamera(cameraId);
      };

      ws.onclose = () => {
        // Only update if we haven't explicitly stopped
        if (camerasRef.current.has(cameraId)) {
          stopCamera(cameraId);
        }
      };

      // 5. Capture & send frames
      const interval = setInterval(() => {
        if (ws.readyState !== WebSocket.OPEN || videoEl.videoWidth === 0) return;
        canvasEl.width = videoEl.videoWidth || 640;
        canvasEl.height = videoEl.videoHeight || 480;
        ctx.drawImage(videoEl, 0, 0, canvasEl.width, canvasEl.height);
        const frameData = canvasEl.toDataURL("image/jpeg", 0.7);
        ws.send(JSON.stringify({ type: "frame", frame: frameData }));
      }, FRAME_INTERVAL_MS);

      // Store reference
      const active: ActiveCamera = { stream, ws, interval, videoEl, canvasEl, state: getState(cameraId) };
      camerasRef.current.set(cameraId, active);

    } catch (err: any) {
      updateState(cameraId, {
        error: err?.message || "Não foi possível acessar a câmera.",
        status: "error",
      });
    }
  }, [getState, updateState, stopCamera]);

  // Cleanup all on unmount
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

/**
 * Hook that subscribes to a specific camera's state and re-renders on changes.
 */
export function useCameraState(cameraId: number): CameraState {
  const { getState, subscribe } = useCameraContext();
  const [, forceRender] = useState(0);

  useEffect(() => {
    return subscribe(cameraId, () => forceRender((n) => n + 1));
  }, [cameraId, subscribe]);

  return getState(cameraId);
}
