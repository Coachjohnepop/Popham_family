"use client";

import Image from "next/image";
import { useState } from "react";
import StorySlideshowModal from "@/components/StorySlideshowModal";
import type { StoryImage } from "@/lib/types";

type StoryPhotoGalleryProps = {
  images: StoryImage[];
  label: string;
};

export default function StoryPhotoGallery({ images, label }: StoryPhotoGalleryProps) {
  const [open, setOpen] = useState(false);
  const [startIndex, setStartIndex] = useState(0);

  if (images.length === 0) return null;

  function openAt(index: number) {
    setStartIndex(index);
    setOpen(true);
  }

  return (
    <>
      <div className="rounded-2xl border border-dashed border-[#c8b08d] bg-[#fffaf2] p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#8b5e34]">
              Photos
            </p>
            <p className="text-sm text-[#6f5c49]">{label}</p>
          </div>
          <button
            type="button"
            onClick={() => openAt(0)}
            className="rounded-full bg-[#8b5e34] px-4 py-2 text-sm font-semibold text-white hover:bg-[#6f4a28]"
          >
            View slideshow ({images.length})
          </button>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {images.slice(0, 4).map((image, index) => (
            <button
              key={image.media}
              type="button"
              onClick={() => openAt(index)}
              className="relative h-16 w-16 overflow-hidden rounded-lg border border-[#e2d4bf] bg-[#efe4d2] hover:ring-2 hover:ring-[#8b5e34]/40"
              aria-label={`Open photo ${index + 1}`}
            >
              <Image src={image.src} alt="" fill sizes="64px" className="object-cover" />
            </button>
          ))}
          {images.length > 4 && (
            <button
              type="button"
              onClick={() => openAt(4)}
              className="flex h-16 w-16 items-center justify-center rounded-lg border border-[#e2d4bf] bg-[#efe4d2] text-xs font-semibold text-[#5c4a38] hover:bg-[#e4d4bc]"
            >
              +{images.length - 4}
            </button>
          )}
        </div>
      </div>

      <StorySlideshowModal
        images={images}
        title={label}
        open={open}
        onClose={() => setOpen(false)}
        startIndex={startIndex}
      />
    </>
  );
}