import { stickers } from "./consts.js";

export const excludeNewTickets = (existed, parsed) => {
  return parsed.reduce((acc, rec) => {
    const isExists = existed.find((ser) => ser === rec);
    if (!isExists) {
      return [...acc, rec];
    } else return acc;
  }, []);
};

export const sendError = (iDS_ARRAY, bot, e) => {
  iDS_ARRAY.forEach(async (id) => {
    await bot.sendSticker(id, stickers.unknown);
    bot.sendMessage(
      id,
      `Произошла ошибка. Бот продолжает работать, если ошибка повторится во время следующей итерации, попробуйте перезапустить бот. Если ошибка не повторилась, значит бот продолжает работать. Код ошибки: ${e}.`,
    );
  });
};
