import { config } from "dotenv";
import { getCategoriesWithAxios } from "./axios.js";
import { executeWithAuth } from "./helpers.js";

config();
const parseQueries = async (bot, tickets) => {
  await executeWithAuth(
    () => getCategoriesWithAxios(bot, tickets),
    bot,
    tickets,
    null, // onSuccess callback
  );
};

// uncomment for testing
// await parseQueries(MOCK.BOT, MOCK.TICKETS);

export default parseQueries;
