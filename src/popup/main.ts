import "./style.css";
import type { BlockingStyle, ExtensionSettings } from "../shared/settings";
import {
  DEFAULT_SETTINGS,
  getSettings,
  setSettings,
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

if (!togglesContainer || !statusElement || !styleSelect || !styleDescription) {
  throw new Error("Guard Your Mind popup layout failed to render.");
}

const toggleInputs = new Map<ToggleSettingKey, HTMLInputElement>();
let currentSettings: ExtensionSettings = DEFAULT_SETTINGS;
let isSaving = false;
let statusTimeout: number | undefined;

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

const initializeSettings = async () => {
  setStatus("Loading…");
  try {
    const settings = await getSettings();
    currentSettings = settings;
    updateInputs(settings);
    setStatus("");
  } catch (error) {
    console.error("Failed to load Guard Your Mind settings", error);
    setStatus("Unable to load settings", "error");
  }
};

subscribeToSettings((settings) => {
  currentSettings = settings;
  updateInputs(settings);
});

void initializeSettings();
