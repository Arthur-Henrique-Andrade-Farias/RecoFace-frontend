import React, { useRef, useEffect, useCallback } from "react";
import { Camera } from "../types";
import { useCameraContext, useCameraState } from "../context/CameraContext";
import {
  VideoCameraIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
} from "@heroicons/react/24/outline";

interface Props {
  camera: Camera;
}

export default function CameraFeed({ camera }: Props) {
  const { startCamera, stopCamera } = useCameraContext();
  const state = useCameraState(camera.id);
  const videoRef = useRef<HTMLVideoElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);

  // Attach stream to visible video element
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !state.stream) return;

    if (video.srcObject !== state.stream) {
      video.srcObject = state.stream;
      video.play().catch(() => {});
    }
  }, [state.stream, state.status]);

  // Draw bounding boxes on overlay canvas
  const drawBoxes = useCallback(() => {
    const canvas = overlayRef.current;
    const video = videoRef.current;
    if (!canvas || !video || !video.videoWidth) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    state.faces.forEach((face) => {
      const { top, right, bottom, left } = face.location;
      const color = face.recognized && face.is_authorized ? "#22c55e" : "#ef4444";
      const w = right - left;
      const h = bottom - top;

      // Box
      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      ctx.shadowColor = color;
      ctx.shadowBlur = 8;
      ctx.strokeRect(left, top, w, h);
      ctx.shadowBlur = 0;

      // Corner accents
      const cs = 14;
      ctx.fillStyle = color;
      [[left, top], [right - cs, top], [left, bottom - cs], [right - cs, bottom - cs]].forEach(
        ([x, y]) => {
          ctx.fillRect(x, y, cs, 3);
          ctx.fillRect(x, y, 3, cs);
        }
      );

      // Label
      const label = face.recognized
        ? `${face.person_name} (${face.confidence.toFixed(0)}%)`
        : "Desconhecido";
      ctx.font = "bold 13px Inter, sans-serif";
      const tw = ctx.measureText(label).width;
      const labelY = top > 30 ? top - 8 : bottom + 24;
      ctx.fillStyle = color;
      ctx.fillRect(left - 1, labelY - 18, tw + 12, 22);
      ctx.fillStyle = "#fff";
      ctx.fillText(label, left + 5, labelY - 2);
    });
  }, [state.faces]);

  // Redraw overlay when faces change
  useEffect(() => {
    if (state.status === "active") drawBoxes();
  }, [state.faces, state.status, drawBoxes]);

  // Clear overlay when stopped
  useEffect(() => {
    if (state.status !== "active") {
      const canvas = overlayRef.current;
      if (canvas) {
        const ctx = canvas.getContext("2d");
        ctx?.clearRect(0, 0, canvas.width, canvas.height);
      }
    }
  }, [state.status]);

  const recognizedCount = state.faces.filter((f) => f.recognized && f.is_authorized).length;
  const unknownCount = state.faces.filter((f) => !f.recognized).length;

  return (
    <div className="card overflow-hidden p-0">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-navy-600 text-white">
        <div className="flex items-center gap-2">
          <VideoCameraIcon className="w-4 h-4 text-blue-300" />
          <span className="font-semibold text-sm truncate">{camera.name}</span>
          {camera.location && (
            <span className="text-xs text-navy-200">— {camera.location}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {state.status === "active" && (
            <span className="flex items-center gap-1 text-xs">
              <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              AO VIVO
            </span>
          )}
          {state.status === "active" ? (
            <button
              onClick={() => stopCamera(camera.id)}
              className="text-xs bg-red-500 hover:bg-red-600 px-3 py-1 rounded-full transition-colors font-medium"
            >
              Parar
            </button>
          ) : (
            <button
              onClick={() => startCamera(camera.id)}
              className="text-xs bg-blue-500 hover:bg-blue-600 px-3 py-1 rounded-full transition-colors font-medium"
              disabled={state.status === "connecting"}
            >
              {state.status === "connecting" ? "Conectando..." : "Iniciar"}
            </button>
          )}
        </div>
      </div>

      {/* Video area */}
      <div className="relative bg-slate-900" style={{ aspectRatio: "16/9" }}>
        {state.status === "idle" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400">
            <VideoCameraIcon className="w-16 h-16 mb-3 opacity-30" />
            <p className="text-sm font-medium">Clique em "Iniciar" para ativar</p>
          </div>
        )}
        {state.status === "connecting" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-300">
            <div className="w-10 h-10 border-4 border-blue-400 border-t-transparent rounded-full animate-spin mb-3" />
            <p className="text-sm">Conectando câmera...</p>
          </div>
        )}
        {state.status === "error" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-red-400 px-6 text-center">
            <ExclamationTriangleIcon className="w-12 h-12 mb-2" />
            <p className="text-sm">{state.error}</p>
            <button
              onClick={() => startCamera(camera.id)}
              className="mt-3 btn-primary text-xs py-1.5 px-4"
            >
              Tentar novamente
            </button>
          </div>
        )}

        {/* Video element - displays the stream from context */}
        <video
          ref={videoRef}
          muted
          playsInline
          className={`w-full h-full object-cover ${state.status !== "active" ? "hidden" : ""}`}
        />

        {/* Overlay canvas for bounding boxes */}
        <canvas
          ref={overlayRef}
          className="absolute inset-0 w-full h-full pointer-events-none"
          style={{ display: state.status === "active" ? "block" : "none" }}
        />

        {/* Face counter badges */}
        {state.status === "active" && state.faces.length > 0 && (
          <div className="absolute top-3 left-3 flex gap-2">
            {recognizedCount > 0 && (
              <span className="flex items-center gap-1 bg-green-500/90 text-white text-xs px-2 py-1 rounded-full font-medium">
                <CheckCircleIcon className="w-3 h-3" />
                {recognizedCount} reconhecido{recognizedCount > 1 ? "s" : ""}
              </span>
            )}
            {unknownCount > 0 && (
              <span className="flex items-center gap-1 bg-red-500/90 text-white text-xs px-2 py-1 rounded-full font-medium">
                <ExclamationTriangleIcon className="w-3 h-3" />
                {unknownCount} desconhecido{unknownCount > 1 ? "s" : ""}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Face list */}
      {state.status === "active" && state.faces.length > 0 && (
        <div className="px-4 py-3 border-t border-slate-100 space-y-1 max-h-40 overflow-y-auto">
          {state.faces.map((face, i) => (
            <div key={i} className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <span
                  className={`w-2 h-2 rounded-full flex-shrink-0 ${
                    face.recognized && face.is_authorized ? "bg-green-500" : "bg-red-500"
                  }`}
                />
                <span className="font-medium">{face.person_name}</span>
                {face.person_name !== "Desconhecido" && (
                  <span className="text-xs text-slate-400">{face.confidence.toFixed(0)}%</span>
                )}
              </div>
              <span
                className={`text-xs font-medium ${
                  face.recognized && face.is_authorized ? "text-green-600" : "text-red-600"
                }`}
              >
                {face.recognized
                  ? face.is_authorized
                    ? "Autorizado"
                    : "Não Autorizado"
                  : "Desconhecido"}
              </span>
            </div>
          ))}
        </div>
      )}

      {state.wsMessage && state.status === "active" && (
        <p className="px-4 py-2 text-xs text-slate-400 border-t border-slate-100">
          {state.wsMessage}
        </p>
      )}
    </div>
  );
}
