import { useState, useRef, useCallback } from "react";
import { CameraType, CameraView, useCameraPermissions } from "expo-camera";

export type CameraStatus =
  | "idle"
  | "requesting"
  | "active"
  | "denied"
  | "unavailable"
  | "error";

export interface UseCameraReturn {
  status: CameraStatus;
  cameraRef: React.RefObject<CameraView | null>;
  requestPermission: () => Promise<void>;
  capturePhoto: () => Promise<string | null>; // Returns local URI
  facing: CameraType;
  toggleFacing: () => void;
}

export function useCamera(): UseCameraReturn {
  // useCameraPermissions is the SDK 53+ recommended API
  // (replaces deprecated Camera.requestCameraPermissionsAsync())
  const [permission, requestPermissionAsync] = useCameraPermissions();
  const [facing, setFacing] = useState<CameraType>("back");
  const cameraRef = useRef<CameraView>(null);

  // Derive CameraStatus from the permission object
  const status: CameraStatus = !permission
    ? "idle"
    : permission.granted
    ? "active"
    : permission.canAskAgain
    ? "idle"
    : "denied";

  const requestPermission = useCallback(async () => {
    try {
      await requestPermissionAsync();
    } catch {
      // status is derived from permission object — no extra state needed
    }
  }, [requestPermissionAsync]);

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
