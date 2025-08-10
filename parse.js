import { config } from "dotenv";
import { getCategoriesWithAxios } from "./axios.js";
import { executeWithAuth } from "./helpers.js";
import { MOCK } from "./consts.js";

config();
const parseQueries = async (bot, tickets) => {
  await executeWithAuth(
    () => getCategoriesWithAxios(bot, tickets),
    bot,
    tickets,
    null, // onSuccess callback
    15000  // таймаут 15 секунд для парсинга талонов
  );
};

// uncomment for testing
// await parseQueries(MOCK.BOT, MOCK.TICKETS);

export default parseQueries;
