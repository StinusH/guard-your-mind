import type { BlockingStyle } from "../shared/settings";
import { CONFIG } from "./config";
import { log } from "./logger";

type BlockSnapshot = {
  original: Element;
  parent: Node | null;
  nextSibling: ChildNode | null;
  placeholder: Element | null;
  style: BlockingStyle;
};

const snapshotSet = new Set<BlockSnapshot>();
const snapshotByOriginal = new WeakMap<Element, BlockSnapshot>();

const isDebugEnabled = (): boolean => CONFIG.debugMode;

const describeSnapshot = (snapshot: BlockSnapshot): string => {
  const tagName = snapshot.original instanceof HTMLElement ? snapshot.original.tagName : "node";
  return `${tagName.toLowerCase()}#${snapshot.original.id || "unknown"}`;
};

export const registerBlockedElement = (
  original: Element,
  style: BlockingStyle,
  placeholder: Element | null,
): void => {
  const existing = snapshotByOriginal.get(original);
  if (existing) {
    snapshotSet.delete(existing);
  }

  const snapshot: BlockSnapshot = {
    original,
    parent: original.parentNode,
    nextSibling: original.nextSibling,
    placeholder,
    style,
  };

  snapshotSet.add(snapshot);
  snapshotByOriginal.set(original, snapshot);

  if (isDebugEnabled()) {
    log("[Guard Your Mind] captured blocked element snapshot", {
      style,
      description: describeSnapshot(snapshot),
    });
  }
};

const restoreSnapshot = (snapshot: BlockSnapshot): void => {
  const { original, parent, nextSibling, placeholder, style } = snapshot;

  if (style !== "remove" && (!placeholder || !placeholder.isConnected)) {
    return;
  }

  if (placeholder?.isConnected) {
    placeholder.remove();
  }

  if (!original.isConnected && parent && "insertBefore" in parent) {
    try {
      parent.insertBefore(original, nextSibling ?? null);
    } catch (error) {
      if (isDebugEnabled()) {
        log("Failed to restore blocked element", {
          error,
          description: describeSnapshot(snapshot),
        });
      }
    }
  }

  if (original instanceof HTMLElement) {
    original.classList.remove(CONFIG.blankedClass);
  }
};

export const restoreBlockedElements = (): void => {
  const snapshots = Array.from(snapshotSet);
  snapshotSet.clear();

  snapshots.forEach((snapshot) => {
    snapshotByOriginal.delete(snapshot.original);
    restoreSnapshot(snapshot);
  });
};
