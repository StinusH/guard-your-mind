import type { BlockingStyle } from "../shared/settings";

export type ToggleSettingKey = "blockingEnabled" | "block18PlusContent" | "showBlockedCounter";

export interface ToggleSettingField {
  key: ToggleSettingKey;
  label: string;
  description: string;
  tooltip?: string;
}

export interface BlockingStyleOption {
  value: BlockingStyle;
  label: string;
  description: string;
}

export const TOGGLE_FIELDS: ToggleSettingField[] = [
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

export const BLOCKING_STYLE_OPTIONS: BlockingStyleOption[] = [
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
    value: "bible",
    label: "Bible verses",
    description: "Replaces content with an uplifting Bible verse.",
  },
];
