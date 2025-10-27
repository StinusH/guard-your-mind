import type { ShadowHost } from "../shared/dom";

export const querySelectorWithin = (element: Element, selector: string): Element | null => {
  const direct = element.querySelector(selector);
  if (direct) {
    return direct;
  }
  const host = element as ShadowHost;
  return host.shadowRoot?.querySelector(selector) ?? null;
};

export const querySelectorAllWithin = (element: Element, selector: string): Element[] => {
  const matches = Array.from(element.querySelectorAll(selector));
  const host = element as ShadowHost;
  if (host.shadowRoot) {
    matches.push(...host.shadowRoot.querySelectorAll(selector));
  }
  return matches;
};

export const hasTruthyAttribute = (element: Element, attributeName: string): boolean => {
  if (!element.hasAttribute(attributeName)) {
    return false;
  }

  const value = element.getAttribute(attributeName);
  if (value === null) {
    return false;
  }

  const normalized = value.trim().toLowerCase();
  return normalized === "" || normalized === "true" || normalized === attributeName.toLowerCase();
};

export const hasTruthyShredditAttribute = (
  element: Element | null,
  attributeNames: string[],
  treatNullValue = true,
  normalizeName?: (name: string) => string,
): boolean => {
  if (!element) {
    return false;
  }

  for (const attributeName of attributeNames) {
    const normalizedName = normalizeName ? normalizeName(attributeName) : attributeName;
    if (!element.hasAttribute(normalizedName)) {
      continue;
    }

    const rawValue = element.getAttribute(normalizedName);
    if (rawValue === null) {
      if (treatNullValue) {
        return true;
      }
      continue;
    }

    const normalized = rawValue.trim().toLowerCase();
    if (
      !normalized ||
      normalized === "true" ||
      normalized === "null" ||
      normalized === attributeName.toLowerCase()
    ) {
      return true;
    }

    if (normalized === "false" || normalized === "0") {
      continue;
    }
  }

  return false;
};
