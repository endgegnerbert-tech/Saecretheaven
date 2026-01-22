import Image from "next/image";
import { cn } from "@/lib/utils";

const ICONS = {
  key: "/key.svg",
  lock: "/lock.svg",
  shield: "/shield.svg",
  upload: "/upload.svg",
  smartphone: "/smartphone.svg",
  cloud: "/cloud.svg",
  clock: "/clock.svg",
  search: "/search.svg",
  image: "/image.svg",
  folder: "/Openfolder.svg",
  refresh: "/RefreshCw.svg",
  chevronRight: "/ChevronRight.svg",
} as const;

export type IconName = keyof typeof ICONS;

interface CustomIconProps {
  name: IconName;
  className?: string;
  size?: number;
}

export function CustomIcon({ name, className, size = 24 }: CustomIconProps) {
  return (
    <div
      className={cn("relative inline-block shrink-0", className)}
      style={{ width: size, height: size }}
    >
      <Image
        src={ICONS[name]}
        alt={name}
        fill
        className="object-contain"
        unoptimized
      />
    </div>
  );
}
