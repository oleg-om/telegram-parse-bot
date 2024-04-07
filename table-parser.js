import PublicGoogleSheetsParser from "public-google-sheets-parser";
import { config } from "dotenv";
import winston, { createLogger } from "winston";
import { SETTINGS } from "./consts.js";

config();

var { SHEET_ID, TABLE_ID } = process.env;

const logger = createLogger({
  level: "info",
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: "logs/info.log", level: "info" }),
    new winston.transports.File({ filename: "logs/combined.log" }),
  ],
});

const stickers = {
  newRow:
    "https://tlgrm.ru/_/stickers/8eb/10f/8eb10f4b-8f4f-4958-aa48-80e7af90470a/6.webp",
};

let rows;

//TODO saving data for logging
let table;

const sendMessage = async (bot) => {
  for (const id of SETTINGS.iDS_ARRAY) {
    await bot.sendSticker(id, stickers.newRow);
    console.log(`message was sent, rows are: ${rows}`);
    await bot.sendMessage(
      id,
      `Похоже, в гугл таблицу добавилась запись! Зайди проверь, https://docs.google.com/spreadsheets/d/${TABLE_ID}/edit#gid=${SHEET_ID}`,
    );
  }
};

const parseTable = async (bot) => {
  const parser = new PublicGoogleSheetsParser(TABLE_ID);
  parser.sheetId = SHEET_ID;
  await parser.parse().then(async (items) => {
    const rowsLength = items?.length || 0;
    if (rowsLength) {
      if (rowsLength === rows) {
        console.log("rows are same...");

        return null;
      } else {
        if (rows) {
          await sendMessage(bot);

          logger.log({
            level: "info",
            rows: "new rows",
            old_data: table,
            new_data: items,
            message: "sent",
            length: items?.length,
            date: new Date(),
          });

          rows = rowsLength;
          table = items;
        } else {
          rows = rowsLength;
          table = items;

          console.log("there are no rows... maybe it was first init");

          logger.log({
            level: "info",
            rows: "new rows, but it is first rows",
            message: "no sent",
            length: items?.length,
            date: new Date(),
          });
        }
      }
    }
  });
};

// TODO mock func
// parseTable({
//   sendSticker: () => {},
//   sendMessage: () => {},
// });
export default parseTable;
