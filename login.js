import { config } from "dotenv";
import puppeteer from "puppeteer";
import fs from "fs";
import { FILES } from "./consts.js";

config();

export const login = async () => {
  const { WEBSITE, USER_LOGIN, USER_PASSWORD } = process.env;

  const defaultTimeout = {
    timeout: 0,
    waitUntil: "domcontentloaded",
  };

  var browser = await puppeteer.launch({
    headless: "new",
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      // "--single-process",
      "--no-zygote",
    ],
    protocolTimeout: 240000, // 2 minutes
  });

  try {
    const page = await browser.newPage();

    // Set screen size
    await page.setViewport({ width: 1080, height: 1024 });

    // read cookies
    const cookiesString = await fs.readFileSync(FILES.COOKIES, (fsRead) =>
      console.log("read cookies", fsRead),
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

      if (cookies) {
        await fs.writeFile(
          FILES.COOKIES,
          JSON.stringify(cookies, null, 2),
          (fsWrite) => console.log("save cookies", fsWrite),
        );
      }

      return JSON.stringify(cookies, null, 2);
    } catch (e) {
      console.log("login error", e);
      throw new Error(e);
    }
  } catch (e) {
    await browser.close();
    console.log("login error", e);
    throw new Error("Ошибка при логине: " + e);
  }
};
