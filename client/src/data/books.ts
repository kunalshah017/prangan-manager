import cambridgeContents from "./fixtures/learn-with-cambridge-2026-27.json";

export interface BookSection {
  title: string;
  type: string;
  newWords?: string[];
  author?: string;
}

export interface LanguageInUseTopic {
  name: string;
  description: string;
}

export interface LanguageInUse {
  topics: LanguageInUseTopic[];
}

export interface ASL {
  listening: string;
  pronunciation: string;
  speaking: string;
}

export interface UnitSections {
  reading?: BookSection;
  languageInUse?: LanguageInUse;
  asl?: ASL;
  writing?: string;
  activity?: string;
}

export interface BookStructureItem {
  id: string;
  title: string;
  type: string;
  pageStart: number;
  children?: BookStructureItem[];
  topics?: string[];
  theme?: string;
  sections?: UnitSections;
  covers?: string;
  activities?: string[];
  description?: string;
}

export interface BookInfo {
  title: string;
  subtitle: string;
  author: string;
  consultingEditor: string;
  publisher: string;
  isbn: string;
  edition: string;
  level: string;
}

export interface Book {
  id: string;
  pdfUrl: string;
  coverUrl: string;
  pdfOffset: number;
  bookInfo: BookInfo;
  structure: BookStructureItem[];
  grammarTopics: string[];
  vocabularyCategories: string[];
  skillsAndCompetencies: {
    listening?: string;
    speaking?: string;
    reading?: string;
    writing?: string;
    pronunciation?: string;
    grammar?: string;
    vocabulary?: string;
    composition?: string;
    lifeSkills: string[];
  };
  specialFeatures: Record<string, string | string[]>;
}

type CambridgeContents = {
  levels: Record<
    string,
    Array<{
      semester: number;
      items: Array<{
        sourceNumber: number;
        title: string;
        page: number;
        section: string;
        cycle: string;
      }>;
    }>
  >;
};

const primaryBookStructure = (
  level: string,
  semester: number,
): BookStructureItem[] => {
  const levelCode = level.toUpperCase().replaceAll(" ", "_");
  const volume = (cambridgeContents as CambridgeContents).levels[
    levelCode
  ]?.find((item) => item.semester === semester);

  const sections = new Map<string, BookStructureItem>();
  for (const item of volume?.items ?? []) {
    const section = sections.get(item.section) ?? {
      id: `${levelCode.toLowerCase()}-${semester}-${item.section.toLowerCase().replaceAll(" ", "-")}`,
      title: item.section,
      type: "section",
      pageStart: item.page,
      children: [],
    };
    section.children!.push({
      id: `${levelCode.toLowerCase()}-${semester}-${item.sourceNumber}`,
      title: item.title,
      type: "topic",
      pageStart: item.page,
      theme: item.cycle.replace("_", "-"),
    });
    sections.set(item.section, section);
  }
  return [...sections.values()];
};

const createLearnWithCambridgeBook = ({
  id,
  isbn,
  level,
  semester,
  coverUrl,
  pdfUrl,
}: {
  id: string;
  isbn: string;
  level: "Primary A" | "Primary B" | "Primary C";
  semester: 1 | 2;
  coverUrl: string;
  pdfUrl: string;
}): Book => ({
  id,
  coverUrl,
  pdfUrl,
  pdfOffset: 9,
  bookInfo: {
    title: `Learn with Cambridge: ${level} — Semester ${semester}`,
    subtitle: "An Integrated Semester Course",
    author: "Cambridge University Press & Assessment",
    consultingEditor: "",
    publisher: "Cambridge University Press & Assessment",
    isbn,
    edition: "Integrated semester edition",
    level,
  },
  structure: primaryBookStructure(level, semester),
  grammarTopics: [],
  vocabularyCategories: [],
  skillsAndCompetencies: {
    reading: "Integrated literacy, rhymes, and stories",
    writing: "Age-appropriate literacy activities",
    lifeSkills: ["General awareness", "Communication", "Creative thinking"],
  },
  specialFeatures: {
    course: "Integrated semester course",
    subjects: ["Literacy", "Numeracy", "Rhymes and Stories", "General Awareness"],
    alignedTo: ["NEP 2020", "NCF 2023"],
  },
});

export const books: Book[] = [
  createLearnWithCambridgeBook({
    id: "learn-with-cambridge-primary-a-semester-1",
    isbn: "978-1-009-83214-4",
    level: "Primary A",
    semester: 1,
    coverUrl:
      "/images/library/learn_with_cambridge_primary_a_semester_1.webp",
    pdfUrl:
      "https://cermlj2dqa0j2jal.public.blob.vercel-storage.com/learn_with_cambridge_primary_a_semester_1-8dGKA0IabpfdPcieQSR8b6KJNGy2pD.pdf",
  }),
  createLearnWithCambridgeBook({
    id: "learn-with-cambridge-primary-a-semester-2",
    isbn: "978-1-009-83215-1",
    level: "Primary A",
    semester: 2,
    coverUrl:
      "/images/library/learn_with_cambridge_primary_a_semester_2.webp",
    pdfUrl:
      "https://cermlj2dqa0j2jal.public.blob.vercel-storage.com/learn_with_cambridge_primary_a_semester_2-nyIfa47YFcvhQ8IwTENtG7lxWRcUDY.pdf",
  }),
  createLearnWithCambridgeBook({
    id: "learn-with-cambridge-primary-b-semester-1",
    isbn: "978-1-009-83216-8",
    level: "Primary B",
    semester: 1,
    coverUrl:
      "/images/library/learn_with_cambridge_primary_b_semester_1.webp",
    pdfUrl:
      "https://cermlj2dqa0j2jal.public.blob.vercel-storage.com/learn_with_cambridge_primary_b_semester_1-UKcbAB222NwdH4l7z28XLwesrQJ383.pdf",
  }),
  createLearnWithCambridgeBook({
    id: "learn-with-cambridge-primary-b-semester-2",
    isbn: "978-1-009-83217-5",
    level: "Primary B",
    semester: 2,
    coverUrl:
      "/images/library/learn_with_cambridge_primary_b_semester_2.webp",
    pdfUrl:
      "https://cermlj2dqa0j2jal.public.blob.vercel-storage.com/learn_with_cambridge_primary_b_semester_2-iYCjgKDV4AsihizZDnZCFRp1lWXZmv.pdf",
  }),
  createLearnWithCambridgeBook({
    id: "learn-with-cambridge-primary-c-semester-1",
    isbn: "978-1-009-83218-2",
    level: "Primary C",
    semester: 1,
    coverUrl:
      "/images/library/learn_with_cambridge_primary_c_semester_1.webp",
    pdfUrl:
      "https://cermlj2dqa0j2jal.public.blob.vercel-storage.com/learn_with_cambridge_primary_c_semester_1-9oU5I0iBP1r3cmkkuMjBGDtGFmhPoq.pdf",
  }),
  createLearnWithCambridgeBook({
    id: "learn-with-cambridge-primary-c-semester-2",
    isbn: "978-1-009-83219-9",
    level: "Primary C",
    semester: 2,
    coverUrl:
      "/images/library/learn_with_cambridge_primary_c_semester_2.webp",
    pdfUrl:
      "https://cermlj2dqa0j2jal.public.blob.vercel-storage.com/learn_with_cambridge_primary_c_semester_2-ryYDSNm1CoMgBg1jHb7Js4vnwzTEwT.pdf",
  }),
  {
    id: "communicate-cambridge-1",
    coverUrl: "/images/library/cambridge_english_level_1.webp",
    pdfUrl:
      "https://cermlj2dqa0j2jal.public.blob.vercel-storage.com/cambridge_english_level_1.pdf",
    pdfOffset: 11,
    bookInfo: {
      title: "Communicate with Cambridge: Coursebook 1",
      subtitle: "Enhanced Edition",
      author: "Sanjana Mulla",
      consultingEditor: "Dr CLN Prakash",
      publisher: "Cambridge University Press",
      isbn: "978-1-009-80140-9",
      edition: "Fourth edition 2024",
      level: "Level 1",
    },
    structure: [
      {
        id: "do-you-remember",
        title: "Do You Remember?",
        type: "introductory-section",
        pageStart: 1,
        topics: [
          "Phonics review",
          "Rhyming words",
          "Letter recognition",
          "Vowel sounds",
          "Opposite words",
          "Listening comprehension",
        ],
      },
      {
        id: "unit-1",
        title: "Unit 1: Manu and His Family",
        type: "unit",
        pageStart: 7,
        theme: "Importance of family",
        sections: {
          reading: {
            title: "Manu and His Family",
            type: "story",
            newWords: [
              "house",
              "mother",
              "hospital",
              "father",
              "school",
              "grandma",
              "grandpa",
              "garden",
              "park",
            ],
          },
          languageInUse: {
            topics: [
              {
                name: "Naming words",
                description: "Names of people, places, animals and things",
              },
              {
                name: "am, are",
                description: "Basic verb usage",
              },
              {
                name: "Family words",
                description: "aunt, uncle, cousins",
              },
            ],
          },
          asl: {
            listening: "Listening to greetings",
            pronunciation: "Words with the same number of letters and sounds",
            speaking: "Practising a dialogue",
          },
          writing: "Completing a card about yourself",
          activity: "Coping with emotions; interpersonal skills",
        },
      },
      {
        id: "poem-1",
        title: "Poem: All of Me",
        type: "poem",
        pageStart: 18,
        theme: "Body awareness",
        sections: {
          reading: {
            title: "All of Me",
            type: "poem",
            newWords: ["exactly", "special"],
          },
          languageInUse: {
            topics: [
              {
                name: "One, many",
                description: "Singular and plural",
              },
              {
                name: "Body words",
                description: "Vocabulary related to body parts",
              },
            ],
          },
        },
      },
      {
        id: "unit-2",
        title: "Unit 2: Friends in the Park",
        type: "unit",
        pageStart: 21,
        theme: "Sharing and caring",
        sections: {
          reading: {
            title: "Friends in the Park",
            type: "story",
            newWords: ["slippery", "rough"],
          },
          languageInUse: {
            topics: [
              {
                name: "he, she, they, it",
                description: "Pronouns",
              },
              {
                name: "I, we, you",
                description: "Personal pronouns",
              },
              {
                name: "Things in a park",
                description:
                  "Vocabulary: seesaw, slide, bench, tree, merry-go-round",
              },
            ],
          },
          asl: {
            listening: "Listening to descriptions of people",
            pronunciation: "Vowel sounds in beat and big",
            speaking: "Practising a conversation",
          },
          writing: "Filling details in a card about a friend",
          activity: "Interpersonal skills",
        },
      },
      {
        id: "poem-2",
        title: "Poem: At School",
        type: "poem",
        pageStart: 29,
        theme: "Punctuality, friendship",
        sections: {
          reading: {
            title: "At School",
            type: "poem",
            newWords: ["hurry", "softly", "quietly", "scissors", "glue"],
          },
          languageInUse: {
            topics: [
              {
                name: "this, that",
                description: "Demonstratives (near and far)",
              },
              {
                name: "these, those",
                description: "Plural demonstratives",
              },
              {
                name: "Shapes",
                description: "Geometric shapes",
              },
              {
                name: "Classroom words",
                description: "Vocabulary related to classroom items",
              },
            ],
          },
        },
      },
      {
        id: "enrichment-1",
        title: "Enrichment Activities 1",
        type: "enrichment",
        pageStart: 35,
        covers: "Units 1 and 2",
        activities: ["Listening", "Speaking", "Activity"],
      },
      {
        id: "unit-3",
        title: "Unit 3: At the Zoo",
        type: "unit",
        pageStart: 37,
        sections: {
          reading: {
            title: "At the Zoo",
            type: "story",
            newWords: ["zoo", "chirp", "roars", "hiss", "crocodile"],
          },
          languageInUse: {
            topics: [
              {
                name: "is, am, are",
                description: "Present tense verb forms",
              },
              {
                name: "Animals and their babies",
                description: "Vocabulary: kitten, cub, lamb, foal, calf, puppy",
              },
            ],
          },
          asl: {
            listening: "Listening to descriptions of animals",
            pronunciation: "Revision: vowel sounds in beat and big",
            speaking: "Speaking about a picture using hints",
          },
          writing: "Rewriting sentences using capital letters and full stops",
          activity: "Self-awareness, critical thinking",
        },
      },
      {
        id: "poem-3",
        title: "Poem: Mr Caterpillar",
        type: "poem",
        pageStart: 46,
        sections: {
          reading: {
            title: "Mr Caterpillar",
            type: "poem",
            newWords: ["beat", "too"],
          },
          languageInUse: {
            topics: [
              {
                name: "Action words",
                description: "Doing words: dance, hop, gallop, run",
              },
              {
                name: "Male and female names of animals",
                description:
                  "horse-mare, bull-cow, lion-lioness, tiger-tigress, deer-doe",
              },
            ],
          },
        },
      },
      {
        id: "unit-4",
        title: "Unit 4: My Red Bicycle",
        type: "unit",
        pageStart: 50,
        sections: {
          reading: {
            title: "My Red Bicycle",
            type: "story",
            newWords: ["maternal aunt", "paternal uncle"],
          },
          languageInUse: {
            topics: [
              {
                name: "can, cannot",
                description: "Ability expressions",
              },
              {
                name: "Vehicles",
                description: "Various types of vehicles",
              },
              {
                name: "Colours of the things around us",
                description: "Color vocabulary",
              },
            ],
          },
          asl: {
            listening: "Listening to dialogues",
            pronunciation: "Vowel sounds in cool and put",
            speaking: "Speaking about things you like or don't like",
          },
          writing: "Completing a paragraph",
        },
      },
      {
        id: "unit-5",
        title: "Unit 5: Hide and Sleep",
        type: "unit",
        pageStart: 58,
        sections: {
          reading: {
            title: "Hide and Sleep",
            type: "story",
          },
          languageInUse: {
            topics: [
              {
                name: "in, on",
                description: "Prepositions of place",
              },
              {
                name: "Occupations",
                description: "Jobs and professions",
              },
            ],
          },
          asl: {
            listening: "Listening to sentences and matching them with pictures",
            pronunciation: "Revision: vowel sounds in cool and put",
            speaking: "Asking and responding to common questions",
          },
          writing: "Completing a picture story",
          activity: "Problem solving",
        },
      },
      {
        id: "think-feel-act-a",
        title: "Think, Feel, Act Section A",
        type: "special-section",
        pageStart: 66,
        activities: ["Art Integration", "21st Century Skills"],
      },
      {
        id: "enrichment-2",
        title: "Enrichment Activities 2",
        type: "enrichment",
        pageStart: 70,
        covers: "Units 3 to 5",
      },
      {
        id: "revision-1",
        title: "Revision 1",
        type: "revision",
        pageStart: 72,
      },
      {
        id: "unit-6",
        title: "Unit 6: The Magic Tree",
        type: "unit",
        pageStart: 74,
        sections: {
          reading: {
            title: "The Magic Tree",
            type: "story",
          },
          languageInUse: {
            topics: [
              {
                name: "Describing words",
                description: "Adjectives",
              },
              {
                name: "Words with the same meaning",
                description: "Synonyms",
              },
            ],
          },
        },
      },
      {
        id: "poem-4",
        title: "Poem: A Child's Song",
        type: "poem",
        pageStart: 82,
        sections: {
          reading: {
            title: "A Child's Song",
            type: "poem",
            author: "Alice F. Green",
          },
          languageInUse: {
            topics: [
              {
                name: "am, am not",
                description: "Negative forms",
              },
              {
                name: "Words that go together",
                description: "Word associations",
              },
              {
                name: "Things we use",
                description: "Common objects vocabulary",
              },
            ],
          },
          asl: {
            listening: "Listening to a poem and filling the blanks",
            pronunciation: "Revision: vowel sounds in beat-big and cool-put",
            speaking: "Using polite words in a dialogue",
          },
          writing: "Filling in the blanks",
          activity: "Interpersonal skills, critical thinking",
        },
      },
      {
        id: "unit-7",
        title: "Unit 7: The Red Raincoat",
        type: "unit",
        pageStart: 88,
        sections: {
          reading: {
            title: "The Red Raincoat",
            type: "story",
          },
          languageInUse: {
            topics: [
              {
                name: "a, an",
                description: "Articles",
              },
              {
                name: "Weather words",
                description: "Vocabulary related to weather",
              },
            ],
          },
          asl: {
            listening: "Listening to a poem and filling the blanks",
            pronunciation: "Vowel sounds in park and sun",
            speaking: "Asking and answering questions about the weather",
          },
          writing: "Writing a short description of a picture",
          activity: "Problem solving, critical thinking",
        },
      },
      {
        id: "poem-5",
        title: "Poem: The Rainbow",
        type: "poem",
        pageStart: 98,
        sections: {
          reading: {
            title: "The Rainbow",
            type: "poem",
          },
          languageInUse: {
            topics: [
              {
                name: "has, have",
                description: "Possession verbs",
              },
              {
                name: "Opposites",
                description: "Antonyms",
              },
            ],
          },
        },
      },
      {
        id: "enrichment-3",
        title: "Enrichment Activities 3",
        type: "enrichment",
        pageStart: 103,
        covers: "Units 6 and 7",
      },
      {
        id: "unit-8",
        title: "Unit 8: King Lion and Rabbit",
        type: "unit",
        pageStart: 105,
        theme: "Wisdom and wit",
        sections: {
          reading: {
            title: "King Lion and Rabbit",
            type: "story",
            author: "Krishna Rao",
            newWords: [
              "offered",
              "arrived",
              "growled",
              "shocked",
              "realise",
              "reflection",
            ],
          },
          languageInUse: {
            topics: [
              {
                name: "up, down, into",
                description: "Prepositions of movement",
              },
              {
                name: "Opposites",
                description: "Antonyms",
              },
            ],
          },
          asl: {
            listening: "Listening to words and picking the odd one",
            pronunciation: "Revision sounds: vowel sounds in park and sun",
            speaking: "Expressing regret",
          },
          writing: "Sequencing sentences using picture clues to make a story",
          activity: "Critical thinking, interpersonal skills",
        },
      },
      {
        id: "poem-6",
        title: "Poem: My Big Fat Cat",
        type: "poem",
        pageStart: 113,
        sections: {
          reading: {
            title: "My Big Fat Cat",
            type: "poem",
          },
          languageInUse: {
            topics: [
              {
                name: "and, but",
                description: "Conjunctions",
              },
              {
                name: "Familiar places",
                description: "Location vocabulary",
              },
            ],
          },
        },
      },
      {
        id: "unit-9",
        title: "Unit 9: The Poor Woodcutter",
        type: "unit",
        pageStart: 117,
        sections: {
          reading: {
            title: "The Poor Woodcutter",
            type: "play",
          },
          languageInUse: {
            topics: [
              {
                name: "Actions that are happening right now",
                description: "Present continuous tense",
              },
              {
                name: "Things people use to work",
                description: "Tools and equipment vocabulary",
              },
            ],
          },
          asl: {
            listening: "Listening to riddles and solving them",
            pronunciation: "Revision",
            speaking: "Describing actions",
          },
          writing: "Writing a short description of an object",
        },
      },
      {
        id: "think-feel-act-b",
        title: "Think, Feel, Act Section B",
        type: "special-section",
        pageStart: 124,
        activities: [
          "21st Century Skills",
          "Learning by Doing",
          "Life Competencies",
        ],
      },
      {
        id: "enrichment-4",
        title: "Enrichment Activities 4",
        type: "enrichment",
        pageStart: 128,
        covers: "Units 8 and 9",
      },
      {
        id: "revision-2",
        title: "Revision 2",
        type: "revision",
        pageStart: 131,
      },
      {
        id: "listening-texts",
        title: "Listening Texts",
        type: "appendix",
        pageStart: 133,
        description: "Audio transcripts for all listening activities",
      },
    ],
    grammarTopics: [
      "Naming words (Nouns)",
      "am, are, is",
      "Family words",
      "Singular and plural",
      "Pronouns (he, she, they, it, I, we, you)",
      "Demonstratives (this, that, these, those)",
      "Action words (Verbs)",
      "can, cannot",
      "Prepositions (in, on, up, down, into)",
      "Describing words (Adjectives)",
      "Synonyms",
      "Antonyms",
      "Articles (a, an)",
      "has, have",
      "Conjunctions (and, but)",
      "Present continuous tense",
    ],
    vocabularyCategories: [
      "Family members",
      "Body parts",
      "Classroom items",
      "Shapes",
      "Park equipment",
      "Animals and their babies",
      "Male and female animals",
      "Vehicles",
      "Colors",
      "Occupations",
      "Weather words",
      "Tools and equipment",
      "Common objects",
    ],
    skillsAndCompetencies: {
      listening: "Progressive listening exercises with audio support",
      speaking: "Dialogues, conversations, and presentations",
      reading: "Stories, poems, and plays with comprehension questions",
      writing: "Creative and functional writing tasks",
      pronunciation: "Vowel sounds and phonics practice",
      lifeSkills: [
        "Empathy",
        "Interpersonal skills",
        "Problem solving",
        "Critical thinking",
        "Self-awareness",
        "Social responsibility",
      ],
    },
    specialFeatures: {
      warmUp: "Pre-reading activities in each unit",
      asl: "Assessment of Speaking and Listening integrated units",
      thinkFeelAct: "Two special sections for concept internalization",
      enrichmentActivities: "Four enrichment sections covering multiple units",
      revisions: "Two comprehensive revision sections",
      artIntegration: "Creative activities connecting to other subjects",
      "21stCenturySkills":
        "Activities promoting critical thinking and creativity",
      lifeCompetencies: "Reflective tasks for personal development",
    },
  },
  {
    id: "communicate-cambridge-2",
    coverUrl: "/images/library/cambridge_english_level_2.webp",
    pdfUrl:
      "https://cermlj2dqa0j2jal.public.blob.vercel-storage.com/cambridge_english_level_2.pdf",
    pdfOffset: 11,
    bookInfo: {
      title: "Communicate with Cambridge: Coursebook 2",
      subtitle: "Enhanced Edition",
      author: "Sanjana Mulla",
      consultingEditor: "Dr CLN Prakash",
      publisher: "Cambridge University Press",
      isbn: "",
      edition: "2024",
      level: "Level 2",
    },
    structure: [
      {
        id: "do-you-remember",
        title: "Do You Remember?",
        type: "introductory-section",
        pageStart: 1,
        topics: [
          "Phonics review",
          "Vowel sounds",
          "Letter blends",
          "Listening for pronunciation",
        ],
      },
      {
        id: "unit-1",
        title: "Unit 1: All About Me",
        type: "unit",
        pageStart: 7,
        theme: "Self awareness",
        sections: {
          reading: {
            title: "Me and My Shadow",
            type: "story",
            newWords: ["shadow", "mirror", "shape", "follow"],
          },
          languageInUse: {
            topics: [
              {
                name: "Naming words",
                description: "Review: nouns",
              },
              {
                name: "Describing words",
                description: "Using adjectives",
              },
            ],
          },
          asl: {
            listening: "Instructions for physical coordination",
            pronunciation: "Vowel sounds (short vs long)",
            speaking: "Describing yourself",
          },
          writing: "Writing about yourself",
        },
      },
      {
        id: "poem-1",
        title: "Poem: I Am Special",
        type: "poem",
        pageStart: 18,
        theme: "Self-esteem",
        sections: {
          reading: {
            title: "I Am Special",
            type: "poem",
            newWords: ["unique", "talent"],
          },
          languageInUse: {
            topics: [
              {
                name: "I, me, my",
                description: "Personal pronouns",
              },
            ],
          },
        },
      },
      {
        id: "unit-2",
        title: "Unit 2: My Family",
        type: "unit",
        pageStart: 21,
        theme: "Family and relationships",
        sections: {
          reading: {
            title: "The Family Picnic",
            type: "story",
            newWords: ["picnic", "basket", "blanket", "games"],
          },
          languageInUse: {
            topics: [
              {
                name: "Family words",
                description:
                  "mother, father, brother, sister, grandmother, grandfather",
              },
              {
                name: "Plural nouns",
                description: "When to use -s, -es, -ies",
              },
            ],
          },
          asl: {
            listening: "Listening to a conversation",
            pronunciation: "Rhyming endings",
            speaking: "Talking about your family",
          },
          writing: "Writing about a family outing",
        },
      },
      {
        id: "poem-2",
        title: "Poem: Our Family Tree",
        type: "poem",
        pageStart: 29,
        theme: "Family connections",
        sections: {
          reading: {
            title: "Our Family Tree",
            type: "poem",
            newWords: ["ancestor", "roots"],
          },
          languageInUse: {
            topics: [
              {
                name: "This, That",
                description: "Demonstratives",
              },
            ],
          },
        },
      },
      {
        id: "enrichment-1",
        title: "Enrichment Activities 1",
        type: "enrichment",
        pageStart: 35,
        covers: "Units 1 and 2",
      },
      {
        id: "unit-3",
        title: "Unit 3: At School",
        type: "unit",
        pageStart: 37,
        theme: "School life",
        sections: {
          reading: {
            title: "School Days",
            type: "story",
            newWords: ["classroom", "teacher", "friend", "subject"],
          },
          languageInUse: {
            topics: [
              {
                name: "Action words",
                description: "Verbs in present tense",
              },
            ],
          },
          asl: {
            listening: "Class timetable",
            pronunciation: "Consonant blends",
            speaking: "Describing a school day",
          },
          writing: "Describe your favourite subject",
        },
      },
      {
        id: "poem-3",
        title: "Poem: In the Playground",
        type: "poem",
        pageStart: 46,
        sections: {
          reading: {
            title: "In the Playground",
            type: "poem",
            newWords: ["slide", "swing", "hop", "skip"],
          },
          languageInUse: {
            topics: [
              {
                name: "Present continuous tense",
                description: "Verbs ending in -ing",
              },
            ],
          },
        },
      },
      {
        id: "unit-4",
        title: "Unit 4: A Day Out",
        type: "unit",
        pageStart: 50,
        sections: {
          reading: {
            title: "The Zoo Visit",
            type: "story",
            newWords: ["lion", "elephant", "cage", "keeper"],
          },
          languageInUse: {
            topics: [
              {
                name: "Describing animals",
                description: "Adjectives: big, small, tall, short",
              },
            ],
          },
          asl: {
            listening: "Directions at the zoo",
            pronunciation: "Plurals and singulars",
            speaking: "Describe a zoo animal",
          },
          writing: "Recount your zoo visit",
        },
      },
      {
        id: "unit-5",
        title: "Unit 5: In the Market",
        type: "unit",
        pageStart: 58,
        sections: {
          reading: {
            title: "At the Fruit Stall",
            type: "story",
            newWords: ["fruit", "stall", "money", "shopkeeper"],
          },
          languageInUse: {
            topics: [
              {
                name: "Countable and uncountable nouns",
                description: "apple, rice, oranges",
              },
            ],
          },
          asl: {
            listening: "Buying groceries",
            pronunciation: "Long and short vowels",
            speaking: "Role-play: customer and shopkeeper",
          },
          writing: "Draw and label your favourite fruit",
        },
      },
      {
        id: "think-feel-act-a",
        title: "Think, Feel, Act Section A",
        type: "special-section",
        pageStart: 66,
        activities: ["Empathy", "Caring for others", "Teamwork"],
      },
      {
        id: "enrichment-2",
        title: "Enrichment Activities 2",
        type: "enrichment",
        pageStart: 70,
        covers: "Units 3 to 5",
      },
      {
        id: "revision-1",
        title: "Revision 1",
        type: "revision",
        pageStart: 72,
      },
      {
        id: "appendix-listening-texts",
        title: "Listening Texts",
        type: "appendix",
        pageStart: 134,
        description: "Audio transcripts for all listening activities",
      },
    ],
    grammarTopics: [
      "Personal pronouns (I, me, my)",
      "Naming words (nouns)",
      "Describing words (adjectives)",
      "Action words (verbs)",
      "Plural formation",
      "Demonstratives (this, that)",
      "Present continuous tense",
      "Countable and uncountable nouns",
    ],
    vocabularyCategories: [
      "Parts of the body",
      "Family members",
      "School objects",
      "Animals",
      "Fruits and vegetables",
      "Action verbs",
      "Adjectives for description",
    ],
    skillsAndCompetencies: {
      listening: "Progressive listening exercises with audio support",
      speaking: "Dialogues, role-play, and presentations",
      reading: "Stories, poems, and comprehension questions",
      writing: "Creative and personal writing tasks",
      pronunciation: "Phonics, vowel and consonant sounds",
      lifeSkills: ["Empathy", "Teamwork", "Sharing", "Self-awareness"],
    },
    specialFeatures: {
      warmUp: "Pre-reading and discussion activities in each unit",
      asl: "Integrated Assessment of Speaking and Listening",
      thinkFeelAct:
        "Two sections focusing on social-emotional learning and empathy",
      enrichmentActivities:
        "Two enrichment modules for review and skill practice",
      revision: "One comprehensive revision section",
      artIntegration: "Drawing and creative connection tasks",
      "21stCenturySkills": "Tasks promoting collaboration and communication",
    },
  },
  {
    id: "communicate-cambridge-3",
    coverUrl: "/images/library/cambridge_english_level_3.webp",
    pdfUrl:
      "https://cermlj2dqa0j2jal.public.blob.vercel-storage.com/cambridge_english_level_3.pdf",
    pdfOffset: 11,
    bookInfo: {
      title: "Communicate with Cambridge: Coursebook 3",
      subtitle: "Enhanced Edition",
      author: "Sanjana Mulla",
      consultingEditor: "Dr CLN Prakash",
      publisher: "Cambridge University Press",
      isbn: "978-1-009-80142-3",
      edition: "Fourth Edition 2024",
      level: "Level 3",
    },
    structure: [
      {
        id: "unit-1",
        title: "The Golden Touch",
        type: "unit",
        pageStart: 1,
        theme: "Attitude, Responsibility",
        sections: {
          reading: {
            title: "The Golden Touch",
            type: "story",
          },
          languageInUse: {
            topics: [
              {
                name: "Common nouns",
                description: "",
              },
              {
                name: "Proper nouns",
                description: "",
              },
              {
                name: "Collective nouns",
                description: "",
              },
            ],
          },
        },
      },
      {
        id: "unit-2",
        title: "The Fortunate Pedlar",
        type: "unit",
        pageStart: 14,
        sections: {
          reading: {
            title: "The Fortunate Pedlar",
            type: "story",
          },
          languageInUse: {
            topics: [
              {
                name: "Singular and plural nouns",
                description: "",
              },
              {
                name: "Articles: a, an, the",
                description: "",
              },
            ],
          },
        },
      },
      {
        id: "poem-1",
        title: "I Meant to Do My Work Today",
        type: "poem",
        pageStart: 23,
        sections: {
          reading: {
            title: "I Meant to Do My Work Today",
            type: "poem",
          },
          languageInUse: {
            topics: [
              {
                name: "Rhyming words",
                description: "",
              },
              {
                name: "Personification",
                description: "",
              },
            ],
          },
        },
      },
      {
        id: "unit-3",
        title: "How the Sun Was Rescued",
        type: "unit",
        pageStart: 26,
        sections: {
          reading: {
            title: "How the Sun Was Rescued",
            type: "story",
          },
          languageInUse: {
            topics: [
              {
                name: "Adjectives of quality",
                description: "",
              },
              {
                name: "Adjectives of quantity",
                description: "",
              },
              {
                name: "Degrees of comparison",
                description: "",
              },
            ],
          },
        },
      },
      {
        id: "enrichment-1",
        title: "Enrichment Activities 1",
        type: "enrichment",
        pageStart: 37,
        covers: "Units 1–3",
      },
      {
        id: "unit-4",
        title: "Mowgli Joins the Wolf Pack",
        type: "unit",
        pageStart: 41,
        sections: {
          reading: {
            title: "Mowgli Joins the Wolf Pack",
            type: "story",
          },
          languageInUse: {
            topics: [
              {
                name: "Simple present tense",
                description: "",
              },
              {
                name: "Simple past tense",
                description: "",
              },
            ],
          },
        },
      },
      {
        id: "poem-2",
        title: "Homes",
        type: "poem",
        pageStart: 53,
        sections: {
          reading: {
            title: "Homes",
            type: "poem",
          },
          languageInUse: {
            topics: [
              {
                name: "Rhyming words",
                description: "",
              },
              {
                name: "Repetition",
                description: "",
              },
            ],
          },
        },
      },
      {
        id: "unit-5",
        title: "Project Sunshine",
        type: "unit",
        pageStart: 55,
        sections: {
          reading: {
            title: "Project Sunshine",
            type: "story",
          },
          languageInUse: {
            topics: [
              {
                name: "Personal pronouns",
                description: "",
              },
              {
                name: "Possessive pronouns",
                description: "",
              },
              {
                name: "Possessive adjectives",
                description: "",
              },
            ],
          },
        },
      },
      {
        id: "poem-3",
        title: "The Song of the Engine",
        type: "poem",
        pageStart: 65,
        sections: {
          reading: {
            title: "The Song of the Engine",
            type: "poem",
          },
          languageInUse: {
            topics: [
              {
                name: "Rhythm",
                description: "",
              },
              {
                name: "Repetition",
                description: "",
              },
            ],
          },
        },
      },
      {
        id: "special-1",
        title: "Think, Feel, Act Section A",
        type: "special-section",
        pageStart: 68,
      },
      {
        id: "enrichment-2",
        title: "Enrichment Activities 2",
        type: "enrichment",
        pageStart: 72,
        covers: "Units 4–5",
      },
      {
        id: "revision-1",
        title: "Revision 1",
        type: "revision",
        pageStart: 76,
      },
      {
        id: "unit-6",
        title: "The Girl Who Hated Books",
        type: "unit",
        pageStart: 80,
        sections: {
          reading: {
            title: "The Girl Who Hated Books",
            type: "story",
          },
          languageInUse: {
            topics: [
              {
                name: "Present continuous tense",
                description: "",
              },
              {
                name: "Main and helping verbs",
                description: "",
              },
              {
                name: "Simple future tense",
                description: "",
              },
            ],
          },
        },
      },
      {
        id: "poem-4",
        title: "Good Books",
        type: "poem",
        pageStart: 91,
        sections: {
          reading: {
            title: "Good Books",
            type: "poem",
          },
          languageInUse: {
            topics: [
              {
                name: "Rhyme scheme",
                description: "",
              },
              {
                name: "Personification",
                description: "",
              },
            ],
          },
        },
      },
      {
        id: "unit-7",
        title: "Exploring an Underwater World",
        type: "unit",
        pageStart: 94,
        sections: {
          reading: {
            title: "Exploring an Underwater World",
            type: "story",
          },
          languageInUse: {
            topics: [
              {
                name: "Prepositions",
                description: "",
              },
            ],
          },
        },
      },
      {
        id: "poem-5",
        title: "The Sea's Treasures",
        type: "poem",
        pageStart: 104,
        sections: {
          reading: {
            title: "The Sea's Treasures",
            type: "poem",
          },
          languageInUse: {
            topics: [
              {
                name: "Alliteration",
                description: "",
              },
              {
                name: "Personification",
                description: "",
              },
            ],
          },
        },
      },
      {
        id: "enrichment-3",
        title: "Enrichment Activities 3",
        type: "enrichment",
        pageStart: 106,
        covers: "Units 6–7",
      },
      {
        id: "unit-8",
        title: "The Farmer Who Bought a Well",
        type: "unit",
        pageStart: 110,
        sections: {
          reading: {
            title: "The Farmer Who Bought a Well",
            type: "story",
          },
          languageInUse: {
            topics: [
              {
                name: "Negative forms",
                description: "",
              },
              {
                name: "Framing wh- questions",
                description: "",
              },
              {
                name: "Interjections",
                description: "",
              },
            ],
          },
        },
      },
      {
        id: "poem-6",
        title: "Bless the Farmers",
        type: "poem",
        pageStart: 121,
        sections: {
          reading: {
            title: "Bless the Farmers",
            type: "poem",
          },
          languageInUse: {
            topics: [
              {
                name: "Rhyme scheme",
                description: "",
              },
            ],
          },
        },
      },
      {
        id: "unit-9",
        title: "The Boy Who Found Grain",
        type: "unit",
        pageStart: 125,
        sections: {
          reading: {
            title: "The Boy Who Found Grain",
            type: "story",
          },
          languageInUse: {
            topics: [
              {
                name: "Adverbs of manner",
                description: "",
              },
              {
                name: "Adverbs of time",
                description: "",
              },
            ],
          },
        },
      },
      {
        id: "unit-10",
        title: "Raja's Useful Collection (play)",
        type: "unit",
        pageStart: 135,
        sections: {
          reading: {
            title: "Raja's Useful Collection",
            type: "play",
          },
          languageInUse: {
            topics: [
              {
                name: "Conjunctions",
                description: "",
              },
            ],
          },
        },
      },
      {
        id: "special-2",
        title: "Think, Feel, Act Section B",
        type: "special-section",
        pageStart: 144,
      },
      {
        id: "enrichment-4",
        title: "Enrichment Activities 4",
        type: "enrichment",
        pageStart: 148,
        covers: "Units 8–10",
      },
      {
        id: "revision-2",
        title: "Revision 2",
        type: "revision",
        pageStart: 152,
      },
      {
        id: "appendix-listening-texts",
        title: "Listening Texts",
        type: "appendix",
        pageStart: 156,
        description: "Audio transcripts for all listening activities",
      },
      {
        id: "authors-info",
        title: "About the Authors/Poets",
        type: "appendix",
        pageStart: 158,
      },
    ],
    grammarTopics: [
      "Nouns (common, proper, collective, singular/plural)",
      "Articles (a, an, the)",
      "Adjectives (quality, quantity, degrees of comparison)",
      "Pronouns (personal, possessive)",
      "Verbs (main, helping, tenses: present, past, future, continuous)",
      "Prepositions",
      "Interjections",
      "Adverbs (manner, time)",
      "Conjunctions",
      "Punctuation (comma, question mark, exclamation mark, capitalisation)",
    ],
    vocabularyCategories: [
      "Synonyms",
      "Antonyms",
      "Compound nouns",
      "Collocations",
      "Homophones",
      "Cardinal and ordinal numbers",
      "Transport words",
      "Occupations",
      "Word families",
    ],
    skillsAndCompetencies: {
      listening:
        "Progressive listening, including detail, inference, and following complex instructions",
      speaking:
        "Role-play, retelling, making requests, giving instructions, expressing opinions",
      reading:
        "Comprehension of stories/poems/plays, inference, HOTS (higher-order thinking skills)",
      writing:
        "Story sequencing, descriptive, diary, letter, flowcharts, critical and creative writing",
      pronunciation:
        "Phonics, consonant/vowel/blend sounds, recognition of stress and rhythm",
      lifeSkills: [
        "Critical thinking",
        "Empathy",
        "Self-awareness",
        "Collaboration and teamwork",
        "Coping with stress/emotions",
      ],
    },
    specialFeatures: {
      warmUp:
        "Pre-reading, value-based and creative warm-up activities in each lesson",
      enrichmentActivities:
        "Four enrichment sections for review and skill development",
      thinkFeelAct: "Two special social-emotional learning sections",
      ASL: "Integrated Assessment of Speaking and Listening section in each unit",
      revision: "Two revision modules for recap and practice",
      artIntegration: "Creative drawing and poster activities",
      enhancementBooklets:
        "Extra booklets for focused practice, accessed via QR codes",
      NCFAlignment:
        "Mapped to NCF 2023 curricular goals with project work and United Nations SDGs",
    },
  },
  {
    id: "communicate-cambridge-4",
    coverUrl: "/images/library/cambridge_english_level_4.webp",
    pdfUrl:
      "https://cermlj2dqa0j2jal.public.blob.vercel-storage.com/cambridge_english_level_4.pdf",
    pdfOffset: 11,
    bookInfo: {
      title: "Communicate with Cambridge: Coursebook 4",
      subtitle: "Enhanced Edition",
      author: "Sanjana Mulla",
      consultingEditor: "Dr CLN Prakash",
      publisher: "Cambridge University Press",
      isbn: "978-1-009-80143-0",
      edition: "Fourth Edition 2024",
      level: "Level 4",
    },
    structure: [
      {
        id: "unit-1",
        title: "The House with the Golden Windows",
        type: "unit",
        pageStart: 1,
        sections: {
          reading: {
            title: "The House with the Golden Windows",
            type: "story",
          },
          languageInUse: {
            topics: [
              {
                name: "Common nouns",
                description: "",
              },
              {
                name: "Proper nouns",
                description: "",
              },
              {
                name: "Plural nouns",
                description: "",
              },
            ],
          },
        },
      },
      {
        id: "poem-1",
        title: "Topsy-Turvy Land",
        type: "poem",
        pageStart: 12,
        sections: {
          reading: {
            title: "Topsy-Turvy Land",
            type: "poem",
          },
          languageInUse: {
            topics: [
              {
                name: "Imagery",
                description: "",
              },
              {
                name: "Rhymes",
                description: "",
              },
            ],
          },
        },
      },
      {
        id: "unit-2",
        title: "My Early Home",
        type: "unit",
        pageStart: 14,
        sections: {
          reading: {
            title: "My Early Home",
            type: "story",
          },
          languageInUse: {
            topics: [
              {
                name: "Personal pronouns",
                description: "",
              },
              {
                name: "Possessive pronouns",
                description: "",
              },
            ],
          },
        },
      },
      {
        id: "poem-2",
        title: "Choosing Their Names",
        type: "poem",
        pageStart: 25,
        sections: {
          reading: {
            title: "Choosing Their Names",
            type: "poem",
          },
          languageInUse: {
            topics: [
              {
                name: "Rhymes",
                description: "",
              },
              {
                name: "Repetition",
                description: "",
              },
            ],
          },
        },
      },
      {
        id: "enrichment-1",
        title: "Enrichment Activities 1",
        type: "enrichment",
        pageStart: 28,
        covers: "Units 1–2",
      },
      {
        id: "unit-3",
        title: "The Most Important Day",
        type: "unit",
        pageStart: 32,
        sections: {
          reading: {
            title: "The Most Important Day",
            type: "story",
          },
          languageInUse: {
            topics: [
              {
                name: "Articles: a, an, the",
                description: "",
              },
              {
                name: "Countable/uncountable nouns",
                description: "",
              },
              {
                name: "Gender of nouns",
                description: "",
              },
            ],
          },
        },
      },
      {
        id: "unit-4",
        title: "Dragon Rock",
        type: "unit",
        pageStart: 44,
        sections: {
          reading: {
            title: "Dragon Rock",
            type: "story",
          },
          languageInUse: {
            topics: [
              {
                name: "The simple present tense",
                description: "",
              },
              {
                name: "The simple past tense",
                description: "",
              },
              {
                name: "Using linkers: and, but, or, so",
                description: "",
              },
            ],
          },
        },
      },
      {
        id: "poem-3",
        title: "The Tease",
        type: "poem",
        pageStart: 58,
        sections: {
          reading: {
            title: "The Tease",
            type: "poem",
          },
          languageInUse: {
            topics: [
              {
                name: "Rhyme scheme",
                description: "",
              },
              {
                name: "Personification",
                description: "",
              },
            ],
          },
        },
      },
      {
        id: "unit-5",
        title: "Humpty Dumpty and Alice",
        type: "unit",
        pageStart: 62,
        sections: {
          reading: {
            title: "Humpty Dumpty and Alice",
            type: "story",
          },
          languageInUse: {
            topics: [
              {
                name: "The simple past tense: affirmative & negative",
                description: "",
              },
            ],
          },
        },
      },
      {
        id: "special-1",
        title: "Think, Feel, Act Section A",
        type: "special-section",
        pageStart: 75,
      },
      {
        id: "enrichment-2",
        title: "Enrichment Activities 2",
        type: "enrichment",
        pageStart: 79,
        covers: "Units 3–5",
      },
      {
        id: "revision-1",
        title: "Revision 1",
        type: "revision",
        pageStart: 83,
      },
      {
        id: "unit-6",
        title: "Irah Becomes a Flower Gardener",
        type: "unit",
        pageStart: 86,
        sections: {
          reading: {
            title: "Irah Becomes a Flower Gardener",
            type: "story",
          },
          languageInUse: {
            topics: [
              {
                name: "Prepositions of position",
                description: "",
              },
              {
                name: "Prepositions of time",
                description: "",
              },
              {
                name: "Phrasal verbs",
                description: "",
              },
            ],
          },
        },
      },
      {
        id: "poem-4",
        title: "Trees",
        type: "poem",
        pageStart: 99,
        sections: {
          reading: {
            title: "Trees",
            type: "poem",
          },
          languageInUse: {
            topics: [
              {
                name: "Imagery",
                description: "",
              },
              {
                name: "Growth cycle (art integration)",
                description: "",
              },
            ],
          },
        },
      },
      {
        id: "unit-7",
        title: "The Olympic Games",
        type: "unit",
        pageStart: 102,
        sections: {
          reading: {
            title: "The Olympic Games",
            type: "story",
          },
          languageInUse: {
            topics: [
              {
                name: "The simple future tense",
                description: "",
              },
            ],
          },
        },
      },
      {
        id: "poem-5",
        title: "One Look",
        type: "poem",
        pageStart: 110,
        sections: {
          reading: {
            title: "One Look",
            type: "poem",
          },
          languageInUse: {
            topics: [
              {
                name: "Repetition",
                description: "",
              },
            ],
          },
        },
      },
      {
        id: "enrichment-3",
        title: "Enrichment Activities 3",
        type: "enrichment",
        pageStart: 113,
        covers: "Units 6–7",
      },
      {
        id: "unit-8",
        title: "A Fairy with Horns",
        type: "unit",
        pageStart: 117,
        sections: {
          reading: {
            title: "A Fairy with Horns",
            type: "story",
          },
          languageInUse: {
            topics: [
              {
                name: "Adjectives",
                description: "",
              },
              {
                name: "Adverbs of manner, time",
                description: "",
              },
            ],
          },
        },
      },
      {
        id: "poem-6",
        title: "The Rum Tum Tugger",
        type: "poem",
        pageStart: 128,
        sections: {
          reading: {
            title: "The Rum Tum Tugger",
            type: "poem",
          },
          languageInUse: {
            topics: [
              {
                name: "Onomatopoeia",
                description: "",
              },
              {
                name: "Repetition",
                description: "",
              },
            ],
          },
        },
      },
      {
        id: "unit-9",
        title: "The Lord of the Cranes",
        type: "unit",
        pageStart: 132,
        sections: {
          reading: {
            title: "The Lord of the Cranes",
            type: "story",
          },
          languageInUse: {
            topics: [
              {
                name: "Present & past continuous tenses",
                description: "",
              },
              {
                name: "Compound adjectives",
                description: "",
              },
            ],
          },
        },
      },
      {
        id: "unit-10",
        title: "Birbal and the Washerman (play)",
        type: "unit",
        pageStart: 140,
        sections: {
          reading: {
            title: "Birbal and the Washerman",
            type: "play",
          },
          languageInUse: {
            topics: [
              {
                name: "Degrees of comparison",
                description: "",
              },
              {
                name: "Abstract nouns",
                description: "",
              },
              {
                name: "Collocations",
                description: "",
              },
            ],
          },
        },
      },
      {
        id: "special-2",
        title: "Think, Feel, Act Section B",
        type: "special-section",
        pageStart: 153,
      },
      {
        id: "enrichment-4",
        title: "Enrichment Activities 4",
        type: "enrichment",
        pageStart: 157,
        covers: "Units 8–10",
      },
      {
        id: "revision-2",
        title: "Revision 2",
        type: "revision",
        pageStart: 160,
      },
      {
        id: "appendix-listening-texts",
        title: "Listening Texts",
        type: "appendix",
        pageStart: 163,
        description: "Audio transcripts for all listening activities",
      },
      {
        id: "appendix-authors",
        title: "About the Authors/Poets",
        type: "appendix",
        pageStart: 166,
      },
    ],
    grammarTopics: [
      "Nouns (common, proper, plural, collective, gender)",
      "Pronouns (personal, possessive)",
      "Articles (a, an, the)",
      "Verbs (present tense, past tense, present/past continuous, simple future)",
      "Adjectives (kinds, degrees, compound)",
      "Adverbs (manner, time)",
      "Prepositions (position, time)",
      "Linkers (and, but, or, so)",
      "Prefixes, Suffixes, Word formation",
      "Abstract nouns",
      "Compound nouns/adjectives",
      "Collocations & phrasal verbs",
      "Tense (affirmative and negative)",
      "Punctuation (apostrophe, direct speech, commas)",
    ],
    vocabularyCategories: [
      "Synonyms",
      "Antonyms",
      "Homophones",
      "Prefixes/Suffixes",
      "Associated words",
      "Compound nouns",
      "Ways of walking",
      "Sports terms",
      "Occupation words",
      "Word meanings (multiple/figurative)",
    ],
    skillsAndCompetencies: {
      listening:
        "Critical listening, following details, aural-visual mapping, inference from audio cues",
      speaking:
        "Role-play, retelling, expressing views, giving warnings, offering advice, formal/group presentations",
      reading:
        "Comprehension (main idea, inference, value), HOTS, literary appreciation, context-based questions",
      writing:
        "Personal/diary entries, animal descriptions, story sequencing, formal letters, narrative/creative tasks",
      pronunciation:
        "Consonant/vowel blends, stress, rhythm, recognition/production of sounds",
      lifeSkills: [
        "Decision making",
        "Empathy & sympathy",
        "Self-awareness",
        "Critical thinking",
        "Collaboration",
        "Interpersonal skills",
      ],
    },
    specialFeatures: {
      warmUp: "Pre-reading, creative, and discussion-focused warm-ups",
      ASL: "Assessment of Speaking and Listening integrated with each main unit",
      enrichmentActivities: "Four enrichment modules for review and practice",
      thinkFeelAct:
        "Two life-skills sections (social-emotional learning: empathy, collaboration, global citizenship)",
      "21stCenturySkills":
        "Project-based and creative/critical skills development (SDGs alignment)",
      artIntegration: "Art/drawing/writing enhancement in select units",
      revision: "Two comprehensive revision modules",
      appendices: "Listening scripts, author bios for literary connection",
      enhancementBooklets:
        "Project-based and reading/writing skill booklets via QR",
    },
  },
  {
    id: "grammar-gear-level-1",
    coverUrl: "/images/library/grammar_gear_level_1.webp",
    pdfUrl:
      "https://cermlj2dqa0j2jal.public.blob.vercel-storage.com/grammar_gear_level_1.pdf",
    pdfOffset: 7,
    bookInfo: {
      title: "Grammar Gear 1",
      subtitle:
        "Revised Edition with Composition, Reading Comprehension and Vocabulary",
      author: "Dr C L N Prakash, Ritu Taneja",
      consultingEditor: "",
      publisher: "Cambridge University Press",
      isbn: "978-1-009-80156-0",
      edition: "Second edition 2024",
      level: "Level 1",
    },
    structure: [
      {
        id: "time-to-recall",
        title: "Time to Recall",
        type: "introductory-section",
        pageStart: 1,
        topics: [
          "a and an",
          "Position words (in, on, under, behind)",
          "Action words",
          "Describing words",
          "One and many",
        ],
      },
      {
        id: "chapter-1",
        title: "Chapter 1: Nouns",
        type: "chapter",
        pageStart: 3,
        topics: [
          "Naming words",
          "Nouns for people, places, animals, birds, things",
        ],
      },
      {
        id: "chapter-2",
        title: "Chapter 2: Nouns—Common and Proper",
        type: "chapter",
        pageStart: 9,
        topics: [
          "Common nouns",
          "Proper nouns",
          "Capital letters for proper nouns",
        ],
      },
      {
        id: "chapter-3",
        title: "Chapter 3: Nouns—Singular and Plural",
        type: "chapter",
        pageStart: 15,
        topics: ["Singular nouns", "Plural nouns", "Adding -s to form plural"],
      },
      {
        id: "chapter-4",
        title: "Chapter 4: Nouns—Gender (masculine and feminine)",
        type: "chapter",
        pageStart: 22,
        topics: [
          "Masculine gender",
          "Feminine gender",
          "Gender of people",
          "Gender of animals and birds",
        ],
      },
      {
        id: "chapter-5",
        title: "Chapter 5: Adjectives",
        type: "chapter",
        pageStart: 28,
        topics: [
          "Adjectives as describing words",
          "Using adjectives to describe nouns",
        ],
      },
      {
        id: "chapter-6",
        title: "Chapter 6: Articles—a and an",
        type: "chapter",
        pageStart: 35,
        topics: [
          "Article a (before consonant sounds)",
          "Article an (before vowel sounds)",
        ],
      },
      {
        id: "speak-well-a",
        title: "Speak Well Section A (Chapters 1–6)",
        type: "speak-well",
        pageStart: 40,
      },
      {
        id: "assessment-1",
        title: "Assessment 1 (Chapters 1–6)",
        type: "assessment",
        pageStart: 42,
      },
      {
        id: "revision-1",
        title: "Revision 1 (Chapters 1–6)",
        type: "revision",
        pageStart: 46,
      },
      {
        id: "everyday-grammar-a",
        title: "Everyday Grammar Section A (Chapters 1–6)",
        type: "everyday-grammar",
        pageStart: 48,
      },
      {
        id: "chapter-7",
        title:
          "Chapter 7: Verbs (the simple present tense and the simple past tense forms)",
        type: "chapter",
        pageStart: 51,
        topics: [
          "Action words (verbs)",
          "Simple present tense",
          "Simple past tense",
        ],
      },
      {
        id: "chapter-8",
        title: "Chapter 8: Verbs—am, is, are (as main verbs)",
        type: "chapter",
        pageStart: 58,
        topics: ["am, is, are as main verbs"],
      },
      {
        id: "chapter-9",
        title: "Chapter 9: Adverbs (ending in -ly)",
        type: "chapter",
        pageStart: 63,
        topics: ["Adverbs", "Adverbs ending in -ly"],
      },
      {
        id: "chapter-10",
        title: "Chapter 10: Pronouns (I, you, he, she, it)",
        type: "chapter",
        pageStart: 67,
        topics: ["Personal pronouns", "I, you, he, she, it"],
      },
      {
        id: "chapter-11",
        title: "Chapter 11: Conjunctions (and, but)",
        type: "chapter",
        pageStart: 70,
        topics: ["Conjunctions", "and, but"],
      },
      {
        id: "chapter-12",
        title: "Chapter 12: Prepositions (in, on, under)",
        type: "chapter",
        pageStart: 74,
        topics: ["Prepositions", "in, on, under"],
      },
      {
        id: "chapter-13",
        title: "Chapter 13: Punctuation—Capital Letters and Full Stop",
        type: "chapter",
        pageStart: 78,
        topics: ["Capital letters", "Full stop"],
      },
      {
        id: "chapter-14",
        title:
          "Chapter 14: Sentences (forming sentences using this, that, these, those)",
        type: "chapter",
        pageStart: 83,
        topics: ["Forming sentences", "Using this, that, these, those"],
      },
      {
        id: "speak-well-b",
        title: "Speak Well Section B (Chapters 7–14)",
        type: "speak-well",
        pageStart: 88,
      },
      {
        id: "assessment-2",
        title: "Assessment 2 (Chapters 7–14)",
        type: "assessment",
        pageStart: 90,
      },
      {
        id: "revision-2",
        title: "Revision 2 (Chapters 7–14)",
        type: "revision",
        pageStart: 94,
      },
      {
        id: "everyday-grammar-b",
        title: "Everyday Grammar Section B (Chapters 7–14)",
        type: "everyday-grammar",
        pageStart: 96,
      },
      {
        id: "accuracy-skills",
        title: "Accuracy Skills (Chapters 1–14)",
        type: "accuracy-skills",
        pageStart: 99,
      },
      {
        id: "vocabulary",
        title: "Vocabulary",
        type: "vocabulary",
        pageStart: 104,
      },
      {
        id: "composition",
        title: "Composition",
        type: "composition",
        pageStart: 110,
        topics: [
          "Filling in gaps",
          "Picture composition",
          "Matching parts to frame sentences",
          "Rewriting sentences",
          "Completing sentences",
        ],
      },
      {
        id: "reading-comprehension",
        title: "Reading Comprehension",
        type: "reading-comprehension",
        pageStart: 118,
        topics: ["The Lion and the Hare"],
      },
    ],
    grammarTopics: [
      "Nouns (people, places, animals, birds, things)",
      "Common and proper nouns",
      "Singular and plural nouns",
      "Gender (masculine and feminine)",
      "Adjectives (describing words)",
      "Articles (a, an)",
      "Verbs (action words)",
      "Simple present tense",
      "Simple past tense",
      "am, is, are (as main verbs)",
      "Adverbs (ending in -ly)",
      "Pronouns (I, you, he, she, it)",
      "Conjunctions (and, but)",
      "Prepositions (in, on, under)",
      "Punctuation (capital letters, full stop)",
      "Sentences (this, that, these, those)",
    ],
    vocabularyCategories: [
      "Position words",
      "Action words",
      "Describing words",
      "Family members",
      "Animals and birds",
      "Common objects",
      "Body parts",
      "Places",
      "Things",
    ],
    skillsAndCompetencies: {
      grammar: "Comprehensive grammar practice with progressive exercises",
      speaking: "Speak Well sections with role-play and dialogue practice",
      vocabulary: "Word building and contextual usage",
      composition: "Picture composition, sentence formation, gap filling",
      reading: "Reading comprehension passages with questions",
      lifeSkills: [
        "Critical thinking",
        "Communication skills",
        "Creativity",
        "Problem solving",
        "Interpersonal skills",
      ],
    },
    specialFeatures: {
      timeToRecall:
        "One introductory module for revision of pre-primary concepts",
      speakWell: "Two sections (A and B) for developing speaking skills",
      assessments: "Two comprehensive assessments covering all chapters",
      revisions: "Two revision sections with concept-based MCQs",
      everydayGrammar:
        "Two sections for contextual grammar practice and blended learning",
      accuracySkills: "Integrated grammar practice module",
      digitalContent: "QR codes for seamless learning experience",
      alignedTo: ["NEP 2020", "NCF-SE 2023"],
    },
  },
  {
    id: "grammar-gear-level-2",
    coverUrl: "/images/library/grammar_gear_level_2.webp",
    pdfUrl:
      "https://cermlj2dqa0j2jal.public.blob.vercel-storage.com/grammar_gear_level_2.pdf",
    pdfOffset: 7,
    bookInfo: {
      title: "Grammar Gear 2",
      subtitle:
        "Revised Edition with Composition, Reading Comprehension and Vocabulary",
      author: "Dr C L N Prakash, Ritu Taneja",
      consultingEditor: "",
      publisher: "Cambridge University Press",
      isbn: "978-1-009-80157-7",
      edition: "Second edition 2024",
      level: "Level 2",
    },
    structure: [
      {
        id: "chapter-1",
        title: "Chapter 1: Nouns—Common and Proper",
        type: "chapter",
        pageStart: 1,
        topics: [
          "Common nouns",
          "Proper nouns",
          "Capital letters for proper nouns",
        ],
      },
      {
        id: "chapter-2",
        title: "Chapter 2: Nouns—Countable and Uncountable",
        type: "chapter",
        pageStart: 10,
        topics: [
          "Countable nouns",
          "Uncountable nouns",
          "Measuring uncountable nouns",
        ],
      },
      {
        id: "chapter-3",
        title: "Chapter 3: Nouns—Singular and Plural",
        type: "chapter",
        pageStart: 16,
        topics: [
          "Singular and plural nouns",
          "Plural formation with -s, -es, -ies",
          "Plural formation with -f/-fe to -ves",
        ],
      },
      {
        id: "chapter-4",
        title: "Chapter 4: Nouns—Gender",
        type: "chapter",
        pageStart: 22,
        topics: [
          "Masculine gender",
          "Feminine gender",
          "Common gender",
          "Neuter gender",
        ],
      },
      {
        id: "chapter-5",
        title: "Chapter 5: Adjectives",
        type: "chapter",
        pageStart: 27,
        topics: [
          "Adjectives of quality",
          "Adjectives of number",
          "Adjectives of quantity",
        ],
      },
      {
        id: "chapter-6",
        title: "Chapter 6: Articles—a, an, the",
        type: "chapter",
        pageStart: 34,
        topics: [
          "Indefinite articles (a, an)",
          "Definite article (the)",
          "Usage with countable and uncountable nouns",
        ],
      },
      {
        id: "speak-well-a",
        title: "Speak Well Section A",
        type: "speak-well",
        pageStart: 40,
        topics: ["Chapters 1–6"],
      },
      {
        id: "assessment-1",
        title: "Assessment 1",
        type: "assessment",
        pageStart: 42,
        topics: ["Chapters 1–6"],
      },
      {
        id: "revision-1",
        title: "Revision 1",
        type: "revision",
        pageStart: 47,
        topics: ["Chapters 1–6"],
      },
      {
        id: "everyday-grammar-a",
        title: "Everyday Grammar Section A",
        type: "everyday-grammar",
        pageStart: 49,
        topics: ["Chapters 1–6"],
      },
      {
        id: "chapter-7",
        title: "Chapter 7: Main Verbs—am, is, are, was, were",
        type: "chapter",
        pageStart: 51,
        topics: [
          "Main verbs",
          "am, is, are (present tense)",
          "was, were (past tense)",
        ],
      },
      {
        id: "chapter-8",
        title: "Chapter 8: Helping Verbs—am, is, are, was, were",
        type: "chapter",
        pageStart: 57,
        topics: [
          "Helping verbs",
          "Present continuous tense",
          "Past continuous tense",
        ],
      },
      {
        id: "chapter-9",
        title: "Chapter 9: Main Verbs—has, have, had",
        type: "chapter",
        pageStart: 62,
        topics: ["Main verbs has, have, had", "Possession and ownership"],
      },
      {
        id: "chapter-10",
        title: "Chapter 10: Verbs—Tenses",
        type: "chapter",
        pageStart: 66,
        topics: [
          "Simple present tense",
          "Simple past tense",
          "Simple future tense",
        ],
      },
      {
        id: "chapter-11",
        title: "Chapter 11: Adverbs—of Manner",
        type: "chapter",
        pageStart: 74,
        topics: ["Adverbs of manner", "Formation by adding -ly"],
      },
      {
        id: "chapter-12",
        title: "Chapter 12: Pronouns",
        type: "chapter",
        pageStart: 79,
        topics: ["Personal pronouns", "I, we, you, he, she, it, they"],
      },
      {
        id: "chapter-13",
        title: "Chapter 13: Conjunctions",
        type: "chapter",
        pageStart: 84,
        topics: ["Conjunctions", "and, but, or"],
      },
      {
        id: "chapter-14",
        title: "Chapter 14: Prepositions",
        type: "chapter",
        pageStart: 89,
        topics: ["Prepositions of place", "in, on, under"],
      },
      {
        id: "chapter-15",
        title: "Chapter 15: Kinds of Sentences",
        type: "chapter",
        pageStart: 96,
        topics: ["Statements", "Questions", "Exclamatory sentences"],
      },
      {
        id: "chapter-16",
        title: "Chapter 16: Punctuation—Question Mark and Exclamation Mark",
        type: "chapter",
        pageStart: 100,
        topics: ["Question mark", "Exclamation mark"],
      },
      {
        id: "speak-well-b",
        title: "Speak Well Section B",
        type: "speak-well",
        pageStart: 104,
        topics: ["Chapters 7–16"],
      },
      {
        id: "assessment-2",
        title: "Assessment 2",
        type: "assessment",
        pageStart: 106,
        topics: ["Chapters 7–16"],
      },
      {
        id: "revision-2",
        title: "Revision 2",
        type: "revision",
        pageStart: 111,
        topics: ["Chapters 7–16"],
      },
      {
        id: "everyday-grammar-b",
        title: "Everyday Grammar Section B",
        type: "everyday-grammar",
        pageStart: 113,
        topics: ["Chapters 7–16"],
      },
      {
        id: "accuracy-skills",
        title: "Accuracy Skills",
        type: "accuracy-skills",
        pageStart: 116,
        topics: ["Chapters 1–16"],
      },
      {
        id: "vocabulary",
        title: "Vocabulary",
        type: "vocabulary",
        pageStart: 120,
        topics: ["Opposites", "Parts of the body", "Mutual dictation"],
      },
      {
        id: "composition",
        title: "Composition",
        type: "composition",
        pageStart: 125,
        topics: ["Picture composition", "Informal letters"],
      },
      {
        id: "reading-comprehension",
        title: "Reading Comprehension",
        type: "reading-comprehension",
        pageStart: 133,
      },
    ],
    grammarTopics: [
      "Common and proper nouns",
      "Countable and uncountable nouns",
      "Singular and plural nouns",
      "Gender (masculine, feminine, common, neuter)",
      "Adjectives (quality, number, quantity)",
      "Articles (a, an, the)",
      "Main verbs (am, is, are, was, were, has, have, had)",
      "Helping verbs",
      "Tenses (simple present, simple past, simple future)",
      "Adverbs of manner",
      "Pronouns (I, we, you, he, she, it, they)",
      "Conjunctions (and, but, or)",
      "Prepositions of place (in, on, under)",
      "Kinds of sentences",
      "Punctuation (question mark, exclamation mark)",
    ],
    vocabularyCategories: [
      "Opposites",
      "Parts of the body",
      "Common objects",
      "Animals and their gender",
      "Family relationships",
      "Places and locations",
    ],
    skillsAndCompetencies: {
      grammar: "Comprehensive grammar practice with exercises",
      speaking: "Speak Well sections with dialogue practice",
      vocabulary: "Word building, opposites, and contextual usage",
      composition: "Picture composition and informal letter writing",
      reading: "Reading comprehension passages with questions",
      lifeSkills: [
        "Critical thinking",
        "Communication skills",
        "Teamwork",
        "Problem solving",
        "Interpersonal skills",
      ],
    },
    specialFeatures: {
      speakWell: "Two sections (A and B) for developing speaking skills",
      assessments: "Two comprehensive assessments covering all chapters",
      revisions: "Two revision sections with MCQs",
      everydayGrammar: "Two sections for contextual grammar practice",
      accuracySkills: "Integrated grammar practice module",
      digitalContent: "QR codes for seamless learning experience",
      alignedTo: ["NEP 2020", "NCF-SE 2023"],
    },
  },
  {
    id: "grammar-gear-level-3",
    coverUrl: "/images/library/grammar_gear_level_3.webp",
    pdfUrl:
      "https://cermlj2dqa0j2jal.public.blob.vercel-storage.com/grammar_gear_level_3.pdf",
    pdfOffset: 7,
    bookInfo: {
      title: "Grammar Gear 3",
      subtitle:
        "Revised Edition with Composition, Reading Comprehension and Vocabulary",
      author: "Dr C L N Prakash, Ritu Taneja",
      consultingEditor: "",
      publisher: "Cambridge University Press",
      isbn: "978-1-009-80158-4",
      edition: "Second edition 2024",
      level: "Level 3",
    },
    structure: [
      {
        id: "chapter-1",
        title: "Chapter 1: Nouns—Collective and Abstract",
        type: "chapter",
        pageStart: 1,
        topics: [
          "Common and proper nouns (review)",
          "Collective nouns",
          "Abstract nouns",
        ],
      },
      {
        id: "chapter-2",
        title: "Chapter 2: Nouns—Singular and Plural",
        type: "chapter",
        pageStart: 11,
        topics: [
          "Singular and plural formation",
          "Plural rules with -s, -es, -ies, -ves",
          "Nouns with no change in plural",
        ],
      },
      {
        id: "chapter-3",
        title: "Chapter 3: Adjectives—of Quality, of Number and of Quantity",
        type: "chapter",
        pageStart: 17,
        topics: [
          "Adjectives of quality",
          "Adjectives of number",
          "Adjectives of quantity",
        ],
      },
      {
        id: "chapter-4",
        title: "Chapter 4: Adjectives—Demonstrative and Possessive",
        type: "chapter",
        pageStart: 23,
        topics: [
          "Demonstrative adjectives (this, that, these, those)",
          "Possessive adjectives (my, our, your, his, her, its, their)",
        ],
      },
      {
        id: "chapter-5",
        title: "Chapter 5: Forming Adjectives",
        type: "chapter",
        pageStart: 30,
        topics: [
          "Forming adjectives from nouns",
          "Forming adjectives from verbs",
        ],
      },
      {
        id: "chapter-6",
        title: "Chapter 6: Articles—a, an, the",
        type: "chapter",
        pageStart: 34,
        topics: [
          "Indefinite articles (a, an)",
          "Definite article (the)",
          "Uses of articles",
        ],
      },
      {
        id: "chapter-7",
        title: "Chapter 7: Verbs",
        type: "chapter",
        pageStart: 42,
        topics: [
          "Main verbs (is, am, are, was, were, has, have, had)",
          "Helping verbs (is, am, are, was, were)",
          "Regular and irregular verbs",
        ],
      },
      {
        id: "chapter-8",
        title: "Chapter 8: Verbs—The Simple Tenses",
        type: "chapter",
        pageStart: 49,
        topics: [
          "Simple present tense",
          "Simple past tense",
          "Simple future tense",
        ],
      },
      {
        id: "chapter-9",
        title: "Chapter 9: Adverbs—of Manner, of Time and of Place",
        type: "chapter",
        pageStart: 54,
        topics: ["Adverbs of manner", "Adverbs of time", "Adverbs of place"],
      },
      {
        id: "chapter-10",
        title: "Chapter 10: Pronouns—Personal and Demonstrative",
        type: "chapter",
        pageStart: 60,
        topics: ["Personal pronouns", "Demonstrative pronouns"],
      },
      {
        id: "speak-well-a",
        title: "Speak Well Section A (Chapters 1–10)",
        type: "speak-well",
        pageStart: 67,
      },
      {
        id: "assessment-1",
        title: "Assessment 1 (Chapters 1–10)",
        type: "assessment",
        pageStart: 69,
      },
      {
        id: "revision-1",
        title: "Revision 1 (Chapters 1–10)",
        type: "revision",
        pageStart: 73,
      },
      {
        id: "everyday-grammar-a",
        title: "Everyday Grammar Section A (Chapters 1–10)",
        type: "everyday-grammar",
        pageStart: 75,
      },
      {
        id: "chapter-11",
        title: "Chapter 11: Conjunctions",
        type: "chapter",
        pageStart: 78,
        topics: ["and, or, but", "because", "so", "though", "as"],
      },
      {
        id: "chapter-12",
        title: "Chapter 12: Interjection",
        type: "chapter",
        pageStart: 85,
        topics: ["Interjections", "Position of interjections"],
      },
      {
        id: "chapter-13",
        title: "Chapter 13: Prepositions—of Place and of Time",
        type: "chapter",
        pageStart: 89,
        topics: [
          "at as preposition of place and time",
          "in as preposition of place and time",
          "on as preposition of place and time",
        ],
      },
      {
        id: "chapter-14",
        title: "Chapter 14: Punctuation",
        type: "chapter",
        pageStart: 97,
        topics: ["The comma", "The apostrophe"],
      },
      {
        id: "chapter-15",
        title: "Chapter 15: Kinds of Sentences",
        type: "chapter",
        pageStart: 102,
        topics: [
          "Declarative sentences",
          "Interrogative sentences",
          "Imperative sentences",
          "Exclamatory sentences",
        ],
      },
      {
        id: "chapter-16",
        title: "Chapter 16: Sentences—Affirmative and Negative",
        type: "chapter",
        pageStart: 105,
        topics: ["Affirmative sentences", "Negative sentences"],
      },
      {
        id: "chapter-17",
        title: "Chapter 17: Sentences—Subject and Predicate",
        type: "chapter",
        pageStart: 108,
        topics: ["Subject", "Predicate"],
      },
      {
        id: "speak-well-b",
        title: "Speak Well Section B (Chapters 11–17)",
        type: "speak-well",
        pageStart: 112,
      },
      {
        id: "assessment-2",
        title: "Assessment 2 (Chapters 11–17)",
        type: "assessment",
        pageStart: 114,
      },
      {
        id: "revision-2",
        title: "Revision 2 (Chapters 11–17)",
        type: "revision",
        pageStart: 118,
      },
      {
        id: "everyday-grammar-b",
        title: "Everyday Grammar Section B (Chapters 11–17)",
        type: "everyday-grammar",
        pageStart: 120,
      },
      {
        id: "accuracy-skills",
        title: "Accuracy Skills (Chapters 1–17)",
        type: "accuracy-skills",
        pageStart: 123,
      },
      {
        id: "vocabulary",
        title: "Vocabulary",
        type: "vocabulary",
        pageStart: 125,
        topics: [
          "Synonyms",
          "Antonyms",
          "Homophones",
          "Compound words",
          "Mutual dictation",
        ],
      },
      {
        id: "composition",
        title: "Composition",
        type: "composition",
        pageStart: 132,
        topics: ["Paragraph writing", "Story writing", "Informal letters"],
      },
      {
        id: "reading-comprehension",
        title: "Reading Comprehension",
        type: "reading-comprehension",
        pageStart: 141,
        topics: ["Passage - The History of Chocolate", "Poem"],
      },
    ],
    grammarTopics: [
      "Collective and abstract nouns",
      "Singular and plural nouns",
      "Adjectives (quality, number, quantity, demonstrative, possessive)",
      "Forming adjectives from nouns and verbs",
      "Articles (a, an, the)",
      "Verbs (main, helping, regular, irregular)",
      "Simple tenses (present, past, future)",
      "Adverbs (manner, time, place)",
      "Pronouns (personal, demonstrative)",
      "Conjunctions (and, or, but, because, so, though, as)",
      "Interjections",
      "Prepositions of place and time (at, in, on)",
      "Punctuation (comma, apostrophe)",
      "Kinds of sentences (declarative, interrogative, imperative, exclamatory)",
      "Affirmative and negative sentences",
      "Subject and predicate",
    ],
    vocabularyCategories: [
      "Synonyms",
      "Antonyms",
      "Homophones",
      "Compound words",
      "Collective nouns",
      "Abstract nouns",
      "Body parts",
      "Places and locations",
      "Animals and their groups",
    ],
    skillsAndCompetencies: {
      grammar: "Comprehensive grammar practice with progressive exercises",
      speaking: "Speak Well sections with role-play and dialogue practice",
      vocabulary:
        "Word building, synonyms, antonyms, homophones, compound words",
      composition: "Paragraph writing, story writing, informal letter writing",
      reading: "Reading comprehension passages and poems with questions",
      lifeSkills: [
        "Critical thinking",
        "Communication skills",
        "Creativity",
        "Collaboration",
        "Problem solving",
        "Interpersonal skills",
      ],
    },
    specialFeatures: {
      speakWell:
        "Two sections (A and B) for developing speaking and communication skills",
      assessments: "Two comprehensive assessments covering all chapters",
      revisions: "Two revision sections with concept-based MCQs",
      everydayGrammar:
        "Two sections for contextual grammar practice and blended learning",
      accuracySkills: "Integrated grammar practice module",
      digitalContent: "QR codes for seamless learning experience",
      alignedTo: ["NEP 2020", "NCF-SE 2023"],
    },
  },
  {
    id: "grammar-gear-level-4",
    coverUrl: "/images/library/grammar_gear_level_4.webp",
    pdfUrl:
      "https://cermlj2dqa0j2jal.public.blob.vercel-storage.com/grammar_gear_level_4.pdf",
    pdfOffset: 7,
    bookInfo: {
      title: "Grammar Gear 4",
      subtitle:
        "Revised Edition with Composition, Reading Comprehension and Vocabulary",
      author: "Dr C L N Prakash, Ritu Taneja",
      consultingEditor: "",
      publisher: "Cambridge University Press",
      isbn: "978-1-009-80159-1",
      edition: "Second edition 2024",
      level: "Level 4",
    },
    structure: [
      {
        id: "chapter-1",
        title: "Chapter 1: Possessive Form of Nouns",
        type: "chapter",
        pageStart: 1,
        topics: [
          "Possessive form of singular nouns",
          "Possessive form of plural nouns",
          "Apostrophe usage",
        ],
      },
      {
        id: "chapter-2",
        title: "Chapter 2: Nouns—Singular and Plural",
        type: "chapter",
        pageStart: 6,
        topics: [
          "Regular plural formation",
          "Irregular plurals",
          "Nouns with same singular and plural forms",
        ],
      },
      {
        id: "chapter-3",
        title: "Chapter 3: Nouns—Kinds and Gender",
        type: "chapter",
        pageStart: 12,
        topics: [
          "Common and proper nouns",
          "Collective nouns",
          "Abstract nouns",
          "Countable and uncountable nouns",
          "Gender (masculine, feminine, common, neuter)",
        ],
      },
      {
        id: "chapter-4",
        title: "Chapter 4: Adjectives—Kinds and Formation",
        type: "chapter",
        pageStart: 20,
        topics: [
          "Adjectives of quality",
          "Adjectives of number",
          "Adjectives of quantity",
          "Demonstrative adjectives",
          "Possessive adjectives",
          "Formation of adjectives",
        ],
      },
      {
        id: "chapter-5",
        title: "Chapter 5: Adjectives—Degrees of Comparison",
        type: "chapter",
        pageStart: 26,
        topics: [
          "Positive degree",
          "Comparative degree",
          "Superlative degree",
          "Formation of degrees",
        ],
      },
      {
        id: "speak-well-a",
        title: "Speak Well Section A (Chapters 1–5)",
        type: "speak-well",
        pageStart: 34,
      },
      {
        id: "chapter-6",
        title: "Chapter 6: Articles",
        type: "chapter",
        pageStart: 36,
        topics: [
          "Indefinite articles (a, an)",
          "Definite article (the)",
          "Uses of articles",
        ],
      },
      {
        id: "chapter-7",
        title: "Chapter 7: Verbs—Irregular and Helping",
        type: "chapter",
        pageStart: 43,
        topics: ["Regular verbs", "Irregular verbs", "Helping verbs"],
      },
      {
        id: "chapter-8",
        title: "Chapter 8: Modals as Helping Verbs",
        type: "chapter",
        pageStart: 50,
        topics: [
          "Modal verbs",
          "can, could, may, might, must, shall, should, will, would",
        ],
      },
      {
        id: "chapter-9",
        title: "Chapter 9: Verbs—The Continuous Tenses",
        type: "chapter",
        pageStart: 54,
        topics: [
          "Present continuous tense",
          "Past continuous tense",
          "Future continuous tense",
        ],
      },
      {
        id: "chapter-10",
        title: "Chapter 10: Verbs—The Simple and Continuous Tenses",
        type: "chapter",
        pageStart: 61,
        topics: [
          "Simple present vs present continuous",
          "Simple past vs past continuous",
          "Simple future vs future continuous",
        ],
      },
      {
        id: "speak-well-b",
        title: "Speak Well Section B (Chapters 6–10)",
        type: "speak-well",
        pageStart: 70,
      },
      {
        id: "assessment-1",
        title: "Assessment 1 (Chapters 1–10)",
        type: "assessment",
        pageStart: 72,
      },
      {
        id: "revision-1",
        title: "Revision 1 (Chapters 1–10)",
        type: "revision",
        pageStart: 76,
      },
      {
        id: "everyday-grammar-a",
        title: "Everyday Grammar Section A (Chapters 1–10)",
        type: "everyday-grammar",
        pageStart: 78,
      },
      {
        id: "chapter-11",
        title: "Chapter 11: Adverbs—Kinds",
        type: "chapter",
        pageStart: 81,
        topics: [
          "Adverbs of manner",
          "Adverbs of place",
          "Adverbs of time",
          "Adverbs of frequency",
          "Adverbs of degree",
        ],
      },
      {
        id: "chapter-12",
        title: "Chapter 12: Adverbs—Formation",
        type: "chapter",
        pageStart: 88,
        topics: ["Forming adverbs from adjectives", "Adverbs ending in -ly"],
      },
      {
        id: "chapter-13",
        title: "Chapter 13: Pronouns—Possessive and Interrogative",
        type: "chapter",
        pageStart: 91,
        topics: [
          "Possessive pronouns",
          "Interrogative pronouns (who, whom, whose, which, what)",
        ],
      },
      {
        id: "chapter-14",
        title: "Chapter 14: Conjunctions",
        type: "chapter",
        pageStart: 97,
        topics: [
          "Coordinating conjunctions (and, but, or, nor, for, yet, so)",
          "Uses of conjunctions",
        ],
      },
      {
        id: "chapter-15",
        title: "Chapter 15: Prepositions—of Time, of Position, of Direction",
        type: "chapter",
        pageStart: 104,
        topics: [
          "Prepositions of time (at, in, on, from, to)",
          "Prepositions of position (in, on, at, by, beside, between)",
          "Prepositions of direction (to, into, through, across)",
        ],
      },
      {
        id: "chapter-16",
        title: "Chapter 16: Punctuation",
        type: "chapter",
        pageStart: 110,
        topics: [
          "Capital letters",
          "Full stop",
          "Comma",
          "Question mark",
          "Exclamation mark",
          "Apostrophe",
        ],
      },
      {
        id: "chapter-17",
        title: "Chapter 17: Subject–verb Agreement",
        type: "chapter",
        pageStart: 114,
        topics: [
          "Agreement with singular and plural subjects",
          "Agreement with compound subjects",
          "Agreement with indefinite pronouns",
        ],
      },
      {
        id: "chapter-18",
        title: "Chapter 18: Kinds of Sentences",
        type: "chapter",
        pageStart: 120,
        topics: [
          "Declarative sentences",
          "Interrogative sentences",
          "Imperative sentences",
          "Exclamatory sentences",
        ],
      },
      {
        id: "chapter-19",
        title: "Chapter 19: Sentence—Subject, Predicate, and Object",
        type: "chapter",
        pageStart: 127,
        topics: ["Subject", "Predicate", "Object"],
      },
      {
        id: "chapter-20",
        title: "Chapter 20: Sentences—Simple and Compound",
        type: "chapter",
        pageStart: 132,
        topics: [
          "Simple sentences",
          "Compound sentences",
          "Joining simple sentences with conjunctions",
        ],
      },
      {
        id: "speak-well-c",
        title: "Speak Well Section C (Chapters 11–20)",
        type: "speak-well",
        pageStart: 137,
      },
      {
        id: "assessment-2",
        title: "Assessment 2 (Chapters 11–20)",
        type: "assessment",
        pageStart: 139,
      },
      {
        id: "revision-2",
        title: "Revision 2 (Chapters 11–20)",
        type: "revision",
        pageStart: 144,
      },
      {
        id: "everyday-grammar-b",
        title: "Everyday Grammar Section B (Chapters 11–20)",
        type: "everyday-grammar",
        pageStart: 146,
      },
      {
        id: "accuracy-skills",
        title: "Accuracy Skills (Chapters 1–20)",
        type: "accuracy-skills",
        pageStart: 149,
      },
      {
        id: "vocabulary",
        title: "Vocabulary",
        type: "vocabulary",
        pageStart: 152,
        topics: ["Synonyms", "Antonyms", "Homophones", "Word formation"],
      },
      {
        id: "composition",
        title: "Composition",
        type: "composition",
        pageStart: 158,
        topics: [
          "Paragraph writing",
          "Story writing",
          "Letter writing",
          "Pre-composition and post-composition tasks",
        ],
      },
      {
        id: "comprehension",
        title: "Comprehension",
        type: "comprehension",
        pageStart: 167,
        topics: ["Reading comprehension passages", "Poems"],
      },
    ],
    grammarTopics: [
      "Possessive form of nouns",
      "Singular and plural nouns (regular and irregular)",
      "Kinds of nouns (common, proper, collective, abstract)",
      "Countable and uncountable nouns",
      "Gender (masculine, feminine, common, neuter)",
      "Adjectives (kinds, formation, degrees of comparison)",
      "Articles (a, an, the)",
      "Verbs (regular, irregular, helping verbs, modals)",
      "Tenses (simple and continuous)",
      "Adverbs (kinds and formation)",
      "Pronouns (possessive and interrogative)",
      "Conjunctions (coordinating)",
      "Prepositions (time, position, direction)",
      "Punctuation",
      "Subject-verb agreement",
      "Kinds of sentences",
      "Subject, predicate, and object",
      "Simple and compound sentences",
    ],
    vocabularyCategories: [
      "Synonyms",
      "Antonyms",
      "Homophones",
      "Word formation",
      "Collective nouns",
      "Abstract nouns",
      "Gender terms",
      "Prepositions",
      "Conjunctions",
    ],
    skillsAndCompetencies: {
      grammar: "Comprehensive grammar practice with progressive exercises",
      speaking: "Speak Well sections (3) with role-play and dialogue practice",
      vocabulary: "Word building, synonyms, antonyms, homophones",
      composition:
        "Paragraph writing, story writing, letter writing with pre and post tasks",
      reading: "Reading comprehension passages and poems with questions",
      lifeSkills: [
        "Critical thinking",
        "Communication skills",
        "Creativity",
        "Collaboration",
        "Problem solving",
        "Interpersonal skills",
      ],
    },
    specialFeatures: {
      speakWell:
        "Three sections (A, B, C) for developing speaking and communication skills",
      assessments: "Two comprehensive assessments covering all chapters",
      revisions: "Two revision sections with concept-based MCQs",
      everydayGrammar:
        "Two sections for contextual grammar practice and blended learning",
      accuracySkills: "Integrated grammar practice module",
      digitalContent: "QR codes for seamless learning experience",
      alignedTo: ["NEP 2020", "NCF-SE 2023"],
    },
  },
];
