"use client";

import { useEffect } from "react";
import { useCamera, type CameraStatus } from "@/hooks/useCamera";

interface CameraViewfinderProps {
  onCapture: (file: File) => void;
}

export function CameraViewfinder({ onCapture }: CameraViewfinderProps) {
  const { status, error, videoRef, startCamera, capturePhoto } = useCamera();

  useEffect(() => {
    startCamera();
  }, [startCamera]);

  const handleCapture = () => {
    const file = capturePhoto();
    if (file) onCapture(file);
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Viewfinder */}
      <div className="camera-viewfinder">
        {/* Corner brackets rendered via CSS pseudo-elements + these divs */}
        <div className="corner-tr" />
        <div className="corner-bl" />

        {status === "active" ? (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6">
            <CameraStatusDisplay status={status} error={error} />
          </div>
        )}
      </div>

      {/* CAMERA capture button */}
      {status === "active" && (
        <button
          onClick={handleCapture}
          className="mx-auto flex items-center gap-2 bg-white border border-gray-200 rounded-full px-5 py-2.5 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 active:scale-95 transition-all"
        >
          <svg
            className="w-4 h-4 text-gray-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z"
            />
          </svg>
          CAMERA
        </button>
      )}
    </div>
  );
}

function CameraStatusDisplay({
  status,
  error,
}: {
  status: CameraStatus;
  error: string | null;
}) {
  if (status === "requesting") {
    return (
      <>
        <div className="w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-gray-400 text-sm">Requesting camera access…</p>
      </>
    );
  }

  if (status === "denied") {
    return (
      <>
        <svg
          className="w-10 h-10 text-red-400 mb-3"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
          />
        </svg>
        <p className="text-red-400 text-sm font-medium">Camera access denied</p>
        <p className="text-gray-500 text-xs mt-1">
          Enable camera in browser settings
        </p>
      </>
    );
  }

  if (status === "unavailable" || status === "error") {
    return (
      <>
        <svg
          className="w-10 h-10 text-gray-500 mb-3"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z"
          />
        </svg>
        <p className="text-gray-400 text-sm">{error ?? "Camera unavailable"}</p>
      </>
    );
  }

  // Idle / default
  return (
    <>
      <p className="text-gray-500 text-sm font-medium">Point at a menu page</p>
      <p className="text-gray-400 text-xs mt-1 uppercase tracking-wider">
        CAMERA
      </p>
    </>
  );
}
