const QUOTE_LIBRARY: readonly string[] = [
  "Small habits today shape who you become tomorrow.",
  "You get stronger every time you choose what uplifts you.",
  "Guard your focus and your focus will guard your goals.",
  "Discipline is doing what matters even when it’s hard.",
  "Feed the mind with purpose, not distraction.",
];

const FALLBACK_QUOTE = "Guard Your Mind";

const shuffledIndices: number[] = [];

const refillShufflePool = (): void => {
  shuffledIndices.length = 0;
  for (let index = 0; index < QUOTE_LIBRARY.length; index += 1) {
    shuffledIndices.push(index);
  }

  for (let current = shuffledIndices.length - 1; current > 0; current -= 1) {
    const swapIndex = Math.floor(Math.random() * (current + 1));
    const temp = shuffledIndices[current];
    shuffledIndices[current] = shuffledIndices[swapIndex];
    shuffledIndices[swapIndex] = temp;
  }
};

export const getRandomQuote = (): string => {
  if (!QUOTE_LIBRARY.length) {
    return FALLBACK_QUOTE;
  }

  if (!shuffledIndices.length) {
    refillShufflePool();
  }

  const nextIndex = shuffledIndices.pop();
  if (typeof nextIndex !== "number") {
    return FALLBACK_QUOTE;
  }

  return QUOTE_LIBRARY[nextIndex] ?? FALLBACK_QUOTE;
};

export const getAllQuotes = (): readonly string[] => QUOTE_LIBRARY;
