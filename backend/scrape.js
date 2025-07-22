// const puppeteer = require('puppeteer');

// const TWITTER_USERNAME = '@Reetuqss';
// const TWITTER_PASSWORD = 'Alokozay@17';

// (async () => {
//   const browser = await puppeteer.connect({
//     browserWSEndpoint: 'ws://localhost:9222/devtools/browser/db0431f0-2b53-4100-bd42-c763a74a3840', // Replace with actual endpoint
//   }).catch(async (err) => {
//     console.log('No existing browser found, launching a new one...');
//     return await puppeteer.launch({
//       headless: false,
//       defaultViewport: null,
//       args: ['--no-sandbox'],
//     });
//   });

//   const page = await browser.newPage();

//   try {
//     await page.goto('https://twitter.com/login', {
//       waitUntil: 'domcontentloaded',
//     });

//     // Wait and type username
//     await page.waitForSelector('input[name="text"]');
//     await page.type('input[name="text"]', TWITTER_USERNAME);
//     await page.keyboard.press('Enter');
//     await new Promise(res => setTimeout(res, 2000));


//     // Wait and type password
//     await page.waitForSelector('input[name="password"]', { timeout: 10000 });
//     await page.type('input[name="password"]', TWITTER_PASSWORD);
//     await page.keyboard.press('Enter');
//     await page.waitForNavigation({ waitUntil: 'domcontentloaded' });

//     // Go to profile
//     await page.goto(`https://twitter.com/${TWITTER_USERNAME}`, {
//       waitUntil: 'networkidle2',
//     });

//     await page.waitForSelector('article');

//     const tweets = await page.evaluate(() => {
//       const tweetEls = document.querySelectorAll('article div[lang]');
//       return Array.from(tweetEls).map((el) => el.innerText);
//     });

//     console.log('✅ Tweets:', tweets);
//   } catch (error) {
//     console.error('❌ Error during login or scraping:', error.message);
//   } finally {
//     // await browser.close(); // Keep browser open if debugging
//   }
// })();


const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.connect({
    browserWSEndpoint: 'ws://localhost:9222/devtools/browser/db0431f0-2b53-4100-bd42-c763a74a3840',
  }).catch(async (err) => {
    console.log('No existing browser found, launching a new one...');
    return await puppeteer.launch({
      headless: false,
      defaultViewport: null,
      args: ['--no-sandbox'],
    });
  });

  const page = await browser.newPage();

  try {
    const keyword = 'AI jobs'; // ✅ change this to any keyword you want
    const searchQuery = encodeURIComponent(keyword);

    await page.goto(`https://twitter.com/search?q=${searchQuery}&src=typed_query`, {
      waitUntil: 'domcontentloaded',
    });

    await page.waitForSelector('article', { timeout: 15000 });

    const tweets = await page.evaluate(() => {
      const tweetEls = document.querySelectorAll('article div[lang]');
      return Array.from(tweetEls).map(el => el.innerText);
    });

    console.log(`✅ Found ${tweets.length} tweets for keyword: "${keyword}"`);
    console.log(tweets);
  } catch (error) {
    console.error('❌ Error during scraping:', error.message);
    await page.screenshot({ path: 'error-screenshot.png' });
    console.log('📸 Screenshot saved to error-screenshot.png');
  } finally {
    // await browser.close(); // Keep it open if you're debugging
  }
})();
  