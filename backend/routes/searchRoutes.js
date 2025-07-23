const express = require("express");
const db = require("../db");
const axios = require("axios");
const puppeteer = require("puppeteer-core");
const { exec } = require("child_process");
let fetch;
(async () => {
  fetch = (await import("node-fetch")).default;
})();

const router = express.Router();

const CHROME_PATH = `"C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"`;
const USER_DATA_DIR = "C:\\chrome-profile";
async function generateReply(tweetContent) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  const response = await axios.post(
    "https://openrouter.ai/api/v1/chat/completions",
    {
      model: "mistralai/mixtral-8x7b-instruct", // or other free model
      messages: [
        {
          role: "user",
          content: `Reply smartly to this tweet:\n"${tweetContent}"\nMake it personal, friendly, and relevant.Be professional and do not use emojis and crisp and small contents `,
        },
      ],
    },
    {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
    }
  );

  const reply = response.data.choices[0]?.message?.content;
  // console.log("Reply:", reply);
  return reply;
}
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
  exec(
    `${CHROME_PATH} --headless=new --disable-gpu --remote-debugging-port=9222 --user-data-dir="${USER_DATA_DIR}"`
  );

  let attempts = 0;
  while (attempts < 10) {
    const ws = await getWebSocketDebuggerUrl();
    if (ws) return ws;
    await new Promise((r) => setTimeout(r, 1000));
    attempts++;
  }

  throw new Error("❌ Failed to launch Chrome or fetch debugger WebSocket URL");
}
router.get("/search", async (req, res) => {
  const rawKeyword = req.query.keyword;
  const minLikes = parseInt(req.query.minLikes || "0");
  const minRetweets = parseInt(req.query.minRetweets || "0");
  const minFollowers = parseInt(req.query.minFollowers || "0");
  const maxResults = parseInt(req.query.max_results || "10");
  if (!rawKeyword)
    return res.status(400).json({ error: "Keyword is required" });

  const keywords = rawKeyword
    .split(",")
    .map((k) => k.trim())
    .filter((k) => k);

  try {
    let allTweets = [];

    for (const keyword of keywords) {
      // 1. Store in history
      await db.query(`INSERT INTO search_history (keyword) VALUES ($1)`, [
        keyword,
      ]);

      // 2. Check DB cache first
      const cached = await db.query(
        `SELECT * FROM tweets WHERE keyword = $1 AND like_count >= $2 AND retweet_count >= $3 AND followers_count >= $4 ORDER BY created_at DESC`,
        [keyword, minLikes, minRetweets, minFollowers]
      );

      if (cached.rows.length > 0) {
        allTweets.push(...cached.rows);
        continue;
      }

      // 3. Scrape if not in cache
      const wsEndpoint = await launchChromeIfNeeded();
      const browser = await puppeteer.connect({
        browserWSEndpoint: wsEndpoint,
        defaultViewport: null,
      });

      const page = await browser.newPage();
      const searchQuery = encodeURIComponent(keyword);
      await page.goto(
        `https://twitter.com/search?q=${searchQuery}&src=typed_query`,
        { waitUntil: "domcontentloaded" }
      );

      for (let i = 0; i < 10; i++) {
        await page.evaluate(() => window.scrollBy(0, window.innerHeight));
        await new Promise((res) => setTimeout(res, 1500));
      }

      const scrapedTweets = await page.evaluate(() => {
  const articles = document.querySelectorAll("article");

  return Array.from(articles).map((article) => {
    const text = article.querySelector("div[lang]")?.innerText;
    const idMatch = article
      .querySelector('a[href*="/status/"]')
      ?.getAttribute("href")
      ?.match(/status\/(\d+)/);
    const id = idMatch ? idMatch[1] : null;

    const metricsLabel = article.querySelector('[role="group"]')?.getAttribute("aria-label") || "";

    // Extract values using regex
   const replies = Number((metricsLabel.match(/(\d+)\s+repl/))?.[1]) || 0;
const retweets = Number((metricsLabel.match(/(\d+)\s+repost/))?.[1]) || 0;
const likes = Number((metricsLabel.match(/(\d+)\s+like/))?.[1]) || 0;
const bookmarks = Number((metricsLabel.match(/(\d+)\s+bookmark/))?.[1]) || 0;
const views = Number((metricsLabel.match(/(\d+)\s+view/))?.[1]) || 0;


    if (!id || !text) return null;

    return {
      id,
      text,
      reply_count: replies,
      retweet_count: retweets,
      like_count: likes,
      bookmark_count: bookmarks,
      view_count: views,
    };
  }).filter(Boolean);
});


      for (const tweet of scrapedTweets) {
        const reply = await generateReply(tweet.text);
        tweet.reply = reply;

        await db.query(
          `INSERT INTO tweets (id, text, reply, like_count, retweet_count,followers_count, keyword, created_at)
           VALUES ($1, $2, $3, $4, $5, $6,$7, NOW())
           ON CONFLICT (id) DO NOTHING`,
          [
            tweet.id,
            tweet.text,
            reply,
            tweet.like_count,
            tweet.retweet_count,
            tweet.followers_count,
            keyword,
          ]
        );
      }

      // Add scraped tweets to result if they match filter
      let filtered = scrapedTweets;
      const isFilteringApplied =
        minLikes > 0 && minRetweets > 0 && minFollowers > 0;

      if (isFilteringApplied) {
        filtered = scrapedTweets.filter(
          (tweet) =>
            tweet.like_count >= minLikes &&
            tweet.retweet_count >= minRetweets &&
            tweet.followers_count >= minFollowers
        );
      }

      // allTweets.push(...filtered);
      allTweets.push(...filtered.slice(0, maxResults));
    }

    res.json({
      keywords,
      from: "cache",
      count: allTweets.length,
      tweets: allTweets,
    });
  } catch (err) {
    console.error("❌ Scrape error:", err.message);
    res.status(500).json({ error: "Scraping failed", message: err.message });
  }
});

router.get("/search/history", async (req, res) => {
  try {
    const result = await db.query(`
      SELECT id, text,reply, like_count, retweet_count, keyword, created_at
      FROM tweets
      ORDER BY created_at DESC
    `);
    const formattedData = result.rows.map(post => ({
      ...post,
      tweet_url: `https://twitter.com/i/web/status/${post.id}`
    }));

    res.json(formattedData);
    // res.json(result.rows);
  } catch (err) {
    console.error("❌ Failed to fetch tweet history:", err.message);
    res.status(500).json({ error: "Failed to fetch tweet history" });
  }
});

router.delete("/search/delete/:id", async (req, res) => {
  const { id } = req.params;
  try {
    await db.query(`DELETE FROM tweets WHERE id = $1`, [id]);
    res.json({ success: true });
  } catch (err) {
    console.error("Delete error:", err.message);
    res.status(500).json({ error: "Delete failed" });
  }
});
// POST /api/post-reply
router.post("/postReply", async (req, res) => {
  const { tweetId, reply, accountId } = req.body;
  const authHeader = req.headers.authorization;

  if (!authHeader || !tweetId || !reply) {
    return res.status(400).json({ message: 'Missing token, tweetId or reply' });
  }

  try {
    let accessToken = authHeader.replace("Bearer ", "");

    // If accountId is provided, get the access token for that account
    if (accountId) {
      const accountResult = await db.query(
        'SELECT access_token FROM social_media_accounts WHERE id = $1 AND deleted_at IS NULL',
        [accountId]
      );

      if (accountResult.rows.length > 0 && accountResult.rows[0].access_token) {
        accessToken = accountResult.rows[0].access_token;
      }
    }

    // Call Twitter API here to post the reply
    const twitterResponse = await axios.post(
      `https://api.twitter.com/2/tweets`,
      {
        text: reply,
        reply: { in_reply_to_tweet_id: tweetId },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    res.json({
      message: "Reply posted successfully",
      data: twitterResponse.data,
      accountId: accountId || null
    });
  } catch (err) {
    console.error("Tweet post error", err?.response?.data || err);
    res.status(500).json({ error: "Failed to post tweet" });
  }
});

// PUT /api/search/update/:id - Update reply for a tweet
router.put("/update/:id", async (req, res) => {
  const { id } = req.params;
  const { reply } = req.body;

  if (!reply) {
    return res.status(400).json({ message: 'Reply content is required' });
  }

  try {
    await db.query(
      `UPDATE tweets SET reply = $1 WHERE id = $2`,
      [reply, id]
    );

    res.json({ success: true, message: 'Reply updated successfully' });
  } catch (err) {
    console.error("Update error:", err.message);
    res.status(500).json({ error: "Update failed" });
  }
});

module.exports = router;
