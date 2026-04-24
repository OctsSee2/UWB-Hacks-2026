function escapeHtml(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function getText(selectors) {
  for (const selector of selectors) {
    const el = document.querySelector(selector);
    if (el && el.innerText.trim()) {
      return el.innerText.trim();
    }
  }
  return "";
}

function getImage(selectors) {
  for (const selector of selectors) {
    const el = document.querySelector(selector);
    if (el) {
      return el.src || el.getAttribute("data-old-hires") || "";
    }
  }
  return "";
}

function iconLeaf(size = 11) {
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 4c-4 0-11 1.5-14 6a7 7 0 0 0 8 10c4.5-1.5 6-8.5 6-16Z"></path><path d="M4 20c4-6 8-9 14-13"></path></svg>`;
}

function iconArrow(size = 14) {
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14"></path><path d="m13 6 6 6-6 6"></path></svg>`;
}

function iconBolt(size = 20) {
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M13 2 4 14h6l-1 8 9-12h-6l1-8Z"></path></svg>`;
}

function iconCheck(size = 12) {
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5 12 5 5L20 7"></path></svg>`;
}

function iconLogo(size = 22) {
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 9h14l-1 11H6L5 9Z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" fill="rgba(167,201,87,0.15)"></path><path d="M9 9V7a3 3 0 0 1 6 0v2" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"></path><path d="M12 7c0-2 1-3.5 3-4 0 2-1 3.5-3 4Z" fill="currentColor"></path></svg>`;
}
