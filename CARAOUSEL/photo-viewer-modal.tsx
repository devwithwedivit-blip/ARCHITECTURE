"use client";

import React, { useEffect, useState } from "react";
import { MediaItem } from "./media-data";

interface PhotoViewerModalProps {
  item: MediaItem | null;
  isOpen: boolean;
  onClose: () => void;
}

export function PhotoViewerModal({ item, isOpen, onClose }: PhotoViewerModalProps) {
  const [orientation, setOrientation] = useState<"horizontal" | "vertical">("horizontal");

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    if (isOpen) {
      document.body.classList.add("viewer-open");
      window.addEventListener("keydown", handleKeyDown);
    } else {
      document.body.classList.remove("viewer-open");
    }

    return () => {
      document.body.classList.remove("viewer-open");
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !item) return null;

  const hasPortrait = Boolean(item.portrait);
  const currentSrc = orientation === "vertical" && item.portrait ? item.portrait : item.src;

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-labelledby="viewer-title"
      onClick={onClose}
    >
      <div
        className={`photo-viewer ${orientation === "vertical" ? "is-portrait" : ""}`}
        onClick={(e) => e.stopPropagation()}
        style={{ display: "grid" }}
      >
        <div className="photo-viewer__top">
          <p id="viewer-title">{item.title} — Perspectiva artística</p>
          <button
            type="button"
            className="photo-viewer__close"
            aria-label="Fechar imagem completa"
            onClick={onClose}
          >
            Fechar <span aria-hidden="true">×</span>
          </button>
        </div>

        <div className="photo-viewer__formats" role="group" aria-label="Enquadramento">
          <button
            type="button"
            className="viewer-landscape"
            aria-pressed={orientation === "horizontal"}
            onClick={() => setOrientation("horizontal")}
          >
            Horizontal
          </button>
          {hasPortrait && (
            <button
              type="button"
              className="viewer-portrait"
              aria-pressed={orientation === "vertical"}
              onClick={() => setOrientation("vertical")}
            >
              Vertical
            </button>
          )}
        </div>

        <div className="flex items-center justify-center min-h-0 w-full overflow-hidden">
          <img
            className="photo-viewer__image"
            src={currentSrc}
            alt={item.alt}
          />
        </div>

        <p className="photo-viewer__note">
          Perspectiva artística. Imagem ilustrativa. Mobiliário e decoração são sugestões.
        </p>
      </div>
    </div>
  );
}
