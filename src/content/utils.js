export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function getText(selectors) {
  for (const selector of selectors) {
    const el = document.querySelector(selector);
    if (el && el.innerText.trim()) {
      return el.innerText.trim();
    }
  }
  return "";
}

export function getImage(selectors) {
  for (const selector of selectors) {
    const el = document.querySelector(selector);
    if (el) {
      return el.src || el.getAttribute("data-old-hires") || "";
    }
  }
  return "";
}
