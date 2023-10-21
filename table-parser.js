import PublicGoogleSheetsParser from "public-google-sheets-parser";
import { config } from "dotenv";
import TelegramApi from "node-telegram-bot-api";

config();

var { TELEGRAM_API_TOKEN, SHEET_ID, TABLE_ID, AVAILABLE_CHAT_IDS } =
  process.env;
const iDS_ARRAY = AVAILABLE_CHAT_IDS.split(",");

const stickers = {
  newRow:
    "https://tlgrm.ru/_/stickers/8eb/10f/8eb10f4b-8f4f-4958-aa48-80e7af90470a/6.webp",
};

let scriptInterval;
let intervalTime = 900000; // 15 minutes;

let rows;

const bot = new TelegramApi(TELEGRAM_API_TOKEN, { polling: true });

const sendMessage = async () => {
  iDS_ARRAY.forEach(async (id) => {
    await bot.sendSticker(id, stickers.newRow);
    console.log(`message was sent, rows are: ${rows}`);
    bot.sendMessage(id, "Похоже, в гугл таблицу добавилась запись!");
  });
};

const parseTable = async () => {
  const parser = new PublicGoogleSheetsParser(TABLE_ID);
  parser.sheetId = SHEET_ID;
  await parser.parse().then(async (items) => {
    const rowsLength = items?.length || 0;
    if (rowsLength) {
      if (rowsLength === rows) {
        console.log("rows are same...");
        return null;
      } else {
        rows = rowsLength;
        await sendMessage();
      }
    }
  });
};

scriptInterval = setInterval(async () => {
  await parseTable();
}, intervalTime);
