"use client";

import { useEffect, useRef } from "react";

// Wraps its child in a fixed-width box with a drag handle on the right
// border. `onResize` fires continuously while dragging (for live feedback);
// `onResizeEnd` fires once on release with the final width, meant for
// persisting the choice (e.g. to the user's own account).
export function ResizableBox({
  width,
  minWidth,
  maxWidth,
  onResize,
  onResizeEnd,
  className,
  children,
}: {
  width: number;
  minWidth: number;
  maxWidth: number;
  onResize: (width: number) => void;
  onResizeEnd: (width: number) => void;
  className?: string;
  children: React.ReactNode;
}) {
  const widthRef = useRef(width);
  const onResizeRef = useRef(onResize);
  const onResizeEndRef = useRef(onResizeEnd);
  const dragStartRef = useRef<{ x: number; width: number } | null>(null);

  // Keeps the refs in sync with the latest props after every render (not
  // during render, which the React Compiler disallows) — mousemove/mouseup
  // handlers read these refs instead of closing over stale prop values.
  useEffect(() => {
    widthRef.current = width;
    onResizeRef.current = onResize;
    onResizeEndRef.current = onResizeEnd;
  });

  useEffect(() => {
    function onMouseMove(e: MouseEvent) {
      if (!dragStartRef.current) return;
      const next = Math.min(
        maxWidth,
        Math.max(minWidth, dragStartRef.current.width + (e.clientX - dragStartRef.current.x))
      );
      onResizeRef.current(next);
    }
    function onMouseUp() {
      if (!dragStartRef.current) return;
      dragStartRef.current = null;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      onResizeEndRef.current(widthRef.current);
    }
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
    return () => {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };
  }, [minWidth, maxWidth]);

  function startDrag(e: React.MouseEvent) {
    dragStartRef.current = { x: e.clientX, width };
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  }

  return (
    <div style={{ width: `${width}px` }} className={`relative shrink-0 ${className ?? ""}`}>
      {children}
      <div
        onMouseDown={startDrag}
        role="separator"
        aria-orientation="vertical"
        className="absolute right-0 top-0 h-full w-1.5 cursor-col-resize hover:bg-(--brand-500)/40"
      />
    </div>
  );
}
