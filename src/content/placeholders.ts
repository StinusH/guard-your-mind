import { CONFIG, QUOTES } from "./config";

let quoteIndex = 0;

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
