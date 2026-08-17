import {
  AssessmentCycle,
  PrismaClient,
} from "../generated/prisma/index.js";
import { assertAdditiveLocalSeedAllowed } from "./seed-safety.js";

interface TopicData {
  serialNumber: string;
  title: string;
  cycle: Exclude<AssessmentCycle, "PRE_ASSESSMENT">;
  subtopics?: TopicData[];
}

interface SyllabusData {
  academicLevelCode: string;
  name: string;
  description: string;
  topics: TopicData[];
}

// Primary A Syllabus Data
const primaryASyllabus: SyllabusData = {
  academicLevelCode: "PRIMARY_A",
  name: "Primary A Complete Syllabus",
  description: "Complete syllabus for Primary A level",
  topics: [
    {
      serialNumber: "1",
      title: "Pattern Writing",
      cycle: AssessmentCycle.SA_1,
    },
    {
      serialNumber: "2",
      title: "Introduction to Letters (A-F)",
      cycle: AssessmentCycle.SA_1,
    },
    {
      serialNumber: "3",
      title: "Number & Number names",
      cycle: AssessmentCycle.SA_1,
    },
    {
      serialNumber: "4",
      title: "Comparisons",
      cycle: AssessmentCycle.SA_1,
      subtopics: [
        {
          serialNumber: "4.1",
          title: "Big and Small",
          cycle: AssessmentCycle.SA_1,
        },
        {
          serialNumber: "4.2",
          title: "Tall and Short",
          cycle: AssessmentCycle.SA_1,
        },
        {
          serialNumber: "4.3",
          title: "More and Less",
          cycle: AssessmentCycle.SA_1,
        },
        {
          serialNumber: "4.4",
          title: "Light and Heavy",
          cycle: AssessmentCycle.SA_1,
        },
        {
          serialNumber: "4.5",
          title: "Long and Short",
          cycle: AssessmentCycle.SA_1,
        },
      ],
    },
    {
      serialNumber: "5",
      title: "Introduction to Letters (N-T)",
      cycle: AssessmentCycle.SA_2,
    },
    {
      serialNumber: "6",
      title: "Comparisons: inside/outside, before-after, full-empty, far-near",
      cycle: AssessmentCycle.SA_2,
    },
    {
      serialNumber: "7",
      title: "Shapes",
      cycle: AssessmentCycle.SA_2,
    },
    {
      serialNumber: "8",
      title: "Numbers & number names: 20-40",
      cycle: AssessmentCycle.SA_2,
    },
    {
      serialNumber: "9",
      title: "My school",
      cycle: AssessmentCycle.SA_2,
    },
    {
      serialNumber: "10",
      title: "My body",
      cycle: AssessmentCycle.SA_2,
    },
    {
      serialNumber: "11",
      title: "Seasons",
      cycle: AssessmentCycle.SA_2,
    },
    {
      serialNumber: "12",
      title: "Parts of plants",
      cycle: AssessmentCycle.SA_2,
    },
    {
      serialNumber: "13",
      title: "Story: The Hare & Tortoise",
      cycle: AssessmentCycle.SA_2,
    },
    {
      serialNumber: "14",
      title: "Story: The Lion & Mouse",
      cycle: AssessmentCycle.SA_2,
    },
    {
      serialNumber: "15",
      title: "Story: The Thirsty crow",
      cycle: AssessmentCycle.SA_2,
    },
    {
      serialNumber: "16",
      title: "Rhymes",
      cycle: AssessmentCycle.SA_2,
      subtopics: [
        {
          serialNumber: "16.1",
          title: "Humpty Dumpty",
          cycle: AssessmentCycle.SA_2,
        },
        {
          serialNumber: "16.2",
          title: "Teddy bear, teddy bear",
          cycle: AssessmentCycle.SA_2,
        },
        {
          serialNumber: "16.3",
          title: "Put your left hand",
          cycle: AssessmentCycle.SA_2,
        },
      ],
    },
    {
      serialNumber: "17",
      title: "Introduction to Letters (T-Z)",
      cycle: AssessmentCycle.SA_3,
    },
    {
      serialNumber: "18",
      title: "Phonic Drill",
      cycle: AssessmentCycle.SA_3,
    },
    {
      serialNumber: "19",
      title: "Vowels & consonants",
      cycle: AssessmentCycle.SA_3,
    },
    {
      serialNumber: "20",
      title: "Numbers & number names: 41-50",
      cycle: AssessmentCycle.SA_3,
    },
    {
      serialNumber: "21",
      title: "Animals",
      cycle: AssessmentCycle.SA_3,
    },
    {
      serialNumber: "22",
      title: "Domestic Animals",
      cycle: AssessmentCycle.SA_3,
    },
    {
      serialNumber: "23",
      title: "Pet Animals",
      cycle: AssessmentCycle.SA_3,
    },
    {
      serialNumber: "24",
      title: "Good habits",
      cycle: AssessmentCycle.SA_3,
    },
    {
      serialNumber: "25",
      title: "Story: The dove and the ant",
      cycle: AssessmentCycle.SA_3,
    },
    {
      serialNumber: "26",
      title: "Story: The greedy dog",
      cycle: AssessmentCycle.SA_3,
    },
    {
      serialNumber: "27",
      title: "Rhymes",
      cycle: AssessmentCycle.SA_3,
      subtopics: [
        {
          serialNumber: "27.1",
          title: "Chubby Cheeks, Dimple Chin",
          cycle: AssessmentCycle.SA_3,
        },
        {
          serialNumber: "27.2",
          title: "Hop a little, jump a little, one two three",
          cycle: AssessmentCycle.SA_3,
        },
      ],
    },
  ],
};

// Primary B Syllabus Data
const primaryBSyllabus: SyllabusData = {
  academicLevelCode: "PRIMARY_B",
  name: "Primary B Complete Syllabus",
  description: "Complete syllabus for Primary B level",
  topics: [
    {
      serialNumber: "1",
      title: "Phonics Drill: Vowels",
      cycle: AssessmentCycle.SA_1,
    },
    {
      serialNumber: "2",
      title: "Blends: (cl, pl, gr, br, ch, sh)",
      cycle: AssessmentCycle.SA_1,
    },
    {
      serialNumber: "3",
      title: "Comparisons",
      cycle: AssessmentCycle.SA_1,
    },
    {
      serialNumber: "4",
      title: "Rhyming words",
      cycle: AssessmentCycle.SA_1,
    },
    {
      serialNumber: "5",
      title: "Numbers 1 to 50",
      cycle: AssessmentCycle.SA_1,
    },
    {
      serialNumber: "6",
      title: "Count and write",
      cycle: AssessmentCycle.SA_1,
    },
    {
      serialNumber: "7",
      title: "Ordinals",
      cycle: AssessmentCycle.SA_1,
    },
    {
      serialNumber: "8",
      title: "Before-After",
      cycle: AssessmentCycle.SA_1,
    },
    {
      serialNumber: "9",
      title: "Between",
      cycle: AssessmentCycle.SA_1,
    },
    {
      serialNumber: "10",
      title: "Increasing Order",
      cycle: AssessmentCycle.SA_1,
    },
    {
      serialNumber: "11",
      title: "Decreasing Order",
      cycle: AssessmentCycle.SA_1,
    },
    {
      serialNumber: "12",
      title: "Greater than and less than",
      cycle: AssessmentCycle.SA_1,
    },
    {
      serialNumber: "13",
      title: "Equal",
      cycle: AssessmentCycle.SA_1,
    },
    {
      serialNumber: "14",
      title: "Patterns",
      cycle: AssessmentCycle.SA_1,
    },
    {
      serialNumber: "15",
      title: "Number and Number Names",
      cycle: AssessmentCycle.SA_1,
    },
    {
      serialNumber: "16",
      title: "Pairing",
      cycle: AssessmentCycle.SA_1,
    },
    {
      serialNumber: "17",
      title: "Picture Reading",
      cycle: AssessmentCycle.SA_1,
    },
    {
      serialNumber: "18",
      title: "Action Words",
      cycle: AssessmentCycle.SA_1,
    },
    {
      serialNumber: "19",
      title: "Odd One Out",
      cycle: AssessmentCycle.SA_1,
    },
    {
      serialNumber: "20",
      title: "Picture Story",
      cycle: AssessmentCycle.SA_1,
    },
    {
      serialNumber: "21",
      title: "Days of the Week",
      cycle: AssessmentCycle.SA_1,
    },
    {
      serialNumber: "22",
      title: "Months of the Year",
      cycle: AssessmentCycle.SA_1,
    },
    {
      serialNumber: "23",
      title: "Shapes",
      cycle: AssessmentCycle.SA_2,
    },
    {
      serialNumber: "24",
      title: "Animals",
      cycle: AssessmentCycle.SA_2,
    },
    {
      serialNumber: "25",
      title: "Animals and their young ones",
      cycle: AssessmentCycle.SA_2,
    },
    {
      serialNumber: "26",
      title: "Animals and their Homes",
      cycle: AssessmentCycle.SA_2,
    },
    {
      serialNumber: "27",
      title: "Plants",
      cycle: AssessmentCycle.SA_2,
    },
    {
      serialNumber: "28",
      title: "Our National Symbols",
      cycle: AssessmentCycle.SA_2,
    },
    {
      serialNumber: "29",
      title: "Our National Leaders",
      cycle: AssessmentCycle.SA_2,
    },
    {
      serialNumber: "30",
      title: "Fruits",
      cycle: AssessmentCycle.SA_2,
    },
    {
      serialNumber: "31",
      title: "Flowers",
      cycle: AssessmentCycle.SA_2,
    },
    {
      serialNumber: "32",
      title: "Vegetables",
      cycle: AssessmentCycle.SA_2,
    },
    {
      serialNumber: "33",
      title: "Vehicles",
      cycle: AssessmentCycle.SA_2,
    },
    {
      serialNumber: "34",
      title: "Important days",
      cycle: AssessmentCycle.SA_2,
    },
    {
      serialNumber: "35",
      title: "Festivals",
      cycle: AssessmentCycle.SA_2,
    },
    {
      serialNumber: "36",
      title: "Our Country - India",
      cycle: AssessmentCycle.SA_2,
    },
    {
      serialNumber: "37",
      title: "People of India",
      cycle: AssessmentCycle.SA_2,
    },
    {
      serialNumber: "38",
      title: "States of India",
      cycle: AssessmentCycle.SA_2,
    },
    {
      serialNumber: "39",
      title: "Story: The camel and the Jackal",
      cycle: AssessmentCycle.SA_2,
    },
    {
      serialNumber: "40",
      title: "Story: The fox and the Grapes",
      cycle: AssessmentCycle.SA_2,
    },
    {
      serialNumber: "41",
      title: "Rhymes: Days of the Week",
      cycle: AssessmentCycle.SA_2,
    },
    {
      serialNumber: "42",
      title: "Rhymes: Tooth Brush",
      cycle: AssessmentCycle.SA_2,
    },
    {
      serialNumber: "43",
      title: "Rhymes: Wheels of the Bus",
      cycle: AssessmentCycle.SA_2,
    },
    {
      serialNumber: "44",
      title: "A and AN",
      cycle: AssessmentCycle.SA_3,
    },
    {
      serialNumber: "45",
      title: "Positions",
      cycle: AssessmentCycle.SA_3,
    },
    {
      serialNumber: "46",
      title: "One & many",
      cycle: AssessmentCycle.SA_3,
    },
    {
      serialNumber: "47",
      title: "This, That, These & Those",
      cycle: AssessmentCycle.SA_3,
    },
    {
      serialNumber: "48",
      title: "Food",
      cycle: AssessmentCycle.SA_3,
    },
    {
      serialNumber: "49",
      title: "Our Helpers",
      cycle: AssessmentCycle.SA_3,
    },
    {
      serialNumber: "50",
      title: "Living Things",
      cycle: AssessmentCycle.SA_3,
    },
    {
      serialNumber: "51",
      title: "Good Habits",
      cycle: AssessmentCycle.SA_3,
    },
    {
      serialNumber: "52",
      title: "Traffic Signal",
      cycle: AssessmentCycle.SA_3,
    },
    {
      serialNumber: "53",
      title: "Road Safety",
      cycle: AssessmentCycle.SA_3,
    },
    {
      serialNumber: "54",
      title: "Magic words",
      cycle: AssessmentCycle.SA_3,
    },
    {
      serialNumber: "55",
      title: "My computer",
      cycle: AssessmentCycle.SA_3,
    },
    {
      serialNumber: "56",
      title: "Planets",
      cycle: AssessmentCycle.SA_3,
    },
    {
      serialNumber: "57",
      title: "Story: The milkmaid's dreams",
      cycle: AssessmentCycle.SA_3,
    },
    {
      serialNumber: "58",
      title: "Story: The truthful woodcutter",
      cycle: AssessmentCycle.SA_3,
    },
    {
      serialNumber: "59",
      title: "Rhymes: Ten little fingers",
      cycle: AssessmentCycle.SA_3,
    },
    {
      serialNumber: "60",
      title: "Rhymes: Thank you God",
      cycle: AssessmentCycle.SA_3,
    },
  ],
};

// Level 1 Syllabus Data
const level1Syllabus: SyllabusData = {
  academicLevelCode: "LEVEL_1",
  name: "Level 1 Complete Syllabus",
  description: "Complete syllabus for Level 1",
  topics: [
    {
      serialNumber: "1",
      title: "Communicate with Cambridge",
      cycle: AssessmentCycle.SA_1,
      subtopics: [
        {
          serialNumber: "1.1",
          title: "Manu and His Family",
          cycle: AssessmentCycle.SA_1,
        },
        {
          serialNumber: "1.2",
          title: "Friends in the Park",
          cycle: AssessmentCycle.SA_1,
        },
        {
          serialNumber: "1.3",
          title: "At the Zoo",
          cycle: AssessmentCycle.SA_1,
        },
      ],
    },
    {
      serialNumber: "2",
      title: "Poem",
      cycle: AssessmentCycle.SA_1,
      subtopics: [
        {
          serialNumber: "2.1",
          title: "All of Me",
          cycle: AssessmentCycle.SA_1,
        },
        {
          serialNumber: "2.2",
          title: "At the School",
          cycle: AssessmentCycle.SA_1,
        },
        {
          serialNumber: "2.3",
          title: "Mr Caterpillar",
          cycle: AssessmentCycle.SA_1,
        },
      ],
    },
    {
      serialNumber: "3",
      title: "Grammar Gear",
      cycle: AssessmentCycle.SA_1,
      subtopics: [
        { serialNumber: "3.1", title: "Nouns", cycle: AssessmentCycle.SA_1 },
        {
          serialNumber: "3.2",
          title: "Nouns: Proper and Common Nouns",
          cycle: AssessmentCycle.SA_1,
        },
        {
          serialNumber: "3.3",
          title: "Nouns: Singular and Plural",
          cycle: AssessmentCycle.SA_1,
        },
        {
          serialNumber: "3.4",
          title: "Nouns: Gender (Masculine and Feminine)",
          cycle: AssessmentCycle.SA_1,
        },
        {
          serialNumber: "3.5",
          title: "Adjectives",
          cycle: AssessmentCycle.SA_1,
        },
        {
          serialNumber: "3.6",
          title: "Vocabulary",
          cycle: AssessmentCycle.SA_1,
        },
      ],
    },
    {
      serialNumber: "4",
      title: "Communicate with Cambridge",
      cycle: AssessmentCycle.SA_2,
      subtopics: [
        {
          serialNumber: "4.1",
          title: "My Red Bicycle",
          cycle: AssessmentCycle.SA_2,
        },
        {
          serialNumber: "4.2",
          title: "Hide and Sleep",
          cycle: AssessmentCycle.SA_2,
        },
        {
          serialNumber: "4.3",
          title: "The Magic tree",
          cycle: AssessmentCycle.SA_2,
        },
      ],
    },
    {
      serialNumber: "5",
      title: "Poem",
      cycle: AssessmentCycle.SA_2,
      subtopics: [
        {
          serialNumber: "5.1",
          title: "A Child's Song",
          cycle: AssessmentCycle.SA_2,
        },
      ],
    },
    {
      serialNumber: "6",
      title: "Grammar Gear",
      cycle: AssessmentCycle.SA_2,
      subtopics: [
        {
          serialNumber: "6.1",
          title: "Articles-a and an",
          cycle: AssessmentCycle.SA_2,
        },
        {
          serialNumber: "6.2",
          title: "Verbs: Simple present and Simple past tense forms",
          cycle: AssessmentCycle.SA_2,
        },
        {
          serialNumber: "6.3",
          title: "Verbs - Am, Is, Are (Main verbs)",
          cycle: AssessmentCycle.SA_2,
        },
        {
          serialNumber: "6.4",
          title: "Adverbs: Ending in ly",
          cycle: AssessmentCycle.SA_2,
        },
        { serialNumber: "6.5", title: "Pronouns", cycle: AssessmentCycle.SA_2 },
        {
          serialNumber: "6.6",
          title: "Composition",
          cycle: AssessmentCycle.SA_2,
        },
      ],
    },
    {
      serialNumber: "7",
      title: "Speaking Topics",
      cycle: AssessmentCycle.SA_2,
      subtopics: [
        {
          serialNumber: "7.1",
          title: "My favourite sports & sportperson",
          cycle: AssessmentCycle.SA_2,
        },
        {
          serialNumber: "7.2",
          title: "My school & favourite teacher",
          cycle: AssessmentCycle.SA_2,
        },
      ],
    },
    {
      serialNumber: "8",
      title: "Communicate with Cambridge",
      cycle: AssessmentCycle.SA_3,
      subtopics: [
        {
          serialNumber: "8.1",
          title: "The Red Raincoat",
          cycle: AssessmentCycle.SA_3,
        },
        {
          serialNumber: "8.2",
          title: "King Lion and Rabbit",
          cycle: AssessmentCycle.SA_3,
        },
        {
          serialNumber: "8.3",
          title: "The Poor Woodcutter",
          cycle: AssessmentCycle.SA_3,
        },
      ],
    },
    {
      serialNumber: "9",
      title: "Poem",
      cycle: AssessmentCycle.SA_3,
      subtopics: [
        {
          serialNumber: "9.1",
          title: "The Rainbow",
          cycle: AssessmentCycle.SA_3,
        },
        {
          serialNumber: "9.2",
          title: "My Big fat Cat",
          cycle: AssessmentCycle.SA_3,
        },
      ],
    },
    {
      serialNumber: "10",
      title: "Grammar Gear",
      cycle: AssessmentCycle.SA_3,
      subtopics: [
        {
          serialNumber: "10.1",
          title: "Conjunctions",
          cycle: AssessmentCycle.SA_3,
        },
        {
          serialNumber: "10.2",
          title: "Prepositions: (in, on, under, up, down, into)",
          cycle: AssessmentCycle.SA_3,
        },
        {
          serialNumber: "10.3",
          title: "Punctuation",
          cycle: AssessmentCycle.SA_3,
        },
        {
          serialNumber: "10.4",
          title: "Reading Comprehension",
          cycle: AssessmentCycle.SA_3,
        },
        {
          serialNumber: "10.5",
          title: "Sentences: form sentences using this, that, these, those",
          cycle: AssessmentCycle.SA_3,
        },
      ],
    },
    {
      serialNumber: "11",
      title: "Speaking Topics",
      cycle: AssessmentCycle.SA_3,
      subtopics: [
        {
          serialNumber: "11.1",
          title: "My dream vacation",
          cycle: AssessmentCycle.SA_3,
        },
        {
          serialNumber: "11.2",
          title: "My dream job",
          cycle: AssessmentCycle.SA_3,
        },
      ],
    },
  ],
};

// Level 2 Syllabus Data
const level2Syllabus: SyllabusData = {
  academicLevelCode: "LEVEL_2",
  name: "Level 2 Complete Syllabus",
  description: "Complete syllabus for Level 2",
  topics: [
    {
      serialNumber: "1",
      title: "Communicate with Cambridge",
      cycle: AssessmentCycle.SA_1,
      subtopics: [
        {
          serialNumber: "1.1",
          title: "The Camel and The Trader",
          cycle: AssessmentCycle.SA_1,
        },
        {
          serialNumber: "1.2",
          title: "Bukka Learns a Lesson",
          cycle: AssessmentCycle.SA_1,
        },
        {
          serialNumber: "1.3",
          title: "Well Done,Polly!",
          cycle: AssessmentCycle.SA_1,
        },
      ],
    },
    {
      serialNumber: "2",
      title: "Poem",
      cycle: AssessmentCycle.SA_1,
      subtopics: [
        {
          serialNumber: "2.1",
          title: "How they Sleep",
          cycle: AssessmentCycle.SA_1,
        },
        {
          serialNumber: "2.2",
          title: "A worm in my Pocket",
          cycle: AssessmentCycle.SA_1,
        },
        {
          serialNumber: "2.3",
          title: "The Swing",
          cycle: AssessmentCycle.SA_1,
        },
      ],
    },
    {
      serialNumber: "3",
      title: "Grammar Gear",
      cycle: AssessmentCycle.SA_1,
      subtopics: [
        {
          serialNumber: "3.1",
          title: "Nouns: Common and Proper",
          cycle: AssessmentCycle.SA_1,
        },
        {
          serialNumber: "3.2",
          title: "Nouns: Countable and Uncountable",
          cycle: AssessmentCycle.SA_1,
        },
        {
          serialNumber: "3.3",
          title: "Nouns: Singular and Plural",
          cycle: AssessmentCycle.SA_1,
        },
        {
          serialNumber: "3.4",
          title:
            "Nouns: Gender (Masculine, Feminine, common and neuter gender)",
          cycle: AssessmentCycle.SA_1,
        },
        {
          serialNumber: "3.5",
          title: "Adjectives (of quality, of number, of quantity)",
          cycle: AssessmentCycle.SA_1,
        },
        { serialNumber: "3.6", title: "Articles", cycle: AssessmentCycle.SA_1 },
        {
          serialNumber: "3.7",
          title: "Vocabulary",
          cycle: AssessmentCycle.SA_1,
        },
      ],
    },
    {
      serialNumber: "4",
      title: "Communicate with Cambridge",
      cycle: AssessmentCycle.SA_2,
      subtopics: [
        {
          serialNumber: "4.1",
          title: "Kiki and Croc",
          cycle: AssessmentCycle.SA_2,
        },
        {
          serialNumber: "4.2",
          title: "The King and the Spider",
          cycle: AssessmentCycle.SA_2,
        },
        {
          serialNumber: "4.3",
          title: "The Banyan Tree",
          cycle: AssessmentCycle.SA_2,
        },
      ],
    },
    {
      serialNumber: "5",
      title: "Poem",
      cycle: AssessmentCycle.SA_2,
      subtopics: [
        {
          serialNumber: "5.1",
          title: "The Growing River",
          cycle: AssessmentCycle.SA_2,
        },
      ],
    },
    {
      serialNumber: "6",
      title: "Grammar Gear",
      cycle: AssessmentCycle.SA_2,
      subtopics: [
        {
          serialNumber: "6.1",
          title: "Main Verbs: Am, Is, Are, Was, Were",
          cycle: AssessmentCycle.SA_2,
        },
        {
          serialNumber: "6.2",
          title: "Helping Verbs: Am, Is, Are, Was, Were",
          cycle: AssessmentCycle.SA_2,
        },
        {
          serialNumber: "6.3",
          title: "Main Verbs: has, have, had",
          cycle: AssessmentCycle.SA_2,
        },
        {
          serialNumber: "6.4",
          title:
            "Verbs: Tenses (Simple present, Simple past, Simple Future tense)",
          cycle: AssessmentCycle.SA_2,
        },
        {
          serialNumber: "6.5",
          title: "Adverbs: of Manner",
          cycle: AssessmentCycle.SA_2,
        },
        {
          serialNumber: "6.6",
          title: "Pronouns: I, we, you, he, she, it, they",
          cycle: AssessmentCycle.SA_2,
        },
        {
          serialNumber: "6.7",
          title: "Composition",
          cycle: AssessmentCycle.SA_2,
        },
      ],
    },
    {
      serialNumber: "7",
      title: "Speaking Topics",
      cycle: AssessmentCycle.SA_2,
      subtopics: [
        {
          serialNumber: "7.1",
          title: "My best friend",
          cycle: AssessmentCycle.SA_2,
        },
        {
          serialNumber: "7.2",
          title: "The most delicious meal I've ever had",
          cycle: AssessmentCycle.SA_2,
        },
      ],
    },
    {
      serialNumber: "8",
      title: "Communicate with Cambridge",
      cycle: AssessmentCycle.SA_3,
      subtopics: [
        {
          serialNumber: "8.1",
          title: "The Chain of Smiles",
          cycle: AssessmentCycle.SA_3,
        },
        {
          serialNumber: "8.2",
          title: "The Two Frogs",
          cycle: AssessmentCycle.SA_3,
        },
        {
          serialNumber: "8.3",
          title: "Spectacles for the Headman",
          cycle: AssessmentCycle.SA_3,
        },
      ],
    },
    {
      serialNumber: "9",
      title: "Poem",
      cycle: AssessmentCycle.SA_3,
      subtopics: [
        {
          serialNumber: "9.1",
          title: "What Makes You Laugh?",
          cycle: AssessmentCycle.SA_3,
        },
        {
          serialNumber: "9.2",
          title: "Frogs At School",
          cycle: AssessmentCycle.SA_3,
        },
      ],
    },
    {
      serialNumber: "10",
      title: "Grammar Gear",
      cycle: AssessmentCycle.SA_3,
      subtopics: [
        {
          serialNumber: "10.1",
          title: "Conjunctions",
          cycle: AssessmentCycle.SA_3,
        },
        {
          serialNumber: "10.2",
          title: "Prepositions",
          cycle: AssessmentCycle.SA_3,
        },
        {
          serialNumber: "10.3",
          title: "Kind of Sentences",
          cycle: AssessmentCycle.SA_3,
        },
        {
          serialNumber: "10.4",
          title: "Punctuations",
          cycle: AssessmentCycle.SA_3,
        },
        {
          serialNumber: "10.5",
          title: "Reading Comprehension",
          cycle: AssessmentCycle.SA_3,
        },
      ],
    },
    {
      serialNumber: "11",
      title: "Speaking Topics",
      cycle: AssessmentCycle.SA_3,
      subtopics: [
        {
          serialNumber: "11.1",
          title: "My typical day at school",
          cycle: AssessmentCycle.SA_3,
        },
        {
          serialNumber: "11.2",
          title: "My favorite cartoon character",
          cycle: AssessmentCycle.SA_3,
        },
      ],
    },
  ],
};

// Level 3 Syllabus Data
const level3Syllabus: SyllabusData = {
  academicLevelCode: "LEVEL_3",
  name: "Level 3 Complete Syllabus",
  description: "Complete syllabus for Level 3",
  topics: [
    {
      serialNumber: "1",
      title: "Communicate with Cambridge",
      cycle: AssessmentCycle.SA_1,
      subtopics: [
        {
          serialNumber: "1.1",
          title: "The Golden Touch",
          cycle: AssessmentCycle.SA_1,
        },
        {
          serialNumber: "1.2",
          title: "The Fortunate Pedlar",
          cycle: AssessmentCycle.SA_1,
        },
        {
          serialNumber: "1.3",
          title: "How the Sun was Rescued",
          cycle: AssessmentCycle.SA_1,
        },
        {
          serialNumber: "1.4",
          title: "Mowgli Joins the Wolf Pack",
          cycle: AssessmentCycle.SA_1,
        },
      ],
    },
    {
      serialNumber: "2",
      title: "Poem",
      cycle: AssessmentCycle.SA_1,
      subtopics: [
        {
          serialNumber: "2.1",
          title: "I Meant to Do My Work Today",
          cycle: AssessmentCycle.SA_1,
        },
        { serialNumber: "2.2", title: "Homes", cycle: AssessmentCycle.SA_1 },
      ],
    },
    {
      serialNumber: "3",
      title: "Grammar Gear",
      cycle: AssessmentCycle.SA_1,
      subtopics: [
        {
          serialNumber: "3.1",
          title: "Nouns: Collective and Abstract",
          cycle: AssessmentCycle.SA_1,
        },
        {
          serialNumber: "3.2",
          title: "Nouns: Singular and Plural",
          cycle: AssessmentCycle.SA_1,
        },
        {
          serialNumber: "3.3",
          title: "Adjectives: of Quality, of Number, and Quantity",
          cycle: AssessmentCycle.SA_1,
        },
        {
          serialNumber: "3.4",
          title: "Adjectives: Demonstrative and Possessive",
          cycle: AssessmentCycle.SA_1,
        },
        {
          serialNumber: "3.5",
          title: "Forming Adjectives",
          cycle: AssessmentCycle.SA_1,
        },
        {
          serialNumber: "3.6",
          title: "Articles: A, An, The",
          cycle: AssessmentCycle.SA_1,
        },
        {
          serialNumber: "3.7",
          title: "Vocabulary",
          cycle: AssessmentCycle.SA_1,
        },
      ],
    },
    {
      serialNumber: "4",
      title: "Communicate with Cambridge",
      cycle: AssessmentCycle.SA_2,
      subtopics: [
        {
          serialNumber: "4.1",
          title: "Project Sunshine",
          cycle: AssessmentCycle.SA_2,
        },
        {
          serialNumber: "4.2",
          title: "The Girl Who Hated Books",
          cycle: AssessmentCycle.SA_2,
        },
        {
          serialNumber: "4.3",
          title: "Exploring an underwater world",
          cycle: AssessmentCycle.SA_2,
        },
      ],
    },
    {
      serialNumber: "5",
      title: "Poem",
      cycle: AssessmentCycle.SA_2,
      subtopics: [
        {
          serialNumber: "5.1",
          title: "The song of the Engine",
          cycle: AssessmentCycle.SA_2,
        },
        {
          serialNumber: "5.2",
          title: "Good Books",
          cycle: AssessmentCycle.SA_2,
        },
        {
          serialNumber: "5.3",
          title: "The Sea's Treasure",
          cycle: AssessmentCycle.SA_2,
        },
      ],
    },
    {
      serialNumber: "6",
      title: "Grammar Gear",
      cycle: AssessmentCycle.SA_2,
      subtopics: [
        {
          serialNumber: "6.1",
          title:
            "Verbs- Main Verbs, Helping Verbs, Regular and Irregular Verbs",
          cycle: AssessmentCycle.SA_2,
        },
        {
          serialNumber: "6.2",
          title: "Verbs: Simple Tenses (Present, Past, Future)",
          cycle: AssessmentCycle.SA_2,
        },
        { serialNumber: "6.3", title: "Adverbs", cycle: AssessmentCycle.SA_2 },
        {
          serialNumber: "6.4",
          title: "Pronouns: Personal and Demonstrative",
          cycle: AssessmentCycle.SA_2,
        },
        {
          serialNumber: "6.5",
          title: "Conjunctions",
          cycle: AssessmentCycle.SA_2,
        },
        {
          serialNumber: "6.6",
          title: "Composition",
          cycle: AssessmentCycle.SA_2,
        },
      ],
    },
    {
      serialNumber: "7",
      title: "Speaking Topics",
      cycle: AssessmentCycle.SA_2,
      subtopics: [
        {
          serialNumber: "7.1",
          title: "My favorite season of the year is",
          cycle: AssessmentCycle.SA_2,
        },
        {
          serialNumber: "7.2",
          title: "Why I love my mom and dad",
          cycle: AssessmentCycle.SA_2,
        },
      ],
    },
    {
      serialNumber: "8",
      title: "Communicate with Cambridge",
      cycle: AssessmentCycle.SA_3,
      subtopics: [
        {
          serialNumber: "8.1",
          title: "The Farmer who bought a well",
          cycle: AssessmentCycle.SA_3,
        },
        {
          serialNumber: "8.2",
          title: "The Boy who found grain",
          cycle: AssessmentCycle.SA_3,
        },
        {
          serialNumber: "8.3",
          title: "Raja's Useful Collection",
          cycle: AssessmentCycle.SA_3,
        },
      ],
    },
    {
      serialNumber: "9",
      title: "Poem",
      cycle: AssessmentCycle.SA_3,
      subtopics: [
        {
          serialNumber: "9.1",
          title: "Bless the Farmers",
          cycle: AssessmentCycle.SA_3,
        },
      ],
    },
    {
      serialNumber: "10",
      title: "Grammar Gear",
      cycle: AssessmentCycle.SA_3,
      subtopics: [
        {
          serialNumber: "10.1",
          title: "Interjections",
          cycle: AssessmentCycle.SA_3,
        },
        {
          serialNumber: "10.2",
          title: "Prepositions: Place and Time",
          cycle: AssessmentCycle.SA_3,
        },
        {
          serialNumber: "10.3",
          title: "Punctuation",
          cycle: AssessmentCycle.SA_3,
        },
        {
          serialNumber: "10.4",
          title: "Kinds of Sentences",
          cycle: AssessmentCycle.SA_3,
        },
        {
          serialNumber: "10.5",
          title: "Sentence: Affirmative and Negative",
          cycle: AssessmentCycle.SA_3,
        },
        {
          serialNumber: "10.6",
          title: "Sentence: Subject and Predicate",
          cycle: AssessmentCycle.SA_3,
        },
        {
          serialNumber: "10.7",
          title: "Reading Comprehension",
          cycle: AssessmentCycle.SA_3,
        },
      ],
    },
    {
      serialNumber: "11",
      title: "Speaking Topics",
      cycle: AssessmentCycle.SA_3,
    },
  ],
};

// Level 4 Syllabus Data
const level4Syllabus: SyllabusData = {
  academicLevelCode: "LEVEL_4",
  name: "Level 4 Complete Syllabus",
  description: "Complete syllabus for Level 4",
  topics: [
    {
      serialNumber: "1",
      title: "Communicate with Cambridge",
      cycle: AssessmentCycle.SA_1,
      subtopics: [
        {
          serialNumber: "1.1",
          title: "The House with the Golden Windows",
          cycle: AssessmentCycle.SA_1,
        },
        {
          serialNumber: "1.2",
          title: "My Early Home",
          cycle: AssessmentCycle.SA_1,
        },
        {
          serialNumber: "1.3",
          title: "The Most important Day",
          cycle: AssessmentCycle.SA_1,
        },
        {
          serialNumber: "1.4",
          title: "Dragon Rock",
          cycle: AssessmentCycle.SA_1,
        },
      ],
    },
    {
      serialNumber: "2",
      title: "Poem",
      cycle: AssessmentCycle.SA_1,
      subtopics: [
        {
          serialNumber: "2.1",
          title: "Topsy-Turvy Land",
          cycle: AssessmentCycle.SA_1,
        },
        {
          serialNumber: "2.2",
          title: "Choosing Their Names",
          cycle: AssessmentCycle.SA_1,
        },
        {
          serialNumber: "2.3",
          title: "The Tease",
          cycle: AssessmentCycle.SA_1,
        },
      ],
    },
    {
      serialNumber: "3",
      title: "Grammar Gear",
      cycle: AssessmentCycle.SA_1,
      subtopics: [
        {
          serialNumber: "3.1",
          title: "Possessives forms of Nouns",
          cycle: AssessmentCycle.SA_1,
        },
        {
          serialNumber: "3.2",
          title: "Nouns Singular and Plural",
          cycle: AssessmentCycle.SA_1,
        },
        {
          serialNumber: "3.3",
          title: "Nouns Kinds",
          cycle: AssessmentCycle.SA_1,
        },
        {
          serialNumber: "3.4",
          title: "Adjectives-Kinds and Formation",
          cycle: AssessmentCycle.SA_1,
        },
        {
          serialNumber: "3.5",
          title: "Adjectives Degrees of Comparison",
          cycle: AssessmentCycle.SA_1,
        },
        { serialNumber: "3.6", title: "Articles", cycle: AssessmentCycle.SA_1 },
        {
          serialNumber: "3.7",
          title: "Verbs: Irregular and Helping",
          cycle: AssessmentCycle.SA_1,
        },
        {
          serialNumber: "3.8",
          title: "Vocabulary",
          cycle: AssessmentCycle.SA_1,
        },
      ],
    },
    {
      serialNumber: "4",
      title: "Communicate with Cambridge",
      cycle: AssessmentCycle.SA_2,
      subtopics: [
        {
          serialNumber: "4.1",
          title: "Humpty Dumpty and Alice",
          cycle: AssessmentCycle.SA_2,
        },
        {
          serialNumber: "4.2",
          title: "Irah Becomes a Flower Gardener",
          cycle: AssessmentCycle.SA_2,
        },
        {
          serialNumber: "4.3",
          title: "The Olympic games",
          cycle: AssessmentCycle.SA_2,
        },
      ],
    },
    {
      serialNumber: "5",
      title: "Poem",
      cycle: AssessmentCycle.SA_2,
      subtopics: [
        { serialNumber: "5.1", title: "Trees", cycle: AssessmentCycle.SA_2 },
        { serialNumber: "5.2", title: "One look", cycle: AssessmentCycle.SA_2 },
      ],
    },
    {
      serialNumber: "6",
      title: "Grammar Gear",
      cycle: AssessmentCycle.SA_2,
      subtopics: [
        {
          serialNumber: "6.1",
          title: "Modals as Helping Verbs",
          cycle: AssessmentCycle.SA_2,
        },
        {
          serialNumber: "6.2",
          title: "Verbs The Continuous Tenses",
          cycle: AssessmentCycle.SA_2,
        },
        {
          serialNumber: "6.3",
          title: "Verbs-The Simple and Continuous Tenses",
          cycle: AssessmentCycle.SA_2,
        },
        {
          serialNumber: "6.4",
          title: "Adverbs : Kinds",
          cycle: AssessmentCycle.SA_2,
        },
        {
          serialNumber: "6.5",
          title: "Adverbs-Formation",
          cycle: AssessmentCycle.SA_2,
        },
        {
          serialNumber: "6.6",
          title: "Pronouns Possessive and Interrogative",
          cycle: AssessmentCycle.SA_2,
        },
        {
          serialNumber: "6.7",
          title: "Conjunctions (for, and, nor, but, or, yet, so)",
          cycle: AssessmentCycle.SA_2,
        },
        {
          serialNumber: "6.8",
          title: "Composition",
          cycle: AssessmentCycle.SA_2,
        },
      ],
    },
    {
      serialNumber: "7",
      title: "Speaking Topics",
      cycle: AssessmentCycle.SA_2,
    },
    {
      serialNumber: "8",
      title: "Communicate with Cambridge",
      cycle: AssessmentCycle.SA_3,
      subtopics: [
        {
          serialNumber: "8.1",
          title: "A Fairy with Horns",
          cycle: AssessmentCycle.SA_3,
        },
        {
          serialNumber: "8.2",
          title: "The Lord of the Cranes",
          cycle: AssessmentCycle.SA_3,
        },
        {
          serialNumber: "8.3",
          title: "Birbal and the Washerman",
          cycle: AssessmentCycle.SA_3,
        },
      ],
    },
    {
      serialNumber: "9",
      title: "Poem",
      cycle: AssessmentCycle.SA_3,
      subtopics: [
        {
          serialNumber: "9.1",
          title: "The Rum Tum Tugger",
          cycle: AssessmentCycle.SA_3,
        },
      ],
    },
    {
      serialNumber: "10",
      title: "Grammar Gear",
      cycle: AssessmentCycle.SA_3,
      subtopics: [
        {
          serialNumber: "10.1",
          title: "Prepositions-of Time, of Position, of Direction",
          cycle: AssessmentCycle.SA_3,
        },
        {
          serialNumber: "10.2",
          title: "Punctuation",
          cycle: AssessmentCycle.SA_3,
        },
        {
          serialNumber: "10.3",
          title: "Subject-Verb Agreement",
          cycle: AssessmentCycle.SA_3,
        },
        {
          serialNumber: "10.4",
          title: "Kinds of Sentences",
          cycle: AssessmentCycle.SA_3,
        },
        {
          serialNumber: "10.5",
          title: "Sentences : Subject, Predicate and Object",
          cycle: AssessmentCycle.SA_3,
        },
        {
          serialNumber: "10.6",
          title: "Sentences : Simple and Compound",
          cycle: AssessmentCycle.SA_3,
        },
        {
          serialNumber: "10.7",
          title: "Reading Comprehension",
          cycle: AssessmentCycle.SA_3,
        },
      ],
    },
    {
      serialNumber: "11",
      title: "Speaking Topics",
      cycle: AssessmentCycle.SA_3,
    },
  ],
};

// Helper function to create topics recursively
async function createTopicsRecursively(
  prisma: PrismaClient,
  syllabusId: string,
  topics: TopicData[],
  parentId: string | null = null,
): Promise<void> {
  for (let i = 0; i < topics.length; i++) {
    const topic = topics[i];

    // Create the main topic
    const createdTopic = await prisma.syllabusTopic.create({
      data: {
        syllabusId,
        parentId,
        serialNumber: topic.serialNumber,
        title: topic.title,
        cycle: topic.cycle,
        orderIndex: i + 1,
        status: "PENDING",
      },
    });

    console.log(`  ✓ Created topic: ${topic.serialNumber} - ${topic.title}`);

    // If there are subtopics, create them recursively
    if (topic.subtopics && topic.subtopics.length > 0) {
      await createTopicsRecursively(
        prisma,
        syllabusId,
        topic.subtopics,
        createdTopic.id,
      );
    }
  }
}

// Helper function to seed syllabi for a specific center
async function seedSyllabiForCenter(
  prisma: PrismaClient,
  project: any,
  center: any,
  semester: any,
  syllabi: SyllabusData[],
) {
  console.log(`\n📍 Processing center: ${center.name}`);
  console.log(`   Project: ${project.name}`);
  console.log(`   Semester: ${semester.name}`);

  for (const syllabusData of syllabi) {
    console.log(`\n📖 Creating syllabus: ${syllabusData.name}`);

    const semesterLevel = await prisma.semesterLevel.findFirst({
      where: {
        semesterId: semester.id,
        academicLevel: { code: syllabusData.academicLevelCode },
      },
    });
    if (!semesterLevel) {
      throw new Error(
        `Semester ${semester.id} does not include ${syllabusData.academicLevelCode}`,
      );
    }

    // Check if syllabus already exists
    const existingSyllabus = await prisma.syllabus.findFirst({
      where: {
        projectId: project.id,
        centerId: center.id,
        semesterId: semester.id,
        semesterLevelId: semesterLevel.id,
        name: syllabusData.name,
      },
    });

    if (existingSyllabus) {
      console.log(`⚠️  Syllabus already exists, skipping...`);
      continue;
    }

    // Create the syllabus
    const syllabus = await prisma.syllabus.create({
      data: {
        projectId: project.id,
        centerId: center.id,
        semesterId: semester.id,
        semesterLevelId: semesterLevel.id,
        name: syllabusData.name,
        description: syllabusData.description,
        isActive: true,
      },
    });

    console.log(`✓ Created syllabus: ${syllabus.name}`);
    console.log(`  Creating ${syllabusData.topics.length} topics...`);

    // Create all topics for this syllabus
    await createTopicsRecursively(prisma, syllabus.id, syllabusData.topics);

    console.log(`✅ Completed ${syllabusData.name}`);
  }
}

// Main seed function
async function seedSyllabus() {
  assertAdditiveLocalSeedAllowed();
  const prisma = new PrismaClient();

  console.log("🌱 Starting syllabus seed...\n");

  try {
    // Get the first active project
    const project = await prisma.projects.findFirst({
      where: { status: "ACTIVE" },
    });

    if (!project) {
      console.error(
        "❌ No active project found. Please create a project first.",
      );
      return;
    }

    // Get Lavender center
    const lavenderCenter = await prisma.centers.findFirst({
      where: {
        projectId: project.id,
        name: { contains: "Lavender", mode: "insensitive" },
      },
    });

    // Get Tulip center
    const tulipCenter = await prisma.centers.findFirst({
      where: {
        projectId: project.id,
        name: { contains: "Tulip", mode: "insensitive" },
      },
    });

    if (!lavenderCenter && !tulipCenter) {
      console.error(
        "❌ Neither Lavender nor Tulip center found. Please create centers first.",
      );
      return;
    }

    // Process Lavender center: Primary B, Level 1, Level 2
    if (lavenderCenter) {
      const lavenderSemester = await prisma.semesters.findFirst({
        where: { centerId: lavenderCenter.id },
      });

      if (lavenderSemester) {
        const lavenderSyllabi: SyllabusData[] = [
          primaryBSyllabus,
          level1Syllabus,
          level2Syllabus,
        ];

        await seedSyllabiForCenter(
          prisma,
          project,
          lavenderCenter,
          lavenderSemester,
          lavenderSyllabi,
        );
      } else {
        console.log(`⚠️  No semester found for Lavender center, skipping...`);
      }
    }

    // Process Tulip center: All syllabi (Primary A, B, Level 1, 2, 3, 4)
    if (tulipCenter) {
      const tulipSemester = await prisma.semesters.findFirst({
        where: { centerId: tulipCenter.id },
      });

      if (tulipSemester) {
        const tulipSyllabi: SyllabusData[] = [
          primaryASyllabus,
          primaryBSyllabus,
          level1Syllabus,
          level2Syllabus,
          level3Syllabus,
          level4Syllabus,
        ];

        await seedSyllabiForCenter(
          prisma,
          project,
          tulipCenter,
          tulipSemester,
          tulipSyllabi,
        );
      } else {
        console.log(`⚠️  No semester found for Tulip center, skipping...`);
      }
    }

    console.log("\n🎉 Syllabus seeding completed successfully!");
  } catch (error) {
    console.error("❌ Error seeding syllabus:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the seed function
seedSyllabus().catch((error) => {
  console.error(error);
  process.exit(1);
});
