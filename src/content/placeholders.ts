import { CONFIG, QUOTES } from "./config";

let quoteIndex = 0;
let blurStylesInjected = false;

const getNextQuote = (): string => {
  const quote = QUOTES[quoteIndex % QUOTES.length];
  quoteIndex += 1;
  return quote;
};

export function createPlaceholder(originalElement: Element): HTMLDivElement {
  const placeholder = document.createElement("div");
  placeholder.className = CONFIG.placeholderClass;

  const rect = originalElement.getBoundingClientRect();
  const computedStyle = window.getComputedStyle(originalElement);

  placeholder.style.cssText = `
    min-height: ${rect.height > 0 ? rect.height : 200}px;
    background: #f6f7f8;
    border: 1px solid #edeff1;
    border-radius: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    margin: ${computedStyle.margin};
    padding: ${computedStyle.padding};
    color: #7c7c7c;
    font-size: 14px;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  `;

  placeholder.innerHTML = `
    <div style="text-align: center; padding: 20px;">
      <div style="font-weight: 500; margin-bottom: 4px;">Content Blocked</div>
      <div style="font-size: 12px; opacity: 0.7;">Blocked by Guard Your Mind</div>
    </div>
  `;

  return placeholder;
}

export function createQuotePlaceholder(originalElement: Element): HTMLDivElement {
  const placeholder = createPlaceholder(originalElement);
  placeholder.innerHTML = `
    <div style="text-align: center; padding: 20px; display: flex; flex-direction: column; gap: 8px;">
      <div style="font-weight: 500; font-size: 13px; opacity: 0.8;">Guard Your Mind</div>
      <div style="font-size: 14px; line-height: 1.4;">“${getNextQuote()}”</div>
    </div>
  `;
  return placeholder;
}

export function ensureBlurStylesInjected(): void {
  if (blurStylesInjected) {
    return;
  }

  const style = document.createElement("style");
  style.textContent = `
    .${CONFIG.blurredClass} {
      position: relative !important;
      filter: blur(6px) saturate(0.4);
      border-radius: inherit;
      overflow: hidden;
    }

    .${CONFIG.blurredClass}::after {
      content: "Blurred by Guard Your Mind";
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(17, 24, 39, 0.55);
      color: #f9fafb;
      font-size: 14px;
      font-weight: 600;
      text-align: center;
      padding: 16px;
      pointer-events: none;
    }
  `;

  const target = document.head ?? document.documentElement ?? document.body;
  if (target) {
    target.appendChild(style);
    blurStylesInjected = true;
  }
}

export function blurElement(element: Element): void {
  ensureBlurStylesInjected();
  const target = element as HTMLElement;
  target.classList.add(CONFIG.blankedClass, CONFIG.blurredClass);
}

export function clearBlurredElements(): void {
  document.querySelectorAll(`.${CONFIG.blurredClass}`).forEach((element) => {
    element.classList.remove(CONFIG.blurredClass);
    element.classList.remove(CONFIG.blankedClass);
  });
}
