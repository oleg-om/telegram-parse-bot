import TelegramApi from "node-telegram-bot-api";
import { config } from "dotenv";
import puppeteerScript from "./puppeteer.js";

config();

const {
  TELEGRAM_API_TOKEN,
  REQEST_INTERVAL,
  REQEST_TIMEOUT,
  AVAILABLE_CHAT_IDS,
} = process.env;

const commands = [
  {
    command: "/start",
    description: "Запустить бота",
  },
  {
    command: "/stop",
    description: "Остановить бота",
  },
  {
    command: "/status",
    description: "Бот запущен?",
  },
  {
    command: "/identify",
    description: "Идентификация",
  },
];

const stickers = {
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

const bot = new TelegramApi(TELEGRAM_API_TOKEN, { polling: true });

bot.setMyCommands(commands);

let isRunning;

const availableIds = AVAILABLE_CHAT_IDS;

bot.on("message", async (msg) => {
  const text = msg?.text;
  const chatId = msg.chat.id;

  const startBot = async () => {
    isRunning = true;

    await bot.sendSticker(chatId, stickers.start);
    bot.sendMessage(chatId, "Бот запущен, чтобы остановить напишите /stop");

    puppeteerScript(bot, chatId, process.env, stickers);

    setInterval(() => {
      if (isRunning) {
        puppeteerScript(bot, chatId, process.env, stickers);
      } else {
        clearInterval(this);
      }
    }, REQEST_INTERVAL);

    const sendAlreadyTwoHours = async (secondWarning) => {
      await bot.sendSticker(chatId, stickers.already2hours);
      console.log(
        secondWarning ? "already many hours..." : "already 2 hours..."
      );

      bot.sendMessage(
        chatId,
        `Бот запущен уже ${
          secondWarning ? "много часов :(" : "2 часа"
        }. Выключи бота командой /stop`
      );
    };

    setTimeout(
      async () => {
        if (isRunning) {
          sendAlreadyTwoHours(false);

          setInterval(() => {
            if (isRunning) {
            sendAlreadyTwoHours(true);
              } else {
              clearInterval(this)
            }
          }, 180000);
        } else {
          clearTimeout(this);
        }
      },
      180000
      // REQEST_TIMEOUT
    );
  };

  if (availableIds.includes(chatId)) {
    if (text === "/start") {
      if (isRunning) {
        bot.sendSticker(chatId, stickers.alreadyStarted);
        bot.sendMessage(
          chatId,
          "Бот уже запущен, чтобы остановить напишите /stop"
        );
        return;
      } else {
        startBot();
      }
    } else if (text === "/stop") {
      isRunning = false;
      await bot.sendSticker(chatId, stickers.stop);
      bot.sendMessage(chatId, "Бот остановлен, для запуска напишите /start");
    } else if (text === "/identify") {
      bot.sendMessage(chatId, `Your chatId is ${chatId}`);
    } else if (text === "/status") {
      if (isRunning) {
        await bot.sendSticker(chatId, stickers.statusOn);
        bot.sendMessage(chatId, "Бот запущен");
      } else {
        await bot.sendSticker(chatId, stickers.statusOf);
        bot.sendMessage(chatId, "Бот спит...");
      }
    } else {
      await bot.sendSticker(chatId, stickers.unknown);
      bot.sendMessage(
        chatId,
        `Неизвестная команда, я знаю команды ${commands
          .map((it) => it.command)
          .join(", ")}`
      );
    }
  } else {
    bot.sendMessage(chatId, `Привет!`);
  }
});
