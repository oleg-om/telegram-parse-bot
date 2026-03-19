import axios from "axios";
import { config } from "dotenv";
import {
  excludeNewTickets,
  sendMessage,
  getCookiesForRequest,
} from "./helpers.js";
import { sendNewTicketsEmail } from "./email.js";
import { stickers } from "./consts.js";
import { getCurrentBranch } from "./branches.js";

config();

export const getCategoriesWithAxios = async (bot, tickets, cookies) => {
  const currentBranch = getCurrentBranch();
  console.log(`get queries with axios for branch ${currentBranch}...`);

  let parsedTickets = [];

  const listQueries = async () => {
    try {
      const requestConfig = await getCookiesForRequest(cookies);
      const res = await axios.get(
        process.env.QUERY_URL.replace("XXX", currentBranch),
        requestConfig,
      );

      parsedTickets = res?.data
        ?.filter((it) => it?.serviceId === Number(process.env.SERVICE_ID))
        ?.map((it) => it?.formattedTicketNumber)
        ?.filter((it) => it);
    } catch (err) {
      console.error("error with axios", err?.response?.status);
      const unauthorized = err?.response?.status === 401;
      if (unauthorized) {
        throw new Error(401);
      } else {
        await sendMessage(
          bot,
          "Я не смог забрать талоны, меня не пустили :( Но я продолжаю работать, может в следующий раз повезет!",
          stickers.unknown,
        );
      }
    }
  };
  await listQueries();

  var PARSED_TICKETS_LENGTH = 0;

  const parsedTicketsLength = parsedTickets?.length;

  console.log(
    `axios parsed tickets length: ${parsedTicketsLength}, ${parsedTickets}. branch: ${currentBranch}`,
  );

  // work with tickets
  if (
    parsedTicketsLength &&
    parsedTicketsLength > 0 &&
    parsedTicketsLength !== PARSED_TICKETS_LENGTH
  ) {
    // check ticket is new
    const newTickets = excludeNewTickets(tickets, parsedTickets);
    const newTicketsLength = newTickets?.length;

    console.log("axios saved tickets", tickets);
    console.log("axios filtered only new tickets", newTickets);

    // send new tickets
    if (newTickets && newTicketsLength) {
      const newTicketsText = `На данный момент ${newTicketsLength} новых талонов: ${newTickets.join(
        ", ",
      )}`;

      await sendMessage(bot, newTicketsText, stickers.talon);

      try {
        await sendNewTicketsEmail(newTicketsText);
      } catch (e) {
        console.error("email notify failed:", e?.message || e);
      }

      // add new services to tickets
      tickets.push(...newTickets);
      // remove duplicates
      tickets = tickets.filter((element, index) => {
        return tickets.indexOf(element) === index;
      });

      console.log("axios ticket was sent");
      console.log("axios new tickets array without duplicates", tickets);
    }
  }
};
