const BIBLE_VERSES: readonly string[] = [
  '"Blessed are the pure in heart, for they shall see God." — Matthew 5:8',
  '"Everyone who looks at a woman with lustful intent has already committed adultery with her in his heart." — Matthew 5:28',
  '"If your right eye causes you to sin, tear it out and throw it away." — Matthew 5:29',
  '"Watch and pray that you may not enter into temptation; the spirit indeed is willing, but the flesh is weak." — Matthew 26:41',
  '"For from within, out of the heart of man, come evil thoughts, sexual immorality, theft, murder, adultery." — Mark 7:21–22',
  '"The eye is the lamp of your body. When your eye is healthy, your whole body is full of light." — Luke 11:34',
  '"How then can I do this great wickedness and sin against God?" — Genesis 39:9',
  '"You shall not commit adultery." — Exodus 20:14',
  '"You shall not covet your neighbor\'s wife." — Exodus 20:17',
  '"Therefore keep my charge, that you do not practice any of these abominable customs." — Leviticus 18:30',
  '"Consecrate yourselves, therefore, and be holy; for I am the LORD your God." — Leviticus 20:7',
  '"Do not bring an abomination into your house." — Deuteronomy 7:26',
  '"You shall be blameless before the LORD your God." — Deuteronomy 18:13',
  '"Choose life, that you and your offspring may live." — Deuteronomy 30:19',
  '"I have made a covenant with my eyes; how then could I gaze at a virgin?" — Job 31:1',
  '"I will not set before my eyes anything that is worthless." — Psalm 101:3',
  '"Create in me a clean heart, O God, and renew a right spirit within me." — Psalm 51:10',
  '"How can a young man keep his way pure? By guarding it according to your word." — Psalm 119:9',
  '"Turn my eyes from looking at worthless things; give me life in your ways." — Psalm 119:37',
  '"Let the words of my mouth and the meditation of my heart be acceptable in your sight." — Psalm 19:14',
  '"Who shall ascend the hill of the LORD? He who has clean hands and a pure heart." — Psalm 24:3–4',
  '"Teach me your way, O LORD, that I may walk in your truth; unite my heart to fear your name." — Psalm 86:11',
  '"Do not let my heart incline to any evil." — Psalm 141:4',
  '"Keep your heart with all vigilance, for from it flow the springs of life." — Proverbs 4:23',
  '"Keep your way far from her, and do not go near the door of her house." — Proverbs 5:8',
  '"For a man\'s ways are before the eyes of the LORD, and he ponders all his paths." — Proverbs 5:21',
  '"Do not desire her beauty in your heart, and do not let her capture you with her eyelashes." — Proverbs 6:25',
  '"Can a man carry fire next to his chest and his clothes not be burned?" — Proverbs 6:27',
  '"He who commits adultery lacks sense; he who does it destroys himself." — Proverbs 6:32',
  '"Let not your heart turn aside to her ways; do not stray into her paths." — Proverbs 7:25',
  '"Drink water from your own cistern, flowing water from your own well." — Proverbs 5:15',
  '"Stolen water is sweet, and bread eaten in secret is pleasant." — Proverbs 9:17',
  '"My son, give me your heart, and let your eyes observe my ways." — Proverbs 23:26',
  '"The mouth of forbidden women is a deep pit; he with whom the LORD is angry will fall into it." — Proverbs 22:14',
  '"Like a city broken into and left without walls is a man without self-control." — Proverbs 25:28',
  '"Whoever conceals his transgressions will not prosper, but he who confesses and forsakes them will obtain mercy." — Proverbs 28:13',
  '"Do not arouse or awaken love until it pleases." — Song of Solomon 2:7',
  '"Catch the foxes for us, the little foxes that spoil the vineyards." — Song of Solomon 2:15',
  '"Fear God and keep his commandments, for this is the whole duty of man." — Ecclesiastes 12:13',
  '"Wash yourselves; make yourselves clean; remove the evil of your deeds." — Isaiah 1:16',
  '"You keep him in perfect peace whose mind is stayed on you." — Isaiah 26:3',
  '"He who walks righteously and speaks uprightly... shuts his eyes from looking on evil." — Isaiah 33:15',
  '"Wash your heart from evil, O Jerusalem, that you may be saved." — Jeremiah 4:14',
  '"The heart is deceitful above all things, and desperately sick; who can understand it?" — Jeremiah 17:9',
  '"I will put my law within them, and I will write it on their hearts." — Jeremiah 31:33',
  '"Make yourselves a new heart and a new spirit." — Ezekiel 18:31',
  '"I will give you a new heart, and a new spirit I will put within you." — Ezekiel 36:26',
  '"Daniel resolved that he would not defile himself." — Daniel 1:8',
  '"Let the wicked forsake his way, and the unrighteous man his thoughts." — Isaiah 55:7',
  '"Let not sin therefore reign in your mortal body, to make you obey its passions." — Romans 6:12',
  '"Present your bodies as a living sacrifice, holy and acceptable to God." — Romans 12:1',
  '"Put on the Lord Jesus Christ, and make no provision for the flesh, to gratify its desires." — Romans 13:14',
  '"Flee from sexual immorality." — 1 Corinthians 6:18',
  '"Glorify God in your body." — 1 Corinthians 6:20',
  '"Your body is a temple of the Holy Spirit within you." — 1 Corinthians 6:19',
  '"No temptation has overtaken you that is not common to man... He will also provide the way of escape." — 1 Corinthians 10:13',
  '"I discipline my body and keep it under control." — 1 Corinthians 9:27',
  '"Let us cleanse ourselves from every defilement of body and spirit." — 2 Corinthians 7:1',
  '"We take every thought captive to obey Christ." — 2 Corinthians 10:5',
  '"Walk by the Spirit, and you will not gratify the desires of the flesh." — Galatians 5:16',
  '"Those who belong to Christ Jesus have crucified the flesh with its passions and desires." — Galatians 5:24',
  '"The one who sows to the Spirit will from the Spirit reap eternal life." — Galatians 6:8',
  '"Put off your old self... and put on the new self." — Ephesians 4:22–24',
  '"Sexual immorality and all impurity or covetousness must not even be named among you." — Ephesians 5:3',
  '"Take no part in the unfruitful works of darkness, but instead expose them." — Ephesians 5:11',
  '"It is shameful even to speak of the things that they do in secret." — Ephesians 5:12',
  '"Put on the whole armor of God, that you may be able to stand against the schemes of the devil." — Ephesians 6:11',
  '"Whatever is true, whatever is honorable... think about these things." — Philippians 4:8',
  '"Let your manner of life be worthy of the gospel of Christ." — Philippians 1:27',
  '"Set your minds on things that are above, not on things that are on earth." — Colossians 3:2',
  '"Put to death therefore what is earthly in you: sexual immorality, impurity, passion, evil desire." — Colossians 3:5',
  '"Let the word of Christ dwell in you richly." — Colossians 3:16',
  '"For this is the will of God, your sanctification: that you abstain from sexual immorality." — 1 Thessalonians 4:3',
  '"Each of you should know how to control his own body in holiness and honor." — 1 Thessalonians 4:4',
  '"God has not called us for impurity, but in holiness." — 1 Thessalonians 4:7',
  '"Abstain from every form of evil." — 1 Thessalonians 5:22',
  '"The Lord is faithful; he will strengthen you and guard you from the evil one." — 2 Thessalonians 3:3',
  '"God gave us a spirit not of fear but of power and love and self-control." — 2 Timothy 1:7',
  '"If anyone cleanses himself from what is dishonorable, he will be a vessel for honorable use." — 2 Timothy 2:21',
  '"Flee youthful passions and pursue righteousness, faith, love, and peace." — 2 Timothy 2:22',
  '"Train yourself for godliness." — 1 Timothy 4:7',
  '"Keep yourself pure." — 1 Timothy 5:22',
  '"The grace of God has appeared... training us to renounce ungodliness and worldly passions." — Titus 2:11–12',
  '"Let marriage be held in honor among all, and let the marriage bed be undefiled." — Hebrews 13:4',
  '"Strive for peace with everyone, and for the holiness without which no one will see the Lord." — Hebrews 12:14',
  '"Lay aside every weight, and sin which clings so closely." — Hebrews 12:1',
  '"Blessed is the man who remains steadfast under trial." — James 1:12',
  '"Each person is tempted when he is lured and enticed by his own desire." — James 1:14',
  '"Receive with meekness the implanted word, which is able to save your souls." — James 1:21',
  '"Submit yourselves therefore to God. Resist the devil, and he will flee from you." — James 4:7',
  '"Draw near to God, and he will draw near to you." — James 4:8',
  '"Prepare your minds for action, being sober-minded." — 1 Peter 1:13',
  '"As obedient children, do not be conformed to the passions of your former ignorance." — 1 Peter 1:14',
  '"As he who called you is holy, you also be holy in all your conduct." — 1 Peter 1:15',
  '"Beloved, I urge you as sojourners and exiles to abstain from the passions of the flesh." — 1 Peter 2:11',
  '"Keep your conduct among the Gentiles honorable." — 1 Peter 2:12',
  '"Be sober-minded; be watchful. Your adversary the devil prowls around like a roaring lion." — 1 Peter 5:8',
  '"His divine power has granted to us all things that pertain to life and godliness." — 2 Peter 1:3',
  '"If you practice these qualities you will never fall." — 2 Peter 1:10',
  '"Beloved, be diligent to be found by him without spot or blemish." — 2 Peter 3:14',
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
