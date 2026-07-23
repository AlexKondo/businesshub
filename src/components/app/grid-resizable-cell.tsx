"use client";

// Shared by every place that renders the field grid (this admin editor and
// the real supplier form) — keep them in sync if this ever changes.
export const GRID_TOTAL_COLUMNS = 50;

// Drag-to-resize a 1-GRID_TOTAL_COLUMNS CSS Grid column span — drag distance
// is converted to a span delta relative to the grid container's measured
// width, so "how many columns" scales correctly regardless of screen size.
//
// Uses Pointer Capture (not document-level mousemove/mouseup) so the handle
// keeps receiving move/up events even if the pointer leaves the handle — or
// the browser viewport entirely — mid-drag. Without capture, releasing the
// button outside the handle's bounds never fires our mouseup listener, and
// the resize keeps following the pointer forever until some later stray
// mouseup elsewhere on the page.
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
  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    e.currentTarget.setPointerCapture(e.pointerId);
    e.currentTarget.dataset.dragStartX = String(e.clientX);
    e.currentTarget.dataset.dragStartSpan = String(span);
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  }

  function computeNextSpan(e: React.PointerEvent<HTMLDivElement>): number | null {
    const { dragStartX, dragStartSpan } = e.currentTarget.dataset;
    if (dragStartX === undefined || dragStartSpan === undefined || !containerRef.current) {
      return null;
    }
    const containerWidth = containerRef.current.getBoundingClientRect().width;
    const perColumn = containerWidth / GRID_TOTAL_COLUMNS;
    const deltaSpan = Math.round((e.clientX - Number(dragStartX)) / perColumn);
    return Math.min(GRID_TOTAL_COLUMNS, Math.max(1, Number(dragStartSpan) + deltaSpan));
  }

  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    const next = computeNextSpan(e);
    if (next !== null) onResize(next);
  }

  function endDrag(e: React.PointerEvent<HTMLDivElement>) {
    const next = computeNextSpan(e);
    delete e.currentTarget.dataset.dragStartX;
    delete e.currentTarget.dataset.dragStartSpan;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
    if (next !== null) onResizeEnd(next);
  }

  return (
    <div
      style={{ gridColumn: `span ${span}` }}
      className={`relative px-2.5 first:pl-0 last:pr-0 ${className ?? ""}`}
    >
      {children}
      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        role="separator"
        aria-orientation="vertical"
        className="absolute right-0 top-0 h-full w-1.5 touch-none cursor-col-resize hover:bg-(--brand-500)/40"
      />
    </div>
  );
}
