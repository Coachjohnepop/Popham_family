"use client";

import Image from "next/image";
import { useState } from "react";
import type { StoryImage } from "@/lib/types";

type StorySlideshowProps = {
  images: StoryImage[];
  title?: string;
};

export default function StorySlideshow({ images, title }: StorySlideshowProps) {
  const [index, setIndex] = useState(0);
  const current = images[index];

  if (!current) return null;

  function go(delta: number) {
    setIndex((prev) => (prev + delta + images.length) % images.length);
  }

  return (
    <figure className="overflow-hidden rounded-2xl border border-[#e2d4bf] bg-[#fffaf2]">
      {title && (
        <div className="border-b border-[#e2d4bf] px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#8b5e34]">
          {title}
        </div>
      )}
      <div className="relative aspect-[4/3] bg-[#efe4d2] sm:aspect-[16/10]">
        <Image
          src={current.src}
          alt={current.caption}
          fill
          sizes="(max-width: 768px) 100vw, 720px"
          className="object-contain"
        />
        {images.length > 1 && (
          <>
            <button
              type="button"
              onClick={() => go(-1)}
              className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-white/90 px-3 py-2 text-sm font-semibold text-[#5c4a38] shadow hover:bg-white"
              aria-label="Previous image"
            >
              ‹
            </button>
            <button
              type="button"
              onClick={() => go(1)}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-white/90 px-3 py-2 text-sm font-semibold text-[#5c4a38] shadow hover:bg-white"
              aria-label="Next image"
            >
              ›
            </button>
          </>
        )}
      </div>
      <figcaption className="space-y-2 px-4 py-3">
        <p className="text-sm leading-relaxed text-[#5c4a38]">{current.caption}</p>
        {images.length > 1 && (
          <div className="flex items-center justify-between gap-3">
            <div className="flex flex-wrap gap-1.5">
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
            <span className="text-xs text-[#6f5c49]">
              {index + 1} / {images.length}
            </span>
          </div>
        )}
      </figcaption>
    </figure>
  );
}