import { useMemo } from "react";
import { encodeQr } from "./qr";

/** Dark-on-white QR with the required 4-module quiet zone. Decorative to assistive tech; the link text is adjacent. */
export function QrCode({ value, size = 200, label }: { value: string; size?: number; label: string }) {
  const path = useMemo(() => {
    const m = encodeQr(value);
    let d = "";
    m.forEach((row, y) =>
      row.forEach((dark, x) => {
        if (dark) d += `M${x + 4} ${y + 4}h1v1h-1z`;
      }),
    );
    return { d, n: m.length + 8 };
  }, [value]);
  return (
    <svg
      role="img"
      aria-label={label}
      viewBox={`0 0 ${path.n} ${path.n}`}
      width={size}
      height={size}
      shapeRendering="crispEdges"
      className="block rounded-field border border-line-panel bg-white"
    >
      <rect width={path.n} height={path.n} fill="#FFFFFF" />
      <path d={path.d} fill="#202323" />
    </svg>
  );
}
