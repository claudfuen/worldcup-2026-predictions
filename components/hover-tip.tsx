"use client";

import { useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

// Lightweight, dependency-free hover/focus tooltip. The panel is portalled to <body> and positioned with
// `position: fixed` from the trigger's bounding box, so it escapes the `overflow-x-auto` clipping that the
// bracket tree and the third-place table would otherwise impose. `pointer-events-none` means the panel
// never intercepts clicks — safe to render from inside a <tr> or an <a> (the portal also keeps the DOM
// valid). Read-only content only; there is nothing to click inside the tip.
//
// Usage:
//   const tip = useHoverTip();
//   <tr {...tip.triggerProps}> … {tip.open && <HoverTipPanel pos={tip.pos}>…</HoverTipPanel>} </tr>

type TipPos = { left: number; top?: number; bottom?: number };

export function useHoverTip() {
  const [pos, setPos] = useState<TipPos | null>(null);
  const show = (e: { currentTarget: Element }) => {
    const r = e.currentTarget.getBoundingClientRect();
    const left = Math.max(8, Math.min(r.left, window.innerWidth - 272)); // 256px panel + margin
    // Prefer below; flip above in the lower part of the viewport so it doesn't run off-screen.
    const below = r.bottom < window.innerHeight * 0.6;
    setPos(below ? { left, top: r.bottom + 6 } : { left, bottom: window.innerHeight - r.top + 6 });
  };
  const hide = () => setPos(null);
  return {
    pos,
    open: pos != null,
    triggerProps: { onMouseEnter: show, onMouseLeave: hide, onFocus: show, onBlur: hide },
  };
}

export function HoverTipPanel({ pos, children }: { pos: TipPos | null; children: ReactNode }) {
  if (!pos || typeof document === "undefined") return null;
  return createPortal(
    <div
      role="tooltip"
      style={{ position: "fixed", left: pos.left, top: pos.top, bottom: pos.bottom, zIndex: 60 }}
      className="border-border-strong bg-surface-raised/95 pointer-events-none w-64 rounded-xl border p-3 text-xs shadow-xl backdrop-blur supports-[backdrop-filter]:bg-surface-raised/85"
    >
      {children}
    </div>,
    document.body,
  );
}
