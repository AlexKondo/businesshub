"use client";

import { useState, type DragEvent } from "react";

// Moves an item within a list from one index to another (immutably).
export function reorder<T>(list: T[], from: number, to: number): T[] {
  const copy = [...list];
  const [moved] = copy.splice(from, 1);
  copy.splice(to, 0, moved);
  return copy;
}

// Native HTML5 drag-and-drop reordering — no external library, matching this
// repo's zero-dependency UI pattern. Spread `dragProps(index)` onto each row;
// `onReorder(from, to)` fires on a successful drop. `dragIndex`/`overIndex`
// let the caller add visual feedback (dim the dragged row, highlight the
// drop target).
export function useDragReorder(onReorder: (from: number, to: number) => void) {
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);

  function dragProps(index: number) {
    return {
      draggable: true,
      onDragStart: (e: DragEvent) => {
        setDragIndex(index);
        e.dataTransfer.effectAllowed = "move";
        // Firefox won't start a drag unless some data is set.
        e.dataTransfer.setData("text/plain", String(index));
      },
      onDragEnter: (e: DragEvent) => {
        e.preventDefault();
        if (dragIndex !== null) setOverIndex(index);
      },
      onDragOver: (e: DragEvent) => {
        // preventDefault is required for onDrop to fire.
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
      },
      onDrop: (e: DragEvent) => {
        e.preventDefault();
        if (dragIndex !== null && dragIndex !== index) onReorder(dragIndex, index);
        setDragIndex(null);
        setOverIndex(null);
      },
      onDragEnd: () => {
        setDragIndex(null);
        setOverIndex(null);
      },
    };
  }

  return { dragIndex, overIndex, dragProps };
}
