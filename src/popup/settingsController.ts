import type { BlockingStyle, ExtensionSettings } from "../shared/settings";
import {
  BLOCKING_STYLE_OPTIONS,
  TOGGLE_FIELDS,
  type ToggleSettingField,
  type ToggleSettingKey,
} from "./config";

type SettingsControllerDeps = {
  container: HTMLElement;
  styleSelect: HTMLSelectElement;
  styleDescription: HTMLElement;
  onToggleChange: (key: ToggleSettingKey, checked: boolean) => void;
  onStyleChange: (style: BlockingStyle) => void;
};

export type SettingsController = {
  initialize: (settings: ExtensionSettings) => void;
  update: (settings: ExtensionSettings, isSaving: boolean) => void;
};

export const createSettingsController = ({
  container,
  styleSelect,
  styleDescription,
  onToggleChange,
  onStyleChange,
}: SettingsControllerDeps): SettingsController => {
  const toggleInputs = new Map<ToggleSettingKey, HTMLInputElement>();
  let initialized = false;

  const updateStyleDescription = (style: BlockingStyle): void => {
    const option = BLOCKING_STYLE_OPTIONS.find((candidate) => candidate.value === style);
    styleDescription.textContent = option ? option.description : "";
  };

  const createToggle = (field: ToggleSettingField, currentSettings: ExtensionSettings): void => {
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
      onToggleChange(field.key, target.checked);
    });

    textContainer.append(label, description);
    wrapper.append(textContainer, input);
    container.appendChild(wrapper);
    toggleInputs.set(field.key, input);
  };

  const initialize = (settings: ExtensionSettings): void => {
    if (initialized) {
      return;
    }

    TOGGLE_FIELDS.forEach((field) => createToggle(field, settings));

    BLOCKING_STYLE_OPTIONS.forEach((option) => {
      const optionElement = document.createElement("option");
      optionElement.value = option.value;
      optionElement.textContent = option.label;
      styleSelect.appendChild(optionElement);
    });

    styleSelect.addEventListener("change", (event) => {
      const target = event.currentTarget as HTMLSelectElement;
      onStyleChange(target.value as BlockingStyle);
    });

    initialized = true;
    update(settings, false);
  };

  const update = (settings: ExtensionSettings, isSaving: boolean): void => {
    toggleInputs.forEach((input, key) => {
      input.checked = settings[key];
      input.disabled = isSaving;
    });

    styleSelect.value = settings.blockingStyle;
    styleSelect.disabled = !settings.blockingEnabled || isSaving;
    updateStyleDescription(settings.blockingStyle);
  };

  return { initialize, update };
};
