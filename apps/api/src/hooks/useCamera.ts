"use client";

/**
 * useCamera — device camera access and capture hook.
 *
 * Handles:
 * - Requesting camera permission (mobile-first)
 * - Streaming video to a <video> element
 * - Capturing a still frame to a File
 * - Cleanup (stopping media tracks on unmount)
 */

import { useRef, useState, useCallback, useEffect } from "react";

export type CameraStatus =
  | "idle"
  | "requesting"
  | "active"
  | "denied"
  | "unavailable"
  | "error";

interface UseCameraReturn {
  status: CameraStatus;
  error: string | null;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  startCamera: () => Promise<void>;
  stopCamera: () => void;
  capturePhoto: () => File | null;
}

export function useCamera(): UseCameraReturn {
  const [status, setStatus] = useState<CameraStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setStatus("idle");
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  const startCamera = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setStatus("unavailable");
      setError("Camera not available on this device or browser.");
      return;
    }

    setStatus("requesting");
    setError(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "environment", // Back camera on mobile
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }

      setStatus("active");
    } catch (err) {
      if (err instanceof DOMException) {
        if (
          err.name === "NotAllowedError" ||
          err.name === "PermissionDeniedError"
        ) {
          setStatus("denied");
          setError(
            "Camera access denied. Please enable camera access in your browser settings."
          );
        } else if (
          err.name === "NotFoundError" ||
          err.name === "DevicesNotFoundError"
        ) {
          setStatus("unavailable");
          setError("No camera found on this device.");
        } else {
          setStatus("error");
          setError(`Camera error: ${err.message}`);
        }
      } else {
        setStatus("error");
        setError("An unexpected error occurred with the camera.");
      }
    }
  }, []);

  const capturePhoto = useCallback((): File | null => {
    const video = videoRef.current;
    if (!video || status !== "active") return null;

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    ctx.drawImage(video, 0, 0);

    // Convert to blob synchronously via toDataURL
    const dataUrl = canvas.toDataURL("image/jpeg", 0.95);
    const base64 = dataUrl.split(",")[1];
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    const blob = new Blob([bytes], { type: "image/jpeg" });

    return new File([blob], `menu-capture-${Date.now()}.jpg`, {
      type: "image/jpeg",
    });
  }, [status]);

  return {
    status,
    error,
    videoRef,
    startCamera,
    stopCamera,
    capturePhoto,
  };
}
