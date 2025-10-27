export type PopupElements = {
  togglesContainer: HTMLDivElement;
  statusElement: HTMLSpanElement;
  styleSelect: HTMLSelectElement;
  styleDescription: HTMLParagraphElement;
  blockedForm: HTMLFormElement;
  blockedInput: HTMLInputElement;
  blockedPasteButton: HTMLButtonElement;
  blockedAddButton: HTMLButtonElement;
  blockedRemoveButton: HTMLButtonElement;
  blockedStatus: HTMLSpanElement;
};

const POPUP_TEMPLATE = `
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
            Manually manage the saved block list when detection misses a community.
          </p>
        </div>
        <form class="blocked-form" data-role="blocked-form">
          <input
            class="blocked-form__input"
            type="text"
            placeholder="Enter subreddit"
            autocomplete="off"
            data-role="blocked-input"
          />
          <button class="blocked-form__button blocked-form__button--secondary" type="button" data-role="blocked-paste">Paste current</button>
          <button class="blocked-form__button" type="submit" data-role="blocked-add">Add</button>
          <button class="blocked-form__button blocked-form__button--secondary" type="button" data-role="blocked-remove">Remove</button>
          <span class="blocked-status" data-role="blocked-status"></span>
        </form>
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

export const renderPopup = (root: HTMLElement): PopupElements => {
  root.innerHTML = POPUP_TEMPLATE;

  const togglesContainer = root.querySelector<HTMLDivElement>("[data-role='toggles']");
  const statusElement = root.querySelector<HTMLSpanElement>("[data-role='status']");
  const styleSelect = root.querySelector<HTMLSelectElement>("[data-role='blocking-style']");
  const styleDescription = root.querySelector<HTMLParagraphElement>(
    "[data-role='style-description']",
  );
  const blockedForm = root.querySelector<HTMLFormElement>("[data-role='blocked-form']");
  const blockedInput = root.querySelector<HTMLInputElement>("[data-role='blocked-input']");
  const blockedPasteButton = blockedForm?.querySelector<HTMLButtonElement>(
    "[data-role='blocked-paste']",
  );
  const blockedAddButton = blockedForm?.querySelector<HTMLButtonElement>(
    "[data-role='blocked-add']",
  );
  const blockedRemoveButton = blockedForm?.querySelector<HTMLButtonElement>(
    "[data-role='blocked-remove']",
  );
  const blockedStatus = blockedForm?.querySelector<HTMLSpanElement>("[data-role='blocked-status']");

  if (
    !togglesContainer ||
    !statusElement ||
    !styleSelect ||
    !styleDescription ||
    !blockedForm ||
    !blockedInput ||
    !blockedPasteButton ||
    !blockedAddButton ||
    !blockedRemoveButton ||
    !blockedStatus
  ) {
    throw new Error("Guard Your Mind popup layout failed to render.");
  }

  return {
    togglesContainer,
    statusElement,
    styleSelect,
    styleDescription,
    blockedForm,
    blockedInput,
    blockedPasteButton,
    blockedAddButton,
    blockedRemoveButton,
    blockedStatus,
  };
};
