import type { StatusController } from "./statusController";

type SaveRequest = {
  nextList: string[];
  previousList: string[];
  successMessage: string;
};

type BlockedListControllerDeps = {
  form: HTMLFormElement;
  input: HTMLInputElement;
  addButton: HTMLButtonElement;
  removeButton: HTMLButtonElement;
  pasteButton: HTMLButtonElement;
  status: StatusController;
  onSave: (request: SaveRequest) => Promise<boolean>;
  readActiveTabUrl: () => Promise<string | null>;
};

const normalizeSubredditInput = (value: string): string | null => {
  if (!value) {
    return null;
  }

  let trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  if (trimmed.startsWith("/r/")) {
    trimmed = trimmed.slice(3);
  } else if (trimmed.startsWith("r/")) {
    trimmed = trimmed.slice(2);
  }

  trimmed = trimmed.toLowerCase();

  if (!/^[a-z0-9_]{2,21}$/.test(trimmed)) {
    return null;
  }

  return trimmed;
};

export type BlockedListController = {
  setBlockedList: (values: string[]) => void;
  getBlockedList: () => string[];
  setSaving: (saving: boolean) => void;
};

export const createBlockedListController = ({
  form,
  input,
  addButton,
  removeButton,
  pasteButton,
  status,
  onSave,
  readActiveTabUrl,
}: BlockedListControllerDeps): BlockedListController => {
  let blockedList: string[] = [];
  let saving = false;

  const setSaving = (nextSaving: boolean): void => {
    saving = nextSaving;
    input.disabled = saving;
    addButton.disabled = saving;
    pasteButton.disabled = saving;
    removeButton.disabled = saving;
  };

  const setBlockedList = (values: string[]): void => {
    blockedList = values
      .map((value) => value.trim())
      .filter(Boolean)
      .map((value) => value.toLowerCase())
      .sort((a, b) => a.localeCompare(b));
  };

  const getBlockedList = (): string[] => blockedList.slice();

  const handleAdd = async (rawValue: string): Promise<void> => {
    if (saving) {
      return;
    }

    const normalized = normalizeSubredditInput(rawValue);
    if (!normalized) {
      status.set("Enter a valid subreddit name", "error");
      return;
    }

    if (blockedList.includes(normalized)) {
      status.set(`r/${normalized} is already blocked`, "neutral");
      return;
    }

    const previousList = getBlockedList();
    const nextList = [...previousList, normalized].sort((a, b) => a.localeCompare(b));
    const success = await onSave({
      nextList,
      previousList,
      successMessage: `Blocked r/${normalized}`,
    });

    if (success) {
      setBlockedList(nextList);
      input.value = "";
    }
  };

  const handleRemove = async (rawValue: string): Promise<void> => {
    if (saving) {
      return;
    }

    const normalized = normalizeSubredditInput(rawValue);
    if (!normalized) {
      status.set("Enter a valid subreddit name", "error");
      return;
    }

    if (!blockedList.includes(normalized)) {
      status.set(`r/${normalized} is not in the list`, "neutral");
      return;
    }

    const previousList = getBlockedList();
    const nextList = previousList.filter((candidate) => candidate !== normalized);
    const success = await onSave({
      nextList,
      previousList,
      successMessage: `Removed r/${normalized}`,
    });

    if (success) {
      setBlockedList(nextList);
      input.value = "";
    }
  };

  const handlePaste = async (): Promise<void> => {
    if (saving) {
      return;
    }

    const url = await readActiveTabUrl();
    if (!url) {
      status.set("Unable to read the current tab URL", "error");
      return;
    }

    const match = url.match(/\/(?:r|user)\/([^/]+)/i);
    const parsed = match ? normalizeSubredditInput(match[1]) : null;

    if (!parsed) {
      status.set("Current tab is not on a subreddit page", "error");
      return;
    }

    input.value = parsed;
    input.focus();
    input.select();
    status.set(`Prepared r/${parsed}`, "neutral");
  };

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    void handleAdd(input.value);
  });

  addButton.addEventListener("click", () => {
    void handleAdd(input.value);
  });

  removeButton.addEventListener("click", () => {
    void handleRemove(input.value);
  });

  pasteButton.addEventListener("click", () => {
    void handlePaste();
  });

  return { setBlockedList, getBlockedList, setSaving };
};
