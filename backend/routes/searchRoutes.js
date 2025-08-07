
const express = require("express");
const db = require("../db");
const axios = require("axios");
const puppeteer = require("puppeteer");
const pool = require("../db"); // PostgreSQL Pool
const path = require('path');
const fs = require('fs');
const { exec } = require("child_process");
let fetch;
(async () => {
  fetch = (await import("node-fetch")).default;
})();

const router = express.Router();

const CHROME_PATH = `"C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"`;
const USER_DATA_DIR = "C:\\chrome-profile";
async function generateReply(tweetContent, model = "meta-llama/llama-3-8b-instruct", promptTemplate = null, keywordId = null) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  
  console.log(`\n========== REPLY GENERATION STARTED ==========`);
  console.log(`Tweet Content: "${tweetContent.substring(0, 50)}${tweetContent.length > 50 ? '...' : ''}"`);
  console.log(`Initial Model: ${model}`);
  console.log(`Keyword ID: ${keywordId || 'None'}`);
  
  // If keywordId is provided, check for associated prompts
  let associatedPrompt = null;
  if (keywordId) {
    try {
      // Query to get the most recently associated prompt for this keyword
      const promptResult = await pool.query(`
        SELECT p.id, p.name, p.model, p.content
        FROM prompts p
        JOIN keyword_prompts kp ON p.id = kp.prompt_id
        WHERE kp.keyword_id = $1 AND p.deleted_at IS NULL AND kp.deleted_at IS NULL
        ORDER BY kp.created_at DESC
        LIMIT 1
      `, [keywordId]);
      
      if (promptResult.rows.length > 0) {
        associatedPrompt = promptResult.rows[0];
        console.log(`\n✅ Found associated prompt for keyword ${keywordId}:`);
        console.log(`   Prompt Name: ${associatedPrompt.name}`);
        console.log(`   Prompt ID: ${associatedPrompt.id}`);
        
        // Use the associated prompt's model and content if available
        if (associatedPrompt.model) {
          const originalModel = model;
          model = associatedPrompt.model;
          console.log(`   Model changed: ${originalModel} → ${model}`);
        } else {
          console.log(`   Using default model: ${model}`);
        }
        
        if (associatedPrompt.content) {
          promptTemplate = associatedPrompt.content;
          console.log(`   Using prompt template from database`);
        }
      } else {
        console.log(`\n⚠️ No associated prompt found for keyword ${keywordId}, using provided values`);
      }
    } catch (error) {
      console.error(`\n❌ Error fetching associated prompt for keyword ${keywordId}:`, error.message);
      // Continue with the provided values if there's an error
    }
  }
  
  // Use the provided prompt template or fall back to the default
  const promptContent = promptTemplate
    ? promptTemplate.replace(/{tweetContent}/g, tweetContent)
    : `Reply smartly to this tweet:\n"${tweetContent}"\nMake it personal, friendly, and relevant.Be professional and do not use emojis and crisp and small contents `;
  
  console.log(`\n🤖 FINAL GENERATION PARAMETERS:`);
  console.log(`   Model: ${model}`);
  if (model === "anthropic/claude-3-sonnet-20240229") {
    console.log(`   ⚠️ Using corrected model: anthropic/claude-3-sonnet-20240229-v1:0`);
  }
  console.log(`   Prompt: ${promptContent.substring(0, 100)}${promptContent.length > 100 ? '...' : ''}`);
  
  const response = await axios.post(
    "https://openrouter.ai/api/v1/chat/completions",
    {
      model: model === "anthropic/claude-3-sonnet-20240229" ? "anthropic/claude-3-sonnet-20240229-v1:0" : model,
      messages: [
        {
          role: "user",
          content: promptContent,
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
  console.log(`\n✅ Reply generated successfully (${reply?.length || 0} characters)`);
  console.log(`========== REPLY GENERATION COMPLETED ==========\n`);
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
  const forceRefresh = req.query.forceRefresh === "true"; // New parameter to bypass cache
  if (!rawKeyword)
    return res.status(400).json({ error: "Keyword is required" });

  const keywords = rawKeyword
    .split(",")
    .map((k) => k.trim())
    .filter((k) => k);

  try {
    let allTweets = [];

    // Check if view_count column exists in tweets table, add it if it doesn't
    try {
     
      const columnCheck = await db.query(`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name = 'tweets' AND column_name = 'view_count'
      `);
      
      if (columnCheck.rows.length === 0) {
       
        await db.query(`ALTER TABLE tweets ADD COLUMN view_count INTEGER DEFAULT 0`);
        
      } else {
        console.log("view_count column already exists in tweets table");
      }
    } catch (columnError) {
      console.error("Error checking/adding view_count column:", columnError.message);
      // Continue with the rest of the function even if this fails
    }

    // Check if posted_time column exists in tweets table, add it if it doesn't
    try {
      const postedTimeColumnCheck = await db.query(`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name = 'tweets' AND column_name = 'posted_time'
      `);
      
      if (postedTimeColumnCheck.rows.length === 0) {
        await db.query(`ALTER TABLE tweets ADD COLUMN posted_time TEXT`);
        console.log("posted_time column added to tweets table");
      } else {
        console.log("posted_time column already exists in tweets table");
      }
    } catch (columnError) {
      console.error("Error checking/adding posted_time column:", columnError.message);
      // Continue with the rest of the function even if this fails
    }

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

    
      // Only check cache if forceRefresh is false
      if (!forceRefresh) {
        const cached = await db.query(query, params);
  
        if (cached.rows.length > 0) {
          console.log(`Using cached results for keyword "${keyword}"`);
          allTweets.push(...cached.rows);
          continue;
        }
      } else {
        console.log(`Force refresh requested for keyword "${keyword}", bypassing cache`);
      }

      
     // 3. Scrape if not in cache
      const result = await pool.query(
      "SELECT account_name, twitter_password FROM social_media_accounts WHERE platform = 'twitter' AND is_default = true LIMIT 1",
      []
    );

    if (result.rows.length === 0) {
      return res
        .status(404)
        .json({
          success: false,
          message: "Twitter account not found for user",
        });
    }

    const { account_name, twitter_password  } = result.rows[0];


  console.log("1");
const browser = await puppeteer.launch({
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-web-security",
    ],
    defaultViewport: null,
  });

  const page = await browser.newPage();

// Log in to Twitter
await page.goto('https://twitter.com/login', { waitUntil: 'networkidle2' });
  console.log("2");

await page.waitForSelector('input[name="text"]', { visible: true });
await page.type('input[name="text"]', account_name);
  console.log("3");
await page.keyboard.press('Enter');

// Wait longer after entering username
await new Promise(resolve => setTimeout(resolve, 5000));
// wait for password field to appear
  console.log("5");

// Try multiple selectors for password field with increased timeout
let passwordFieldFound = false;
    
// First attempt - original selector with increased timeout
try {
  console.log("Trying original password selector...");
  await page.waitForSelector('input[name="password"]', { visible: true, timeout: 20000 });
  console.log("Password field found with original selector");
  await page.type('input[name="password"]', twitter_password);
  passwordFieldFound = true;
} catch (error) {
  console.log("Original password selector failed:", error.message);
}

// Second attempt - alternative selectors
if (!passwordFieldFound) {
  try {
    console.log("Trying alternative password selectors...");
    await page.waitForSelector('input[type="password"], input.password-field', { visible: true, timeout: 10000 });
    console.log("Password field found with alternative selector");
    
    // Use the appropriate selector based on which one exists
    const passwordSelector = await page.$('input[type="password"]') ? 'input[type="password"]' : 'input.password-field';
    await page.type(passwordSelector, twitter_password);
    passwordFieldFound = true;
  } catch (error) {
    console.log("Alternative password selectors failed:", error.message);
  }
}

// Third attempt - look for any password input
if (!passwordFieldFound) {
  try {
    console.log("Looking for any password input...");
    
    // Check if there's any password field on the page
    const passwordField = await page.evaluate(() => {
      const inputs = Array.from(document.querySelectorAll('input'));
      const passwordInput = inputs.find(input =>
        input.type === 'password' ||
        input.name === 'password' ||
        input.id?.includes('password') ||
        input.placeholder?.toLowerCase().includes('password')
      );
      
      if (passwordInput) {
        return {
          found: true,
          selector: passwordInput.id ? `#${passwordInput.id}` :
                    passwordInput.name ? `input[name="${passwordInput.name}"]` :
                    'input[type="password"]'
        };
      }
      return { found: false };
    });
    
    if (passwordField.found) {
      console.log(`Password field found with dynamic selector: ${passwordField.selector}`);
      await page.waitForSelector(passwordField.selector, { timeout: 5000 });
      await page.type(passwordField.selector, twitter_password);
      passwordFieldFound = true;
    }
  } catch (error) {
    console.log("Dynamic password field search failed:", error.message);
  }
}

// If all attempts failed, take a screenshot and throw an error
if (!passwordFieldFound) {
  console.error("Failed to find password field with any method");
  
  // Take a screenshot to debug
  try {
    await page.screenshot({ path: 'search-password-field-error.png' });
    console.log("Screenshot saved as search-password-field-error.png");
  } catch (screenshotError) {
    console.error("Failed to take screenshot:", screenshotError.message);
  }
  
  throw new Error("Could not find password input field");
}

await page.keyboard.press('Enter');
  console.log("6");

// Wait for navigation with increased timeout and better error handling
try {
  await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 });
} catch (navError) {
  console.log("Navigation timeout, but continuing anyway:", navError.message);
  // Check if we're actually logged in despite the navigation timeout
  const isLoggedIn = await page.evaluate(() => {
    return !document.querySelector('input[name="password"]') &&
           (document.querySelector('[data-testid="AppTabBar_Home_Link"]') ||
            document.querySelector('[aria-label*="Home"]'));
  });
  
  if (isLoggedIn) {
    console.log("✅ Appears to be logged in despite navigation timeout");
  } else {
    console.log("⚠️ May not be properly logged in");
  }
}
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

        return Array.from(articles)
          .map((article) => {
            const text = article.querySelector("div[lang]")?.innerText;
            const idMatch = article
              .querySelector('a[href*="/status/"]')
              ?.getAttribute("href")
              ?.match(/status\/(\d+)/);
            const id = idMatch ? idMatch[1] : null;

            const metricsLabel =
              article
                .querySelector('[role="group"]')
                ?.getAttribute("aria-label") || "";

            // Extract engagement metrics using regex
            const replies =
              Number(metricsLabel.match(/(\d+)\s+repl/)?.[1]) || 0;
            const retweets =
              Number(metricsLabel.match(/(\d+)\s+repost/)?.[1]) || 0;
            const likes = Number(metricsLabel.match(/(\d+)\s+like/)?.[1]) || 0;
            const bookmarks =
              Number(metricsLabel.match(/(\d+)\s+bookmark/)?.[1]) || 0;
              
            // Extract view count using multiple methods for reliability
            let views = 0;
            let viewsMethod = "default";
            try {
              console.log(`Tweet ID: ${id}, Starting view count extraction...`);
              
              // METHOD 1: Try to extract from specific analytics elements (most reliable)
              console.log(`METHOD 1: Looking for view count in specific analytics elements...`);
              const viewElements = article.querySelectorAll('[data-testid="app-text-transition-container"]');
              console.log(`METHOD 1: Found ${viewElements.length} potential view elements`);
              
              for (const element of viewElements) {
                const viewText = element.innerText || "";
                console.log(`METHOD 1: Examining element text: "${viewText}"`);
                
                // Look for patterns like "1.2K views" or "1,234 views"
                const viewMatch = viewText.match(/^(\d+(?:[,.]\d+)*[KkMmBb]?)\s*(?:view|views)$/i);
                if (viewMatch) {
                  const rawCount = viewMatch[1];
                  console.log(`METHOD 1: Found raw view count: ${rawCount}`);
                  
                  // Convert K, M, B suffixes to actual numbers
                  let multiplier = 1;
                  if (rawCount.match(/[Kk]$/)) multiplier = 1000;
                  if (rawCount.match(/[Mm]$/)) multiplier = 1000000;
                  if (rawCount.match(/[Bb]$/)) multiplier = 1000000000;
                  
                  // Remove suffix and convert to number
                  const numericPart = rawCount.replace(/[KkMmBb]$/, "").replace(/[,.]/g, "");
                  views = parseInt(numericPart) * multiplier;
                  
                  viewsMethod = "analytics_element_specific";
                  console.log(`METHOD 1 SUCCESS: Extracted view count ${views} from analytics element`);
                  break;
                }
              }
              
              // METHOD 2: Try to extract from metrics label using regex
              if (views === 0) {
                console.log(`METHOD 2: Examining metrics label: "${metricsLabel}"`);
                // Look for patterns like "1.2K views" or "1,234 views"
                const viewsMatch = metricsLabel.match(/(\d+(?:[,.]\d+)*[KkMmBb]?)\s*(?:view|views)/i);
                
                if (viewsMatch) {
                  const rawCount = viewsMatch[1];
                  console.log(`METHOD 2: Found raw view count: ${rawCount}`);
                  
                  // Convert K, M, B suffixes to actual numbers
                  let multiplier = 1;
                  if (rawCount.match(/[Kk]$/)) multiplier = 1000;
                  if (rawCount.match(/[Mm]$/)) multiplier = 1000000;
                  if (rawCount.match(/[Bb]$/)) multiplier = 1000000000;
                  
                  // Remove suffix and convert to number
                  const numericPart = rawCount.replace(/[KkMmBb]$/, "").replace(/[,.]/g, "");
                  views = parseInt(numericPart) * multiplier;
                  
                  viewsMethod = "metrics_label_regex";
                  console.log(`METHOD 2 SUCCESS: Found view count ${views} in metrics label`);
                } else {
                  console.log(`METHOD 2: No view count found in metrics label`);
                }
              }
              
              // METHOD 3: Look for view count in any element with analytics data
              if (views === 0) {
                console.log(`METHOD 3: Looking for view count in analytics elements...`);
                const analyticsElements = article.querySelectorAll('[data-testid*="analytics"], [aria-label*="analytics"]');
                console.log(`METHOD 3: Found ${analyticsElements.length} analytics elements`);
                
                for (const element of analyticsElements) {
                  const analyticsText = element.innerText || "";
                  console.log(`METHOD 3: Examining analytics text: "${analyticsText}"`);
                  const analyticsMatch = analyticsText.match(/(\d+(?:[,.]\d+)*[KkMmBb]?)\s*(?:view|views)/i);
                  
                  if (analyticsMatch) {
                    const rawCount = analyticsMatch[1];
                    console.log(`METHOD 3: Found raw view count: ${rawCount}`);
                    
                    // Convert K, M, B suffixes to actual numbers
                    let multiplier = 1;
                    if (rawCount.match(/[Kk]$/)) multiplier = 1000;
                    if (rawCount.match(/[Mm]$/)) multiplier = 1000000;
                    if (rawCount.match(/[Bb]$/)) multiplier = 1000000000;
                    
                    // Remove suffix and convert to number
                    const numericPart = rawCount.replace(/[KkMmBb]$/, "").replace(/[,.]/g, "");
                    views = parseInt(numericPart) * multiplier;
                    
                    viewsMethod = "analytics_element";
                    console.log(`METHOD 3 SUCCESS: Found view count ${views} in analytics element`);
                    break;
                  }
                }
              }
              
              // METHOD 4: Look for view count in any text content
              if (views === 0) {
                console.log(`METHOD 4: Looking for view count in any text...`);
                const allText = article.innerText;
                // Look for patterns like "1.2K views" or "1,234 views"
                const viewMatches = allText.match(/(\d+(?:[,.]\d+)*[KkMmBb]?)\s*(?:view|views)/gi);
                
                if (viewMatches && viewMatches.length > 0) {
                  console.log(`METHOD 4: Found potential view counts: ${viewMatches.join(', ')}`);
                  // Extract the first match
                  const firstMatch = viewMatches[0].match(/(\d+(?:[,.]\d+)*[KkMmBb]?)/i);
                  if (firstMatch) {
                    const rawCount = firstMatch[1];
                    console.log(`METHOD 4: Found raw view count: ${rawCount}`);
                    
                    // Convert K, M, B suffixes to actual numbers
                    let multiplier = 1;
                    if (rawCount.match(/[Kk]$/)) multiplier = 1000;
                    if (rawCount.match(/[Mm]$/)) multiplier = 1000000;
                    if (rawCount.match(/[Bb]$/)) multiplier = 1000000000;
                    
                    // Remove suffix and convert to number
                    const numericPart = rawCount.replace(/[KkMmBb]$/, "").replace(/[,.]/g, "");
                    views = parseInt(numericPart) * multiplier;
                    
                    viewsMethod = "any_text_regex";
                    console.log(`METHOD 4 SUCCESS: Extracted view count ${views}`);
                  }
                } else {
                  console.log(`METHOD 4: No view count pattern found in text`);
                }
              }
              
              // METHOD 5: Try to find view count in specific spans near metrics
              if (views === 0) {
                console.log(`METHOD 5: Looking for view count in specific spans...`);
                const spans = article.querySelectorAll('span');
                
                for (const span of spans) {
                  const spanText = span.innerText || "";
                  // Look specifically for text that might be just the view count
                  if (/^\d+(?:[,.]\d+)*[KkMmBb]?$/.test(spanText.trim())) {
                    console.log(`METHOD 5: Found potential view count: ${spanText}`);
                    
                    // Check if the next sibling contains "view" or "views"
                    const nextSibling = span.nextSibling;
                    const nextElement = span.nextElementSibling;
                    const parentText = span.parentElement?.innerText || "";
                    
                    if (
                      (nextSibling && String(nextSibling.textContent).match(/views?/i)) ||
                      (nextElement && nextElement.innerText.match(/views?/i)) ||
                      (parentText.match(/views?/i))
                    ) {
                      const rawCount = spanText.trim();
                      console.log(`METHOD 5: Confirmed view count: ${rawCount}`);
                      
                      // Convert K, M, B suffixes to actual numbers
                      let multiplier = 1;
                      if (rawCount.match(/[Kk]$/)) multiplier = 1000;
                      if (rawCount.match(/[Mm]$/)) multiplier = 1000000;
                      if (rawCount.match(/[Bb]$/)) multiplier = 1000000000;
                      
                      // Remove suffix and convert to number
                      const numericPart = rawCount.replace(/[KkMmBb]$/, "").replace(/[,.]/g, "");
                      views = parseInt(numericPart) * multiplier;
                      
                      viewsMethod = "span_with_views";
                      console.log(`METHOD 5 SUCCESS: Found view count ${views} in span`);
                      break;
                    }
                  }
                }
              }
              
              // METHOD 6: Estimate based on engagement metrics if all else fails
              if (views === 0) {
                console.log(`METHOD 6: Estimating view count based on engagement metrics...`);
                
                // Improved estimation based on likes and retweets
                // Twitter typically has ~1-5% engagement rate, so views ≈ likes / 0.01-0.05
                // Higher engagement tweets tend to have lower view-to-like ratios
                let estimatedViews;
                
                if (likes > 1000) {
                  // High engagement posts (viral) - lower multiplier
                  estimatedViews = likes * 15;
                } else if (likes > 100) {
                  // Medium engagement - medium multiplier
                  estimatedViews = likes * 25;
                } else {
                  // Low engagement - higher multiplier
                  estimatedViews = Math.max(likes * 40, retweets * 100);
                }
                
                if (estimatedViews > 0) {
                  views = estimatedViews;
                  viewsMethod = "engagement_estimate";
                  console.log(`METHOD 6 SUCCESS: Estimated ${views} views based on engagement metrics`);
                } else {
                  console.log(`METHOD 6: Could not estimate views from engagement metrics`);
                }
              }
              
              // Final result
              if (views === 0) {
                console.log(`FAILED: Could not extract or estimate view count for tweet ${id}`);
                // Default to a reasonable number based on followers and engagement
                views = Math.max(likes * 20, 100);
                viewsMethod = "default_fallback";
                console.log(`Using default fallback view count: ${views}`);
              } else {
                console.log(`SUCCESS: Got view count ${views} for tweet ${id} using method: ${viewsMethod}`);
              }
              
            } catch (e) {
              console.log("Error extracting view count:", e);
              // Default fallback on error
              views = Math.max(likes * 20, 100);
            }

            if (!id || !text) return null;

            // Extract author information if available
            const authorElement = article.querySelector(
              'div[data-testid="User-Name"]'
            );
            const followersText = authorElement?.innerText || "";
            
            // Extract followers count using multiple methods for reliability
            let followers = 0;
            let followersMethod = "default";
            try {
              console.log(`Tweet ID: ${id}, Starting followers count extraction...`);
              
              // METHOD 1: Try to extract from author element text using regex
              console.log(`METHOD 1: Examining author element text: "${followersText.substring(0, 100)}..."`);
              const followersMatch = followersText.match(/(\d+(?:[,.]\d+)*)\s*(?:Followers|followers)/i);
              
              if (followersMatch) {
                followers = parseInt(followersMatch[1].replace(/[,.]/g, ""));
                followersMethod = "author_text_regex";
                console.log(`METHOD 1 SUCCESS: Found followers count ${followers} in author text`);
              } else {
                console.log(`METHOD 1: No followers count found in author text`);
              }
              
              // METHOD 2: If method 1 failed, try to find any text with followers count pattern
              if (followers === 0) {
                console.log(`METHOD 2: Looking for followers count in any text...`);
                const allText = article.innerText;
                const allFollowersMatches = allText.match(/(\d+(?:[,.]\d+)*)\s*(?:Followers|followers)/gi);
                
                if (allFollowersMatches && allFollowersMatches.length > 0) {
                  console.log(`METHOD 2: Found potential followers counts: ${allFollowersMatches.join(', ')}`);
                  // Extract the first match
                  const firstMatch = allFollowersMatches[0].match(/(\d+(?:[,.]\d+)*)/);
                  if (firstMatch) {
                    followers = parseInt(firstMatch[1].replace(/[,.]/g, ""));
                    followersMethod = "any_text_regex";
                    console.log(`METHOD 2 SUCCESS: Extracted followers count ${followers}`);
                  }
                } else {
                  console.log(`METHOD 2: No followers count pattern found in text`);
                }
              }
              
              // METHOD 3: Try to extract from profile stats if available
              if (followers === 0) {
                console.log(`METHOD 3: Looking for profile stats...`);
                const statsElements = article.querySelectorAll('[data-testid="UserProfileStats"]');
                
                if (statsElements.length > 0) {
                  console.log(`METHOD 3: Found ${statsElements.length} profile stats elements`);
                  for (const statsElement of statsElements) {
                    const statsText = statsElement.innerText || "";
                    console.log(`METHOD 3: Examining stats text: "${statsText}"`);
                    const statsMatch = statsText.match(/(\d+(?:[,.]\d+)*)\s*(?:Followers|followers)/i);
                    
                    if (statsMatch) {
                      followers = parseInt(statsMatch[1].replace(/[,.]/g, ""));
                      followersMethod = "profile_stats";
                      console.log(`METHOD 3 SUCCESS: Found followers count ${followers} in profile stats`);
                      break;
                    }
                  }
                } else {
                  console.log(`METHOD 3: No profile stats elements found`);
                }
              }
              
              // METHOD 4: Estimate based on engagement metrics if all else fails
              if (followers === 0) {
                console.log(`METHOD 4: Estimating followers based on engagement metrics...`);
                
                // Extract engagement metrics
                const likes = Number(metricsLabel.match(/(\d+)\s+like/)?.[1]) || 0;
                const retweets = Number(metricsLabel.match(/(\d+)\s+repost/)?.[1]) || 0;
                
                console.log(`METHOD 4: Engagement metrics - likes: ${likes}, retweets: ${retweets}`);
                
                // Estimate followers based on engagement (rough heuristic)
                if (likes > 1000 || retweets > 500) {
                  followers = 10000; // High engagement suggests many followers
                  console.log(`METHOD 4: High engagement detected, estimating ${followers} followers`);
                } else if (likes > 100 || retweets > 50) {
                  followers = 5000; // Medium engagement
                  console.log(`METHOD 4: Medium engagement detected, estimating ${followers} followers`);
                } else if (likes > 10 || retweets > 5) {
                  followers = 1000; // Low engagement
                  console.log(`METHOD 4: Low engagement detected, estimating ${followers} followers`);
                } else {
                  followers = 500; // Minimal engagement
                  console.log(`METHOD 4: Minimal engagement detected, estimating ${followers} followers`);
                }
                
                followersMethod = "engagement_estimate";
              }
              
              // Final result
              if (followers === 0) {
                console.log(`FAILED: Could not extract or estimate followers count for tweet ${id}`);
                followers = 1000; // Default fallback
                followersMethod = "default_fallback";
              } else {
                console.log(`SUCCESS: Got followers count ${followers} for tweet ${id} using method: ${followersMethod}`);
              }
              
            } catch (e) {
              console.log("Error extracting followers count:", e);
              followers = 1000; // Default fallback on error
            }
              
            // Extract author name and username
            // First try to get the name from the first span in the User-Name div
            let authorName = "Unknown User";
            try {
              const authorNameElement = article.querySelector('div[data-testid="User-Name"] a:first-child span');
              if (authorNameElement) {
                authorName = authorNameElement.innerText.trim();
              } else {
                // Try alternative selector
                const altAuthorNameElement = article.querySelector('div[data-testid="User-Name"] div span');
                if (altAuthorNameElement) {
                  authorName = altAuthorNameElement.innerText.trim();
                }
              }
            } catch (e) {
              console.log("Error extracting author name:", e);
            }


            //Extract tweet Posted time
            let postedTime = "";
            let postedTimeMethod = "default";
            try {
              console.log(`Tweet ID: ${id}, Starting posted time extraction...`);
              
              // METHOD 1: Try to extract from time element with datetime attribute
              console.log(`METHOD 1: Looking for time element with datetime attribute...`);
              const timeElement = article.querySelector('time[datetime]');
              if (timeElement) {
                const datetime = timeElement.getAttribute('datetime');
                if (datetime) {
                  postedTime = datetime;
                  postedTimeMethod = "datetime_attribute";
                  console.log(`METHOD 1 SUCCESS: Found posted time ${postedTime} from datetime attribute`);
                }
              } else {
                console.log(`METHOD 1: No time element with datetime found`);
              }
              
              // METHOD 2: Try to extract from time element text content
              if (!postedTime) {
                console.log(`METHOD 2: Looking for time element text content...`);
                const timeElements = article.querySelectorAll('time');
                for (const timeEl of timeElements) {
                  const timeText = timeEl.innerText || "";
                  console.log(`METHOD 2: Examining time element text: "${timeText}"`);
                  
                  // Look for relative time patterns like "2h", "1d", "3m", etc.
                  if (/^\d+[smhd]$/.test(timeText.trim())) {
                    postedTime = timeText.trim();
                    postedTimeMethod = "relative_time_text";
                    console.log(`METHOD 2 SUCCESS: Found relative time ${postedTime}`);
                    break;
                  }
                  
                  // Look for date patterns like "Dec 25", "Jan 1, 2023", etc.
                  if (/^[A-Za-z]{3}\s+\d{1,2}(,\s+\d{4})?$/.test(timeText.trim())) {
                    postedTime = timeText.trim();
                    postedTimeMethod = "date_text";
                    console.log(`METHOD 2 SUCCESS: Found date ${postedTime}`);
                    break;
                  }
                }
              }
              
              // METHOD 3: Try to extract from aria-label containing time information
              if (!postedTime) {
                console.log(`METHOD 3: Looking for time in aria-labels...`);
                const ariaElements = article.querySelectorAll('[aria-label]');
                for (const element of ariaElements) {
                  const ariaLabel = element.getAttribute('aria-label') || "";
                  console.log(`METHOD 3: Examining aria-label: "${ariaLabel.substring(0, 50)}..."`);
                  
                  // Look for time patterns in aria-label
                  const timeMatch = ariaLabel.match(/(\d{1,2}:\d{2}\s*(?:AM|PM))/i) ||
                                   ariaLabel.match(/(\d+[smhd])\s*ago/i) ||
                                   ariaLabel.match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2}(?:,\s*\d{4})?/i);
                  
                  if (timeMatch && timeMatch[1]) {
                    postedTime = timeMatch[1];
                    postedTimeMethod = "aria_label_time";
                    console.log(`METHOD 3 SUCCESS: Found time ${postedTime} in aria-label`);
                    break;
                  }
                }
              }
              
              // METHOD 4: Try to extract from any text that looks like a timestamp
              if (!postedTime) {
                console.log(`METHOD 4: Looking for timestamp patterns in all text...`);
                const allText = article.innerText;
                
                // Look for relative time patterns
                const relativeTimeMatch = allText.match(/(\d+[smhd])\s*(?:ago)?/i);
                if (relativeTimeMatch && relativeTimeMatch[1]) {
                  postedTime = relativeTimeMatch[1];
                  postedTimeMethod = "text_relative_time";
                  console.log(`METHOD 4 SUCCESS: Found relative time ${postedTime} in text`);
                } else {
                  // Look for date patterns
                  const dateMatch = allText.match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2}(?:,\s*\d{4})?/i);
                  if (dateMatch && dateMatch[0]) {
                    postedTime = dateMatch[0];
                    postedTimeMethod = "text_date_pattern";
                    console.log(`METHOD 4 SUCCESS: Found date ${postedTime} in text`);
                  }
                }
              }
              
              // METHOD 5: Try to extract from link href containing timestamp
              if (!postedTime) {
                console.log(`METHOD 5: Looking for timestamp in status links...`);
                const statusLinks = article.querySelectorAll('a[href*="/status/"]');
                for (const link of statusLinks) {
                  const href = link.getAttribute('href') || "";
                  // Sometimes Twitter includes timestamp info in URL parameters
                  if (href.includes('?') || href.includes('&')) {
                    console.log(`METHOD 5: Found status link with parameters: ${href}`);
                    // This method is less reliable, so we'll skip it for now
                  }
                }
              }
              
              // Final result
              if (!postedTime) {
                console.log(`FAILED: Could not extract posted time for tweet ${id}`);
                postedTime = new Date().toISOString(); // Default to current time
                postedTimeMethod = "default_fallback";
                console.log(`Using default fallback posted time: ${postedTime}`);
              } else {
                console.log(`SUCCESS: Extracted posted time '${postedTime}' for tweet ${id} using method: ${postedTimeMethod}`);
              }
              
            } catch (e) {
              console.log("Error extracting posted time:", e);
              postedTime = new Date().toISOString(); // Default fallback on error
              postedTimeMethod = "error_fallback";
            }
            
            // Extract username (handle) using multiple methods for reliability
            let authorUsername = "username";
            let usernameMethod = "default";
            try {
              console.log(`Tweet ID: ${id}, Starting username extraction...`);
              
              // METHOD 1: Try to find the username from profile URL (most reliable)
              const profileLink = article.querySelector('a[href^="/"][role="link"]');
              if (profileLink) {
                const href = profileLink.getAttribute('href');
                console.log(`METHOD 1: Found profile link with href: ${href}`);
                if (href && href.startsWith('/') && !href.includes('/status/')) {
                  // Extract username from URL path (first segment after /)
                  authorUsername = href.split('/')[1];
                  usernameMethod = "profile_url";
                  console.log(`METHOD 1 SUCCESS: Extracted username '${authorUsername}' from profile URL`);
                }
              } else {
                console.log(`METHOD 1: No profile link found`);
              }
              
              // METHOD 2: If method 1 failed, try to find spans with @ prefix
              if (authorUsername === "username") {
                console.log(`METHOD 2: Looking for spans with @ prefix...`);
                const usernameElements = article.querySelectorAll('div[data-testid="User-Name"] span');
                console.log(`METHOD 2: Found ${usernameElements.length} potential username elements`);
                
                for (const element of usernameElements) {
                  const text = element.innerText || "";
                  console.log(`METHOD 2: Examining element with text: "${text}"`);
                  if (text.includes('@')) {
                    authorUsername = text.trim().replace('@', '');
                    usernameMethod = "span_with_@";
                    console.log(`METHOD 2 SUCCESS: Found username '${authorUsername}' in span`);
                    break;
                  }
                }
              }
              
              // METHOD 3: Try to extract from aria-label which often contains username
              if (authorUsername === "username") {
                console.log(`METHOD 3: Looking for username in aria-labels...`);
                const ariaLabelElements = article.querySelectorAll('[aria-label]');
                console.log(`METHOD 3: Found ${ariaLabelElements.length} elements with aria-label`);
                
                for (const element of ariaLabelElements) {
                  const label = element.getAttribute('aria-label') || "";
                  console.log(`METHOD 3: Examining aria-label: "${label}"`);
                  const usernameMatch = label.match(/@([A-Za-z0-9_]+)/);
                  if (usernameMatch && usernameMatch[1]) {
                    authorUsername = usernameMatch[1];
                    usernameMethod = "aria_label";
                    console.log(`METHOD 3 SUCCESS: Found username '${authorUsername}' in aria-label`);
                    break;
                  }
                }
              }
              
              // METHOD 4: Try to extract from any text content that looks like a username
              if (authorUsername === "username") {
                console.log(`METHOD 4: Looking for username in any text content...`);
                const allText = article.innerText;
                console.log(`METHOD 4: Article text length: ${allText.length} characters`);
                const usernameMatches = allText.match(/@([A-Za-z0-9_]+)/g);
                
                if (usernameMatches && usernameMatches.length > 0) {
                  console.log(`METHOD 4: Found ${usernameMatches.length} potential usernames: ${usernameMatches.join(', ')}`);
                  // Take the first match and remove the @ symbol
                  authorUsername = usernameMatches[0].substring(1);
                  usernameMethod = "text_content";
                  console.log(`METHOD 4 SUCCESS: Using username '${authorUsername}' from text content`);
                } else {
                  console.log(`METHOD 4: No username patterns found in text`);
                }
              }
              
              // Final result
              if (authorUsername === "username") {
                console.log(`FAILED: Could not extract username for tweet ${id}`);
              } else {
                console.log(`SUCCESS: Extracted username '${authorUsername}' for tweet ${id} using method: ${usernameMethod}`);
              }
              
            } catch (e) {
              console.log("Error extracting username:", e);
            }
              
            // Extract profile image URL using multiple methods for reliability
            let profileImageUrl = "";
            let imageMethod = "default";
            try {
              console.log(`Tweet ID: ${id}, Starting profile image extraction...`);
              
              // METHOD 1: Try the primary avatar selector
              let profileImageElement = article.querySelector('div[data-testid="Tweet-User-Avatar"] img');
              if (profileImageElement) {
                console.log(`METHOD 1 SUCCESS: Found image with Tweet-User-Avatar selector`);
                imageMethod = "tweet_user_avatar";
              } else {
                console.log(`METHOD 1: No image found with Tweet-User-Avatar selector`);
              }
              
              // METHOD 2: If method 1 failed, try finding any image in the tweet header
              if (!profileImageElement) {
                profileImageElement = article.querySelector('a[role="link"][tabindex="-1"] img');
                if (profileImageElement) {
                  console.log(`METHOD 2 SUCCESS: Found image in tweet header`);
                  imageMethod = "tweet_header";
                } else {
                  console.log(`METHOD 2: No image found in tweet header`);
                }
              }
              
              // METHOD 3: Try to find any image with profile_images in the src
              if (!profileImageElement) {
                profileImageElement = article.querySelector('img[src*="profile_images"]');
                if (profileImageElement) {
                  console.log(`METHOD 3 SUCCESS: Found image with profile_images in src`);
                  imageMethod = "profile_images_src";
                } else {
                  console.log(`METHOD 3: No image found with profile_images in src`);
                }
              }
              
              // METHOD 4: Try to find any image in the article header
              if (!profileImageElement) {
                const header = article.querySelector('div[data-testid="User-Name"]')?.closest('div[role="group"]');
                if (header) {
                  profileImageElement = header.querySelector('img');
                  if (profileImageElement) {
                    console.log(`METHOD 4 SUCCESS: Found image in article header`);
                    imageMethod = "article_header";
                  } else {
                    console.log(`METHOD 4: No image found in article header`);
                  }
                } else {
                  console.log(`METHOD 4: Could not find article header`);
                }
              }
              
              // METHOD 5: Look for any image with common profile image attributes
              if (!profileImageElement) {
                console.log(`METHOD 5: Searching all images for profile-like attributes...`);
                const allImages = article.querySelectorAll('img');
                console.log(`METHOD 5: Found ${allImages.length} images to examine`);
                
                for (const img of allImages) {
                  const src = img.getAttribute('src') || '';
                  const alt = img.getAttribute('alt') || '';
                  console.log(`METHOD 5: Examining image - src: "${src.substring(0, 30)}...", alt: "${alt}"`);
                  
                  // Check if it looks like a profile image
                  if (
                    src.includes('profile') ||
                    src.includes('avatar') ||
                    alt.includes('profile') ||
                    alt.includes('avatar') ||
                    (img.width === img.height && img.width <= 50)
                  ) {
                    profileImageElement = img;
                    console.log(`METHOD 5 SUCCESS: Found likely profile image`);
                    imageMethod = "attribute_match";
                    break;
                  }
                }
                
                if (!profileImageElement) {
                  console.log(`METHOD 5: No suitable profile image found`);
                }
              }
              
              if (profileImageElement) {
                profileImageUrl = profileImageElement.getAttribute('src');
                console.log(`Found raw image URL: ${profileImageUrl}`);
                
                // Make sure we have the full URL
                if (profileImageUrl && profileImageUrl.startsWith('/')) {
                  profileImageUrl = 'https://twitter.com' + profileImageUrl;
                  console.log(`Converted to absolute URL: ${profileImageUrl}`);
                }
              }
              
              // Final result
              if (!profileImageUrl) {
                console.log(`FAILED: Could not extract profile image for tweet ${id}`);
              } else {
                console.log(`SUCCESS: Extracted profile image for tweet ${id} using method: ${imageMethod}`);
                console.log(`Profile image URL: ${profileImageUrl}`);
              }
              
            } catch (e) {
              console.log("Error extracting profile image:", e);
            }

            return {
              id,
              text,
              reply_count: replies,
              retweet_count: retweets,
              like_count: likes,
              bookmark_count: bookmarks,
              view_count: views,
              followers_count: followers,
              author_name: authorName,
              author_username: authorUsername,
              profile_image_url: profileImageUrl,
              posted_time: postedTime
            };
          })
          .filter(Boolean);
      });

      for (const tweet of scrapedTweets) {
        // Don't generate replies automatically - leave reply field null
        // Replies will only be generated when user clicks "Generate Reply" button on dashboard
        
        // Check if view_count column exists in tweets table
        const columnCheck = await db.query(`
          SELECT column_name
          FROM information_schema.columns
          WHERE table_name = 'tweets' AND column_name = 'view_count'
        `);
        
        // Check if posted_time column exists
        const postedTimeColumnCheck = await db.query(`
          SELECT column_name
          FROM information_schema.columns
          WHERE table_name = 'tweets' AND column_name = 'posted_time'
        `);
        
        if (columnCheck.rows.length === 0 && postedTimeColumnCheck.rows.length === 0) {
          // Neither view_count nor posted_time columns exist
          console.log("view_count and posted_time columns don't exist, using insertion query without them");
          await db.query(
            `INSERT INTO tweets (id, text, reply, like_count, retweet_count, followers_count, keyword, created_at, author_name, author_username, profile_image_url)
             VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), $8, $9, $10)
             ON CONFLICT (id) DO NOTHING`,
            [
              tweet.id,
              tweet.text,
              null, // Set reply to null initially - will be generated on demand
              tweet.like_count,
              tweet.retweet_count,
              tweet.followers_count || 1000,
              keyword,
              tweet.author_name || "Unknown User",
              tweet.author_username !== "username" ? tweet.author_username : "user_" + tweet.id.substring(0, 8),
              tweet.profile_image_url || "https://abs.twimg.com/sticky/default_profile_images/default_profile_400x400.png"
            ]
          );
        } else if (columnCheck.rows.length === 0 && postedTimeColumnCheck.rows.length > 0) {
          // Only posted_time column exists
          console.log("Only posted_time column exists, including it in the insertion query");
          await db.query(
            `INSERT INTO tweets (id, text, reply, like_count, retweet_count, followers_count, keyword, created_at, author_name, author_username, profile_image_url, posted_time)
             VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), $8, $9, $10, $11)
             ON CONFLICT (id) DO NOTHING`,
            [
              tweet.id,
              tweet.text,
              null, // Set reply to null initially - will be generated on demand
              tweet.like_count,
              tweet.retweet_count,
              tweet.followers_count || 1000,
              keyword,
              tweet.author_name || "Unknown User",
              tweet.author_username !== "username" ? tweet.author_username : "user_" + tweet.id.substring(0, 8),
              tweet.profile_image_url || "https://abs.twimg.com/sticky/default_profile_images/default_profile_400x400.png",
              tweet.posted_time || new Date().toISOString()
            ]
          );
        } else if (columnCheck.rows.length > 0 && postedTimeColumnCheck.rows.length === 0) {
          // Only view_count column exists
          console.log("Only view_count column exists, including it in the insertion query");
          await db.query(
            `INSERT INTO tweets (id, text, reply, like_count, retweet_count, followers_count, keyword, created_at, author_name, author_username, profile_image_url, view_count)
             VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), $8, $9, $10, $11)
             ON CONFLICT (id) DO NOTHING`,
            [
              tweet.id,
              tweet.text,
              null, // Set reply to null initially - will be generated on demand
              tweet.like_count,
              tweet.retweet_count,
              tweet.followers_count || 1000,
              keyword,
              tweet.author_name || "Unknown User",
              tweet.author_username !== "username" ? tweet.author_username : "user_" + tweet.id.substring(0, 8),
              tweet.profile_image_url || "https://abs.twimg.com/sticky/default_profile_images/default_profile_400x400.png",
              tweet.view_count || 0
            ]
          );
        } else {
          // Both view_count and posted_time columns exist
          console.log("Both view_count and posted_time columns exist, including them in the insertion query");
          await db.query(
            `INSERT INTO tweets (id, text, reply, like_count, retweet_count, followers_count, keyword, created_at, author_name, author_username, profile_image_url, view_count, posted_time)
             VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), $8, $9, $10, $11, $12)
             ON CONFLICT (id) DO NOTHING`,
            [
              tweet.id,
              tweet.text,
              null, // Set reply to null initially - will be generated on demand
              tweet.like_count,
              tweet.retweet_count,
              tweet.followers_count || 1000,
              keyword,
              tweet.author_name || "Unknown User",
              tweet.author_username !== "username" ? tweet.author_username : "user_" + tweet.id.substring(0, 8),
              tweet.profile_image_url || "https://abs.twimg.com/sticky/default_profile_images/default_profile_400x400.png",
              tweet.view_count || 0,
              tweet.posted_time || new Date().toISOString()
            ]
          );
        }
      }

      // Always apply filtering based on provided criteria
      let filtered = scrapedTweets.filter(
        (tweet) =>
          tweet.like_count >= minLikes &&
          tweet.retweet_count >= minRetweets &&
          (minFollowers === 0 || tweet.followers_count >= minFollowers)
      );

      console.log(
        `Filtered tweets: ${filtered.length} out of ${scrapedTweets.length}`
      );
      console.log(
        `Filtering criteria: minLikes=${minLikes}, minRetweets=${minRetweets}, minFollowers=${minFollowers}`
      );

      // Add created_at timestamp to each tweet if it doesn't have one
      const currentTime = new Date().toISOString();
      const tweetsWithTimestamp = filtered.map(tweet => ({
        ...tweet,
        created_at: tweet.created_at || currentTime
      }));

      // Add filtered tweets to result
      allTweets.push(...tweetsWithTimestamp.slice(0, maxResults));
    }

    // Determine the data source for the response
    const dataSource = forceRefresh ? "twitter" : "cache";
    
    res.json({
      keywords,
      from: dataSource,
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
    // Check if view_count column exists in tweets table
    const columnCheck = await db.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'tweets' AND column_name = 'view_count'
    `);
    
    // Check if posted_time column exists in tweets table
    const postedTimeColumnCheck = await db.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'tweets' AND column_name = 'posted_time'
    `);
    
    let query;
    if (columnCheck.rows.length === 0 && postedTimeColumnCheck.rows.length === 0) {
      // Neither view_count nor posted_time columns exist
      console.log("view_count and posted_time columns don't exist, using query without them");
      query = `
        SELECT id, text, reply, like_count, retweet_count, keyword, created_at,
               followers_count, author_name, author_username, profile_image_url
        FROM tweets
        ORDER BY created_at DESC
      `;
    } else if (columnCheck.rows.length === 0 && postedTimeColumnCheck.rows.length > 0) {
      // Only posted_time column exists
      console.log("Only posted_time column exists, including it in the query");
      query = `
        SELECT id, text, reply, like_count, retweet_count, keyword, created_at,
               followers_count, author_name, author_username, profile_image_url, posted_time
        FROM tweets
        ORDER BY created_at DESC
      `;
    } else if (columnCheck.rows.length > 0 && postedTimeColumnCheck.rows.length === 0) {
      // Only view_count column exists
      console.log("Only view_count column exists, including it in the query");
      query = `
        SELECT id, text, reply, like_count, retweet_count, keyword, created_at,
               followers_count, author_name, author_username, profile_image_url, view_count
        FROM tweets
        ORDER BY created_at DESC
      `;
    } else {
      // Both view_count and posted_time columns exist
      console.log("Both view_count and posted_time columns exist, including them in the query");
      query = `
        SELECT id, text, reply, like_count, retweet_count, keyword, created_at,
               followers_count, author_name, author_username, profile_image_url, view_count, posted_time
        FROM tweets
        ORDER BY created_at DESC
      `;
    }
    
    const result = await db.query(query);
    const formattedData = result.rows.map((post) => ({
      ...post,
      tweet_url: `https://twitter.com/i/web/status/${post.id}`,
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

router.put("/update/:id", async (req, res) => {
  const { id } = req.params;
  const { reply } = req.body;

  if (!reply) {
    return res.status(400).json({ message: "Reply content is required" });
  }

  try {
    await db.query(`UPDATE tweets SET reply = $1 WHERE id = $2`, [reply, id]);

    res.json({ success: true, message: "Reply updated successfully" });
  } catch (err) {
    console.error("Update error:", err.message);
    res.status(500).json({ error: "Update failed" });
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
// DEPRECATED: This endpoint is no longer used directly. Use /reply-to-tweet instead.
// Kept for backward compatibility.
router.post("/postReply", async (req, res) => {
  console.log("WARNING: Using deprecated /postReply endpoint. Use /reply-to-tweet instead.");
  
  const {
    tweetId,
    replyText,
    selectedAccountId,
    tweetText,
    tweetUrl,
    keywordId,
    likeCount = 0,
    retweetCount = 0,
    replyId = null, // Add reply ID parameter
  } = req.body;

  // Initialize engagement metrics to 0 for new replies
  // This ensures we're tracking the engagement of the user's reply, not the original post
  const engagementCount = 0;

  try {
    const insertQuery = `
      INSERT INTO post_history
        (post_text, post_url, posted_at, engagement_count, likes_count, retweets_count, created_at, updated_at, keyword_id, account_id, reply_id)
      VALUES
        ($1, $2, NOW(), $3, $4, $5, NOW(), NOW(), $6, $7, $8)
      RETURNING id
    `;

    const values = [
      replyText || "", // Store the reply text instead of the original tweet text
      tweetUrl || `https://twitter.com/i/web/status/${tweetId}`,
      engagementCount,
      0, // Initialize likes_count to 0
      0, // Initialize retweets_count to 0
      keywordId || null,
      selectedAccountId,
      replyId, // Store the reply ID
    ];

    const result = await pool.query(insertQuery, values);

    res.status(200).json({
      success: true,
      message: "Post added to history",
      post_id: result.rows[0].id,
      reply_id: replyId,
    });
  } catch (error) {
    console.error("Insert Error:", error.message);
    res.status(500).json({ success: false, message: "Failed to save post" });
  }
});

// router.post("/reply-to-tweet", async (req, res) => {
//   const {
//     tweetId,
//     replyText,
//     selectedAccountId,
//     keywordId,
//     tweetText,
//     likeCount,
//     retweetCount
//   } = req.body;
//   console.log(req.body);

//   if (!tweetId || !replyText || !selectedAccountId) {
//     return res
//       .status(400)
//       .json({ success: false, message: "Missing required fields" });
//   }

//   try {
//     // Fetch user credentials from DB
//     const result = await pool.query(
//       "SELECT account_name,password FROM social_media_accounts WHERE id = $1",
//       [selectedAccountId]
//     );

//     if (result.rows.length === 0) {
//       return res
//         .status(404)
//         .json({
//           success: false,
//           message: "Twitter account not found for user",
//         });
//     }

//     const { account_name, password  } = result.rows[0];

//     // Run Puppeteer login and reply - now returns a result object with reply ID
//     const postResult = await postReplyWithPuppeteerAndGetId(
//       account_name,
//       password ,
//       tweetId,
//       replyText
//     );

//     if (postResult.success) {
//       // Store the reply in post_history with the reply ID
//       try {
//         const tweetUrl = `https://twitter.com/i/web/status/${tweetId}`;

//         const insertQuery = `
//           INSERT INTO post_history
//             (post_text, post_url, posted_at, engagement_count, likes_count, retweets_count, created_at, updated_at, keyword_id, account_id, reply_id)
//           VALUES
//             ($1, $2, NOW(), $3, $4, $5, NOW(), NOW(), $6, $7, $8)
//           RETURNING id
//         `;
        
//         // Use the provided like and retweet counts if available, otherwise default to 0
//         const values = [
//           replyText,
//           tweetUrl,
//           (likeCount || 0) + (retweetCount || 0), // Initial engagement count based on original tweet
//           likeCount || 0,                         // Initial likes count
//           retweetCount || 0,                      // Initial retweets count
//           keywordId || null,
//           selectedAccountId,
//           postResult.replyId || null, // Store the reply ID
//         ];

//         const insertResult = await pool.query(insertQuery, values);
//         const postHistoryId = insertResult.rows[0].id;

//         return res.json({
//           success: true,
//           message: "Reply posted successfully",
//           details: {
//             ...postResult.details,
//             post_history_id: postHistoryId,
//             reply_id: postResult.replyId
//           },
//         });
//       } catch (dbError) {
//         console.error("Error saving reply to post history:", dbError);
//         // Still return success since the tweet was posted
//         return res.json({
//           success: true,
//           message: "Reply posted successfully, but failed to save to history",
//           details: postResult.details || {},
//         });
//       }
//     } else {
//       // If posting failed but didn't throw an exception
//       return res.status(400).json({
//         success: false,
//         message: "Failed to post reply",
//         error: postResult.error || "Unknown error",
//       });
//     }
//   } catch (error) {
//     console.error("❌ Error in replying to tweet:", error.message);
//     return res.status(500).json({
//       success: false,
//       message: "Failed to post reply",
//       error: error.message,
//     });
//   }
// });

// async function postReplyWithPuppeteer(
//   username,
//   password,
//   tweetId,
//   replyText
// ) {
//   const browser = await puppeteer.launch({
//     headless: true, // Change to false to see what's happening
//     args: [
//       "--no-sandbox",
//       "--disable-setuid-sandbox",
//       "--disable-web-security",
//     ],
//     defaultViewport: null,
//   });

//   const page = await browser.newPage();
//   await page.setViewport({ width: 1280, height: 800 });
//   let result = {
//     success: false,
//     error: null,
//     details: {},
//   };

//   try {
//     console.log("🔐 Logging in...");

//     await page.goto("https://twitter.com/login", { waitUntil: "networkidle2" });

//     // Fill username
//     console.log("1");
//     await page.waitForSelector('input[name="text"]');
//     console.log("2");
//     await page.type('input[name="text"]', username);
//     console.log("3");
//     await page.keyboard.press("Enter");
//     console.log("4");
//     await new Promise((resolve) => setTimeout(resolve, 2000));

//     console.log("5");
//     // Fill password
//     await page.waitForSelector('input[name="password"]', { timeout: 10000 });
//     console.log("6");
//     console.log("🔑 Username:", username);
//     console.log("🔑 Password:", password);
//     console.log("🧪 typeof Password:", typeof password);

//     await page.type('input[name="password"]', password);
//     console.log("7");
//     await page.keyboard.press("Enter");
//     console.log("8");
//     await page.waitForNavigation({ waitUntil: "networkidle2" });
//     console.log("9");
//     console.log("✅ Logged in");

//     const tweetUrl = `https://twitter.com/i/web/status/${tweetId}`;

//     console.log(`📨 Opening tweet: ${tweetUrl}`);
//     console.log("🔗 Navigating to tweet:", tweetUrl);
//     await page.goto(tweetUrl, { waitUntil: "networkidle2", timeout: 90000 });

//     // Wait for reply button using stable test ID
//     await page.waitForSelector('button[data-testid="reply"]', {
//       timeout: 10000,
//     });
//     console.log("✅ Reply button found");

//     await page.click('button[data-testid="reply"]');
//     console.log("📨 Reply button clicked");

//     // Wait for reply modal textarea
//     await page.waitForSelector('div[data-testid="tweetTextarea_0"]', {
//       timeout: 15000,
//     });
//     await page.waitForSelector(
//       'div[role="textbox"][data-testid="tweetTextarea_0"]'
//     );
//     await page.type(
//       'div[role="textbox"][data-testid="tweetTextarea_0"]',
//       replyText
//     );
//     console.log("📝 Typed reply");

//     // Wait for the "Reply" button to become enabled
//     await page.waitForFunction(
//       () => {
//         const btn = document.querySelector(
//           'div[data-testid="tweetButton"] > button, button[data-testid="tweetButton"]'
//         );
//         return (
//           btn && !btn.disabled && btn.getAttribute("aria-disabled") !== "true"
//         );
//       },
//       { timeout: 10000 }
//     );

//     console.log("✅ Reply button is now enabled");

//     // Click the reply button
//     const replyBtn = await page.$(
//       'div[data-testid="tweetButton"] > button, button[data-testid="tweetButton"]'
//     );
//     await replyBtn.click();
//     console.log("Clicked reply button, waiting for confirmation...");
//     console.log("posted");
//     // Increase timeout to allow Twitter to process the reply
//     await new Promise((resolve) => setTimeout(resolve, 10000));

//     // Verify that the tweet was actually posted
//     try {
//       // Look for success indicators
//       const successIndicator = await page.evaluate(() => {
//         // Check for success toast or notification
//         const successToast =
//           document.body.textContent.includes("Your Tweet was sent") ||
//           document.body.textContent.includes("Reply posted");

//         // Check if the reply dialog is closed (another indicator of success)
//         const replyDialogClosed = !document.querySelector('div[role="dialog"]');

//         // Check for any error messages
//         const errorMessages =
//           document.body.innerText.match(
//             /error|failed|couldn't post|try again/i
//           ) || [];

//         return {
//           successToast,
//           replyDialogClosed,
//           errorMessages,
//         };
//       });

//       if (successIndicator.successToast || successIndicator.replyDialogClosed) {
//         console.log(
//           "✅ Tweet successfully posted! Indicators:",
//           successIndicator
//         );
//         result.success = true;
//         result.details = {
//           successIndicators: successIndicator,
//         };
//       } else if (successIndicator.errorMessages.length > 0) {
//         console.error(
//           "❌ Error messages found:",
//           successIndicator.errorMessages
//         );
//         result.success = false;
//         result.error = `Tweet posting failed: ${successIndicator.errorMessages.join(
//           ", "
//         )}`;
//       } else {
//         console.log("⚠️ No success indicators found, but no error either");
//         // In this case, we'll assume it worked since there's no error
//         result.success = true;
//         result.details = {
//           warning: "No explicit success indicators found, but no errors either",
//         };
//       }
//     } catch (verifyError) {
//       console.error("❌ Error verifying tweet post:", verifyError.message);
//       result.success = false;
//       result.error = `Failed to verify if tweet was posted: ${verifyError.message}`;
//     }

//     // Wait a bit longer to ensure everything is processed
//     await new Promise((resolve) => setTimeout(resolve, 5000));

//     return result;
//   } catch (err) {
//     console.error("❌ Puppeteer failed:", err.message);
//     result.success = false;
//     result.error = err.message;
//     return result;
//   } finally {
//     await browser.close();
//   }
// }
router.post("/reply-to-tweet", async (req, res) => {
  const {
    tweetId,
    replyText,
    selectedAccountId,
    keywordId,
    tweetText,
    likeCount,
    retweetCount,
    model,
    promptContent
  } = req.body;
  console.log(req.body);

  if (!tweetId || !replyText || !selectedAccountId) {
    return res
      .status(400)
      .json({ success: false, message: "Missing required fields" });
  }

  try {
    // Fetch user credentials from DB
    const result = await pool.query(
      "SELECT account_name,twitter_password FROM social_media_accounts WHERE id = $1",
      [selectedAccountId]
    );

    if (result.rows.length === 0) {
      return res
        .status(404)
        .json({
          success: false,
          message: "Twitter account not found for user",
        });
    }

    console.log(result.rows[0])
    const { account_name, twitter_password  } = result.rows[0];

    // Run Puppeteer login and reply - now returns a result object with reply ID
    const postResult = await postReplyWithPuppeteerAndGetId(
      account_name,
      twitter_password ,
      tweetId,
      replyText
    );

    if (postResult.success) {
      // Store the reply in post_history with the reply ID
      try {
        const tweetUrl = `https://twitter.com/i/web/status/${tweetId}`;

        const insertQuery = `
          INSERT INTO post_history
            (post_text, post_url, posted_at, engagement_count, likes_count, retweets_count, created_at, updated_at, keyword_id, account_id, reply_id, tweetId)
          VALUES
            ($1, $2, NOW(), $3, $4, $5, NOW(), NOW(), $6, $7, $8, $9)
          RETURNING id
        `;

        // Always store the reply in the database, even if we couldn't get the reply ID
        // The reply ID is optional, but the tweet ID is required
        const values = [
          replyText,
          tweetUrl,
          (likeCount || 0) + (retweetCount || 0), // Initial engagement count based on original tweet
          likeCount || 0,                         // Initial likes count
          retweetCount || 0,                      // Initial retweets count
          keywordId || null,
          selectedAccountId,
          postResult.replyId || null,             // Reply ID might be null if we couldn't find it
          tweetId                                 // Original tweet ID is always available
        ];

        const insertResult = await pool.query(insertQuery, values);
        const postHistoryId = insertResult.rows[0].id;

        return res.json({
          success: true,
          message: "Reply posted successfully",
          details: {
            ...postResult.details,
            post_history_id: postHistoryId,
            reply_id: postResult.replyId
          },
        });
      } catch (dbError) {
        console.error("Error saving reply to post history:", dbError);
        // Still return success since the tweet was posted
        return res.json({
          success: true,
          message: "Reply posted successfully, but failed to save to history",
          details: postResult.details || {},
        });
      }
    } else {
      // If posting failed but didn't throw an exception
      return res.status(400).json({
        success: false,
        message: "Failed to post reply",
        error: postResult.error || "Unknown error",
      });
    }
  } catch (error) {
    console.error("❌ Error in replying to tweet:", error.message);
    return res.status(500).json({
      success: false,
      message: "Failed to post reply",
      error: error.message,
    });
  }
});
 
async function postReplyWithPuppeteerAndGetId(
  username,
  twitter_password,
  tweetId,
  replyText
) {
  const browser = await puppeteer.launch({
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-web-security",
    ],
    defaultViewport: null,
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });
  let result = {
    success: false,
    error: null,
    details: {},
    replyId: null,
  };

  try {
    console.log("🔐 Logging in...");
 await page.goto("https://twitter.com/login", { waitUntil: "networkidle2" });

    // Take a screenshot of the initial login page for debugging
    try {
      await page.screenshot({ path: 'twitter-login-initial.png' });
      console.log("Screenshot saved as twitter-login-initial.png");
    } catch (screenshotError) {
      console.error("Failed to take initial screenshot:", screenshotError.message);
    }
    
    // Analyze the login page structure to determine the best approach
    console.log("🔍 Analyzing Twitter login page structure...");
    const loginPageFormat = await page.evaluate(() => {
      // Check for username field
      const usernameField = document.querySelector('input[name="text"], input[autocomplete="username"]');
      
      // Check for password field on the same page
      const passwordField = document.querySelector('input[type="password"], input[name="password"]');
      
      // Check for single-page login form
      const singlePageLogin = document.querySelector('form') &&
                             document.querySelector('form').querySelectorAll('input').length >= 2;
      
      // Check for verification or CAPTCHA
      const hasVerification = document.body.innerText.toLowerCase().includes('verify') ||
                             document.body.innerText.toLowerCase().includes('captcha') ||
                             document.body.innerText.toLowerCase().includes('unusual activity');
      
      return {
        hasUsernameField: !!usernameField,
        hasPasswordField: !!passwordField,
        isSinglePageLogin: !!singlePageLogin,
        hasVerification: hasVerification,
        pageTitle: document.title,
        bodyText: document.body.innerText.substring(0, 200) // First 200 chars for analysis
      };
    });
    
    console.log("Login page analysis:", loginPageFormat);
    
    // Handle different login page formats
    if (loginPageFormat.isSinglePageLogin && loginPageFormat.hasPasswordField) {
      console.log("Detected single-page login format with both username and password fields");
      
      // Try to find username field
      await page.waitForSelector('input[name="text"], input[autocomplete="username"]', { timeout: 10000 });
      await page.type('input[name="text"], input[autocomplete="username"]', username);
      console.log("Username entered in single-page format");
      
      // Try to find password field
      await page.waitForSelector('input[type="password"], input[name="password"]', { timeout: 10000 });
      await page.type('input[type="password"], input[name="password"]', twitter_password);
      console.log("Password entered in single-page format");
      
      // Find and click login button
      const loginButton = await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button, div[role="button"]'));
        const loginBtn = buttons.find(btn =>
          btn.innerText.toLowerCase().includes('log in') ||
          btn.innerText.toLowerCase().includes('sign in')
        );
        
        if (loginBtn) {
          const rect = loginBtn.getBoundingClientRect();
          return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
        }
        return null;
      });
      
      if (loginButton) {
        await page.mouse.click(loginButton.x, loginButton.y);
        console.log("Clicked login button in single-page format");
      } else {
        // Try to submit the form with Enter key
        await page.keyboard.press("Enter");
        console.log("Pressed Enter to submit login form");
      }
    } else if (loginPageFormat.hasVerification) {
      // Handle verification challenge
      console.log("⚠️ Verification or CAPTCHA detected on login page");
      console.log("Login page text:", loginPageFormat.bodyText);
      
      // Take a screenshot of the verification page
      try {
        await page.screenshot({ path: 'twitter-verification-challenge.png' });
        console.log("Screenshot saved as twitter-verification-challenge.png");
      } catch (screenshotError) {
        console.error("Failed to take verification screenshot:", screenshotError.message);
      }
      
      throw new Error("Twitter login requires verification or CAPTCHA. Manual login required.");
    } else {
      // Traditional two-step login flow
      console.log("Using traditional two-step login flow");
      
      //     // Fill username
      console.log("1");
      await page.waitForSelector('input[name="text"]');
      console.log("2");
      await page.type('input[name="text"]', username);
      console.log("3");
      await page.keyboard.press("Enter");
      console.log("4");
      // Wait longer after entering username
      await new Promise((resolve) => setTimeout(resolve, 5000));
      
      // Take a screenshot after username entry
      try {
        await page.screenshot({ path: 'twitter-login-after-username.png' });
        console.log("Screenshot saved as twitter-login-after-username.png");
      } catch (screenshotError) {
        console.error("Failed to take after-username screenshot:", screenshotError.message);
      }
      
      console.log("5");
      // Fill password - try multiple selectors with increased timeout
      let passwordFieldFound = false;
      
      // First attempt - original selector with increased timeout
      try {
        console.log("Trying original password selector...");
        await page.waitForSelector('input[name="password"]', { timeout: 20000 });
        console.log("6 - Password field found with original selector");
        passwordFieldFound = true;
      } catch (error) {
        console.log("Original password selector failed:", error.message);
      }
      
      // Second attempt - alternative selectors
      if (!passwordFieldFound) {
        try {
          console.log("Trying alternative password selectors...");
          await page.waitForSelector('input[type="password"], input.password-field', { timeout: 10000 });
          console.log("6 - Password field found with alternative selector");
          passwordFieldFound = true;
        } catch (error) {
          console.log("Alternative password selectors failed:", error.message);
        }
      }
      
      // Third attempt - look for any password input
      if (!passwordFieldFound) {
        try {
          console.log("Looking for any password input...");
          
          // Check if there's any password field on the page
          const passwordField = await page.evaluate(() => {
            const inputs = Array.from(document.querySelectorAll('input'));
            const passwordInput = inputs.find(input =>
              input.type === 'password' ||
              input.name === 'password' ||
              input.id?.includes('password') ||
              input.placeholder?.toLowerCase().includes('password')
            );
            
            if (passwordInput) {
              return {
                found: true,
                selector: passwordInput.id ? `#${passwordInput.id}` :
                          passwordInput.name ? `input[name="${passwordInput.name}"]` :
                          'input[type="password"]'
              };
            }
            return { found: false };
          });
          
          if (passwordField.found) {
            console.log(`6 - Password field found with dynamic selector: ${passwordField.selector}`);
            await page.waitForSelector(passwordField.selector, { timeout: 5000 });
            passwordFieldFound = true;
          }
        } catch (error) {
          console.log("Dynamic password field search failed:", error.message);
        }
      }
      
      // Check for verification or CAPTCHA after username entry
      if (!passwordFieldFound) {
        const verificationCheck = await page.evaluate(() => {
          const bodyText = document.body.innerText.toLowerCase();
          return {
            hasVerification: bodyText.includes('verify') ||
                            bodyText.includes('captcha') ||
                            bodyText.includes('unusual activity') ||
                            bodyText.includes('confirm your identity'),
            pageText: document.body.innerText.substring(0, 200) // First 200 chars for analysis
          };
        });
        
        if (verificationCheck.hasVerification) {
          console.log("⚠️ Verification or CAPTCHA detected after username entry:", verificationCheck.pageText);
          
          // Take a screenshot of the verification page
          try {
            await page.screenshot({ path: 'twitter-verification-after-username.png' });
            console.log("Screenshot saved as twitter-verification-after-username.png");
          } catch (screenshotError) {
            console.error("Failed to take verification screenshot:", screenshotError.message);
          }
          
          throw new Error("Twitter login requires verification or CAPTCHA after username entry. Manual login required.");
        }
      }
      
      // If all attempts failed, take a screenshot and throw an error
      if (!passwordFieldFound) {
        console.error("Failed to find password field with any method");
        
        // Take a screenshot to debug
        try {
          await page.screenshot({ path: 'password-field-error.png' });
          console.log("Screenshot saved as password-field-error.png");
        } catch (screenshotError) {
          console.error("Failed to take screenshot:", screenshotError.message);
        }
        
        throw new Error("Could not find password input field. Twitter may have changed their login page structure.");
      }
      
      console.log("🔑 Username:", username);
      console.log("🔑 Password:", twitter_password);
      console.log("🧪 typeof Password:", typeof twitter_password);
  
      // Type password in the found field
      if (passwordFieldFound) {
        // Use the appropriate selector based on which attempt succeeded
        const passwordSelector = await page.$('input[name="password"]') ? 'input[name="password"]' :
                                await page.$('input[type="password"]') ? 'input[type="password"]' :
                                'input.password-field';
        
        await page.type(passwordSelector, twitter_password);
      }
    }
    console.log("7");
    await page.keyboard.press("Enter");
    console.log("8");
    
    // Wait for navigation with increased timeout and better error handling
    try {
      await page.waitForNavigation({ waitUntil: "networkidle2", timeout: 30000 });
      console.log("9");
      console.log("✅ Logged in");
    } catch (navError) {
      console.log("Navigation timeout, but continuing anyway:", navError.message);
      // Take a screenshot to see what happened
      try {
        await page.screenshot({ path: 'post-login-state.png' });
        console.log("Screenshot saved as post-login-state.png");
      } catch (screenshotError) {
        console.error("Failed to take screenshot:", screenshotError.message);
      }
      
      // Check if we're actually logged in despite the navigation timeout
      const isLoggedIn = await page.evaluate(() => {
        // Look for elements that indicate we're logged in
        return !document.querySelector('input[name="password"]') &&
               (document.querySelector('[data-testid="AppTabBar_Home_Link"]') ||
                document.querySelector('[aria-label*="Home"]') ||
                document.querySelector('[data-testid="SideNav_NewTweet_Button"]'));
      });
      
      if (isLoggedIn) {
        console.log("✅ Appears to be logged in despite navigation timeout");
      } else {
        console.log("⚠️ May not be properly logged in");
      }
    }

    const tweetUrl = `https://twitter.com/i/web/status/${tweetId}`;
    console.log(`📨 Opening tweet: ${tweetUrl}`);
    await page.goto(tweetUrl, { waitUntil: "networkidle2", timeout: 90000 });

    // Wait for reply button and click it
    console.log("Looking for reply button...");
    
    let replyButtonFound = false;
    
    // Try different selectors for the reply button
    try {
      // First attempt - original selector
      await page.waitForSelector('button[data-testid="reply"]', {
        timeout: 15000,
      });
      console.log("✅ Reply button found with original selector");
      await page.click('button[data-testid="reply"]');
      replyButtonFound = true;
      console.log("📨 Reply button clicked");
    } catch (error) {
      console.log("Original reply button selector failed:", error.message);
    }
    
    // Second attempt - alternative selector
    if (!replyButtonFound) {
      try {
        console.log("Trying alternative reply button selector...");
        await page.waitForSelector('div[aria-label*="Reply"], button[aria-label*="Reply"]', {
          timeout: 10000,
        });
        console.log("✅ Reply button found with alternative selector");
        await page.click('div[aria-label*="Reply"], button[aria-label*="Reply"]');
        replyButtonFound = true;
        console.log("📨 Reply button clicked");
      } catch (error) {
        console.log("Alternative reply button selector failed:", error.message);
      }
    }
    
    // Third attempt - look for any button with reply text
    if (!replyButtonFound) {
      try {
        console.log("Trying to find any button with reply text...");
        
        // Look for any element that might be a reply button
        const replyButton = await page.evaluate(() => {
          // Look for elements containing "reply" text
          const elements = Array.from(document.querySelectorAll('button, div[role="button"]'));
          const replyElement = elements.find(el =>
            el.innerText.toLowerCase().includes('reply') ||
            el.getAttribute('aria-label')?.toLowerCase().includes('reply')
          );
          
          if (replyElement) {
            // Get element coordinates for clicking
            const rect = replyElement.getBoundingClientRect();
            return {
              found: true,
              x: rect.left + rect.width / 2,
              y: rect.top + rect.height / 2
            };
          }
          
          return { found: false };
        });
        
        if (replyButton.found) {
          console.log("✅ Reply button found with text search");
          await page.mouse.click(replyButton.x, replyButton.y);
          replyButtonFound = true;
          console.log("📨 Reply button clicked");
        }
      } catch (error) {
        console.log("Text-based reply button search failed:", error.message);
      }
    }
    
    // If all attempts failed, take a screenshot and throw an error
    if (!replyButtonFound) {
      console.error("Failed to find reply button with any method");
      
      // Take a screenshot to debug
      try {
        await page.screenshot({ path: 'reply-button-error.png' });
        console.log("Screenshot saved as reply-button-error.png");
      } catch (screenshotError) {
        console.error("Failed to take screenshot:", screenshotError.message);
      }
      
      throw new Error("Could not find reply button");
    }

    // Wait for reply modal textarea and type reply
    // Try multiple selectors as Twitter's UI might change
    console.log("Waiting for tweet textarea...");
    
    let textareaFound = false;
    
    // Try different selectors with increased timeout
    try {
      // First attempt - original selector
      await page.waitForSelector('div[data-testid="tweetTextarea_0"]', {
        timeout: 20000,
      });
      await page.waitForSelector(
        'div[role="textbox"][data-testid="tweetTextarea_0"]'
      );
      await page.type(
        'div[role="textbox"][data-testid="tweetTextarea_0"]',
        replyText
      );
      textareaFound = true;
      console.log("Found textarea using original selector");
    } catch (error) {
      console.log("Original textarea selector failed:", error.message);
    }
    
    // Second attempt - alternative selector
    if (!textareaFound) {
      try {
        console.log("Trying alternative selector...");
        await page.waitForSelector('div[role="textbox"]', {
          timeout: 10000,
        });
        await page.type('div[role="textbox"]', replyText);
        textareaFound = true;
        console.log("Found textarea using alternative selector");
      } catch (error) {
        console.log("Alternative textarea selector failed:", error.message);
      }
    }
    
    // Third attempt - look for any editable div
    if (!textareaFound) {
      try {
        console.log("Trying to find any editable div...");
        await page.waitForSelector('div[contenteditable="true"]', {
          timeout: 10000,
        });
        await page.type('div[contenteditable="true"]', replyText);
        textareaFound = true;
        console.log("Found textarea using contenteditable selector");
      } catch (error) {
        console.log("Contenteditable selector failed:", error.message);
      }
    }
    
    // If all attempts failed, take a screenshot and throw an error
    if (!textareaFound) {
      console.error("Failed to find tweet textarea with any selector");
      
      // Take a screenshot to debug
      try {
        await page.screenshot({ path: 'tweet-reply-error.png' });
        console.log("Screenshot saved as tweet-reply-error.png");
      } catch (screenshotError) {
        console.error("Failed to take screenshot:", screenshotError.message);
      }
      
      throw new Error("Could not find tweet textarea element");
    }
    console.log("📝 Typed reply");

    // Wait for the "Reply" button to become enabled with multiple selector attempts
    console.log("Waiting for tweet button to be enabled...");
    
    let tweetButtonFound = false;
    
    // First attempt - original selector
    try {
      await page.waitForFunction(
        () => {
          const btn = document.querySelector(
            'div[data-testid="tweetButton"] > button, button[data-testid="tweetButton"]'
          );
          return (
            btn && !btn.disabled && btn.getAttribute("aria-disabled") !== "true"
          );
        },
        { timeout: 10000 }
      );
      
      console.log("✅ Tweet button found with original selector");
      const replyBtn = await page.$(
        'div[data-testid="tweetButton"] > button, button[data-testid="tweetButton"]'
      );
      await replyBtn.click();
      tweetButtonFound = true;
      console.log("📨 Tweet button clicked");
    } catch (error) {
      console.log("Original tweet button selector failed:", error.message);
    }
    
    // Second attempt - alternative selector
    if (!tweetButtonFound) {
      try {
        console.log("Trying alternative tweet button selector...");
        await page.waitForFunction(
          () => {
            const btn = document.querySelector(
              'button[data-testid*="tweet"], div[role="button"][data-testid*="tweet"]'
            );
            return (
              btn && !btn.disabled && btn.getAttribute("aria-disabled") !== "true"
            );
          },
          { timeout: 10000 }
        );
        
        console.log("✅ Tweet button found with alternative selector");
        const replyBtn = await page.$(
          'button[data-testid*="tweet"], div[role="button"][data-testid*="tweet"]'
        );
        await replyBtn.click();
        tweetButtonFound = true;
        console.log("📨 Tweet button clicked");
      } catch (error) {
        console.log("Alternative tweet button selector failed:", error.message);
      }
    }
    
    // Third attempt - look for any enabled button in the reply dialog
    if (!tweetButtonFound) {
      try {
        console.log("Trying to find any enabled button in reply dialog...");
        
        // Look for any button that might be a tweet button
        const tweetButton = await page.evaluate(() => {
          // First look for dialog
          const dialog = document.querySelector('div[role="dialog"]');
          if (!dialog) return { found: false };
          
          // Look for enabled buttons in the dialog
          const buttons = Array.from(dialog.querySelectorAll('button:not([disabled]), div[role="button"]'));
          const tweetBtn = buttons.find(btn =>
            !btn.disabled &&
            btn.getAttribute("aria-disabled") !== "true" &&
            (btn.innerText.toLowerCase().includes('tweet') ||
             btn.innerText.toLowerCase().includes('reply') ||
             btn.getAttribute('aria-label')?.toLowerCase().includes('tweet') ||
             btn.getAttribute('aria-label')?.toLowerCase().includes('reply'))
          );
          
          if (tweetBtn) {
            // Get element coordinates for clicking
            const rect = tweetBtn.getBoundingClientRect();
            return {
              found: true,
              x: rect.left + rect.width / 2,
              y: rect.top + rect.height / 2
            };
          }
          
          return { found: false };
        });
        
        if (tweetButton.found) {
          console.log("✅ Tweet button found with dialog search");
          await page.mouse.click(tweetButton.x, tweetButton.y);
          tweetButtonFound = true;
          console.log("📨 Tweet button clicked");
        }
      } catch (error) {
        console.log("Dialog-based tweet button search failed:", error.message);
      }
    }
    
    // If all attempts failed, take a screenshot and throw an error
    if (!tweetButtonFound) {
      console.error("Failed to find tweet button with any method");
      
      // Take a screenshot to debug
      try {
        await page.screenshot({ path: 'tweet-button-error.png' });
        console.log("Screenshot saved as tweet-button-error.png");
      } catch (screenshotError) {
        console.error("Failed to take screenshot:", screenshotError.message);
      }
      
      throw new Error("Could not find tweet button");
    }
    
    console.log("Waiting for confirmation after clicking tweet button...");

    // Wait for the reply to be posted
    await new Promise((resolve) => setTimeout(resolve, 10000));

    // Now try to get the reply ID by going to the user's profile and finding the reply
    console.log("🔍 Searching for reply ID...");

    // Go to user profile's replies tab
    const userProfileUrl = `https://twitter.com/${username}`;
    await page.goto(userProfileUrl, { waitUntil: "networkidle2" });

    // Click on "Replies" tab
    await page.waitForSelector('a[href$="/with_replies"]', { timeout: 10000 });
    await page.click('a[href$="/with_replies"]');
  // Wait longer to ensure the page loads completely
  await new Promise(resolve => setTimeout(resolve, 5000));

    console.log("🔍 Scanning replies for the posted reply...");

    // Scroll down a bit to make sure we see the latest replies
    await page.evaluate(() => window.scrollBy(0, 500));
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Improved reply ID extraction with multiple attempts
    let replyId = null;

    // First attempt: Look for the reply we just posted
    try {
      replyId = await page.evaluate((originalTweetId, replyContent) => {
        const articles = document.querySelectorAll('article');
        console.log(`Found ${articles.length} articles to check`);

        for (const article of articles) {
          // Check if this article contains our reply text
          const tweetText = article.querySelector('div[lang]')?.innerText || '';

          if (tweetText.includes(replyContent)) {
            console.log(`Found article with matching text: ${tweetText.substring(0, 50)}...`);

            // Check if this is a reply to our target tweet
            const links = article.querySelectorAll('a[href*="/status/"]');

            for (const link of links) {
              const href = link.getAttribute('href');
              if (href && href.includes('/status/')) {
                console.log(`Found link with href: ${href}`);

                // If this is our reply, extract the reply ID
                const replyLinks = article.querySelectorAll('a[href*="/status/"]');
                for (const replyLink of replyLinks) {
                  const replyHref = replyLink.getAttribute('href');
                  if (replyHref && replyHref.includes('/status/') && !replyHref.includes(`/${originalTweetId}`)) {
                    const replyMatch = replyHref.match(/\/status\/(\d+)/);
                    if (replyMatch && replyMatch[1]) {
                      console.log(`Found reply ID: ${replyMatch[1]}`);
                      return replyMatch[1];
                    }
                  }
                }
              }
            }
          }
        }
        return null;
      }, tweetId, replyText);
    } catch (error) {
      console.error("Error in first attempt to find reply ID:", error.message);
    }

    // Second attempt: If we couldn't find the reply ID, try a different approach
    if (!replyId) {
      console.log("First attempt failed, trying second approach...");
      try {
        // Wait a bit more and try again
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Try to find any recent tweet from this user that contains our reply text
        replyId = await page.evaluate((replyContent) => {
          const articles = document.querySelectorAll('article');

          for (const article of articles) {
            const tweetText = article.querySelector('div[lang]')?.innerText || '';

            // If this article contains our reply text, it's likely our reply
            if (tweetText.includes(replyContent)) {
              // Get the tweet ID from any status link in this article
              const statusLinks = article.querySelectorAll('a[href*="/status/"]');
              for (const link of statusLinks) {
                const href = link.getAttribute('href');
                const match = href.match(/\/status\/(\d+)/);
                if (match && match[1]) {
                  return match[1];
                }
              }
            }
          }
          return null;
        }, replyText);
      } catch (error) {
        console.error("Error in second attempt to find reply ID:", error.message);
      }
    }

    if (replyId) {
      console.log("✅ Found reply ID:", replyId);
      result.replyId = replyId;
      result.success = true;
      result.details = {
        message: "Reply posted and ID retrieved successfully",
        replyId: replyId
      };
    } else {
      console.log("⚠️ Reply posted but couldn't find reply ID");
      // Still mark as success since the reply was posted
      result.success = true;
      result.details = {
        warning: "Reply posted but couldn't retrieve reply ID. The reply will still be stored in the database.",
      };
    }

    return result;
  } catch (err) {
    console.error("❌ Puppeteer failed:", err.message);
    result.success = false;
    result.error = err.message;
    return result;
  } finally {
    await browser.close();
  }
}

 



// DELETE /api/history/:id - Delete a post from post history
router.delete("/history/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      `DELETE FROM post_history WHERE id = $1 RETURNING id`,
      [id]
    );
    
    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'Post not found in history'
      });
    }
    
    res.json({
      success: true,
      message: 'Post successfully deleted from history',
      id: result.rows[0].id
    });
  } catch (err) {
    console.error("Delete error:", err.message);
    res.status(500).json({
      success: false,
      message: "Failed to delete post from history",
      error: err.message
    });
  }
});

// Simple GET endpoint to check if the generate-reply route is accessible
router.get("/generate-reply-check", (req, res) => {
  res.json({
    success: true,
    message: "Generate reply endpoint is accessible"
  });
});

// New endpoint to generate replies using OpenRouter API
router.post("/generate-reply", async (req, res) => {
  try {
    console.log("Received generate-reply request:", req.body);
    const { model, messages, tweetContent, promptTemplate, keywordId } = req.body;
    
    // If tweetContent is provided, use the generateReply function
    if (tweetContent) {
      const reply = await generateReply(tweetContent, model, promptTemplate, keywordId);
      
      if (!reply) {
        return res.status(500).json({
          success: false,
          message: "Failed to generate reply"
        });
      }
      
      return res.json({
        success: true,
        reply: reply
      });
    }
    
    // Otherwise, use the raw messages approach
    if (!model || !messages || !messages.length) {
      return res.status(400).json({
        success: false,
        message: "Missing required parameters: model and messages or tweetContent"
      });
    }
    
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      console.error("OpenRouter API key not configured");
      return res.status(500).json({
        success: false,
        message: "OpenRouter API key not configured"
      });
    }
    
    console.log(`\n========== DIRECT API REPLY GENERATION STARTED ==========`);
    console.log(`Initial Model: ${model}`);
    console.log(`Message Length: ${messages[0].content.length} characters`);
    
    try {
      console.log(`\n🤖 FINAL GENERATION PARAMETERS:`);
      console.log(`   Model: ${model}`);
      if (model === "anthropic/claude-3-sonnet-20240229") {
        console.log(`   ⚠️ Using corrected model: anthropic/claude-3-sonnet-20240229-v1:0`);
      }
      console.log(`   Prompt: ${messages[0].content.substring(0, 100)}${messages[0].content.length > 100 ? '...' : ''}`);
      
      const response = await axios.post(
        "https://openrouter.ai/api/v1/chat/completions",
        {
          model: model === "anthropic/claude-3-sonnet-20240229" ? "anthropic/claude-3-sonnet-20240229-v1:0" : model,
          messages: messages,
        },
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
        }
      );
      
      const reply = response.data.choices[0]?.message?.content;
      
      console.log(`\n✅ Reply generated successfully (${reply?.length || 0} characters)`);
      console.log(`========== DIRECT API REPLY GENERATION COMPLETED ==========\n`);
      
      if (!reply) {
        return res.status(500).json({
          success: false,
          message: "Failed to generate reply - no content in response"
        });
      }
      
      res.json({
        success: true,
        reply: reply
      });
    } catch (apiError) {
      console.error("OpenRouter API error:", apiError.response?.data || apiError.message);
      return res.status(500).json({
        success: false,
        message: `OpenRouter API error: ${apiError.response?.data?.error?.message || apiError.message}`
      });
    }
    
  } catch (error) {
    console.error("Error generating reply:", error.message);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to generate reply"
    });
  }
});

module.exports = router;
