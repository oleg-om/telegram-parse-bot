import { config } from "dotenv";
import { SETTINGS, stickers, FILES } from "./consts.js";
import { login } from "./login.js";
import fs from "node:fs";

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

/**
 * Получает cookies для авторизованных запросов
 * @param {string} cookiesParam - Переданные cookies (опционально)
 * @returns {Object} Объект с настройками для axios запросов
 */
export const getCookiesForRequest = async (cookiesParam = null) => {
  try {
    // Читаем cookies из файла
    const cookiesString = await fs.readFileSync(FILES.COOKIES, (fsRead) =>
      console.log("read cookies from helpers", fsRead),
    );

    // Парсим cookies
    const cookiesParsed = JSON.parse(cookiesParam || cookiesString);
    const cookieValue = cookiesParsed?.find((it) => it)?.value || "";

    // Возвращаем готовые настройки для axios
    return {
      withCredentials: true,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Content-Type": "application/json",
        Cookie: `JSESSIONID=${cookieValue}`,
      },
    };
  } catch (error) {
    console.error("Ошибка при получении cookies:", error);
    // Возвращаем базовые настройки без cookies
    return {
      withCredentials: true,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Content-Type": "application/json",
      },
    };
  }
};

/**
 * Выполняет запрос с автоматической авторизацией при ошибке 401
 * @param {Function} requestFunction - Функция для выполнения запроса
 * @param {Object} bot - Объект бота для отправки ошибок
 * @param {Array} tickets - Массив талонов (опционально)
 * @param {Function} onSuccess - Callback при успешном выполнении
 * @returns {Promise<any>} Результат выполнения запроса
 */
export const executeWithAuth = async (
  requestFunction,
  bot,
  tickets = null,
  onSuccess = null,
) => {
  try {
    // Выполняем запрос
    const result = await requestFunction();

    if (onSuccess) {
      await onSuccess(result);
    }

    return result;
  } catch (error) {
    // Проверяем на ошибку 401 (неавторизован)
    if (error?.response?.status === 401) {
      console.log("Unauthorized request, attempting login...");

      try {
        // Выполняем логин
        await login(tickets, bot);
        
        // Повторяем запрос после успешной авторизации
        console.log("Login successful, retrying request...");
        const retryResult = await requestFunction();
        
        if (onSuccess) {
          await onSuccess(retryResult);
        }
        
        return retryResult;
      } catch (loginError) {
        console.log("Fatal error during login:", loginError);
        if (tickets) {
          tickets.length = 0; // Очищаем массив талонов
        }
        await sendError(bot, loginError);
        throw loginError;
      }
    } else {
      // Если это не ошибка 401, пробрасываем ошибку дальше
      throw error;
    }
  }
};
