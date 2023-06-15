import puppeteer from "puppeteer";
import { config } from "dotenv";
import fs from "fs";

config();
const puppeteerScript = (bot, chatId, env, stickers, tickets) => {
  const {
    WEBSITE,
    USER_LOGIN,
    USER_PASSWORD,
    Q_CATEGORY,
    WANTED_SERVICE,
    SERVICES_CLASS,
    CATEGORIES_CLASS,
  } = env;

  (async () => {
    const defaultTimeout = {
      timeout: 0,
      waitUntil: "domcontentloaded",
    };

    try {
      var browser = await puppeteer.launch({
        headless: "new",
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
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

        // services
        const services = await page.evaluate(
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

        var SERVICES_LENGTH = 0

        const servicesLength = services?.length;

        console.log("servicesLength: ", servicesLength);

        await page.screenshot({ path: "./screenshots/services.png" });
        if (servicesLength && servicesLength > 0 && servicesLength !== SERVICES_LENGTH && tickets !== services) {
          tickets = services
          await bot.sendSticker(chatId, stickers.talon);
          bot.sendMessage(
            chatId,
            `На данный момент талонов: ${servicesLength}: ${services.join(', ')}`
          );
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

      console.log("error", e);

      await bot.sendSticker(chatId, stickers.unknown);
      bot.sendMessage(chatId, `Ошибка, напишите администратору: ${e}`);
    }
  })();
};

// const tickets = []
// puppeteerScript({sendMessage:()=>{}, sendSticker: () => {}}, null, process.env, true, tickets);
export default puppeteerScript;
