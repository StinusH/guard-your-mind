const QUOTE_LIBRARY: readonly string[] = [
  "Guard your eyes today so your dreams stay clear tomorrow.",
  "Purpose grows when you feed it more than your impulses.",
  "The mind craves what you rehearse; rehearse what lifts you.",
  "Discipline is the architect that builds a wiser tomorrow.",
  "When you choose focus over flashes, you choose freedom.",
  "Attention is a currency—spend it where your future lives.",
  "Still waters run deep; a still mind runs strong.",
  "One pure choice can break a thousand quiet chains.",
  "You are not missing out by choosing what you won't regret.",
  "Strength is saying no when distractions scream yes.",
  "Your habits escort your heart to its destination.",
  "Guarded eyes blaze with unborrowed confidence.",
  "Feed your calling and your cravings will starve.",
  "The content you allow becomes the content of your character.",
  "Focus is a muscle; flex it when temptations whisper.",
  "Direction is set by the quiet choices no one sees.",
  "A clear mind hears purpose louder than noise.",
  "Every scroll shapes the soul—scroll with intention.",
  "Discipline today is compassion for your future self.",
  "Your integrity is worth more than any instant high.",
  "You can't glow in the dark if you keep dimming your light.",
  "Guarding your mind guards the ones you love.",
  "Peace grows where you prune unhealthy appetites.",
  "Your attention is sacred; treat it like a gift.",
  "Restraint is not weakness; it's wisdom in motion.",
  "Stay planted in purpose and storms become background noise.",
  "Character strengthens every time you shut a tempting tab.",
  "The stories you watch become the story you live.",
  "Freedom starts where harmful curiosity ends.",
  "You are stronger than the cycle trying to convince you otherwise.",
  "Protect your focus and your focus will protect your goals.",
  "A pure mind can dream without distortion.",
  "Guardrails feel restrictive until they save your life.",
  "Your standards set the temperature of your future.",
  "Short-term thrills forfeit long-term peace.",
  "Walk away from what weakens who you want to be.",
  "Hope is fueled by healthy inputs.",
  "Conscience is calmer when curiosity is clean.",
  "You are not what tempts you—you are what you entertain.",
  "A quiet victory today becomes a louder confidence tomorrow.",
  "Filter your feed like your future depends on it—because it does.",
  "Self-respect grows in the soil of self-control.",
  "Invest in clarity and you'll withdraw courage.",
  "No screen is worth the shame it keeps replaying.",
  "Resisting once makes resisting twice easier.",
  "Aim higher than the algorithms expect you to.",
  "When you master your appetite, you master your direction.",
  "Every boundary you honor is a promise kept to yourself.",
  "Curate what you consume and you'll cultivate who you become.",
  "There is power in pausing before you open a link.",
  "Choose content that champions your convictions.",
  "Feed your focus and starve your compromise.",
  "Strong minds choose seeds, not weeds.",
  "Temptation loses power when purpose gains momentum.",
  "Let discipline speak louder than desire.",
  "Guarding your mind guards your legacy.",
  "Nothing changes if your inputs stay the same.",
  "Cravings fade where conviction is fed.",
  "You can't build a noble life with toxic bricks.",
  "Stay loyal to the future you prayed for.",
  "The best filter is a clear sense of calling.",
  "Detours disappear when you're locked on destination.",
  "Protect your peace like it's your greatest possession.",
  "Screens obey the standards you set for them.",
  "Every refusal is rehearsing resilience.",
  "What you allow lingers longer than you think.",
  "Trade the thrill of secrecy for the joy of integrity.",
  "Purity is power focused in the right direction.",
  "Mindful scrolling beats mindless spirals.",
  "Live the story you want to tell when no one is watching.",
  "Victory begins with the tabs you never open.",
  "Habits heal when honesty is welcome.",
  "Feed on truth and lies lose their flavor.",
  "Guarding your mind makes room for greater ideas.",
  "You can't chase purpose and chase poison.",
  "Focus fiercely on what fuels your faith.",
  "Consistency is courage practiced daily.",
  "Let your standards be louder than society's suggestions.",
  "Choose inputs that inspire output.",
  "Peace is the prize of disciplined eyes.",
  "Win the first glance and the battle is half over.",
  "Healthy habits are heavy at first, then they carry you.",
  "Be the guardian of your own attention.",
  "Temptation thrives on secrecy; starve it with light.",
  "Hold the line today so tomorrow's you can run further.",
  "Your destiny deserves more than impulsive clicks.",
  "Control your content or your content will control you.",
  "Healthy minds repel unhealthy media.",
  "Integrity shines brightest when no one is around to applaud.",
  "You were made for more than momentary escapes.",
  "Bold standards build unshakable confidence.",
  "Stay rooted in truth when trends try to uproot you.",
  "Guard the gate to your imagination.",
  "Purposeful limits lead to limitless peace.",
  "Clean input, clear outlook.",
  "Choose what adds value, not what steals virtue.",
  "Protect the promise inside you from pixels that poison.",
  "Wholeness is worth every hard no.",
  "The future is grateful for every filtered feed.",
  "Let your focus be fiercer than your FOMO.",
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
