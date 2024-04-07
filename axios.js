import axios from "axios";
import { config } from "dotenv";
import fs from "fs";
import { excludeNewTickets, sendMessage } from "./helpers.js";
import { FILES, stickers } from "./consts.js";

config();

export const getCategoriesWithAxios = async (bot, tickets, cookies) => {
  console.log("get queries with axios...");
  // read cookies
  const cookiesString = await fs.readFileSync(FILES.COOKIES, (fsRead) =>
    console.log("read cookies from axios", fsRead),
  );

  const cookiesParsed = JSON.parse(cookies || cookiesString);
  const cookieValue = cookiesParsed?.find((it) => it)?.value || "";

  let parsedTickets = [];

  const listQueries = async () => {
    try {
      const res = await axios.get(process.env.BACKEND_URL, {
        withCredentials: true,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Content-Type": "application/json",
          Cookie: `JSESSIONID=${cookieValue}`,
        },
      });

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
    "axios parsed tickets length: ",
    parsedTicketsLength,
    parsedTickets,
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
      await sendMessage(
        bot,
        `На данный момент ${newTicketsLength} новых талонов: ${newTickets.join(
          ", ",
        )}`,
        stickers.talon,
      );

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
