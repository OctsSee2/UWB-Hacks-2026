import { bubblePositionKey } from "./config";
import { clamp } from "./utils";

type BubblePosition = {
  left: number;
  top: number;
};

type DragState = {
  startX: number;
  startY: number;
  startLeft: number;
  startTop: number;
  moved: boolean;
};

function readBubblePosition(): BubblePosition | null {
  try {
    const raw = localStorage.getItem(bubblePositionKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (typeof parsed?.left === "number" && typeof parsed?.top === "number") {
      return parsed;
    }
  } catch (_) {
    return null;
  }

  return null;
}

function writeBubblePosition(left: number, top: number): void {
  localStorage.setItem(bubblePositionKey, JSON.stringify({ left, top }));
}

function getClampedPosition(
  left: number,
  top: number,
  badge: HTMLElement
): BubblePosition {
  const margin = 8;
  const maxLeft = Math.max(margin, window.innerWidth - badge.offsetWidth - margin);
  const maxTop = Math.max(margin, window.innerHeight - badge.offsetHeight - margin);

  return {
    left: clamp(left, margin, maxLeft),
    top: clamp(top, margin, maxTop),
  };
}

function applyBubblePosition(root: HTMLElement, left: number, top: number): void {
  root.style.left = `${left}px`;
  root.style.top = `${top}px`;
  root.style.right = "auto";
  root.style.bottom = "auto";
}

export function setupDraggableBubble(
  root: HTMLElement,
  badge: HTMLElement,
  onDragEnd: () => void
): () => void {
  const saved = readBubblePosition();
  if (saved) {
    const clamped = getClampedPosition(saved.left, saved.top, badge);
    applyBubblePosition(root, clamped.left, clamped.top);
  }

  let drag: DragState | null = null;

  const onPointerDown = (event: PointerEvent) => {
    if (event.button !== 0) return;

    const rect = root.getBoundingClientRect();
    drag = {
      startX: event.clientX,
      startY: event.clientY,
      startLeft: rect.left,
      startTop: rect.top,
      moved: false,
    };

    root.classList.add("cc-dragging");
    badge.setPointerCapture?.(event.pointerId);
  };

  const onPointerMove = (event: PointerEvent) => {
    if (!drag) return;

    const deltaX = event.clientX - drag.startX;
    const deltaY = event.clientY - drag.startY;
    if (!drag.moved && Math.abs(deltaX) + Math.abs(deltaY) > 4) {
      drag.moved = true;
    }

    if (!drag.moved) return;

    event.preventDefault();
    const next = getClampedPosition(
      drag.startLeft + deltaX,
      drag.startTop + deltaY,
      badge
    );
    applyBubblePosition(root, next.left, next.top);
  };

  const onPointerUp = (event: PointerEvent) => {
    if (!drag) return;

    badge.releasePointerCapture?.(event.pointerId);
    root.classList.remove("cc-dragging");

    if (drag.moved) {
      const rect = root.getBoundingClientRect();
      const clamped = getClampedPosition(rect.left, rect.top, badge);
      applyBubblePosition(root, clamped.left, clamped.top);
      writeBubblePosition(clamped.left, clamped.top);
      onDragEnd();
    }

    drag = null;
  };

  const onResize = () => {
    const rect = root.getBoundingClientRect();
    const clamped = getClampedPosition(rect.left, rect.top, badge);
    applyBubblePosition(root, clamped.left, clamped.top);
    writeBubblePosition(clamped.left, clamped.top);
  };

  badge.addEventListener("pointerdown", onPointerDown);
  badge.addEventListener("pointermove", onPointerMove);
  badge.addEventListener("pointerup", onPointerUp);
  badge.addEventListener("pointercancel", onPointerUp);
  window.addEventListener("resize", onResize);

  return () => {
    badge.removeEventListener("pointerdown", onPointerDown);
    badge.removeEventListener("pointermove", onPointerMove);
    badge.removeEventListener("pointerup", onPointerUp);
    badge.removeEventListener("pointercancel", onPointerUp);
    window.removeEventListener("resize", onResize);
  };
}
