import Image from "next/image";
import type { LandingImage } from "@/lib/landing-images";

const FRAME_STYLES = [
  "rotate-[-6deg] -translate-x-2 sm:translate-x-0",
  "rotate-[4deg] translate-y-3",
  "rotate-[-3deg] -translate-y-2",
  "rotate-[7deg] translate-x-2 translate-y-1",
  "rotate-[-5deg] -translate-y-1",
  "rotate-[3deg] translate-y-4",
  "rotate-[-8deg] translate-x-1",
  "rotate-[5deg] -translate-y-3",
];

const CATEGORY_RING: Record<LandingImage["category"], string> = {
  family: "ring-[#8b5e34]/30",
  history: "ring-[#3b82f6]/30",
  places: "ring-[#7c3aed]/30",
};

type LandingPhotoCollageProps = {
  images: LandingImage[];
  totalInDocument: number;
};

export default function LandingPhotoCollage({
  images,
  totalInDocument,
}: LandingPhotoCollageProps) {
  if (images.length === 0) return null;

  return (
    <section className="relative mt-10 sm:mt-12">
      <div className="pointer-events-none absolute inset-x-8 top-1/2 hidden h-40 -translate-y-1/2 rounded-full bg-[#e8dcc8]/80 blur-3xl sm:block" />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4 lg:grid-cols-8 lg:gap-3">
        {images.map((image, index) => (
          <figure
            key={image.id}
            className={`group relative overflow-hidden rounded-2xl border-4 border-white bg-white p-1.5 shadow-md transition duration-300 hover:z-10 hover:scale-105 hover:shadow-xl ${FRAME_STYLES[index % FRAME_STYLES.length]} ${CATEGORY_RING[image.category]} ring-4`}
          >
            <div className="relative aspect-[4/5] overflow-hidden rounded-xl bg-[#efe4d2]">
              <Image
                src={image.src}
                alt={image.caption}
                fill
                sizes="(max-width: 640px) 45vw, (max-width: 1024px) 20vw, 140px"
                className="object-cover"
                priority={index < 4}
              />
            </div>
            <figcaption className="mt-2 px-1 text-center text-[10px] leading-snug text-[#6f5c49]">
              {image.caption}
            </figcaption>
          </figure>
        ))}
      </div>

      <p className="mx-auto mt-6 max-w-2xl text-center text-xs text-[#6f5c49]">
        {totalInDocument} photographs and illustrations in the original family document —{" "}
        {images.length} highlights from Winifred&apos;s story shown here.
      </p>
    </section>
  );
}