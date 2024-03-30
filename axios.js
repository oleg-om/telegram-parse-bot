import axios from "axios";
import { config } from "dotenv";
import fs from "fs";
import { excludeNewTickets } from "./helpers.js";

config();

export const getCategoriesWithAxios = async (
  bot,
  tickets,
  stickers,
  iDS_ARRAY,
) => {
  console.log("get queries...");

  // read cookies
  const cookiesString = await fs.readFileSync("./cookies.json", (fsRead) =>
    console.log("read cookies", fsRead),
  );
  const cookiesParsed = JSON.parse(cookiesString);
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
      const thereAreNewTickets = res?.data
        ?.filter((it) => it?.serviceId === Number(process.env.SERVICE_ID))
        ?.map((it) => it?.formattedTicketNumber)
        ?.filter((it) => it);

      parsedTickets = thereAreNewTickets;
    } catch (err) {
      console.error(err.response.status);
      throw new Error(err?.response);
    }

    await listQueries();

    var PARSED_TICKETS_LENGTH = 0;

    const parsedTicketsLength = parsedTickets?.length;

    console.log("parsed tickets length: ", parsedTicketsLength, parsedTickets);

    // work with tickets
    if (
      parsedTicketsLength &&
      parsedTicketsLength > 0 &&
      parsedTicketsLength !== PARSED_TICKETS_LENGTH
    ) {
      // check ticket is new
      const newTickets = excludeNewTickets(tickets, parsedTickets);
      const newTicketsLength = newTickets?.length;

      console.log("saved tickets", tickets);
      console.log("filtered only new tickets", newTickets);

      // send new tickets
      if (newTickets && newTicketsLength) {
        iDS_ARRAY.forEach(async (id) => {
          await bot.sendSticker(id, stickers.talon);
          bot.sendMessage(
            id,
            `На данный момент ${newTicketsLength} новых талонов: ${newTickets.join(
              ", ",
            )}`,
          );
        });

        // add new services to tickets
        tickets.push(...newTickets);
        // remove duplicates
        const uniqueTickets = tickets.filter((element, index) => {
          return tickets.indexOf(element) === index;
        });
        tickets = uniqueTickets;

        console.log("ticket was sent");
        console.log("new tickets array without duplicates", tickets);
      }
    }
  };
};
// const tickets = [];
// getCategoriesWithAxios(
//   { sendMessage: () => {}, sendSticker: () => {} },
//   tickets,
//   true,
//   [],
// );
