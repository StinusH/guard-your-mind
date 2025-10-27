const BIBLE_VERSES: readonly string[] = [
  "“I can do all things through Christ who strengthens me.” — Philippians 4:13",
  "“The Lord is my shepherd; I shall not want.” — Psalm 23:1",
  "“Be strong and courageous. Do not be afraid; do not be discouraged, for the Lord your God will be with you wherever you go.” — Joshua 1:9",
  "“For I know the plans I have for you, declares the Lord, plans to prosper you and not to harm you, plans to give you hope and a future.” — Jeremiah 29:11",
  "“Let all that you do be done in love.” — 1 Corinthians 16:14",
];

const FALLBACK_VERSE =
  "“The light shines in the darkness, and the darkness has not overcome it.” — John 1:5";

const verseIndices: number[] = [];

const refillVersePool = (): void => {
  verseIndices.length = 0;
  for (let index = 0; index < BIBLE_VERSES.length; index += 1) {
    verseIndices.push(index);
  }

  for (let current = verseIndices.length - 1; current > 0; current -= 1) {
    const swapIndex = Math.floor(Math.random() * (current + 1));
    const temp = verseIndices[current];
    verseIndices[current] = verseIndices[swapIndex];
    verseIndices[swapIndex] = temp;
  }
};

export const getRandomBibleQuote = (): string => {
  if (!BIBLE_VERSES.length) {
    return FALLBACK_VERSE;
  }

  if (!verseIndices.length) {
    refillVersePool();
  }

  const nextIndex = verseIndices.pop();
  if (typeof nextIndex !== "number") {
    return FALLBACK_VERSE;
  }

  return BIBLE_VERSES[nextIndex] ?? FALLBACK_VERSE;
};

export const getAllBibleQuotes = (): readonly string[] => BIBLE_VERSES;
