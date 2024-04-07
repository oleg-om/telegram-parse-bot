import { config } from "dotenv";
import { SETTINGS, stickers } from "./consts.js";
config();

export const excludeNewTickets = (existed, parsed) => {
  return parsed.reduce((acc, rec) => {
    const isExists = existed.find((ser) => ser === rec);
    if (!isExists) {
      return [...acc, rec];
    } else return acc;
  }, []);
};

export const sendError = async (bot, e) => {
  for (const id of SETTINGS.iDS_ARRAY) {
    await bot.sendSticker(id, stickers.unknown);
    await bot.sendMessage(
      id,
      `Произошла ошибка. Бот продолжает работать, если ошибка повторится во время следующей итерации, попробуйте перезапустить бот. Если ошибка не повторилась, значит бот продолжает работать. Код ошибки: ${e}.`,
    );
  }
};

export const sendMessage = async (bot, text, sticker, user) => {
  if (!user) {
    for (const id of SETTINGS.iDS_ARRAY) {
      if (sticker) {
        await bot.sendSticker(id, sticker);
      }
      await bot.sendMessage(id, text);
    }
  } else {
    if (sticker) {
      await bot.sendSticker(user, sticker);
    }
    await bot.sendMessage(user, text);
  }
};
