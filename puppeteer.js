import puppeteer from "puppeteer";
import { config } from "dotenv";
import fs from "fs";

config();
const puppeteerScript = (bot, chatId, env, stickers, tickets, iDS_ARRAY) => {
  const {
    WEBSITE,
    USER_LOGIN,
    USER_PASSWORD,
    Q_CATEGORY,
    WANTED_SERVICE,
    SERVICES_CLASS,
    CATEGORIES_CLASS
  } = env;

  (async () => {
    const defaultTimeout = {
      timeout: 0,
      waitUntil: "domcontentloaded",
    };

    try {
      var browser = await puppeteer.launch({
        headless: "new",
        args: ["--no-sandbox", "--disable-setuid-sandbox", "--single-process", "--no-zygote"],
        protocolTimeout: 240000 // 2 minutes
      });
      const page = await browser.newPage();

      // Set screen size
      await page.setViewport({ width: 1080, height: 1024 });

      // read cookies
      const cookiesString = await fs.readFileSync("./cookies.json", (fsRead) =>
        console.log("read cookies", fsRead)
      );

      if (cookiesString) {
        console.log("set cookie", cookiesString);

        const cookiesView = JSON.parse(cookiesString);
        await page.setCookie(...cookiesView);
      }
      console.log("go to main page");

      // go to main page
      await page.goto(WEBSITE, defaultTimeout);

      // login
      const loginInputSelector = "#userName";
      const passInputSelector = "#pass";

      // Wait inputs
      const getCategories = async () => {
        console.log("get queries...");

        // get queries
        // Go back to website after redirect
        await page.goto(WEBSITE, defaultTimeout);
        await page.waitForSelector(CATEGORIES_CLASS, defaultTimeout);


        // wait loading is finished
          const loadingSelector = "#blockerFX"
          await page.$eval(loadingSelector, element=> element.style === { '0': 'opacity' })

        // category

        const linkSelector = `//td[contains(text(), '${Q_CATEGORY}')]`;

        const links = await page.waitForXPath(linkSelector, defaultTimeout);

        await links.click();

        // tickets
        const parsedTickets = await page.evaluate(
            (WANTED_SERVICE, SERVICES_CLASS) => {

                const getNumber = (service, wanted) => {
                    if (service) {
                        return service.split(wanted).map((it) => it.trim()).find((it) => it)
                    }   return service
                }

              return Array.from(
                  document.querySelectorAll(`[data-ng-repeat="${SERVICES_CLASS}"]`),
                  (element) => {
                      return {
                      name: getNumber(element?.textContent, WANTED_SERVICE),
                      show: element?.textContent.includes(WANTED_SERVICE)
                  }}
              )?.filter((it) => it.show).map((it) => it?.name);
            },
            WANTED_SERVICE,
            SERVICES_CLASS
        )

        var PARSED_TICKETS_LENGTH = 0

        const parsedTicketsLength = parsedTickets?.length;

        console.log("parsed tickets length: ", parsedTicketsLength, parsedTickets);

        await page.screenshot({ path: "./screenshots/services.png" });

        // work with tickets
        if (parsedTicketsLength && parsedTicketsLength > 0 && parsedTicketsLength !== PARSED_TICKETS_LENGTH) {
          // check ticket is new
          const excludeNewTickets = (existed, parsed) => {
            return parsed.reduce((acc,rec)=> {
              const isExists = existed.find((ser) => ser === rec)
              if (!isExists) {
                return [...acc, rec]
              } else return acc
            },[])
          }

          const newTickets = excludeNewTickets(tickets, parsedTickets)
          const newTicketsLength = newTickets?.length

          console.log('saved tickets', tickets)
          console.log('filtered only new tickets', newTickets)

          // send new tickets
          if (newTickets && newTicketsLength) {
            iDS_ARRAY.forEach(async (id) => {
              await bot.sendSticker(id, stickers.talon);
              bot.sendMessage(
                  id,
                  `На данный момент ${newTicketsLength} новых талонов: ${newTickets.join(', ')}`
              );
            })

            // add new services to tickets
            tickets.push(...newTickets)
            // remove duplicates
            const uniqueTickets = tickets.filter((element, index) => {
              return tickets.indexOf(element) === index;
            });
            tickets = uniqueTickets

            console.log('ticket was sent')
            console.log('new tickets array without duplicates', tickets)
          }

        }

        await browser.close();
      };

      try {
        await page.waitForSelector(loginInputSelector);

        console.log("login...");

        // Type into search box
        await page.type(loginInputSelector, USER_LOGIN);
        await page.type(passInputSelector, USER_PASSWORD);

        // Wait and click on first result
        const loginButtonSelector = "tr > td > button";
        await page.waitForSelector(loginButtonSelector);
        await page.click(loginButtonSelector);

        console.log("logged in");

        // save cookies
        const cookies = await page.cookies();

        console.log("save cookies");

        await fs.writeFile(
          "./cookies.json",
          JSON.stringify(cookies, null, 2),
          (fsWrite) => console.log("save cookies", fsWrite)
        );

        console.log("get categories with login");

        getCategories(WANTED_SERVICE);
      } catch {
        console.log("get categories without login");

        getCategories(WANTED_SERVICE);
      }
    } catch (e) {
      await browser.close();
      tickets = []
      console.log("error", e);

      iDS_ARRAY.forEach(async (id) => {
        await bot.sendSticker(id, stickers.unknown);
        bot.sendMessage(id, `Произошла ошибка. Бот продолжает работать, если ошибка повторится во время следующей итерации, попробуйте перезапустить бот. Если ошибка не повторилась, значит бот продолжает работать. Код ошибки: ${e}.`);
      })


    }
  })();
};
//
// const tickets = []
// puppeteerScript({sendMessage:()=>{}, sendSticker: () => {}}, null, process.env, true, tickets);
export default puppeteerScript;
