// update-post-engagement.js
// This script updates the engagement metrics for posts in the post_history table
// It can be run periodically using a cron job or similar scheduler

require('dotenv').config();
const pool = require('../db');
const puppeteer = require('puppeteer');

async function updatePostEngagement() {
  console.log('Starting post engagement update...');
  
  try {
    // Get posts that need engagement updates
    // For this example, we'll get posts that are less than 7 days old
    const result = await pool.query(`
      SELECT ph.id, ph.post_url, ph.posted_at
      FROM post_history ph
      WHERE ph.deleted_at IS NULL
        AND ph.posted_at > NOW() - INTERVAL '7 days'
      ORDER BY ph.posted_at DESC
    `);
    
    if (result.rows.length === 0) {
      console.log('No posts found to update');
      return;
    }
    
    console.log(`Found ${result.rows.length} posts to update`);
    
    // Launch browser
    const browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-web-security',
      ],
      defaultViewport: null,
    });
    
    for (const post of result.rows) {
      try {
        console.log(`Updating engagement for post ID: ${post.id}`);
        
        // Skip posts without a URL
        if (!post.post_url) {
          console.log(`Skipping post ID: ${post.id} - No URL`);
          continue;
        }
        
        // Extract metrics using Puppeteer
        const metrics = await getPostEngagementMetrics(browser, post.post_url);
        
        if (metrics) {
          // Update the post in the database
          await pool.query(`
            UPDATE post_history
            SET likes_count = $1,
                retweets_count = $2,
                engagement_count = $3,
                updated_at = NOW()
            WHERE id = $4
          `, [
            metrics.likes,
            metrics.retweets,
            metrics.likes + metrics.retweets,
            post.id
          ]);
          
          console.log(`Updated post ID: ${post.id} - Likes: ${metrics.likes}, Retweets: ${metrics.retweets}`);
        } else {
          console.log(`Failed to get metrics for post ID: ${post.id}`);
        }
      } catch (postError) {
        console.error(`Error updating post ID: ${post.id}`, postError);
      }
      
      // Add a small delay between requests to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    // Close browser
    await browser.close();
    
    console.log('Post engagement update completed');
  } catch (error) {
    console.error('Error updating post engagement:', error);
  } finally {
    // Close the database connection
    pool.end();
  }
}

async function getPostEngagementMetrics(browser, postUrl) {
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });
    
    console.log(`Fetching metrics for URL: ${postUrl}`);
    await page.goto(postUrl, { waitUntil: 'networkidle2', timeout: 60000 });
    
    // Wait for the page to load
    await page.waitForTimeout(3000);
    
    // Extract metrics
    const metrics = await page.evaluate(() => {
      try {
        // Look for the metrics in the tweet
        const metricsElement = document.querySelector('[role="group"]');
        if (!metricsElement) return null;
        
        const metricsLabel = metricsElement.getAttribute('aria-label') || '';
        
        // Extract values using regex
        const likes = Number((metricsLabel.match(/(\d+)\s+like/)?.[1]) || 0);
        const retweets = Number((metricsLabel.match(/(\d+)\s+repost/)?.[1]) || 0);
        
        return { likes, retweets };
      } catch (err) {
        console.error('Error extracting metrics:', err);
        return null;
      }
    });
    
    await page.close();
    return metrics;
  } catch (error) {
    console.error('Error fetching post metrics:', error);
    return null;
  }
}

// Run the script
updatePostEngagement().catch(console.error);