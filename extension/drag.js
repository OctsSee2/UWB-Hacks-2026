function readBubblePosition() {
  try {
    const raw = localStorage.getItem(CarbonCartConfig.bubblePositionKey);
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

function writeBubblePosition(left, top) {
  localStorage.setItem(
    CarbonCartConfig.bubblePositionKey,
    JSON.stringify({ left, top })
  );
}

function getClampedPosition(left, top, badge) {
  const margin = 8;
  const maxLeft = Math.max(margin, window.innerWidth - badge.offsetWidth - margin);
  const maxTop = Math.max(margin, window.innerHeight - badge.offsetHeight - margin);

  return {
    left: clamp(left, margin, maxLeft),
    top: clamp(top, margin, maxTop),
  };
}

function applyBubblePosition(root, left, top) {
  root.style.left = `${left}px`;
  root.style.top = `${top}px`;
  root.style.right = "auto";
  root.style.bottom = "auto";
}

function setupDraggableBubble(root, badge, onDragEnd) {
  const saved = readBubblePosition();
  if (saved) {
    const clamped = getClampedPosition(saved.left, saved.top, badge);
    applyBubblePosition(root, clamped.left, clamped.top);
  }

  let drag = null;

  const onPointerDown = (event) => {
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

  const onPointerMove = (event) => {
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

  const onPointerUp = (event) => {
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
}
