import TelegramApi from "node-telegram-bot-api";
import { config } from "dotenv";
import parseQueries from "./parse.js";
import parseTable from "./table-parser.js";
import { COMMANDS, COMMANDS_LIST, SETTINGS, stickers } from "./consts.js";
import { sendMessage } from "./helpers.js";

config();

const {
  TELEGRAM_API_TOKEN,
  REQEST_INTERVAL,
  REQEST_TIMEOUT,
  AVAILABLE_CHAT_IDS,
} = process.env;

const bot = new TelegramApi(TELEGRAM_API_TOKEN, { polling: true });

bot.setMyCommands(COMMANDS_LIST);

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
    console.log("NEW startBot CHAT_ID", idOfChat);

    await sendMessage(
      bot,
      "Бот запущен, чтобы остановить напишите /stop",
      stickers.start,
    );

    await parseQueries(bot, tickets);

    scriptInterval = setInterval(async () => {
      if (isRunning) {
        await parseQueries(bot, tickets);
      } else {
        clearInterval(scriptInterval);
      }
    }, REQEST_INTERVAL);

    const sendAlreadyTwoHours = async (secondWarning) => {
      for (const id of SETTINGS.iDS_ARRAY) {
        console.log(
          secondWarning ? "already many hours..." : "already 2 hours...",
        );
        await sendMessage(
          bot,
          `Это я бот. Я запущен уже ${
            secondWarning ? "много часов :(" : "2 часа"
          }. Выключи бота командой /stop`,
          stickers.already2hours,
          id,
        );
      }
    };
    if (isRunning) {
      already2hoursTimeout = setTimeout(async () => {
        if (isRunning) {
          await sendAlreadyTwoHours(false);

          already2hoursInterval = setInterval(async () => {
            if (isRunning) {
              await sendAlreadyTwoHours(true);
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
    if (text === COMMANDS.START) {
      if (isRunning) {
        await sendMessage(
          bot,
          "Бот уже запущен, чтобы остановить напишите /stop",
          stickers.alreadyStarted,
          chatId,
        );
      } else {
        await startBot(chatId);
      }
    } else if (text === COMMANDS.STOP) {
      isRunning = false;
      tickets = [];
      clearTimeout(already2hoursTimeout);
      clearInterval(already2hoursInterval);
      clearInterval(scriptInterval);

      await sendMessage(
        bot,
        "Бот остановлен, для запуска напишите /start",
        stickers.stop,
      );
    } else if (text === COMMANDS.IDENTIFY) {
      await bot.sendMessage(chatId, `Your chatId is ${chatId}`);
    } else if (text === COMMANDS.STATUS) {
      if (isRunning) {
        await bot.sendSticker(chatId, stickers.statusOn);
        await bot.sendMessage(chatId, "Бот запущен");
      } else {
        await bot.sendSticker(chatId, stickers.statusOf);
        await bot.sendMessage(chatId, "Бот спит...");
      }
    } else {
      await sendMessage(
        bot,
        `Неизвестная команда, я знаю команды ${COMMANDS_LIST.map(
          (it) => it.command,
        ).join(", ")}`,
        stickers.unknown,
        chatId,
      );
    }
  } else {
    await sendMessage(bot, "Привет!", null, chatId);
  }
});

// parse google sheet

let sheetInterval;
let sheetIntervalTime = 240000; // 4 minutes;

sheetInterval = setInterval(async () => {
  await parseTable(bot);
}, sheetIntervalTime);
