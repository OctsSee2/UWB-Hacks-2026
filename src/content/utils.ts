export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function getText(selectors: string[]): string {
  for (const selector of selectors) {
    const el = document.querySelector(selector);
    const text = el?.textContent?.trim();
    if (text) {
      return text;
    }
  }
  return "";
}

export function getImage(selectors: string[]): string {
  for (const selector of selectors) {
    const el = document.querySelector<HTMLImageElement>(selector);
    if (el) {
      return el.src || el.getAttribute("data-old-hires") || "";
    }
  }
  return "";
}
