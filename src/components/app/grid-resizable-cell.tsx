"use client";

import { useEffect, useRef } from "react";

// Same drag-to-resize mechanism as ResizableBox, but resizes a 1-12 CSS
// Grid column span instead of a raw pixel width — drag distance is
// converted to a span delta relative to the grid container's measured
// width, so "how many columns" scales correctly regardless of screen size.
export function GridResizableCell({
  span,
  containerRef,
  onResize,
  onResizeEnd,
  className,
  children,
}: {
  span: number;
  containerRef: React.RefObject<HTMLElement | null>;
  onResize: (span: number) => void;
  onResizeEnd: (span: number) => void;
  className?: string;
  children: React.ReactNode;
}) {
  const spanRef = useRef(span);
  const onResizeRef = useRef(onResize);
  const onResizeEndRef = useRef(onResizeEnd);
  const dragStartRef = useRef<{ x: number; span: number } | null>(null);

  useEffect(() => {
    spanRef.current = span;
    onResizeRef.current = onResize;
    onResizeEndRef.current = onResizeEnd;
  });

  useEffect(() => {
    function onMouseMove(e: MouseEvent) {
      if (!dragStartRef.current || !containerRef.current) return;
      const containerWidth = containerRef.current.getBoundingClientRect().width;
      const perColumn = containerWidth / 12;
      const deltaSpan = Math.round((e.clientX - dragStartRef.current.x) / perColumn);
      const next = Math.min(12, Math.max(1, dragStartRef.current.span + deltaSpan));
      onResizeRef.current(next);
    }
    function onMouseUp() {
      if (!dragStartRef.current) return;
      dragStartRef.current = null;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      onResizeEndRef.current(spanRef.current);
    }
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
    return () => {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };
  }, [containerRef]);

  function startDrag(e: React.MouseEvent) {
    dragStartRef.current = { x: e.clientX, span };
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  }

  return (
    <div
      style={{ gridColumn: `span ${span}` }}
      className={`relative ${className ?? ""}`}
    >
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
