import TelegramApi from "node-telegram-bot-api";
import { config } from "dotenv";
import parseQueries from "./parse.js";
import parseTable from "./table-parser.js";
import { COMMANDS, COMMANDS_LIST, SETTINGS, stickers } from "./consts.js";
import { sendMessage } from "./helpers.js";
import {
  getBranches,
  getCurrentBranchInfo,
  setCurrentBranch,
  generateBranchesFile,
  cleanupBranchesFile,
} from "./branches.js";

config();

console.log("=== Telegram Parse Bot ===");
console.log("Node version:", process.version);
console.log("Starting bot initialization...");

const {
  TELEGRAM_API_TOKEN,
  REQEST_INTERVAL,
  REQEST_TIMEOUT,
  AVAILABLE_CHAT_IDS,
} = process.env;

if (!TELEGRAM_API_TOKEN) {
  console.error("ERROR: TELEGRAM_API_TOKEN not set in .env");
  process.exit(1);
}

if (!AVAILABLE_CHAT_IDS) {
  console.error("ERROR: AVAILABLE_CHAT_IDS not set in .env");
  process.exit(1);
}

console.log("Creating Telegram bot instance...");
const bot = new TelegramApi(TELEGRAM_API_TOKEN, { polling: true });

bot.setMyCommands(COMMANDS_LIST);

console.log("Bot initialized successfully!");
console.log("Allowed chat IDs:", AVAILABLE_CHAT_IDS);
console.log("Request interval:", REQEST_INTERVAL, "ms");
console.log("Waiting for messages...");

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

    const currentBranchInfo = await getCurrentBranchInfo(bot);
    await sendMessage(
      bot,
      `🚀 Бот запущен, чтобы остановить напишите /stop.\n\n🏢 Текущая ветка: ${currentBranchInfo.name} (ID: ${currentBranchInfo.id}), для изменения: ${COMMANDS.BRANCHES}`,
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
          `😥 Это я бот. Я запущен уже ${
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
          `Бот уже запущен, чтобы остановить напишите /stop`,
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
        "🛑 Бот остановлен, для запуска напишите /start",
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
    } else if (text === COMMANDS.BRANCH) {
      const currentBranchInfo = await getCurrentBranchInfo(bot);
      await bot.sendMessage(
        chatId,
        `🏢 Текущая ветка: ${currentBranchInfo.name} (ID: ${currentBranchInfo.id}), для изменения: ${COMMANDS.BRANCHES}`,
      );
    } else if (text.startsWith("/branch ")) {
      // Обработка команды /branch <ID>
      const branchId = parseInt(text.split(" ")[1]);
      if (isNaN(branchId)) {
        await bot.sendMessage(
          chatId,
          "❌ Неверный формат. Используйте: /branch <ID>",
        );
        return;
      }

      try {
        const branches = await getBranches(bot);
        const branchExists = branches.find((branch) => branch.id === branchId);

        if (!branchExists) {
          await bot.sendMessage(chatId, `❌ Ветка с ID ${branchId} не найдена`);
          return;
        }

        setCurrentBranch(branchId);
        await bot.sendMessage(
          chatId,
          `✅ Ветка успешно изменена на: ${branchExists.name} (ID: ${branchExists.id})`,
        );
      } catch (error) {
        console.error("Ошибка при смене ветки:", error);
        await bot.sendMessage(chatId, "Произошла ошибка при смене ветки");
      }
    } else if (text === COMMANDS.BRANCHES) {
      await sendBranchesFile(bot, chatId);
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

// Функция для отправки файла со списком веток
const sendBranchesFile = async (bot, chatId) => {
  try {
    await bot.sendMessage(chatId, "Генерирую файл со списком веток...");

    const { filePath, fileName } = await generateBranchesFile(bot);

    // Отправляем файл
    await bot.sendDocument(chatId, filePath, {
      caption:
        "📋 Список всех доступных веток\n\nДля выбора ветки используйте команду /branch <ID>\nНапример: /branch 720",
    });

    // Удаляем временный файл
    cleanupBranchesFile(filePath);
  } catch (error) {
    console.error("Ошибка при отправке файла веток:", error);
    await bot.sendMessage(chatId, "Произошла ошибка при загрузке списка веток");
  }
};

// Функция для показа меню выбора ветки (оставляем для совместимости, но не используем)
const showBranchSelectionMenu = async (bot, chatId) => {
  try {
    const branches = await getBranches(bot);

    if (branches?.length === 0) {
      await bot.sendMessage(chatId, "Не удалось загрузить список веток");
      return;
    }

    const keyboard = {
      inline_keyboard: branches.map((branch) => [
        {
          text: `${branch.name} (${branch.id})`,
          callback_data: `branch_${branch.id}`,
        },
      ]),
    };

    await bot.sendMessage(chatId, "Выберите ветку для парсинга талонов:", {
      reply_markup: keyboard,
    });
  } catch (error) {
    console.error("Ошибка при показе меню веток:", error);
    await bot.sendMessage(chatId, "Произошла ошибка при загрузке списка веток");
  }
};

// Обработчик callback-запросов от инлайн-клавиатуры
bot.on("callback_query", async (callbackQuery) => {
  const chatId = callbackQuery.message.chat.id;
  const data = callbackQuery.data;

  if (data.startsWith("branch_")) {
    const branchId = parseInt(data.replace("branch_", ""));
    setCurrentBranch(branchId);

    const currentBranchInfo = await getCurrentBranchInfo(bot);
    await bot.answerCallbackQuery(callbackQuery.id, {
      text: `Ветка изменена на: ${currentBranchInfo.name}`,
    });

    await bot.editMessageText(
      `✅ Ветка успешно изменена на: ${currentBranchInfo.name} (ID: ${currentBranchInfo.id})`,
      {
        chat_id: chatId,
        message_id: callbackQuery.message.message_id,
      },
    );
  }
});

// parse google sheet

let sheetInterval;
let sheetIntervalTime = 240000; // 4 minutes;

sheetInterval = setInterval(async () => {
  await parseTable(bot);
}, sheetIntervalTime);

// Обработка необработанных ошибок
process.on("uncaughtException", (error) => {
  console.error("UNCAUGHT EXCEPTION:", error);
  console.error(error.stack);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("UNHANDLED REJECTION at:", promise);
  console.error("Reason:", reason);
});

// Обработка ошибок polling у бота
bot.on("polling_error", (error) => {
  console.error("POLLING ERROR:", error.code, error.message);
});
