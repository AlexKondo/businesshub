"use client";

// Wraps its child in a fixed-width box with a drag handle on the right
// border. `onResize` fires continuously while dragging (for live feedback);
// `onResizeEnd` fires once on release with the final width, meant for
// persisting the choice (e.g. to the user's own account).
//
// Uses Pointer Capture (not document-level mousemove/mouseup) so the handle
// keeps receiving move/up events even if the pointer leaves the handle — or
// the browser viewport entirely — mid-drag. Without capture, releasing the
// button outside the handle's bounds never fires our mouseup listener, and
// the resize keeps following the pointer forever until some later stray
// mouseup elsewhere on the page.
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
  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    e.currentTarget.setPointerCapture(e.pointerId);
    e.currentTarget.dataset.dragStartX = String(e.clientX);
    e.currentTarget.dataset.dragStartWidth = String(width);
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  }

  function computeNextWidth(e: React.PointerEvent<HTMLDivElement>): number | null {
    const { dragStartX, dragStartWidth } = e.currentTarget.dataset;
    if (dragStartX === undefined || dragStartWidth === undefined) return null;
    return Math.min(
      maxWidth,
      Math.max(minWidth, Number(dragStartWidth) + (e.clientX - Number(dragStartX)))
    );
  }

  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    const next = computeNextWidth(e);
    if (next !== null) onResize(next);
  }

  function endDrag(e: React.PointerEvent<HTMLDivElement>) {
    const next = computeNextWidth(e);
    delete e.currentTarget.dataset.dragStartX;
    delete e.currentTarget.dataset.dragStartWidth;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
    if (next !== null) onResizeEnd(next);
  }

  return (
    <div style={{ width: `${width}px` }} className={`relative shrink-0 ${className ?? ""}`}>
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
