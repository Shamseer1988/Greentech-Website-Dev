import Image from "next/image";
import { cn } from "cn";

/**
 * See-through background photo of a category card. The text area keeps the card colour,
 * so the words stay easy to read with any photo and at any strength.
 */
export function CardPhoto({
  src,
  opacity,
  dark,
  sizes = "(min-width: 1024px) 400px, (min-width: 640px) 50vw, 100vw",
}: {
  src: string;
  opacity: number;
  dark?: boolean;
  sizes?: string;
}) {
  return (
    <span aria-hidden="true" className="absolute inset-0 overflow-hidden rounded-[inherit]">
      <span className="absolute inset-0" style={{ opacity: opacity / 100 }}>
        <Image
          src={src}
          alt=""
          fill
          sizes={sizes}
          className="object-cover transition-transform duration-700 ease-out group-hover:scale-105 motion-reduce:transform-none motion-reduce:transition-none"
        />
      </span>
      <span
        className={cn(
          "absolute inset-0 bg-linear-to-t",
          dark
            ? "from-deep via-deep/85 via-58% to-transparent"
            : "from-white via-white/90 via-42% to-transparent to-80%",
        )}
      />
    </span>
  );
}
