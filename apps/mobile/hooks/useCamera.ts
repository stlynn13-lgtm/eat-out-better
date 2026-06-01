import { useState, useRef, useCallback } from "react";
import { Camera, CameraType, CameraView } from "expo-camera";

export type CameraStatus =
  | "idle"
  | "requesting"
  | "active"
  | "denied"
  | "unavailable"
  | "error";

export interface UseCameraReturn {
  status: CameraStatus;
  cameraRef: React.RefObject<CameraView>;
  requestPermission: () => Promise<void>;
  capturePhoto: () => Promise<string | null>; // Returns local URI
  facing: CameraType;
  toggleFacing: () => void;
}

export function useCamera(): UseCameraReturn {
  const [status, setStatus] = useState<CameraStatus>("idle");
  const [facing, setFacing] = useState<CameraType>("back");
  const cameraRef = useRef<CameraView>(null);

  const requestPermission = useCallback(async () => {
    setStatus("requesting");
    try {
      const { status: permStatus } = await Camera.requestCameraPermissionsAsync();
      if (permStatus === "granted") {
        setStatus("active");
      } else {
        setStatus("denied");
      }
    } catch {
      setStatus("error");
    }
  }, []);

  const capturePhoto = useCallback(async (): Promise<string | null> => {
    if (!cameraRef.current || status !== "active") return null;
    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.9,
        exif: false,
      });
      return photo?.uri ?? null;
    } catch (error) {
      console.error("Capture failed:", error);
      return null;
    }
  }, [status]);

  const toggleFacing = useCallback(() => {
    setFacing((prev) => (prev === "back" ? "front" : "back"));
  }, []);

  return {
    status,
    cameraRef,
    requestPermission,
    capturePhoto,
    facing,
    toggleFacing,
  };
}
