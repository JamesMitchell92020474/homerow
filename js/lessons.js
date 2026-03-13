/**
 * HomeRow — Lesson Curriculum
 * Defines all lessons, exercises, key introduction order, and progression logic.
 * Exposed as window.Lessons.
 *
 * Design principles:
 * - Keys introduced by frequency and ergonomic order (home row → top → bottom → numbers → symbols)
 * - Real English words used wherever possible (builds natural muscle memory)
 * - Each lesson has warmup, drill, and word/sentence exercises
 * - If accuracy drops below threshold mid-drill, repeat the drill
 *
 * Phases:
 *   Beginner    : Lessons  1–7  (15–20 min sessions)
 *   Intermediate: Lessons  8–14 (25–30 min sessions)
 *   Advanced    : Lessons 15+   (30–45 min sessions)
 *
 * To add a new lesson: append an entry to LESSON_DATA below following the same schema.
 */

window.Lessons = (() => {

  // ─── Finger map ──────────────────────────────────────────────────────────────
  // Maps each key character to the finger that should press it.

  const FINGER_MAP = {
    // Left hand
    '`': 'left-pinky', '1': 'left-pinky', 'q': 'left-pinky', 'a': 'left-pinky', 'z': 'left-pinky',
    '2': 'left-ring',  'w': 'left-ring',  's': 'left-ring',  'x': 'left-ring',
    '3': 'left-middle','e': 'left-middle','d': 'left-middle', 'c': 'left-middle',
    '4': 'left-index', 'r': 'left-index', 'f': 'left-index', 'v': 'left-index',
    '5': 'left-index', 't': 'left-index', 'g': 'left-index', 'b': 'left-index',
    // Thumbs
    ' ': 'thumb',
    // Right hand
    '6': 'right-index', 'y': 'right-index', 'h': 'right-index', 'n': 'right-index',
    '7': 'right-index', 'u': 'right-index', 'j': 'right-index', 'm': 'right-index',
    '8': 'right-middle','i': 'right-middle','k': 'right-middle', ',': 'right-middle',
    '9': 'right-ring',  'o': 'right-ring',  'l': 'right-ring',  '.': 'right-ring',
    '0': 'right-pinky', 'p': 'right-pinky', ';': 'right-pinky', '/': 'right-pinky',
    '-': 'right-pinky', '[': 'right-pinky',
    // Symbols (shifted) — same finger as base key
    '!': 'left-pinky',  '@': 'left-ring',   '#': 'left-middle', '$': 'left-index',
    '%': 'left-index',  '^': 'right-index', '&': 'right-index', '*': 'right-middle',
    '(': 'right-ring',  ')': 'right-pinky', '_': 'right-pinky', '?': 'right-pinky',
    "'": 'right-pinky', '"': 'right-pinky', ':': 'right-pinky',
  };

  // ─── Keyboard rows for the visual keyboard diagram ───────────────────────────

  const KEYBOARD_LAYOUT = [
    ['`','1','2','3','4','5','6','7','8','9','0','-','='],
    ['q','w','e','r','t','y','u','i','o','p','[',']','\\'],
    ['a','s','d','f','g','h','j','k','l',';',"'"],
    ['z','x','c','v','b','n','m',',','.','/',],
  ];

  // ─── Lesson data ──────────────────────────────────────────────────────────────

  const LESSON_DATA = [

    // ══════════════════════════════════════════════════════════
    //  BEGINNER PHASE — Lessons 1–7
    // ══════════════════════════════════════════════════════════

    {
      id: 1,
      title: 'Left Hand Home Row',
      subtitle: 'Keys: A S D F',
      description: 'Place your left fingers on the home row: A (pinky), S (ring), D (middle), F (index). Keep fingers lightly resting on these keys at all times.',
      phase: 'beginner',
      newKeys: ['a', 's', 'd', 'f'],
      allKeys: ['a', 's', 'd', 'f', ' '],
      targetWpm: 15,
      targetAccuracy: 90,
      sessionLength: { min: 15, max: 20 },
      exercises: [
        {
          id: 'warmup',
          type: 'warmup',
          label: 'Warmup — Meet Your Left Hand',
          text: 'fff fff ddd ddd sss sss aaa aaa fff ddd sss aaa',
        },
        {
          id: 'drill1',
          type: 'drill',
          label: 'Key Drill — All Four',
          text: 'aaa sss ddd fff fff ddd sss aaa asdf fdsa asdf fdsa',
        },
        {
          id: 'drill2',
          type: 'drill',
          label: 'Alternating Pairs',
          text: 'as as sa sa sd sd ds ds df df fd fd fs fs af af fa fa',
        },
        {
          id: 'words',
          type: 'words',
          label: 'Real Words',
          text: 'add ads dad fad sad all fall flask slash dash alas dads falls',
        },
        {
          id: 'sentence',
          type: 'sentence',
          label: 'Sentence Practice',
          text: 'a sad dad falls a flask falls all dads fall',
        },
      ],
    },

    {
      id: 2,
      title: 'Right Hand Home Row',
      subtitle: 'Keys: J K L ;',
      description: 'Now place your right fingers: J (index), K (middle), L (ring), ; (pinky). Both hands should now rest on the full home row.',
      phase: 'beginner',
      newKeys: ['j', 'k', 'l', ';'],
      allKeys: ['a', 's', 'd', 'f', 'j', 'k', 'l', ';', ' '],
      targetWpm: 18,
      targetAccuracy: 90,
      sessionLength: { min: 15, max: 20 },
      exercises: [
        {
          id: 'warmup',
          type: 'warmup',
          label: 'Warmup — Right Hand',
          text: 'jjj kkk lll ;;; jjj kkk lll ;;; jkl; ;lkj jkl; ;lkj',
        },
        {
          id: 'drill1',
          type: 'drill',
          label: 'Both Hands Together',
          text: 'asdf jkl; asdf jkl; fdsa ;lkj fdsa ;lkj aj sk dl f; f; dl sk aj',
        },
        {
          id: 'drill2',
          type: 'drill',
          label: 'Cross-Hand Pairs',
          text: 'al sk dj fk al sk dj fk as jk df l; as jk df l;',
        },
        {
          id: 'words',
          type: 'words',
          label: 'Home Row Words',
          text: 'all ask fall lass lads flask slash dash asks falls flak skull',
        },
        {
          id: 'sentence',
          type: 'sentence',
          label: 'Sentence Practice',
          text: 'ask all lads a flask falls all dads ask a sad lass',
        },
      ],
    },

    {
      id: 3,
      title: 'Add E and I',
      subtitle: 'Keys: E I',
      description: 'E is typed with your left middle finger (up from D). I is typed with your right middle finger (up from K). These are two of the most common vowels in English.',
      phase: 'beginner',
      newKeys: ['e', 'i'],
      allKeys: ['a', 's', 'd', 'f', 'j', 'k', 'l', ';', 'e', 'i', ' '],
      targetWpm: 20,
      targetAccuracy: 90,
      sessionLength: { min: 15, max: 20 },
      exercises: [
        {
          id: 'warmup',
          type: 'warmup',
          label: 'Warmup — E and I',
          text: 'ded ded kik kik ede ede iki iki eee iii eee iii',
        },
        {
          id: 'drill1',
          type: 'drill',
          label: 'Reach and Return',
          text: 'de ed ei ie id di es se if fi ied die fie lie sie die',
        },
        {
          id: 'words',
          type: 'words',
          label: 'New Words',
          text: 'aide dial fail file idea isle life side slide desk field ideal skill fill',
        },
        {
          id: 'sentence',
          type: 'sentence',
          label: 'Sentence Practice',
          text: 'a side desk fails all ideas slide aside fill the field',
        },
      ],
    },

    {
      id: 4,
      title: 'Add T and O',
      subtitle: 'Keys: T O',
      description: 'T is typed with your left index finger (up from F). O is typed with your right ring finger (up from L). These unlock hundreds of common English words.',
      phase: 'beginner',
      newKeys: ['t', 'o'],
      allKeys: ['a', 's', 'd', 'e', 'f', 'i', 'j', 'k', 'l', 'o', 's', 't', ';', ' '],
      targetWpm: 22,
      targetAccuracy: 90,
      sessionLength: { min: 15, max: 20 },
      exercises: [
        {
          id: 'warmup',
          type: 'warmup',
          label: 'Warmup — T and O',
          text: 'ftf ftf lol lol tft tft oto oto tot tot oto',
        },
        {
          id: 'drill1',
          type: 'drill',
          label: 'T and O Reach',
          text: 'to ot ti it ot ol lo sto ots toi oit sto ist lots slot',
        },
        {
          id: 'words',
          type: 'words',
          label: 'New Words',
          text: 'slot total float told lost toast stool toil tool fold solid toad',
        },
        {
          id: 'sentence',
          type: 'sentence',
          label: 'Sentence Practice',
          text: 'take a total of old tools the stool is solid toast is ideal',
        },
      ],
    },

    {
      id: 5,
      title: 'Add N and R',
      subtitle: 'Keys: N R',
      description: 'R is typed with your left index finger (up from F). N is typed with your right index finger (up from J). Two of the most common consonants in English.',
      phase: 'beginner',
      newKeys: ['n', 'r'],
      allKeys: ['a', 'd', 'e', 'f', 'i', 'j', 'k', 'l', 'n', 'o', 'r', 's', 't', ' '],
      targetWpm: 23,
      targetAccuracy: 90,
      sessionLength: { min: 15, max: 20 },
      exercises: [
        {
          id: 'warmup',
          type: 'warmup',
          label: 'Warmup — N and R',
          text: 'frf frf jnj jnj rrf nnj rfr njn rnrn nrnr',
        },
        {
          id: 'drill1',
          type: 'drill',
          label: 'R and N Drill',
          text: 'rn nr rin orn rant rent rant rind rain ran ran ran nor nor',
        },
        {
          id: 'words',
          type: 'words',
          label: 'New Words',
          text: 'rain rail train rent learn rind return natural real note role iron',
        },
        {
          id: 'sentence',
          type: 'sentence',
          label: 'Sentence Practice',
          text: 'learn to train in the rain rent a real iron trail',
        },
      ],
    },

    {
      id: 6,
      title: 'Add G and H',
      subtitle: 'Keys: G H',
      description: 'G is typed with your left index finger (between F and the space bar). H is typed with your right index finger (between J and the space bar). These are the inner home-row neighbours.',
      phase: 'beginner',
      newKeys: ['g', 'h'],
      allKeys: ['a', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'n', 'o', 'r', 's', 't', ' '],
      targetWpm: 24,
      targetAccuracy: 90,
      sessionLength: { min: 15, max: 20 },
      exercises: [
        {
          id: 'warmup',
          type: 'warmup',
          label: 'Warmup — G and H',
          text: 'fgf fgf jhj jhj gfg hjh ghg hgh ggh hhg',
        },
        {
          id: 'drill1',
          type: 'drill',
          label: 'G and H Drill',
          text: 'gh hg the then this that high night right thing other their',
        },
        {
          id: 'words',
          type: 'words',
          label: 'New Words',
          text: 'high night right light thing other their there then that this fight',
        },
        {
          id: 'sentence',
          type: 'sentence',
          label: 'Sentence Practice',
          text: 'the night is right for this thing their light is high',
        },
      ],
    },

    {
      id: 7,
      title: 'Beginner Review',
      subtitle: 'All beginner keys',
      description: 'Time to put it all together. This session reviews everything from the beginner phase in longer word sequences and natural sentences.',
      phase: 'beginner',
      newKeys: [],
      allKeys: ['a', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'n', 'o', 'r', 's', 't', ' '],
      targetWpm: 25,
      targetAccuracy: 90,
      sessionLength: { min: 20, max: 20 },
      exercises: [
        {
          id: 'warmup',
          type: 'warmup',
          label: 'Warmup',
          text: 'asdf jkl; asdf jkl; the rain in the night the right thing',
        },
        {
          id: 'drill1',
          type: 'drill',
          label: 'Speed Drill',
          text: 'her and the for this that then their other there those right light',
        },
        {
          id: 'sentence1',
          type: 'sentence',
          label: 'Sentences',
          text: 'learn the right things in the night other lights shine here',
        },
        {
          id: 'sentence2',
          type: 'sentence',
          label: 'More Sentences',
          text: 'rent a real iron trail and learn to train in the rain their field is large',
        },
      ],
    },

    // ══════════════════════════════════════════════════════════
    //  INTERMEDIATE PHASE — Lessons 8–14
    // ══════════════════════════════════════════════════════════

    {
      id: 8,
      title: 'Add Y and U',
      subtitle: 'Keys: Y U',
      description: 'Y is typed with your left index finger (top row, reaching up from G). U is typed with your right index finger (top row, reaching up from H).',
      phase: 'intermediate',
      newKeys: ['y', 'u'],
      allKeys: ['a', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'n', 'o', 'r', 's', 't', 'u', 'y', ' '],
      targetWpm: 27,
      targetAccuracy: 90,
      sessionLength: { min: 25, max: 30 },
      exercises: [
        {
          id: 'warmup',
          type: 'warmup',
          label: 'Warmup — Y and U',
          text: 'juj juj fyf fyf yfy uyu yuu uuy yuu uuy',
        },
        {
          id: 'drill1',
          type: 'drill',
          label: 'Y and U Drill',
          text: 'yu uy yur ury your your you you yell yell until unity truly',
        },
        {
          id: 'words',
          type: 'words',
          label: 'New Words',
          text: 'your year young study truly unity style youth hurry fury duty',
        },
        {
          id: 'sentence',
          type: 'sentence',
          label: 'Sentence Practice',
          text: 'you truly study each year your unity and duty are real',
        },
      ],
    },

    {
      id: 9,
      title: 'Add W and P',
      subtitle: 'Keys: W P',
      description: 'W is typed with your left ring finger (top row, up from S). P is typed with your right pinky finger (top row, up from ;).',
      phase: 'intermediate',
      newKeys: ['w', 'p'],
      allKeys: ['a', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'n', 'o', 'p', 'r', 's', 't', 'u', 'w', 'y', ' '],
      targetWpm: 28,
      targetAccuracy: 90,
      sessionLength: { min: 25, max: 30 },
      exercises: [
        {
          id: 'warmup',
          type: 'warmup',
          label: 'Warmup — W and P',
          text: 'sws sws ;p; ;p; wsw pwp wpwp pwpw wpp pww',
        },
        {
          id: 'drill1',
          type: 'drill',
          label: 'W and P Drill',
          text: 'wp pw who when what with power paper print while plan path',
        },
        {
          id: 'words',
          type: 'words',
          label: 'New Words',
          text: 'with when what power paper print while plan path word part well point',
        },
        {
          id: 'sentence',
          type: 'sentence',
          label: 'Sentence Practice',
          text: 'print with power when you plan the path well',
        },
      ],
    },

    {
      id: 10,
      title: 'Add C and M',
      subtitle: 'Keys: C M',
      description: 'C is typed with your left middle finger (bottom row, down from D). M is typed with your right index finger (bottom row, down from J).',
      phase: 'intermediate',
      newKeys: ['c', 'm'],
      allKeys: ['a', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'r', 's', 't', 'u', 'w', 'y', ' '],
      targetWpm: 29,
      targetAccuracy: 90,
      sessionLength: { min: 25, max: 30 },
      exercises: [
        {
          id: 'warmup',
          type: 'warmup',
          label: 'Warmup — C and M',
          text: 'dcd dcd jmj jmj cdc mcm cmc mcm ccm mmc',
        },
        {
          id: 'drill1',
          type: 'drill',
          label: 'C and M Drill',
          text: 'cm mc come make came more much time form claim merit mice',
        },
        {
          id: 'words',
          type: 'words',
          label: 'New Words',
          text: 'come make time more much came claim merit mice cream music',
        },
        {
          id: 'sentence',
          type: 'sentence',
          label: 'Sentence Practice',
          text: 'come make more time for music claim your merit now',
        },
      ],
    },

    {
      id: 11,
      title: 'Add B and V',
      subtitle: 'Keys: B V',
      description: 'Both B and V are typed with your left index finger on the bottom row. B is to the right of V. Keep your wrist relaxed as you reach down.',
      phase: 'intermediate',
      newKeys: ['b', 'v'],
      allKeys: ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'r', 's', 't', 'u', 'v', 'w', 'y', ' '],
      targetWpm: 30,
      targetAccuracy: 90,
      sessionLength: { min: 25, max: 30 },
      exercises: [
        {
          id: 'warmup',
          type: 'warmup',
          label: 'Warmup — B and V',
          text: 'fbf fbf fvf fvf bfb vfv bvb vbv bvv vbb',
        },
        {
          id: 'drill1',
          type: 'drill',
          label: 'B and V Drill',
          text: 'bv vb have been over above below brave voice event vibrant',
        },
        {
          id: 'words',
          type: 'words',
          label: 'New Words',
          text: 'have been over above below brave voice event vibrant brave view brave',
        },
        {
          id: 'sentence',
          type: 'sentence',
          label: 'Sentence Practice',
          text: 'have you been brave above and below give voice to your view',
        },
      ],
    },

    {
      id: 12,
      title: 'Add Q, X, and Z',
      subtitle: 'Keys: Q X Z',
      description: 'Q is your left pinky on the top row. X is your left ring finger on the bottom row. Z is your left pinky on the bottom row. These are the rarest letters — but still important!',
      phase: 'intermediate',
      newKeys: ['q', 'x', 'z'],
      allKeys: ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z', ' '],
      targetWpm: 30,
      targetAccuracy: 88,
      sessionLength: { min: 25, max: 30 },
      exercises: [
        {
          id: 'warmup',
          type: 'warmup',
          label: 'Warmup — Q X Z',
          text: 'aqa aqa sxs sxs aza aza qaq xsx zaz qxz zxq',
        },
        {
          id: 'drill1',
          type: 'drill',
          label: 'Q X Z Drill',
          text: 'qz zq xz zx quiz exact next quite quick extra zero fox vex',
        },
        {
          id: 'words',
          type: 'words',
          label: 'New Words',
          text: 'quiz exact next quite quick extra zero fox vex xerox zone zinc fix',
        },
        {
          id: 'sentence',
          type: 'sentence',
          label: 'Sentence Practice',
          text: 'the quick brown fox zaps a zero extra quiz quite exactly',
        },
      ],
    },

    {
      id: 13,
      title: 'Full Alphabet Review',
      subtitle: 'All 26 letters',
      description: 'Every letter of the alphabet is now at your fingertips. This session focuses on smooth, confident typing with real English words and sentences.',
      phase: 'intermediate',
      newKeys: [],
      allKeys: 'abcdefghijklmnopqrstuvwxyz '.split(''),
      targetWpm: 32,
      targetAccuracy: 90,
      sessionLength: { min: 30, max: 30 },
      exercises: [
        {
          id: 'warmup',
          type: 'warmup',
          label: 'Warmup',
          text: 'the quick brown fox jumps over the lazy dog',
        },
        {
          id: 'drill1',
          type: 'drill',
          label: 'Common Words',
          text: 'the and for are but not you all can her was one our out day get has him his how its may new now old see two way who boy did its let put say she too use',
        },
        {
          id: 'sentence1',
          type: 'sentence',
          label: 'Paragraph 1',
          text: 'practice makes perfect when you type every day your speed grows quickly',
        },
        {
          id: 'sentence2',
          type: 'sentence',
          label: 'Paragraph 2',
          text: 'good habits build over time just focus on accuracy first and speed will follow',
        },
      ],
    },

    {
      id: 14,
      title: 'Intermediate Review',
      subtitle: 'Speed and fluency',
      description: 'Push your speed while keeping accuracy above 90%. Focus on rhythm — type steadily rather than in bursts.',
      phase: 'intermediate',
      newKeys: [],
      allKeys: 'abcdefghijklmnopqrstuvwxyz '.split(''),
      targetWpm: 35,
      targetAccuracy: 90,
      sessionLength: { min: 30, max: 30 },
      exercises: [
        {
          id: 'warmup',
          type: 'warmup',
          label: 'Warmup',
          text: 'pack my box with five dozen liquor jugs',
        },
        {
          id: 'drill1',
          type: 'drill',
          label: 'Common Phrases',
          text: 'in the end at last by the way in fact as well from now on as a result in other words',
        },
        {
          id: 'sentence1',
          type: 'sentence',
          label: 'Paragraph',
          text: 'every expert was once a beginner the key is to keep going even when it feels slow',
        },
        {
          id: 'paragraph',
          type: 'sentence',
          label: 'Extended Text',
          text: 'touch typing is a skill that pays dividends every single day once you learn it you will wonder how you ever managed without it keep your eyes on the screen and trust your fingers',
        },
      ],
    },

    // ══════════════════════════════════════════════════════════
    //  ADVANCED PHASE — Lessons 15+
    // ══════════════════════════════════════════════════════════

    {
      id: 15,
      title: 'Numbers — 1 through 5',
      subtitle: 'Keys: 1 2 3 4 5',
      description: 'Numbers live on the top row. Use your left hand: 1 (pinky), 2 (ring), 3 (middle), 4 (index), 5 (index stretch). Return to home row after each reach.',
      phase: 'advanced',
      newKeys: ['1', '2', '3', '4', '5'],
      allKeys: 'abcdefghijklmnopqrstuvwxyz12345 '.split(''),
      targetWpm: 30,
      targetAccuracy: 88,
      sessionLength: { min: 30, max: 35 },
      exercises: [
        {
          id: 'warmup',
          type: 'warmup',
          label: 'Warmup — Left Numbers',
          text: '1 2 3 4 5 5 4 3 2 1 12 23 34 45 123 234 345 12345',
        },
        {
          id: 'drill1',
          type: 'drill',
          label: 'Number Sequences',
          text: '111 222 333 444 555 123 234 345 1234 2345 12345 54321',
        },
        {
          id: 'mixed',
          type: 'mixed',
          label: 'Numbers in Context',
          text: 'call 123 at 4 pm room 25 floor 3 item 14 step 5 group 2',
        },
        {
          id: 'sentence',
          type: 'sentence',
          label: 'Sentence Practice',
          text: 'I have 3 cats and 2 dogs and 14 fish and 5 birds in 1 house',
        },
      ],
    },

    {
      id: 16,
      title: 'Numbers — 6 through 0',
      subtitle: 'Keys: 6 7 8 9 0',
      description: 'The right half of the number row: 6 and 7 (right index), 8 (right middle), 9 (right ring), 0 (right pinky). Steady reach — home row is always your base.',
      phase: 'advanced',
      newKeys: ['6', '7', '8', '9', '0'],
      allKeys: 'abcdefghijklmnopqrstuvwxyz1234567890 '.split(''),
      targetWpm: 30,
      targetAccuracy: 88,
      sessionLength: { min: 30, max: 35 },
      exercises: [
        {
          id: 'warmup',
          type: 'warmup',
          label: 'Warmup — Right Numbers',
          text: '6 7 8 9 0 0 9 8 7 6 67 78 89 90 678 789 890 6789 7890',
        },
        {
          id: 'drill1',
          type: 'drill',
          label: 'Full Number Row',
          text: '1234567890 0987654321 1357 2468 246810 135790',
        },
        {
          id: 'mixed',
          type: 'mixed',
          label: 'Numbers in Context',
          text: 'year 2024 score 780 page 96 room 308 call 0800 size 10',
        },
        {
          id: 'sentence',
          type: 'sentence',
          label: 'Sentence Practice',
          text: 'in 2024 we hit a score of 980 out of 1000 just 20 short',
        },
      ],
    },

    {
      id: 17,
      title: 'Basic Punctuation',
      subtitle: 'Keys: . , \'',
      description: 'Punctuation makes text readable. Period (right ring), comma (right middle), apostrophe (right pinky). Practice placing them accurately without breaking your rhythm.',
      phase: 'advanced',
      newKeys: ['.', ',', "'"],
      allKeys: "abcdefghijklmnopqrstuvwxyz1234567890., ' ".split(''),
      targetWpm: 32,
      targetAccuracy: 88,
      sessionLength: { min: 35, max: 40 },
      exercises: [
        {
          id: 'warmup',
          type: 'warmup',
          label: 'Warmup — Punctuation',
          text: 'a, b, c. d, e. f, g. one, two, three. yes, no.',
        },
        {
          id: 'drill1',
          type: 'drill',
          label: 'Comma and Period',
          text: 'go, stay. run, walk. yes, no. here, there. up, down.',
        },
        {
          id: 'words',
          type: 'words',
          label: 'Contractions',
          text: "don't can't won't isn't it's I'm you're they're we're",
        },
        {
          id: 'sentence',
          type: 'sentence',
          label: 'Sentence Practice',
          text: "Hello, world. Don't stop learning. It's the best habit you can build.",
        },
      ],
    },

    {
      id: 18,
      title: 'More Punctuation',
      subtitle: 'Keys: ! ? - _',
      description: 'Exclamation and question marks add expression. Hyphens connect words. These often require the Shift key — keep your left pinky steady on Shift while your right hand types.',
      phase: 'advanced',
      newKeys: ['!', '?', '-'],
      allKeys: "abcdefghijklmnopqrstuvwxyz1234567890.,!?-' ".split(''),
      targetWpm: 33,
      targetAccuracy: 88,
      sessionLength: { min: 35, max: 40 },
      exercises: [
        {
          id: 'warmup',
          type: 'warmup',
          label: 'Warmup — Expressive Keys',
          text: 'yes! no? why? wow! go! stop? wait - now? ready! set! go!',
        },
        {
          id: 'drill1',
          type: 'drill',
          label: 'Punctuation Drill',
          text: 'ready? yes! stop - go! what? now! start - wait? done!',
        },
        {
          id: 'sentence',
          type: 'sentence',
          label: 'Sentence Practice',
          text: "Wow! What? No - it can't be! Are you sure? I think so - maybe!",
        },
      ],
    },

    {
      id: 19,
      title: 'Real World Text',
      subtitle: 'Extended passages',
      description: 'Now type longer passages from real English prose. Focus on maintaining steady rhythm throughout — not just the beginning of each line.',
      phase: 'advanced',
      newKeys: [],
      allKeys: "abcdefghijklmnopqrstuvwxyz1234567890.,!?-' ".split(''),
      targetWpm: 38,
      targetAccuracy: 90,
      sessionLength: { min: 40, max: 45 },
      exercises: [
        {
          id: 'warmup',
          type: 'warmup',
          label: 'Warmup',
          text: 'the five boxing wizards jump quickly',
        },
        {
          id: 'passage1',
          type: 'sentence',
          label: 'Passage 1',
          text: "The secret of getting ahead is getting started. The best time to plant a tree was 20 years ago. The second best time is now.",
        },
        {
          id: 'passage2',
          type: 'sentence',
          label: 'Passage 2',
          text: "Success is not final, failure is not fatal - it is the courage to continue that counts. Keep going, keep growing.",
        },
        {
          id: 'passage3',
          type: 'sentence',
          label: 'Passage 3',
          text: "Typing well is like any other skill - deliberate practice, done consistently, compounds over time. Ten minutes a day beats two hours once a week.",
        },
      ],
    },

    {
      id: 20,
      title: 'Speed and Fluency',
      subtitle: 'Push your limits',
      description: 'Your goal now is smooth, fast, accurate typing. Push your WPM while keeping accuracy above 90%. Rhythmic typing beats frantic bursts every time.',
      phase: 'advanced',
      newKeys: [],
      allKeys: "abcdefghijklmnopqrstuvwxyz1234567890.,!?-' ".split(''),
      targetWpm: 45,
      targetAccuracy: 90,
      sessionLength: { min: 40, max: 45 },
      exercises: [
        {
          id: 'warmup',
          type: 'warmup',
          label: 'Warmup',
          text: 'how vexingly quick daft zebras jump',
        },
        {
          id: 'speed1',
          type: 'sentence',
          label: 'Speed Run 1',
          text: 'If you can type 45 words per minute accurately, you are faster than most office workers in the world. Keep pushing.',
        },
        {
          id: 'speed2',
          type: 'sentence',
          label: 'Speed Run 2',
          text: "Accuracy first, speed second. But once accuracy becomes automatic, speed follows naturally. Don't fight it - flow with it.",
        },
        {
          id: 'speed3',
          type: 'sentence',
          label: 'Speed Run 3',
          text: "The quick brown fox jumps over the lazy dog. Pack my box with five dozen liquor jugs. How vexingly quick daft zebras jump!",
        },
      ],
    },

    // ─── Add more lessons here — extend the curriculum with ID 21, 22, etc. ───
    // Follow the same schema. Advanced lessons can include:
    //   - Code snippets (for developer-focused practice)
    //   - Long prose passages
    //   - Timed speed challenges
    //   - Custom symbol practice (@, #, $, etc.)

  ];

  // ─── Helper functions ─────────────────────────────────────────────────────────

  function get(id) {
    return LESSON_DATA.find(l => l.id === id) || null;
  }

  function getAll() {
    return LESSON_DATA;
  }

  function getByPhase(phase) {
    return LESSON_DATA.filter(l => l.phase === phase);
  }

  function getNext(currentId) {
    const idx = LESSON_DATA.findIndex(l => l.id === currentId);
    return idx >= 0 && idx < LESSON_DATA.length - 1 ? LESSON_DATA[idx + 1] : null;
  }

  function getPhaseFor(lessonId) {
    const lesson = get(lessonId);
    return lesson ? lesson.phase : 'beginner';
  }

  function getFingerFor(char) {
    return FINGER_MAP[char.toLowerCase()] || null;
  }

  function getKeyboardLayout() {
    return KEYBOARD_LAYOUT;
  }

  /**
   * Checks if a lesson is unlocked based on the previous lesson's progress.
   * Lesson 1 is always unlocked.
   */
  function isUnlocked(lessonId) {
    if (lessonId === 1) return true;
    if (!window.Storage) return lessonId === 1;
    const prev = get(lessonId - 1);
    if (!prev) return false;
    const progress = window.Storage.getLessonProgress(prev.id);
    return progress.completed;
  }

  /**
   * Returns the recommended session duration (in minutes) for a given lesson.
   */
  function getSessionLength(lessonId) {
    const lesson = get(lessonId);
    if (!lesson) return 20;
    const { min, max } = lesson.sessionLength;
    return Math.round((min + max) / 2);
  }

  /**
   * Generates a warm-up drill text targeting specific problem keys,
   * limited to the allowed keys of the given lesson.
   */
  function getProblemKeyDrill(lessonId, problemKeys) {
    const lesson = get(lessonId);
    if (!lesson || !problemKeys || problemKeys.length === 0) return null;
    return window.Tracker ? window.Tracker.generateDrill(problemKeys, lesson.allKeys) : null;
  }

  return {
    get,
    getAll,
    getByPhase,
    getNext,
    getPhaseFor,
    getFingerFor,
    getKeyboardLayout,
    isUnlocked,
    getSessionLength,
    getProblemKeyDrill,
    FINGER_MAP,
    KEYBOARD_LAYOUT,
  };

})();
