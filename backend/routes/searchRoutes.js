const express = require("express");
const db = require("../db");
const axios = require("axios");
const puppeteer = require("puppeteer");
const pool = require("../db"); // PostgreSQL Pool
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

      // 2. Check DB cache first with proper filtering
      let query = `SELECT * FROM tweets WHERE keyword = $1`;
      const params = [keyword];
      let paramIndex = 2;
      
      // Only add conditions for parameters that are provided
      if (minLikes > 0) {
        query += ` AND like_count >= $${paramIndex}`;
        params.push(minLikes);
        paramIndex++;
      }
      
      if (minRetweets > 0) {
        query += ` AND retweet_count >= $${paramIndex}`;
        params.push(minRetweets);
        paramIndex++;
      }
      
      if (minFollowers > 0) {
        query += ` AND followers_count >= $${paramIndex}`;
        params.push(minFollowers);
        paramIndex++;
      }
      
      query += ` ORDER BY created_at DESC`;
      
      console.log("DB Query:", query, "Params:", params);
      const cached = await db.query(query, params);

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

    // Extract author information if available
    const authorElement = article.querySelector('div[data-testid="User-Name"]');
    const followersText = authorElement?.innerText || '';
    // Try to extract followers count from author info
    const followersMatch = followersText.match(/(\d+(?:[,.]\d+)*)\s*Followers/i);
    const followers = followersMatch ?
      parseInt(followersMatch[1].replace(/[,.]/g, '')) : 0;

    return {
      id,
      text,
      reply_count: replies,
      retweet_count: retweets,
      like_count: likes,
      bookmark_count: bookmarks,
      view_count: views,
      followers_count: followers,
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
            10000,
            keyword,
          ]
        );
      }

      // Always apply filtering based on provided criteria
      let filtered = scrapedTweets.filter(
        (tweet) =>
          tweet.like_count >= minLikes &&
          tweet.retweet_count >= minRetweets &&
          (minFollowers === 0 || tweet.followers_count >= minFollowers)
      );

      console.log(`Filtered tweets: ${filtered.length} out of ${scrapedTweets.length}`);
      console.log(`Filtering criteria: minLikes=${minLikes}, minRetweets=${minRetweets}, minFollowers=${minFollowers}`);

      // Add filtered tweets to result
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
// router.post("/postReply", async (req, res) => {
//   const { tweetId, reply, accountId } = req.body;
//   const authHeader = req.headers.authorization;

//   if (!authHeader || !tweetId || !reply) {
//     return res.status(400).json({ message: 'Missing token, tweetId or reply' });
//   }

//   try {
//     let accessToken = authHeader.replace("Bearer ", "");

//     // If accountId is provided, get the access token for that account
//     if (accountId) {
//       const accountResult = await db.query(
//         'SELECT access_token FROM social_media_accounts WHERE id = $1 AND deleted_at IS NULL',
//         [accountId]
//       );

//       if (accountResult.rows.length > 0 && accountResult.rows[0].access_token) {
//         accessToken = accountResult.rows[0].access_token;
//       }
//     }

//     // Call Twitter API here to post the reply
//     const twitterResponse = await axios.post(
//       `https://api.twitter.com/2/tweets`,
//       {
//         text: reply,
//         reply: { in_reply_to_tweet_id: tweetId },
//       },
//       {
//         headers: {
//           Authorization: `Bearer ${accessToken}`,
//           "Content-Type": "application/json",
//         },
//       }
//     );

//     res.json({
//       message: "Reply posted successfully",
//       data: twitterResponse.data,
//       accountId: accountId || null
//     });
//   } catch (err) {
//     console.error("Tweet post error", err?.response?.data || err);
//     res.status(500).json({ error: "Failed to post tweet" });
//   }
// });
router.post("/postReply", async (req, res) => {
  const {
     tweetId,
        replyText,
        selectedAccountId

  } = req.body;

  const engagementCount = (likeCount || 0) + (retweetCount || 0);

  try {
    const insertQuery = `
      INSERT INTO post_history 
        (post_text, post_url, posted_at, engagement_count, likes_count, retweets_count, created_at, updated_at, keyword_id, account_id)
      VALUES 
        ($1, $2, NOW(), $3, $4, $5, NOW(), NOW(), $6, $7)
      RETURNING id
    `;

    const values = [
      tweetText,
      tweetUrl,
      engagementCount,
      likeCount,
      retweetCount,
      keywordId,
      accountId,
    ];

    const result = await pool.query(insertQuery, values);

    res.status(200).json({
      success: true,
      message: "Post added to history",
      post_id: result.rows[0].id,
    });
  } catch (error) {
    console.error("Insert Error:", error.message);
    res.status(500).json({ success: false, message: "Failed to save post" });
  }
});

router.post("/reply-to-tweet", async (req, res) => {
  const { tweetId, replyText, selectedAccountId } = req.body;
  console.log(req.body);

  if (!tweetId || !replyText || !selectedAccountId) {
    return res.status(400).json({ success: false, message: "Missing required fields" });
  }

  try {
    // Fetch user credentials from DB
    const id=selectedAccountId;

    const result = await pool.query(
      "SELECT account_name, twitter_password FROM social_media_accounts WHERE id = $1",
      [selectedAccountId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Twitter account not found for user" });
    }

    const { account_name, twitter_password } = result.rows[0];

    // Run Puppeteer login and reply
    await postReplyWithPuppeteer(account_name, twitter_password, tweetId, replyText);

    return res.json({ success: true, message: "Reply posted successfully" });
  } catch (error) {
    console.error("❌ Error in replying to tweet:", error.message);
    return res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
});

async function postReplyWithPuppeteer(username, twitter_password, tweetId, replyText) {
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox"],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });

  try {
    console.log("🔐 Logging in...");

    await page.goto("https://twitter.com/login", { waitUntil: "networkidle2" });

    // Fill username
    console.log("1")
    await page.waitForSelector('input[name="text"]');
    console.log("2")
    await page.type('input[name="text"]', username);
        console.log("3")
    await page.keyboard.press("Enter");
        console.log("4")
    await new Promise(resolve => setTimeout(resolve, 2000));

    console.log("5")
    // Fill password
    await page.waitForSelector('input[name="password"]', { timeout: 5000 });
        console.log("6")
        console.log("🔑 Username:", username);
console.log("🔑 Password:", twitter_password);
console.log("🧪 typeof Password:", typeof twitter_password);

    await page.type('input[name="password"]', twitter_password);
     console.log("7")
    await page.keyboard.press("Enter");
 console.log("8")
    await page.waitForNavigation({ waitUntil: "networkidle2" });
     console.log("9")
    console.log("✅ Logged in");

    const tweetUrl = `https://twitter.com/i/web/status/${tweetId}`;


    console.log(`📨 Opening tweet: ${tweetUrl}`);
    console.log("🔗 Navigating to tweet:", tweetUrl);
    await page.goto(tweetUrl, { waitUntil: "networkidle2", timeout: 90000 });

    // Wait for the tweet content to load
  

    // Wait for reply button using stable test ID
        await page.screenshot({ path: "error.png" });
   await page.waitForSelector('button[data-testid="reply"]', { timeout: 10000 });
       await page.screenshot({ path: "error2.png" });
  console.log("✅ Reply button found");
      await page.screenshot({ path: "erro3.png" });

  await page.click('button[data-testid="reply"]');
  console.log("📨 Reply button clicked");

    // Wait for reply modal textarea
    await page.waitForSelector('div[data-testid="tweetTextarea_0"]', { timeout: 15000 });

   await page.waitForSelector('div[role="textbox"][data-testid="tweetTextarea_0"]');
await page.type('div[role="textbox"][data-testid="tweetTextarea_0"]', replyText);
console.log("📝 Typed reply");
   await page.screenshot({ path: "erro6.png" });
// 2. Wait for the reply button to become enabled
await page.waitForFunction(() => {
  const btn = document.querySelector('button[data-testid="tweetButton"]');
  return btn && !btn.disabled && btn.getAttribute('aria-disabled') !== "true";
}, { timeout: 10000 });
console.log("✅ Reply button is now enabled");
   await page.screenshot({ path: "erro9.png" });

// 3. Click the reply button
await page.click('button[data-testid="tweetButton"]');
console.log("📤 Reply posted successfully");

    await page.waitForTimeout(3000);
  } catch (err) {
    console.error("❌ Puppeteer failed:", err.message);
    throw err;
  } finally {
    await browser.close();
  }
}

// PUT /api/search/update/:id - Update reply for a tweet
// router.put("/update/:id", async (req, res) => {
//   const { id } = req.params;
//   const { reply } = req.body;

//   if (!reply) {
//     return res.status(400).json({ message: 'Reply content is required' });
//   }

//   try {
//     await db.query(
//       `UPDATE tweets SET reply = $1 WHERE id = $2`,
//       [reply, id]
//     );

//     res.json({ success: true, message: 'Reply updated successfully' });
//   } catch (err) {
//     console.error("Update error:", err.message);
//     res.status(500).json({ error: "Update failed" });
//   }
// });

module.exports = router;
