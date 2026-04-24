import React, { useState } from "react";
import { AcademicCapIcon, XMarkIcon } from "@heroicons/react/24/outline";

interface Props {
  title: string;
  driveFileId: string;
}

export default function TutorialButton({ title, driveFileId }: Props) {
  const [open, setOpen] = useState(false);
  const embedUrl = `https://drive.google.com/file/d/${driveFileId}/preview`;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-sm font-medium transition-colors"
        title="Ver tutorial"
      >
        <AcademicCapIcon className="w-4 h-4" />
        Tutorial
      </button>

      {open && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-xl w-full max-w-4xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <AcademicCapIcon className="w-5 h-5 text-blue-600" />
                <h2 className="font-bold text-slate-800">Tutorial — {title}</h2>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
            <div className="relative bg-black" style={{ aspectRatio: "16/9" }}>
              <iframe
                src={embedUrl}
                allow="autoplay"
                allowFullScreen
                title={`Tutorial ${title}`}
                className="absolute inset-0 w-full h-full rounded-b-2xl"
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
