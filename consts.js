import { config } from "dotenv";
config();

export const COMMANDS = {
  START: "/start",
  STOP: "/stop",
  STATUS: "/status",
  IDENTIFY: "/identify",
};

export const COMMANDS_LIST = [
  {
    command: COMMANDS.START,
    description: "Запустить бота",
  },
  {
    command: COMMANDS.STOP,
    description: "Остановить бота",
  },
  {
    command: COMMANDS.STATUS,
    description: "Бот запущен?",
  },
  {
    command: COMMANDS.IDENTIFY,
    description: "Идентификация",
  },
];

export const stickers = {
  start:
    "https://tlgrm.ru/_/stickers/bad/cbd/badcbdd2-589e-4319-b114-a17bdbb8968e/7.webp",
  stop: "https://tlgrm.ru/_/stickers/bad/cbd/badcbdd2-589e-4319-b114-a17bdbb8968e/34.webp",
  talon:
    "https://tlgrm.ru/_/stickers/bad/cbd/badcbdd2-589e-4319-b114-a17bdbb8968e/14.webp",
  alreadyStarted:
    "https://tlgrm.ru/_/stickers/bad/cbd/badcbdd2-589e-4319-b114-a17bdbb8968e/13.webp",
  already2hours:
    "https://tlgrm.ru/_/stickers/bad/cbd/badcbdd2-589e-4319-b114-a17bdbb8968e/3.webp",
  statusOf:
    "https://tlgrm.ru/_/stickers/bad/cbd/badcbdd2-589e-4319-b114-a17bdbb8968e/27.webp",
  statusOn:
    "https://tlgrm.ru/_/stickers/bad/cbd/badcbdd2-589e-4319-b114-a17bdbb8968e/32.webp",
  unknown:
    "https://tlgrm.ru/_/stickers/bad/cbd/badcbdd2-589e-4319-b114-a17bdbb8968e/12.webp",
};

export const FILES = {
  COOKIES: "./cookies.json",
};

export const SETTINGS = {
  iDS_ARRAY: process.env.AVAILABLE_CHAT_IDS.split(","),
};

export const MOCK = {
  BOT: { sendMessage: () => {}, sendSticker: () => {} },
  TICKETS: [],
};
