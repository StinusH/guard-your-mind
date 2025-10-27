type StatusVariant = "success" | "error" | "neutral";

export type StatusController = {
  set: (message: string, variant?: StatusVariant) => void;
  clear: () => void;
};

export const createStatusController = (
  statusElement: HTMLElement,
  blockedStatus: HTMLElement,
): StatusController => {
  let timeoutId: number | null = null;

  const applyVariant = (target: HTMLElement, variant: StatusVariant | undefined): void => {
    if (variant === "success") {
      target.dataset.variant = "success";
    } else if (variant === "error") {
      target.dataset.variant = "error";
    } else {
      delete target.dataset.variant;
    }
  };

  const clear = (): void => {
    statusElement.textContent = "";
    applyVariant(statusElement, undefined);
    blockedStatus.textContent = "";
    applyVariant(blockedStatus, undefined);
  };

  const set = (message: string, variant: StatusVariant = "neutral"): void => {
    if (timeoutId !== null) {
      window.clearTimeout(timeoutId);
      timeoutId = null;
    }

    statusElement.textContent = message;
    blockedStatus.textContent = message;
    applyVariant(statusElement, variant);
    applyVariant(blockedStatus, variant);

    if (message) {
      timeoutId = window.setTimeout(() => {
        clear();
        timeoutId = null;
      }, 2500);
    }
  };

  return { set, clear };
};
