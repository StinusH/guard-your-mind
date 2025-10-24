import "./style.css";
import type { BlockingStyle, ExtensionSettings } from "../shared/settings";
import {
  DEFAULT_SETTINGS,
  getBlockedSubreddits,
  getSettings,
  setBlockedSubreddits,
  setSettings,
  subscribeToBlockedSubreddits,
  subscribeToSettings,
} from "../shared/settings";

type ToggleSettingKey = "blockingEnabled" | "block18PlusContent" | "showBlockedCounter";

interface ToggleSettingField {
  key: ToggleSettingKey;
  label: string;
  description: string;
  tooltip?: string;
}

interface BlockingStyleOption {
  value: BlockingStyle;
  label: string;
  description: string;
}

const TOGGLE_FIELDS: ToggleSettingField[] = [
  {
    key: "blockingEnabled",
    label: "Enable Reddit blocking",
    description: "Blank mature (18+) content on Reddit across all pages.",
  },
  {
    key: "block18PlusContent",
    label: 'Block posts tagged "18+"',
    description: "Include Reddit’s 18+ marker when deciding what to blank.",
    tooltip:
      "The 18+ tag covers all adult content on Reddit, including sexual imagery, nudity, and graphic violence.",
  },
  {
    key: "showBlockedCounter",
    label: "Show blocked counter",
    description: "Display the number of blocked items in this popup.",
  },
];

const BLOCKING_STYLE_OPTIONS: BlockingStyleOption[] = [
  {
    value: "placeholder",
    label: "Neutral placeholder",
    description: "Replaces content with a neutral card stating it was blocked.",
  },
  {
    value: "remove",
    label: "Remove completely",
    description: "Deletes the content card entirely so nothing remains.",
  },
  {
    value: "quotes",
    label: "Motivational quotes",
    description: "Shows a short inspirational quote instead of the content.",
  },
  {
    value: "blur",
    label: "Blur in place",
    description: "Keeps the content but heavily blurs it with an overlay.",
  },
];

const root = document.querySelector<HTMLDivElement>("#app");

if (!root) {
  throw new Error("Guard Your Mind popup root not found.");
}

root.innerHTML = `
  <main class="popup">
    <header class="popup__header">
      <h1 class="popup__title">Guard Your Mind</h1>
      <p class="popup__subtitle">Choose how mature Reddit content is handled.</p>
    </header>
    <section class="popup__section" data-role="toggles"></section>
    <section class="popup__section popup__section--blocked">
      <div class="setting-group">
        <div class="setting-group__header">
          <h2 class="setting-group__title">Blocked subreddits</h2>
          <p class="setting-group__subtitle">
            Manually add communities to the saved block list when detection misses them.
          </p>
        </div>
        <form class="blocked-form" data-role="blocked-form">
          <input
            class="blocked-form__input"
            type="text"
            placeholder="Add subreddit (e.g., AiUncensored)"
            autocomplete="off"
            data-role="blocked-input"
          />
          <button class="blocked-form__button" type="submit">Add</button>
        </form>
        <div class="blocked-list" data-role="blocked-list"></div>
      </div>
    </section>
    <section class="popup__section popup__section--style">
      <div class="setting-group">
        <div class="setting-group__header">
          <h2 class="setting-group__title">Blocking style</h2>
          <p class="setting-group__subtitle">
            Select what you see when a mature post or subreddit is blocked while protection is on.
          </p>
        </div>
        <label class="setting-select">
          <span class="setting-select__label">Blocked content display</span>
          <select class="setting-select__input" data-role="blocking-style"></select>
        </label>
        <p class="setting-select__description" data-role="style-description"></p>
      </div>
    </section>
    <footer class="popup__footer">
      <span class="popup__status" data-role="status"></span>
      <span class="popup__helper">Changes save automatically.</span>
    </footer>
  </main>
`;

const togglesContainer = root.querySelector<HTMLDivElement>("[data-role='toggles']");
const statusElement = root.querySelector<HTMLSpanElement>("[data-role='status']");
const styleSelect = root.querySelector<HTMLSelectElement>("[data-role='blocking-style']");
const styleDescription = root.querySelector<HTMLParagraphElement>(
  "[data-role='style-description']",
);
const blockedForm = root.querySelector<HTMLFormElement>("[data-role='blocked-form']");
const blockedInput = root.querySelector<HTMLInputElement>("[data-role='blocked-input']");
const blockedListContainer = root.querySelector<HTMLDivElement>("[data-role='blocked-list']");
const blockedAddButton = blockedForm?.querySelector<HTMLButtonElement>("button[type='submit']");

if (
  !togglesContainer ||
  !statusElement ||
  !styleSelect ||
  !styleDescription ||
  !blockedForm ||
  !blockedInput ||
  !blockedListContainer ||
  !blockedAddButton
) {
  throw new Error("Guard Your Mind popup layout failed to render.");
}

const toggleInputs = new Map<ToggleSettingKey, HTMLInputElement>();
let currentSettings: ExtensionSettings = DEFAULT_SETTINGS;
let isSaving = false;
let statusTimeout: number | undefined;
let blockedSubredditsState: string[] = [];

const setStatus = (message: string, variant: "success" | "error" | "neutral" = "neutral") => {
  statusElement.textContent = message;

  if (variant === "success") {
    statusElement.dataset.variant = "success";
  } else if (variant === "error") {
    statusElement.dataset.variant = "error";
  } else {
    delete statusElement.dataset.variant;
  }

  if (statusTimeout) {
    window.clearTimeout(statusTimeout);
  }

  if (message) {
    statusTimeout = window.setTimeout(() => {
      statusElement.textContent = "";
      delete statusElement.dataset.variant;
    }, 2500);
  }
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

const renderBlockedSubreddits = () => {
  blockedListContainer.innerHTML = "";

  if (!blockedSubredditsState.length) {
    const emptyState = document.createElement("p");
    emptyState.className = "blocked-list__empty";
    emptyState.textContent = "No subreddits saved yet.";
    blockedListContainer.appendChild(emptyState);
    return;
  }

  const fragment = document.createDocumentFragment();

  blockedSubredditsState.forEach((subreddit) => {
    const item = document.createElement("div");
    item.className = "blocked-list__item";

    const name = document.createElement("span");
    name.className = "blocked-list__name";
    name.textContent = `r/${subreddit}`;

    const removeButton = document.createElement("button");
    removeButton.type = "button";
    removeButton.className = "blocked-list__remove";
    removeButton.textContent = "Remove";
    removeButton.disabled = isSaving;
    removeButton.addEventListener("click", () => {
      handleBlockedRemove(subreddit);
    });

    item.append(name, removeButton);
    fragment.appendChild(item);
  });

  blockedListContainer.appendChild(fragment);
};

const updateStyleDescription = (style: BlockingStyle) => {
  const option = BLOCKING_STYLE_OPTIONS.find((candidate) => candidate.value === style);
  styleDescription.textContent = option ? option.description : "";
};

const updateInputs = (settings: ExtensionSettings) => {
  TOGGLE_FIELDS.forEach((field) => {
    const input = toggleInputs.get(field.key);
    if (!input) {
      return;
    }

    input.checked = settings[field.key];
    input.disabled = isSaving;
  });

  styleSelect.value = settings.blockingStyle;
  styleSelect.disabled = !settings.blockingEnabled || isSaving;
  updateStyleDescription(settings.blockingStyle);

  blockedInput.disabled = isSaving;
  blockedAddButton.disabled = isSaving;
  blockedListContainer.querySelectorAll<HTMLButtonElement>("button").forEach((button) => {
    button.disabled = isSaving;
  });
};

const persistSettings = async (nextSettings: ExtensionSettings, previous: ExtensionSettings) => {
  isSaving = true;
  updateInputs(nextSettings);
  setStatus("Saving…");

  try {
    await setSettings(nextSettings);
    setStatus("Saved", "success");
  } catch (error) {
    console.error("Failed to save Guard Your Mind settings", error);
    currentSettings = previous;
    updateInputs(previous);
    setStatus("Failed to save changes", "error");
  } finally {
    isSaving = false;
    updateInputs(currentSettings);
  }
};

const handleToggle = (key: ToggleSettingKey, checked: boolean) => {
  const previous = currentSettings;
  if (previous[key] === checked) {
    return;
  }

  const nextSettings: ExtensionSettings = { ...currentSettings, [key]: checked };
  currentSettings = nextSettings;
  updateInputs(nextSettings);
  void persistSettings(nextSettings, previous);
};

const handleStyleChange = (value: BlockingStyle) => {
  const previous = currentSettings;
  if (previous.blockingStyle === value) {
    return;
  }

  const nextSettings: ExtensionSettings = { ...currentSettings, blockingStyle: value };
  currentSettings = nextSettings;
  updateInputs(nextSettings);
  void persistSettings(nextSettings, previous);
};

const persistBlockedList = async (nextList: string[], previous: string[]) => {
  isSaving = true;
  updateInputs(currentSettings);
  renderBlockedSubreddits();
  setStatus("Saving…");

  try {
    await setBlockedSubreddits(nextList);
    blockedSubredditsState = nextList;
    renderBlockedSubreddits();
    setStatus("Saved", "success");
  } catch (error) {
    console.error("Failed to update blocked subreddits", error);
    blockedSubredditsState = previous;
    renderBlockedSubreddits();
    setStatus("Failed to update list", "error");
  } finally {
    isSaving = false;
    updateInputs(currentSettings);
  }
};

function handleBlockedRemove(subreddit: string): void {
  if (!blockedSubredditsState.includes(subreddit) || isSaving) {
    return;
  }

  const previous = blockedSubredditsState.slice();
  const nextList = previous.filter((candidate) => candidate !== subreddit);
  blockedSubredditsState = nextList;
  renderBlockedSubreddits();
  void persistBlockedList(nextList, previous);
}

const handleBlockedAdd = (rawValue: string): void => {
  if (isSaving) {
    return;
  }

  const normalized = normalizeSubredditInput(rawValue);
  if (!normalized) {
    setStatus("Enter a valid subreddit name", "error");
    return;
  }

  if (blockedSubredditsState.includes(normalized)) {
    setStatus(`r/${normalized} is already blocked`, "neutral");
    return;
  }

  const previous = blockedSubredditsState.slice();
  const nextList = [...blockedSubredditsState, normalized].sort((a, b) => a.localeCompare(b));
  blockedSubredditsState = nextList;
  renderBlockedSubreddits();
  void persistBlockedList(nextList, previous);
  blockedInput.value = "";
};

const createToggle = (field: ToggleSettingField): HTMLLabelElement => {
  const wrapper = document.createElement("label");
  wrapper.className = "setting-toggle";

  const textContainer = document.createElement("div");
  textContainer.className = "setting-toggle__text";

  const label = document.createElement("span");
  label.className = "setting-toggle__label";
  label.textContent = field.label;
  if (field.tooltip) {
    const tooltip = document.createElement("span");
    tooltip.className = "setting-toggle__tooltip";
    tooltip.textContent = "i";
    tooltip.title = field.tooltip;
    tooltip.setAttribute("role", "img");
    tooltip.setAttribute("aria-label", field.tooltip);
    label.appendChild(tooltip);
  }

  const description = document.createElement("span");
  description.className = "setting-toggle__description";
  description.textContent = field.description;

  const input = document.createElement("input");
  input.type = "checkbox";
  input.className = "setting-toggle__input";
  input.checked = currentSettings[field.key];
  input.addEventListener("change", (event) => {
    const target = event.currentTarget as HTMLInputElement;
    handleToggle(field.key, target.checked);
  });

  textContainer.append(label, description);
  wrapper.append(textContainer, input);
  toggleInputs.set(field.key, input);

  return wrapper;
};

renderBlockedSubreddits();

// Populate toggle settings
TOGGLE_FIELDS.forEach((field) => {
  const toggle = createToggle(field);
  togglesContainer.appendChild(toggle);
});

// Populate blocking style select
BLOCKING_STYLE_OPTIONS.forEach((option) => {
  const optionElement = document.createElement("option");
  optionElement.value = option.value;
  optionElement.textContent = option.label;
  styleSelect.appendChild(optionElement);
});

styleSelect.addEventListener("change", (event) => {
  const target = event.currentTarget as HTMLSelectElement;
  handleStyleChange(target.value as BlockingStyle);
});

blockedForm.addEventListener("submit", (event) => {
  event.preventDefault();
  handleBlockedAdd(blockedInput.value);
});

const initializeSettings = async () => {
  setStatus("Loading…");
  try {
    const [settings, blocked] = await Promise.all([getSettings(), getBlockedSubreddits()]);

    currentSettings = settings;
    blockedSubredditsState = blocked;
    updateInputs(settings);
    renderBlockedSubreddits();
    setStatus("");
  } catch (error) {
    console.error("Failed to load Guard Your Mind data", error);
    setStatus("Unable to load settings", "error");
  }
};

subscribeToSettings((settings) => {
  currentSettings = settings;
  updateInputs(settings);
});

void initializeSettings();

subscribeToBlockedSubreddits((subreddits) => {
  blockedSubredditsState = subreddits.slice().sort((a, b) => a.localeCompare(b));
  renderBlockedSubreddits();
  updateInputs(currentSettings);
});
