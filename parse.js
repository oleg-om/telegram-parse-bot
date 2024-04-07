import { config } from "dotenv";
import { getCategoriesWithAxios } from "./axios.js";
import { login } from "./login.js";
import { sendError } from "./helpers.js";
import { MOCK } from "./consts.js";

config();
const parseQueries = async (bot, tickets) => {
  try {
    await getCategoriesWithAxios(bot, tickets);
  } catch (error) {
    if (error.message === "401") {
      console.log("start login");
      await login(tickets, bot)
        .then(async (cookies) => {
          setTimeout(async () => {
            await getCategoriesWithAxios(bot, tickets, cookies);
          }, 100);
        })
        .catch(async (e) => {
          console.log("fatal error", e);
          tickets = [];
          await sendError(bot, e);
        });
    }
  }
};

// uncomment for testing
// await parseQueries(MOCK.BOT, MOCK.TICKETS);

export default parseQueries;
