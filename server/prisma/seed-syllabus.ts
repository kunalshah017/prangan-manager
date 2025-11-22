import { PrismaClient, Level } from "../generated/prisma/index.js";

const prisma = new PrismaClient();

interface TopicData {
  serialNumber: string;
  title: string;
  cycle?: string;
  subtopics?: TopicData[];
}

interface SyllabusData {
  level: Level;
  name: string;
  description: string;
  topics: TopicData[];
}

// Primary A Syllabus Data
const primaryASyllabus: SyllabusData = {
  level: "PRIMARY_A",
  name: "Primary A Complete Syllabus",
  description: "Complete syllabus for Primary A level",
  topics: [
    {
      serialNumber: "1",
      title: "Pattern Writing",
      cycle: "SA-1",
    },
    {
      serialNumber: "2",
      title: "Introduction to Letters (A-F)",
      cycle: "SA-1",
    },
    {
      serialNumber: "3",
      title: "Number & Number names",
      cycle: "SA-1",
    },
    {
      serialNumber: "4",
      title: "Comparisons",
      cycle: "SA-1",
      subtopics: [
        { serialNumber: "4.1", title: "Big and Small", cycle: "SA-1" },
        { serialNumber: "4.2", title: "Tall and Short", cycle: "SA-1" },
        { serialNumber: "4.3", title: "More and Less", cycle: "SA-1" },
        { serialNumber: "4.4", title: "Light and Heavy", cycle: "SA-1" },
        { serialNumber: "4.5", title: "Long and Short", cycle: "SA-1" },
      ],
    },
    {
      serialNumber: "5",
      title: "Introduction to Letters (N-T)",
      cycle: "SA-2",
    },
    {
      serialNumber: "6",
      title: "Comparisons: inside/outside, before-after, full-empty, far-near",
      cycle: "SA-2",
    },
    {
      serialNumber: "7",
      title: "Shapes",
      cycle: "SA-2",
    },
    {
      serialNumber: "8",
      title: "Numbers & number names: 20-40",
      cycle: "SA-2",
    },
    {
      serialNumber: "9",
      title: "My school",
      cycle: "SA-2",
    },
    {
      serialNumber: "10",
      title: "My body",
      cycle: "SA-2",
    },
    {
      serialNumber: "11",
      title: "Seasons",
      cycle: "SA-2",
    },
    {
      serialNumber: "12",
      title: "Parts of plants",
      cycle: "SA-2",
    },
    {
      serialNumber: "13",
      title: "Story: The Hare & Tortoise",
      cycle: "SA-2",
    },
    {
      serialNumber: "14",
      title: "Story: The Lion & Mouse",
      cycle: "SA-2",
    },
    {
      serialNumber: "15",
      title: "Story: The Thirsty crow",
      cycle: "SA-2",
    },
    {
      serialNumber: "16",
      title: "Rhymes",
      cycle: "SA-2",
      subtopics: [
        { serialNumber: "16.1", title: "Humpty Dumpty", cycle: "SA-2" },
        {
          serialNumber: "16.2",
          title: "Teddy bear, teddy bear",
          cycle: "SA-2",
        },
        { serialNumber: "16.3", title: "Put your left hand", cycle: "SA-2" },
      ],
    },
    {
      serialNumber: "17",
      title: "Introduction to Letters (T-Z)",
      cycle: "SA-3",
    },
    {
      serialNumber: "18",
      title: "Phonic Drill",
      cycle: "SA-3",
    },
    {
      serialNumber: "19",
      title: "Vowels & consonants",
      cycle: "SA-3",
    },
    {
      serialNumber: "20",
      title: "Numbers & number names: 41-50",
      cycle: "SA-3",
    },
    {
      serialNumber: "21",
      title: "Animals",
      cycle: "SA-3",
    },
    {
      serialNumber: "22",
      title: "Domestic Animals",
      cycle: "SA-3",
    },
    {
      serialNumber: "23",
      title: "Pet Animals",
      cycle: "SA-3",
    },
    {
      serialNumber: "24",
      title: "Good habits",
      cycle: "SA-3",
    },
    {
      serialNumber: "25",
      title: "Story: The dove and the ant",
      cycle: "SA-3",
    },
    {
      serialNumber: "26",
      title: "Story: The greedy dog",
      cycle: "SA-3",
    },
    {
      serialNumber: "27",
      title: "Rhymes",
      cycle: "SA-3",
      subtopics: [
        {
          serialNumber: "27.1",
          title: "Chubby Cheeks, Dimple Chin",
          cycle: "SA-3",
        },
        {
          serialNumber: "27.2",
          title: "Hop a little, jump a little, one two three",
          cycle: "SA-3",
        },
      ],
    },
  ],
};

// Primary B Syllabus Data
const primaryBSyllabus: SyllabusData = {
  level: "PRIMARY_B",
  name: "Primary B Complete Syllabus",
  description: "Complete syllabus for Primary B level",
  topics: [
    {
      serialNumber: "1",
      title: "Phonics Drill: Vowels",
      cycle: "SA-1",
    },
    {
      serialNumber: "2",
      title: "Blends: (cl, pl, gr, br, ch, sh)",
      cycle: "SA-1",
    },
    {
      serialNumber: "3",
      title: "Comparisons",
      cycle: "SA-1",
    },
    {
      serialNumber: "4",
      title: "Rhyming words",
      cycle: "SA-1",
    },
    {
      serialNumber: "5",
      title: "Numbers 1 to 50",
      cycle: "SA-1",
    },
    {
      serialNumber: "6",
      title: "Count and write",
      cycle: "SA-1",
    },
    {
      serialNumber: "7",
      title: "Ordinals",
      cycle: "SA-1",
    },
    {
      serialNumber: "8",
      title: "Before-After",
      cycle: "SA-1",
    },
    {
      serialNumber: "9",
      title: "Between",
      cycle: "SA-1",
    },
    {
      serialNumber: "10",
      title: "Increasing Order",
      cycle: "SA-1",
    },
    {
      serialNumber: "11",
      title: "Decreasing Order",
      cycle: "SA-1",
    },
    {
      serialNumber: "12",
      title: "Greater than and less than",
      cycle: "SA-1",
    },
    {
      serialNumber: "13",
      title: "Equal",
      cycle: "SA-1",
    },
    {
      serialNumber: "14",
      title: "Patterns",
      cycle: "SA-1",
    },
    {
      serialNumber: "15",
      title: "Number and Number Names",
      cycle: "SA-1",
    },
    {
      serialNumber: "16",
      title: "Pairing",
      cycle: "SA-1",
    },
    {
      serialNumber: "17",
      title: "Picture Reading",
      cycle: "SA-1",
    },
    {
      serialNumber: "18",
      title: "Action Words",
      cycle: "SA-1",
    },
    {
      serialNumber: "19",
      title: "Odd One Out",
      cycle: "SA-1",
    },
    {
      serialNumber: "20",
      title: "Picture Story",
      cycle: "SA-1",
    },
    {
      serialNumber: "21",
      title: "Days of the Week",
      cycle: "SA-1",
    },
    {
      serialNumber: "22",
      title: "Months of the Year",
      cycle: "SA-1",
    },
    {
      serialNumber: "23",
      title: "Shapes",
      cycle: "SA-2",
    },
    {
      serialNumber: "24",
      title: "Animals",
      cycle: "SA-2",
    },
    {
      serialNumber: "25",
      title: "Animals and their young ones",
      cycle: "SA-2",
    },
    {
      serialNumber: "26",
      title: "Animals and their Homes",
      cycle: "SA-2",
    },
    {
      serialNumber: "27",
      title: "Plants",
      cycle: "SA-2",
    },
    {
      serialNumber: "28",
      title: "Our National Symbols",
      cycle: "SA-2",
    },
    {
      serialNumber: "29",
      title: "Our National Leaders",
      cycle: "SA-2",
    },
    {
      serialNumber: "30",
      title: "Fruits",
      cycle: "SA-2",
    },
    {
      serialNumber: "31",
      title: "Flowers",
      cycle: "SA-2",
    },
    {
      serialNumber: "32",
      title: "Vegetables",
      cycle: "SA-2",
    },
    {
      serialNumber: "33",
      title: "Vehicles",
      cycle: "SA-2",
    },
    {
      serialNumber: "34",
      title: "Important days",
      cycle: "SA-2",
    },
    {
      serialNumber: "35",
      title: "Festivals",
      cycle: "SA-2",
    },
    {
      serialNumber: "36",
      title: "Our Country - India",
      cycle: "SA-2",
    },
    {
      serialNumber: "37",
      title: "People of India",
      cycle: "SA-2",
    },
    {
      serialNumber: "38",
      title: "States of India",
      cycle: "SA-2",
    },
    {
      serialNumber: "39",
      title: "Story: The camel and the Jackal",
      cycle: "SA-2",
    },
    {
      serialNumber: "40",
      title: "Story: The fox and the Grapes",
      cycle: "SA-2",
    },
    {
      serialNumber: "41",
      title: "Rhymes: Days of the Week",
      cycle: "SA-2",
    },
    {
      serialNumber: "42",
      title: "Rhymes: Tooth Brush",
      cycle: "SA-2",
    },
    {
      serialNumber: "43",
      title: "Rhymes: Wheels of the Bus",
      cycle: "SA-2",
    },
    {
      serialNumber: "44",
      title: "A and AN",
      cycle: "SA-3",
    },
    {
      serialNumber: "45",
      title: "Positions",
      cycle: "SA-3",
    },
    {
      serialNumber: "46",
      title: "One & many",
      cycle: "SA-3",
    },
    {
      serialNumber: "47",
      title: "This, That, These & Those",
      cycle: "SA-3",
    },
    {
      serialNumber: "48",
      title: "Food",
      cycle: "SA-3",
    },
    {
      serialNumber: "49",
      title: "Our Helpers",
      cycle: "SA-3",
    },
    {
      serialNumber: "50",
      title: "Living Things",
      cycle: "SA-3",
    },
    {
      serialNumber: "51",
      title: "Good Habits",
      cycle: "SA-3",
    },
    {
      serialNumber: "52",
      title: "Traffic Signal",
      cycle: "SA-3",
    },
    {
      serialNumber: "53",
      title: "Road Safety",
      cycle: "SA-3",
    },
    {
      serialNumber: "54",
      title: "Magic words",
      cycle: "SA-3",
    },
    {
      serialNumber: "55",
      title: "My computer",
      cycle: "SA-3",
    },
    {
      serialNumber: "56",
      title: "Planets",
      cycle: "SA-3",
    },
    {
      serialNumber: "57",
      title: "Story: The milkmaid's dreams",
      cycle: "SA-3",
    },
    {
      serialNumber: "58",
      title: "Story: The truthful woodcutter",
      cycle: "SA-3",
    },
    {
      serialNumber: "59",
      title: "Rhymes: Ten little fingers",
      cycle: "SA-3",
    },
    {
      serialNumber: "60",
      title: "Rhymes: Thank you God",
      cycle: "SA-3",
    },
  ],
};

// Level 1 Syllabus Data
const level1Syllabus: SyllabusData = {
  level: "LEVEL_1",
  name: "Level 1 Complete Syllabus",
  description: "Complete syllabus for Level 1",
  topics: [
    {
      serialNumber: "1",
      title: "Communicate with Cambridge",
      cycle: "SA-1",
      subtopics: [
        { serialNumber: "1.1", title: "Manu and His Family", cycle: "SA-1" },
        { serialNumber: "1.2", title: "Friends in the Park", cycle: "SA-1" },
        { serialNumber: "1.3", title: "At the Zoo", cycle: "SA-1" },
      ],
    },
    {
      serialNumber: "2",
      title: "Poem",
      cycle: "SA-1",
      subtopics: [
        { serialNumber: "2.1", title: "All of Me", cycle: "SA-1" },
        { serialNumber: "2.2", title: "At the School", cycle: "SA-1" },
        { serialNumber: "2.3", title: "Mr Caterpillar", cycle: "SA-1" },
      ],
    },
    {
      serialNumber: "3",
      title: "Grammar Gear",
      cycle: "SA-1",
      subtopics: [
        { serialNumber: "3.1", title: "Nouns", cycle: "SA-1" },
        {
          serialNumber: "3.2",
          title: "Nouns: Proper and Common Nouns",
          cycle: "SA-1",
        },
        {
          serialNumber: "3.3",
          title: "Nouns: Singular and Plural",
          cycle: "SA-1",
        },
        {
          serialNumber: "3.4",
          title: "Nouns: Gender (Masculine and Feminine)",
          cycle: "SA-1",
        },
        { serialNumber: "3.5", title: "Adjectives", cycle: "SA-1" },
        { serialNumber: "3.6", title: "Vocabulary", cycle: "SA-1" },
      ],
    },
    {
      serialNumber: "4",
      title: "Communicate with Cambridge",
      cycle: "SA-2",
      subtopics: [
        { serialNumber: "4.1", title: "My Red Bicycle", cycle: "SA-2" },
        { serialNumber: "4.2", title: "Hide and Sleep", cycle: "SA-2" },
        { serialNumber: "4.3", title: "The Magic tree", cycle: "SA-2" },
      ],
    },
    {
      serialNumber: "5",
      title: "Poem",
      cycle: "SA-2",
      subtopics: [
        { serialNumber: "5.1", title: "A Child's Song", cycle: "SA-2" },
      ],
    },
    {
      serialNumber: "6",
      title: "Grammar Gear",
      cycle: "SA-2",
      subtopics: [
        { serialNumber: "6.1", title: "Articles-a and an", cycle: "SA-2" },
        {
          serialNumber: "6.2",
          title: "Verbs: Simple present and Simple past tense forms",
          cycle: "SA-2",
        },
        {
          serialNumber: "6.3",
          title: "Verbs - Am, Is, Are (Main verbs)",
          cycle: "SA-2",
        },
        { serialNumber: "6.4", title: "Adverbs: Ending in ly", cycle: "SA-2" },
        { serialNumber: "6.5", title: "Pronouns", cycle: "SA-2" },
        { serialNumber: "6.6", title: "Composition", cycle: "SA-2" },
      ],
    },
    {
      serialNumber: "7",
      title: "Speaking Topics",
      cycle: "SA-2",
      subtopics: [
        {
          serialNumber: "7.1",
          title: "My favourite sports & sportperson",
          cycle: "SA-2",
        },
        {
          serialNumber: "7.2",
          title: "My school & favourite teacher",
          cycle: "SA-2",
        },
      ],
    },
    {
      serialNumber: "8",
      title: "Communicate with Cambridge",
      cycle: "SA-3",
      subtopics: [
        { serialNumber: "8.1", title: "The Red Raincoat", cycle: "SA-3" },
        { serialNumber: "8.2", title: "King Lion and Rabbit", cycle: "SA-3" },
        { serialNumber: "8.3", title: "The Poor Woodcutter", cycle: "SA-3" },
      ],
    },
    {
      serialNumber: "9",
      title: "Poem",
      cycle: "SA-3",
      subtopics: [
        { serialNumber: "9.1", title: "The Rainbow", cycle: "SA-3" },
        { serialNumber: "9.2", title: "My Big fat Cat", cycle: "SA-3" },
      ],
    },
    {
      serialNumber: "10",
      title: "Grammar Gear",
      cycle: "SA-3",
      subtopics: [
        { serialNumber: "10.1", title: "Conjunctions", cycle: "SA-3" },
        {
          serialNumber: "10.2",
          title: "Prepositions: (in, on, under, up, down, into)",
          cycle: "SA-3",
        },
        { serialNumber: "10.3", title: "Punctuation", cycle: "SA-3" },
        { serialNumber: "10.4", title: "Reading Comprehension", cycle: "SA-3" },
        {
          serialNumber: "10.5",
          title: "Sentences: form sentences using this, that, these, those",
          cycle: "SA-3",
        },
      ],
    },
    {
      serialNumber: "11",
      title: "Speaking Topics",
      cycle: "SA-3",
      subtopics: [
        { serialNumber: "11.1", title: "My dream vacation", cycle: "SA-3" },
        { serialNumber: "11.2", title: "My dream job", cycle: "SA-3" },
      ],
    },
  ],
};

// Level 2 Syllabus Data
const level2Syllabus: SyllabusData = {
  level: "LEVEL_2",
  name: "Level 2 Complete Syllabus",
  description: "Complete syllabus for Level 2",
  topics: [
    {
      serialNumber: "1",
      title: "Communicate with Cambridge",
      cycle: "SA-1",
      subtopics: [
        {
          serialNumber: "1.1",
          title: "The Camel and The Trader",
          cycle: "SA-1",
        },
        { serialNumber: "1.2", title: "Bukka Learns a Lesson", cycle: "SA-1" },
        { serialNumber: "1.3", title: "Well Done,Polly!", cycle: "SA-1" },
      ],
    },
    {
      serialNumber: "2",
      title: "Poem",
      cycle: "SA-1",
      subtopics: [
        { serialNumber: "2.1", title: "How they Sleep", cycle: "SA-1" },
        { serialNumber: "2.2", title: "A worm in my Pocket", cycle: "SA-1" },
        { serialNumber: "2.3", title: "The Swing", cycle: "SA-1" },
      ],
    },
    {
      serialNumber: "3",
      title: "Grammar Gear",
      cycle: "SA-1",
      subtopics: [
        {
          serialNumber: "3.1",
          title: "Nouns: Common and Proper",
          cycle: "SA-1",
        },
        {
          serialNumber: "3.2",
          title: "Nouns: Countable and Uncountable",
          cycle: "SA-1",
        },
        {
          serialNumber: "3.3",
          title: "Nouns: Singular and Plural",
          cycle: "SA-1",
        },
        {
          serialNumber: "3.4",
          title:
            "Nouns: Gender (Masculine, Feminine, common and neuter gender)",
          cycle: "SA-1",
        },
        {
          serialNumber: "3.5",
          title: "Adjectives (of quality, of number, of quantity)",
          cycle: "SA-1",
        },
        { serialNumber: "3.6", title: "Articles", cycle: "SA-1" },
        { serialNumber: "3.7", title: "Vocabulary", cycle: "SA-1" },
      ],
    },
    {
      serialNumber: "4",
      title: "Communicate with Cambridge",
      cycle: "SA-2",
      subtopics: [
        { serialNumber: "4.1", title: "Kiki and Croc", cycle: "SA-2" },
        {
          serialNumber: "4.2",
          title: "The King and the Spider",
          cycle: "SA-2",
        },
        { serialNumber: "4.3", title: "The Banyan Tree", cycle: "SA-2" },
      ],
    },
    {
      serialNumber: "5",
      title: "Poem",
      cycle: "SA-2",
      subtopics: [
        { serialNumber: "5.1", title: "The Growing River", cycle: "SA-2" },
      ],
    },
    {
      serialNumber: "6",
      title: "Grammar Gear",
      cycle: "SA-2",
      subtopics: [
        {
          serialNumber: "6.1",
          title: "Main Verbs: Am, Is, Are, Was, Were",
          cycle: "SA-2",
        },
        {
          serialNumber: "6.2",
          title: "Helping Verbs: Am, Is, Are, Was, Were",
          cycle: "SA-2",
        },
        {
          serialNumber: "6.3",
          title: "Main Verbs: has, have, had",
          cycle: "SA-2",
        },
        {
          serialNumber: "6.4",
          title:
            "Verbs: Tenses (Simple present, Simple past, Simple Future tense)",
          cycle: "SA-2",
        },
        { serialNumber: "6.5", title: "Adverbs: of Manner", cycle: "SA-2" },
        {
          serialNumber: "6.6",
          title: "Pronouns: I, we, you, he, she, it, they",
          cycle: "SA-2",
        },
        { serialNumber: "6.7", title: "Composition", cycle: "SA-2" },
      ],
    },
    {
      serialNumber: "7",
      title: "Speaking Topics",
      cycle: "SA-2",
      subtopics: [
        { serialNumber: "7.1", title: "My best friend", cycle: "SA-2" },
        {
          serialNumber: "7.2",
          title: "The most delicious meal I've ever had",
          cycle: "SA-2",
        },
      ],
    },
    {
      serialNumber: "8",
      title: "Communicate with Cambridge",
      cycle: "SA-3",
      subtopics: [
        { serialNumber: "8.1", title: "The Chain of Smiles", cycle: "SA-3" },
        { serialNumber: "8.2", title: "The Two Frogs", cycle: "SA-3" },
        {
          serialNumber: "8.3",
          title: "Spectacles for the Headman",
          cycle: "SA-3",
        },
      ],
    },
    {
      serialNumber: "9",
      title: "Poem",
      cycle: "SA-3",
      subtopics: [
        { serialNumber: "9.1", title: "What Makes You Laugh?", cycle: "SA-3" },
        { serialNumber: "9.2", title: "Frogs At School", cycle: "SA-3" },
      ],
    },
    {
      serialNumber: "10",
      title: "Grammar Gear",
      cycle: "SA-3",
      subtopics: [
        { serialNumber: "10.1", title: "Conjunctions", cycle: "SA-3" },
        { serialNumber: "10.2", title: "Prepositions", cycle: "SA-3" },
        { serialNumber: "10.3", title: "Kind of Sentences", cycle: "SA-3" },
        { serialNumber: "10.4", title: "Punctuations", cycle: "SA-3" },
        { serialNumber: "10.5", title: "Reading Comprehension", cycle: "SA-3" },
      ],
    },
    {
      serialNumber: "11",
      title: "Speaking Topics",
      cycle: "SA-3",
      subtopics: [
        {
          serialNumber: "11.1",
          title: "My typical day at school",
          cycle: "SA-3",
        },
        {
          serialNumber: "11.2",
          title: "My favorite cartoon character",
          cycle: "SA-3",
        },
      ],
    },
  ],
};

// Level 3 Syllabus Data
const level3Syllabus: SyllabusData = {
  level: "LEVEL_3",
  name: "Level 3 Complete Syllabus",
  description: "Complete syllabus for Level 3",
  topics: [
    {
      serialNumber: "1",
      title: "Communicate with Cambridge",
      cycle: "SA-1",
      subtopics: [
        { serialNumber: "1.1", title: "The Golden Touch", cycle: "SA-1" },
        { serialNumber: "1.2", title: "The Fortunate Pedlar", cycle: "SA-1" },
        {
          serialNumber: "1.3",
          title: "How the Sun was Rescued",
          cycle: "SA-1",
        },
        {
          serialNumber: "1.4",
          title: "Mowgli Joins the Wolf Pack",
          cycle: "SA-1",
        },
      ],
    },
    {
      serialNumber: "2",
      title: "Poem",
      cycle: "SA-1",
      subtopics: [
        {
          serialNumber: "2.1",
          title: "I Meant to Do My Work Today",
          cycle: "SA-1",
        },
        { serialNumber: "2.2", title: "Homes", cycle: "SA-1" },
      ],
    },
    {
      serialNumber: "3",
      title: "Grammar Gear",
      cycle: "SA-1",
      subtopics: [
        {
          serialNumber: "3.1",
          title: "Nouns: Collective and Abstract",
          cycle: "SA-1",
        },
        {
          serialNumber: "3.2",
          title: "Nouns: Singular and Plural",
          cycle: "SA-1",
        },
        {
          serialNumber: "3.3",
          title: "Adjectives: of Quality, of Number, and Quantity",
          cycle: "SA-1",
        },
        {
          serialNumber: "3.4",
          title: "Adjectives: Demonstrative and Possessive",
          cycle: "SA-1",
        },
        { serialNumber: "3.5", title: "Forming Adjectives", cycle: "SA-1" },
        { serialNumber: "3.6", title: "Articles: A, An, The", cycle: "SA-1" },
        { serialNumber: "3.7", title: "Vocabulary", cycle: "SA-1" },
      ],
    },
    {
      serialNumber: "4",
      title: "Communicate with Cambridge",
      cycle: "SA-2",
      subtopics: [
        { serialNumber: "4.1", title: "Project Sunshine", cycle: "SA-2" },
        {
          serialNumber: "4.2",
          title: "The Girl Who Hated Books",
          cycle: "SA-2",
        },
        {
          serialNumber: "4.3",
          title: "Exploring an underwater world",
          cycle: "SA-2",
        },
      ],
    },
    {
      serialNumber: "5",
      title: "Poem",
      cycle: "SA-2",
      subtopics: [
        { serialNumber: "5.1", title: "The song of the Engine", cycle: "SA-2" },
        { serialNumber: "5.2", title: "Good Books", cycle: "SA-2" },
        { serialNumber: "5.3", title: "The Sea's Treasure", cycle: "SA-2" },
      ],
    },
    {
      serialNumber: "6",
      title: "Grammar Gear",
      cycle: "SA-2",
      subtopics: [
        {
          serialNumber: "6.1",
          title:
            "Verbs- Main Verbs, Helping Verbs, Regular and Irregular Verbs",
          cycle: "SA-2",
        },
        {
          serialNumber: "6.2",
          title: "Verbs: Simple Tenses (Present, Past, Future)",
          cycle: "SA-2",
        },
        { serialNumber: "6.3", title: "Adverbs", cycle: "SA-2" },
        {
          serialNumber: "6.4",
          title: "Pronouns: Personal and Demonstrative",
          cycle: "SA-2",
        },
        { serialNumber: "6.5", title: "Conjunctions", cycle: "SA-2" },
        { serialNumber: "6.6", title: "Composition", cycle: "SA-2" },
      ],
    },
    {
      serialNumber: "7",
      title: "Speaking Topics",
      cycle: "SA-2",
      subtopics: [
        {
          serialNumber: "7.1",
          title: "My favorite season of the year is",
          cycle: "SA-2",
        },
        {
          serialNumber: "7.2",
          title: "Why I love my mom and dad",
          cycle: "SA-2",
        },
      ],
    },
    {
      serialNumber: "8",
      title: "Communicate with Cambridge",
      cycle: "SA-3",
      subtopics: [
        {
          serialNumber: "8.1",
          title: "The Farmer who bought a well",
          cycle: "SA-3",
        },
        {
          serialNumber: "8.2",
          title: "The Boy who found grain",
          cycle: "SA-3",
        },
        {
          serialNumber: "8.3",
          title: "Raja's Useful Collection",
          cycle: "SA-3",
        },
      ],
    },
    {
      serialNumber: "9",
      title: "Poem",
      cycle: "SA-3",
      subtopics: [
        { serialNumber: "9.1", title: "Bless the Farmers", cycle: "SA-3" },
      ],
    },
    {
      serialNumber: "10",
      title: "Grammar Gear",
      cycle: "SA-3",
      subtopics: [
        { serialNumber: "10.1", title: "Interjections", cycle: "SA-3" },
        {
          serialNumber: "10.2",
          title: "Prepositions: Place and Time",
          cycle: "SA-3",
        },
        { serialNumber: "10.3", title: "Punctuation", cycle: "SA-3" },
        { serialNumber: "10.4", title: "Kinds of Sentences", cycle: "SA-3" },
        {
          serialNumber: "10.5",
          title: "Sentence: Affirmative and Negative",
          cycle: "SA-3",
        },
        {
          serialNumber: "10.6",
          title: "Sentence: Subject and Predicate",
          cycle: "SA-3",
        },
        { serialNumber: "10.7", title: "Reading Comprehension", cycle: "SA-3" },
      ],
    },
    {
      serialNumber: "11",
      title: "Speaking Topics",
      cycle: "SA-3",
    },
  ],
};

// Level 4 Syllabus Data
const level4Syllabus: SyllabusData = {
  level: "LEVEL_4",
  name: "Level 4 Complete Syllabus",
  description: "Complete syllabus for Level 4",
  topics: [
    {
      serialNumber: "1",
      title: "Communicate with Cambridge",
      cycle: "SA-1",
      subtopics: [
        {
          serialNumber: "1.1",
          title: "The House with the Golden Windows",
          cycle: "SA-1",
        },
        { serialNumber: "1.2", title: "My Early Home", cycle: "SA-1" },
        { serialNumber: "1.3", title: "The Most important Day", cycle: "SA-1" },
        { serialNumber: "1.4", title: "Dragon Rock", cycle: "SA-1" },
      ],
    },
    {
      serialNumber: "2",
      title: "Poem",
      cycle: "SA-1",
      subtopics: [
        { serialNumber: "2.1", title: "Topsy-Turvy Land", cycle: "SA-1" },
        { serialNumber: "2.2", title: "Choosing Their Names", cycle: "SA-1" },
        { serialNumber: "2.3", title: "The Tease", cycle: "SA-1" },
      ],
    },
    {
      serialNumber: "3",
      title: "Grammar Gear",
      cycle: "SA-1",
      subtopics: [
        {
          serialNumber: "3.1",
          title: "Possessives forms of Nouns",
          cycle: "SA-1",
        },
        {
          serialNumber: "3.2",
          title: "Nouns Singular and Plural",
          cycle: "SA-1",
        },
        { serialNumber: "3.3", title: "Nouns Kinds", cycle: "SA-1" },
        {
          serialNumber: "3.4",
          title: "Adjectives-Kinds and Formation",
          cycle: "SA-1",
        },
        {
          serialNumber: "3.5",
          title: "Adjectives Degrees of Comparison",
          cycle: "SA-1",
        },
        { serialNumber: "3.6", title: "Articles", cycle: "SA-1" },
        {
          serialNumber: "3.7",
          title: "Verbs: Irregular and Helping",
          cycle: "SA-1",
        },
        { serialNumber: "3.8", title: "Vocabulary", cycle: "SA-1" },
      ],
    },
    {
      serialNumber: "4",
      title: "Communicate with Cambridge",
      cycle: "SA-2",
      subtopics: [
        {
          serialNumber: "4.1",
          title: "Humpty Dumpty and Alice",
          cycle: "SA-2",
        },
        {
          serialNumber: "4.2",
          title: "Irah Becomes a Flower Gardener",
          cycle: "SA-2",
        },
        { serialNumber: "4.3", title: "The Olympic games", cycle: "SA-2" },
      ],
    },
    {
      serialNumber: "5",
      title: "Poem",
      cycle: "SA-2",
      subtopics: [
        { serialNumber: "5.1", title: "Trees", cycle: "SA-2" },
        { serialNumber: "5.2", title: "One look", cycle: "SA-2" },
      ],
    },
    {
      serialNumber: "6",
      title: "Grammar Gear",
      cycle: "SA-2",
      subtopics: [
        {
          serialNumber: "6.1",
          title: "Modals as Helping Verbs",
          cycle: "SA-2",
        },
        {
          serialNumber: "6.2",
          title: "Verbs The Continuous Tenses",
          cycle: "SA-2",
        },
        {
          serialNumber: "6.3",
          title: "Verbs-The Simple and Continuous Tenses",
          cycle: "SA-2",
        },
        { serialNumber: "6.4", title: "Adverbs : Kinds", cycle: "SA-2" },
        { serialNumber: "6.5", title: "Adverbs-Formation", cycle: "SA-2" },
        {
          serialNumber: "6.6",
          title: "Pronouns Possessive and Interrogative",
          cycle: "SA-2",
        },
        {
          serialNumber: "6.7",
          title: "Conjunctions (for, and, nor, but, or, yet, so)",
          cycle: "SA-2",
        },
        { serialNumber: "6.8", title: "Composition", cycle: "SA-2" },
      ],
    },
    {
      serialNumber: "7",
      title: "Speaking Topics",
      cycle: "SA-2",
    },
    {
      serialNumber: "8",
      title: "Communicate with Cambridge",
      cycle: "SA-3",
      subtopics: [
        { serialNumber: "8.1", title: "A Fairy with Horns", cycle: "SA-3" },
        { serialNumber: "8.2", title: "The Lord of the Cranes", cycle: "SA-3" },
        {
          serialNumber: "8.3",
          title: "Birbal and the Washerman",
          cycle: "SA-3",
        },
      ],
    },
    {
      serialNumber: "9",
      title: "Poem",
      cycle: "SA-3",
      subtopics: [
        { serialNumber: "9.1", title: "The Rum Tum Tugger", cycle: "SA-3" },
      ],
    },
    {
      serialNumber: "10",
      title: "Grammar Gear",
      cycle: "SA-3",
      subtopics: [
        {
          serialNumber: "10.1",
          title: "Prepositions-of Time, of Position, of Direction",
          cycle: "SA-3",
        },
        { serialNumber: "10.2", title: "Punctuation", cycle: "SA-3" },
        {
          serialNumber: "10.3",
          title: "Subject-Verb Agreement",
          cycle: "SA-3",
        },
        { serialNumber: "10.4", title: "Kinds of Sentences", cycle: "SA-3" },
        {
          serialNumber: "10.5",
          title: "Sentences : Subject, Predicate and Object",
          cycle: "SA-3",
        },
        {
          serialNumber: "10.6",
          title: "Sentences : Simple and Compound",
          cycle: "SA-3",
        },
        { serialNumber: "10.7", title: "Reading Comprehension", cycle: "SA-3" },
      ],
    },
    {
      serialNumber: "11",
      title: "Speaking Topics",
      cycle: "SA-3",
    },
  ],
};

// Helper function to create topics recursively
async function createTopicsRecursively(
  syllabusId: string,
  topics: TopicData[],
  parentId: string | null = null
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
        syllabusId,
        topic.subtopics,
        createdTopic.id
      );
    }
  }
}

// Main seed function
async function seedSyllabus() {
  console.log("🌱 Starting syllabus seed...\n");

  try {
    // Get the first active project, center, and semester for seeding
    const project = await prisma.projects.findFirst({
      where: { status: "ACTIVE" },
    });

    if (!project) {
      console.error(
        "❌ No active project found. Please create a project first."
      );
      return;
    }

    const center = await prisma.centers.findFirst({
      where: { projectId: project.id },
    });

    if (!center) {
      console.error("❌ No center found. Please create a center first.");
      return;
    }

    const semester = await prisma.semesters.findFirst({
      where: { centerId: center.id },
    });

    if (!semester) {
      console.error("❌ No semester found. Please create a semester first.");
      return;
    }

    console.log(`📚 Using context:`);
    console.log(`   Project: ${project.name}`);
    console.log(`   Center: ${center.name}`);
    console.log(`   Semester: ${semester.name}\n`);

    // Array of all syllabi to seed
    const allSyllabi: SyllabusData[] = [
      primaryASyllabus,
      primaryBSyllabus,
      level1Syllabus,
      level2Syllabus,
      level3Syllabus,
      level4Syllabus,
    ];

    // Process each syllabus
    for (const syllabusData of allSyllabi) {
      console.log(`\n📖 Creating syllabus: ${syllabusData.name}`);

      // Check if syllabus already exists
      const existingSyllabus = await prisma.syllabus.findFirst({
        where: {
          projectId: project.id,
          centerId: center.id,
          semesterId: semester.id,
          level: syllabusData.level,
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
          level: syllabusData.level,
          name: syllabusData.name,
          description: syllabusData.description,
          isActive: true,
        },
      });

      console.log(`✓ Created syllabus: ${syllabus.name}`);
      console.log(`  Creating ${syllabusData.topics.length} topics...`);

      // Create all topics for this syllabus
      await createTopicsRecursively(syllabus.id, syllabusData.topics);

      console.log(`✅ Completed ${syllabusData.name}`);
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
