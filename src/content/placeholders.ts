import { CONFIG } from "./config";
import { getRandomQuote } from "./quotes";

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
    align-items: flex-start;
    justify-content: center;
    margin: ${computedStyle.margin};
    padding: 16px;
    color: #4b4b4b;
    font-size: 14px;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  `;
  placeholder.style.boxSizing = "border-box";

  const contentWrapper = document.createElement("div");
  contentWrapper.style.cssText = `
    display: flex;
    flex-direction: column;
    gap: 4px;
    align-items: center;
    text-align: center;
    width: 100%;
  `;

  const headline = document.createElement("div");
  headline.textContent = "Content Blocked";
  headline.style.cssText = `
    font-weight: 600;
    font-size: 16px;
  `;

  const subline = document.createElement("div");
  subline.textContent = "Blocked by Guard Your Mind";
  subline.style.cssText = `
    font-size: 12px;
    opacity: 0.7;
  `;

  contentWrapper.append(headline, subline);
  placeholder.appendChild(contentWrapper);

  return placeholder;
}

export function createQuotePlaceholder(originalElement: Element): HTMLDivElement {
  const placeholder = createPlaceholder(originalElement);
  placeholder.replaceChildren();

  const contentWrapper = document.createElement("div");
  contentWrapper.style.cssText = `
    display: flex;
    flex-direction: column;
    gap: 10px;
    align-items: center;
    text-align: center;
    width: 100%;
  `;

  const headline = document.createElement("div");
  headline.textContent = "Guard Your Mind";
  headline.style.cssText = `
    font-weight: 600;
    font-size: 14px;
    opacity: 0.8;
  `;

  const quoteText = document.createElement("div");
  quoteText.textContent = `“${getRandomQuote()}”`;
  quoteText.style.cssText = `
    font-size: 15px;
    line-height: 1.5;
  `;

  contentWrapper.append(headline, quoteText);
  placeholder.appendChild(contentWrapper);
  return placeholder;
}
