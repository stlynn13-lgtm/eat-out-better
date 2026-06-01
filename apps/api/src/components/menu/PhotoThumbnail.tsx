"use client";

import Image from "next/image";

interface PhotoThumbnailProps {
  src: string;
  index: number;
  onRemove: (index: number) => void;
}

export function PhotoThumbnail({ src, index, onRemove }: PhotoThumbnailProps) {
  return (
    <div className="relative w-14 h-14 rounded-xl overflow-hidden border-2 border-gray-200 bg-gray-100 flex-shrink-0">
      <Image
        src={src}
        alt={`Menu page ${index + 1}`}
        fill
        className="object-cover"
        sizes="56px"
      />
      {/* Page number label */}
      <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs text-center py-0.5 font-medium">
        {index + 1}
      </div>
      {/* Remove button */}
      <button
        onClick={() => onRemove(index)}
        className="absolute top-0.5 right-0.5 w-4 h-4 bg-black/60 text-white rounded-full flex items-center justify-center text-xs leading-none hover:bg-black/80 transition-colors"
        aria-label={`Remove page ${index + 1}`}
      >
        ×
      </button>
    </div>
  );
}

interface AddPhotoButtonProps {
  onClick: () => void;
  disabled?: boolean;
}

export function AddPhotoButton({ onClick, disabled }: AddPhotoButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="w-14 h-14 rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 flex items-center justify-center text-gray-400 hover:border-green-400 hover:text-green-500 hover:bg-green-50 transition-colors flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
      aria-label="Add another menu page"
    >
      <span className="text-xl font-light">+</span>
    </button>
  );
}
