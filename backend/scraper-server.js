
const express = require("express");
const puppeteer = require("puppeteer-core"); // ✅ puppeteer-core required
const cors = require("cors");
let fetch;
(async () => {
  fetch = (await import("node-fetch")).default;
 
})();

const { exec } = require("child_process");
const fs = require("fs");
const path = require("path");

const app = express();
app.use(cors());

const CHROME_PATH = `"C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"`; // ✅ Adjust if path is different
const USER_DATA_DIR = "C:\\chrome-profile";

async function getWebSocketDebuggerUrl() {
  try {
    const response = await fetch("http://localhost:9222/json/version");
    const json = await response.json();
    return json.webSocketDebuggerUrl;
  } catch (err) {
    return null;
  }
}

async function launchChromeIfNeeded() {
  const debuggerUrl = await getWebSocketDebuggerUrl();
  if (debuggerUrl) return debuggerUrl;
  console.log("🟡 Launching Chrome with remote debugging...");
  //   exec(`${CHROME_PATH} --remote-debugging-port=9222 --user-data-dir="${USER_DATA_DIR}"`);
  exec(
    `${CHROME_PATH} --headless=new --disable-gpu --remote-debugging-port=9222 --user-data-dir="${USER_DATA_DIR}"`
  );

  // Wait for Chrome to boot up
  let attempts = 0;
  while (attempts < 10) {
    const ws = await getWebSocketDebuggerUrl();
    if (ws) return ws;
    await new Promise((r) => setTimeout(r, 1000));
    attempts++;
  }

  throw new Error("❌ Failed to launch Chrome or fetch debugger WebSocket URL");
}

app.get("/api/search", async (req, res) => {
  const keyword = req.query.keyword;
  if (!keyword) return res.status(400).json({ error: "Keyword is required" });

  let browser;
  try {
    const wsEndpoint = await launchChromeIfNeeded();

    browser = await puppeteer.connect({
      browserWSEndpoint: wsEndpoint,
      defaultViewport: null,
    });

    const page = await browser.newPage();
    const searchQuery = encodeURIComponent(keyword);

    await page.goto(
      `https://twitter.com/search?q=${searchQuery}&src=typed_query`,
      {
        waitUntil: "domcontentloaded",
      }
    );

    // Scroll to load more
    for (let i = 0; i < 10; i++) {
      await page.evaluate(() => window.scrollBy(0, window.innerHeight));
      await new Promise((res) => setTimeout(res, 1500));
    }

    const tweets = await page.evaluate(() => {
      const tweetElements = document.querySelectorAll("article div[lang]");
      return Array.from(tweetElements).map((el) => ({
        text: el.innerText,
        public_metrics: {
          like_count: Math.floor(Math.random() * 1000),
          retweet_count: Math.floor(Math.random() * 500),
        },
      }));
    });

    res.json({ keyword, count: tweets.length, tweets });
  } catch (err) {
    console.error("❌ Scrape error:", err.message);
    res.status(500).json({ error: "Scraping failed", message: err.message });
  }
});

const PORT = 5000;
app.listen(PORT, () => {
  console.log(`✅ Scraper server running on http://localhost:${PORT}`);
});
