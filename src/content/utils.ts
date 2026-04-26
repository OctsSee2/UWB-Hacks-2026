export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function getText(selectors: string[]): string {
  for (const selector of selectors) {
    let el: Element | null = null;
    try {
      el = document.querySelector(selector);
    } catch {
      continue;
    }
    const text = el?.textContent?.trim();
    if (text) {
      return text;
    }
  }
  return "";
}

export function getImage(selectors: string[]): string {
  for (const selector of selectors) {
    let el: HTMLImageElement | null = null;
    try {
      el = document.querySelector<HTMLImageElement>(selector);
    } catch {
      continue;
    }
    if (el) {
      return el.src || el.getAttribute("data-old-hires") || "";
    }
  }
  return "";
}
