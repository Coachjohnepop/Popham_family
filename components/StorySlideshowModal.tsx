"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import type { StoryImage } from "@/lib/types";

type StorySlideshowModalProps = {
  images: StoryImage[];
  title: string;
  open: boolean;
  onClose: () => void;
  startIndex?: number;
};

export default function StorySlideshowModal({
  images,
  title,
  open,
  onClose,
  startIndex = 0,
}: StorySlideshowModalProps) {
  const [index, setIndex] = useState(startIndex);

  useEffect(() => {
    if (open) {
      setIndex(startIndex);
    }
  }, [open, startIndex]);

  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowLeft") setIndex((prev) => (prev - 1 + images.length) % images.length);
      if (event.key === "ArrowRight") setIndex((prev) => (prev + 1) % images.length);
    }

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, images.length, onClose]);

  if (!open || images.length === 0) return null;

  const current = images[index];
  if (!current) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#2b2118]/75 p-4 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        className="relative w-full max-w-4xl overflow-hidden rounded-3xl border border-[#e2d4bf] bg-[#fffaf2] shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 border-b border-[#e2d4bf] px-4 py-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#8b5e34]">
              {title}
            </p>
            <p className="text-xs text-[#6f5c49]">
              {index + 1} of {images.length}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full bg-[#efe4d2] px-3 py-1.5 text-sm font-semibold text-[#5c4a38] hover:bg-[#e4d4bc]"
          >
            Close
          </button>
        </div>

        <div className="relative aspect-[4/3] bg-[#efe4d2] sm:aspect-[16/10]">
          <Image
            src={current.src}
            alt={current.caption}
            fill
            sizes="(max-width: 1024px) 100vw, 896px"
            className="object-contain"
            priority
          />
          {images.length > 1 && (
            <>
              <button
                type="button"
                onClick={() => setIndex((prev) => (prev - 1 + images.length) % images.length)}
                className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-white/90 px-3 py-2 text-lg font-semibold text-[#5c4a38] shadow"
                aria-label="Previous image"
              >
                ‹
              </button>
              <button
                type="button"
                onClick={() => setIndex((prev) => (prev + 1) % images.length)}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-white/90 px-3 py-2 text-lg font-semibold text-[#5c4a38] shadow"
                aria-label="Next image"
              >
                ›
              </button>
            </>
          )}
        </div>

        <div className="space-y-3 px-4 py-4">
          <p className="text-sm leading-relaxed text-[#5c4a38]">{current.caption}</p>
          {images.length > 1 && (
            <div className="flex flex-wrap justify-center gap-1.5">
              {images.map((image, i) => (
                <button
                  key={image.media}
                  type="button"
                  onClick={() => setIndex(i)}
                  aria-label={`Show image ${i + 1}`}
                  className={`h-2.5 w-2.5 rounded-full transition ${
                    i === index ? "bg-[#8b5e34]" : "bg-[#d9cbb6] hover:bg-[#c8b08d]"
                  }`}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}