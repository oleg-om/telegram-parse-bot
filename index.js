import TelegramApi from "node-telegram-bot-api";
import { config } from "dotenv";
import puppeteerScript from "./puppeteer.js";
import parseTable from "./table-parser.js";
import { commands, stickers } from "./consts.js";

config();

const {
  TELEGRAM_API_TOKEN,
  REQEST_INTERVAL,
  REQEST_TIMEOUT,
  AVAILABLE_CHAT_IDS,
} = process.env;

const iDS_ARRAY = AVAILABLE_CHAT_IDS.split(",");

const bot = new TelegramApi(TELEGRAM_API_TOKEN, { polling: true });

bot.setMyCommands(commands);

let isRunning;

const availableIds = AVAILABLE_CHAT_IDS;
let tickets = [];

let already2hoursTimeout;
let already2hoursInterval;
let scriptInterval;

bot.on("message", async (msg) => {
  const text = msg?.text;
  const chatId = msg.chat.id;
  console.log("chatId", chatId);

  const startBot = async (idOfChat) => {
    isRunning = true;
    const CHAT_ID = idOfChat;
    console.log("NEW startBot CHAT_ID", CHAT_ID);

    iDS_ARRAY.forEach(async (id) => {
      await bot.sendSticker(id, stickers.start);
      bot.sendMessage(id, "Бот запущен, чтобы остановить напишите /stop");
    });

    puppeteerScript(bot, CHAT_ID, process.env, stickers, tickets, iDS_ARRAY);

    scriptInterval = setInterval(() => {
      if (isRunning) {
        puppeteerScript(
          bot,
          CHAT_ID,
          process.env,
          stickers,
          tickets,
          iDS_ARRAY,
        );
      } else {
        clearInterval(scriptInterval);
      }
    }, REQEST_INTERVAL);

    const sendAlreadyTwoHours = async (secondWarning) => {
      iDS_ARRAY.forEach(async (id) => {
        await bot.sendSticker(id, stickers.already2hours);
        console.log(
          secondWarning ? "already many hours..." : "already 2 hours...",
        );

        bot.sendMessage(
          id,
          `Это я бот. Я запущен уже ${
            secondWarning ? "много часов :(" : "2 часа"
          }. Выключи бота командой /stop`,
        );
      });
    };
    if (isRunning) {
      already2hoursTimeout = setTimeout(async () => {
        if (isRunning) {
          sendAlreadyTwoHours(false);

          already2hoursInterval = setInterval(() => {
            if (isRunning) {
              sendAlreadyTwoHours(true);
            } else {
              clearInterval(already2hoursInterval);
            }
          }, REQEST_TIMEOUT);
        } else {
          clearTimeout(already2hoursTimeout);
        }
      }, REQEST_TIMEOUT);
    } else {
      clearTimeout(already2hoursTimeout);
      clearInterval(already2hoursInterval);
    }
  };

  if (availableIds.includes(chatId)) {
    if (text === "/start") {
      if (isRunning) {
        bot.sendSticker(id, stickers.alreadyStarted);
        bot.sendMessage(id, "Бот уже запущен, чтобы остановить напишите /stop");
        return;
      } else {
        startBot(chatId);
      }
    } else if (text === "/stop") {
      isRunning = false;
      tickets = [];
      clearTimeout(already2hoursTimeout);
      clearInterval(already2hoursInterval);
      clearInterval(scriptInterval);
      iDS_ARRAY.forEach(async (id) => {
        await bot.sendSticker(id, stickers.stop);
        bot.sendMessage(id, "Бот остановлен, для запуска напишите /start");
      });
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
          .join(", ")}`,
      );
    }
  } else {
    bot.sendMessage(chatId, `Привет!`);
  }
});

// parse google sheet

let sheetInterval;
let sheetIntervalTime = 240000; // 4 minutes;

sheetInterval = setInterval(async () => {
  await parseTable(bot);
}, sheetIntervalTime);
