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
import type { BlockedListController } from "./blockedListController";
import { createBlockedListController } from "./blockedListController";
import type { ToggleSettingKey } from "./config";
import { renderPopup } from "./layout";
import type { SettingsController } from "./settingsController";
import { createSettingsController } from "./settingsController";
import { createStatusController } from "./statusController";

const root = document.querySelector<HTMLDivElement>("#app");

if (!root) {
  throw new Error("Guard Your Mind popup root not found.");
}

const elements = renderPopup(root);
const status = createStatusController(elements.statusElement, elements.blockedStatus);

let currentSettings: ExtensionSettings = DEFAULT_SETTINGS;
let isSaving = false;

const settingsController: SettingsController = createSettingsController({
  container: elements.togglesContainer,
  styleSelect: elements.styleSelect,
  styleDescription: elements.styleDescription,
  onToggleChange: handleToggleChange,
  onStyleChange: handleStyleChange,
});

const blockedListController: BlockedListController = createBlockedListController({
  form: elements.blockedForm,
  input: elements.blockedInput,
  addButton: elements.blockedAddButton,
  removeButton: elements.blockedRemoveButton,
  pasteButton: elements.blockedPasteButton,
  status,
  onSave: persistBlockedList,
  readActiveTabUrl,
});

function applySavingState(saving: boolean): void {
  isSaving = saving;
  settingsController.update(currentSettings, isSaving);
  blockedListController.setSaving(isSaving);
}

async function readActiveTabUrl(): Promise<string | null> {
  return await new Promise<string | null>((resolve) => {
    try {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (chrome.runtime.lastError) {
          console.error("Guard Your Mind failed to read active tab", chrome.runtime.lastError);
          resolve(null);
          return;
        }
        resolve(tabs?.[0]?.url ?? null);
      });
    } catch (error) {
      console.error("Guard Your Mind failed to query tabs", error);
      resolve(null);
    }
  });
}

async function persistSettings(
  nextSettings: ExtensionSettings,
  previous: ExtensionSettings,
): Promise<void> {
  applySavingState(true);
  status.set("Saving…");

  try {
    await setSettings(nextSettings);
    status.set("Saved", "success");
  } catch (error) {
    console.error("Failed to save Guard Your Mind settings", error);
    currentSettings = previous;
    settingsController.update(previous, false);
    status.set("Failed to save changes", "error");
  } finally {
    applySavingState(false);
  }
}

async function persistBlockedList({
  nextList,
  previousList,
  successMessage,
}: {
  nextList: string[];
  previousList: string[];
  successMessage: string;
}): Promise<boolean> {
  applySavingState(true);
  status.set("Saving…");

  try {
    await setBlockedSubreddits(nextList);
    blockedListController.setBlockedList(nextList);
    status.set(successMessage, "success");
    return true;
  } catch (error) {
    console.error("Failed to update blocked subreddits", error);
    blockedListController.setBlockedList(previousList);
    status.set("Failed to update list", "error");
    return false;
  } finally {
    applySavingState(false);
  }
}

function handleToggleChange(key: ToggleSettingKey, checked: boolean): void {
  const previous = currentSettings;
  if (previous[key] === checked) {
    return;
  }

  const nextSettings: ExtensionSettings = { ...currentSettings, [key]: checked };
  currentSettings = nextSettings;
  settingsController.update(nextSettings, isSaving);
  void persistSettings(nextSettings, previous);
}

function handleStyleChange(style: BlockingStyle): void {
  const previous = currentSettings;
  if (previous.blockingStyle === style) {
    return;
  }

  const nextSettings: ExtensionSettings = { ...currentSettings, blockingStyle: style };
  currentSettings = nextSettings;
  settingsController.update(nextSettings, isSaving);
  void persistSettings(nextSettings, previous);
}

blockedListController.setBlockedList([]);
applySavingState(false);
settingsController.initialize(DEFAULT_SETTINGS);

const initializePopup = async (): Promise<void> => {
  status.set("Loading…");
  try {
    const [settings, blockedList] = await Promise.all([getSettings(), getBlockedSubreddits()]);
    currentSettings = settings;
    settingsController.update(settings, isSaving);
    blockedListController.setBlockedList(blockedList);
    status.set("");
  } catch (error) {
    console.error("Failed to load Guard Your Mind data", error);
    status.set("Unable to load settings", "error");
  }
};

void initializePopup();

subscribeToSettings((settings) => {
  currentSettings = settings;
  settingsController.update(settings, isSaving);
});

subscribeToBlockedSubreddits((subreddits) => {
  blockedListController.setBlockedList(subreddits);
  settingsController.update(currentSettings, isSaving);
});
