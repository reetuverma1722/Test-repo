// trendingRoutes.js
const express = require('express');
const router = express.Router();
const axios = require('axios');
const jwt = require('jsonwebtoken');

// Middleware to check authentication
const checkAuth = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      // For development purposes, allow requests without a token
      console.log('No token provided, using default user ID');
      req.user = { id: 1 }; // Default user ID for testing
      return next();
    }
    
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'buzzly-secret-key');
      req.user = decoded;
    } catch (err) {
      console.log('Invalid token, using default user ID');
      req.user = { id: 1 }; // Default user ID for testing
    }
     
    next();
  } catch (error) {
    console.error('Auth error:', error);
    req.user = { id: 1 }; // Default user ID for testing
    next();
  }
};

// Get trending hashtags from Twitter
router.get('/trending/twitter', checkAuth, async (req, res) => {
  try {
    // Fetch trending hashtags from Trend24 API
    const options = {
	method: 'GET',
	hostname: 'twitter-trends-by-location.p.rapidapi.com',
	port: null,
	path: '/locations',
	headers: {
		'x-rapidapi-key': 'fa14ec6950msh58daef721594911p1c4f7bjsna524ade84138',
		'x-rapidapi-host': 'twitter-trends-by-location.p.rapidapi.com'
	}
};
const req = http.request(options, function (res) {
	const chunks = [];

	res.on('data', function (chunk) {
		chunks.push(chunk);
	});

	res.on('end', function () {
		const body = Buffer.concat(chunks);
		console.log(body.toString());
	});
});
  } catch (error) {
    console.error('Error fetching Twitter trending hashtags:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch Twitter trending hashtags' });
  }
});

// Get trending hashtags from LinkedIn
router.get('/trending/linkedin', checkAuth, async (req, res) => {
  try {
    // Fetch trending hashtags from Trend24 API
    const response = await axios.get('https://api.trend24.app/v1/trends/linkedin');
    
    // Process and format the data
    const trendingData = response.data;
    
    // Return the trending data
    res.json({ 
      success: true, 
      data: trendingData 
    });
  } catch (error) {
    console.error('Error fetching LinkedIn trending hashtags:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch LinkedIn trending hashtags' });
  }
});

// Get combined trending data from both platforms
router.get('/trending', checkAuth, async (req, res) => {
  try {
    // Fetch trending hashtags from both platforms
    const [twitterResponse, linkedinResponse] = await Promise.all([
      axios.get('https://api.trend24.app/v1/trends/twitter'),
      axios.get('https://api.trend24.app/v1/trends/linkedin')
    ]);
    
    // Process and format the data
    const twitterData = twitterResponse.data;
    const linkedinData = linkedinResponse.data;
    
    // Analyze and combine the data
    const combinedData = {
      twitter: twitterData,
      linkedin: linkedinData,
      analysis: {
        commonTrends: findCommonTrends(twitterData, linkedinData),
        topTwitterTrends: getTopTrends(twitterData, 10),
        topLinkedInTrends: getTopTrends(linkedinData, 10)
      }
    };
    
    // Return the combined data
    res.json({ 
      success: true, 
      data: combinedData 
    });
  } catch (error) {
    console.error('Error fetching trending hashtags:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch trending hashtags' });
  }
});

// Helper function to find common trends between platforms
function findCommonTrends(twitterData, linkedinData) {
  // This is a simplified implementation
  // In a real implementation, you would need to parse the actual response structure
  const twitterTrends = extractTrends(twitterData);
  const linkedinTrends = extractTrends(linkedinData);
  
  // Find common trends (case-insensitive)
  return twitterTrends.filter(trend => 
    linkedinTrends.some(liTrend => 
      liTrend.toLowerCase() === trend.toLowerCase()
    )
  );
}

// Helper function to extract trends from API response
function extractTrends(data) {
  // This is a placeholder implementation
  // In a real implementation, you would need to parse the actual response structure
  // based on the Trend24 API documentation
  try {
    // Example implementation - adjust based on actual API response structure
    if (data && data.trends) {
      return data.trends.map(trend => trend.name || trend.hashtag || trend.text);
    }
    return [];
  } catch (error) {
    console.error('Error extracting trends:', error);
    return [];
  }
}

// Helper function to get top trends
function getTopTrends(data, count) {
  // This is a placeholder implementation
  // In a real implementation, you would need to parse the actual response structure
  // and sort by volume, engagement, or other metrics
  try {
    // Example implementation - adjust based on actual API response structure
    if (data && data.trends) {
      return data.trends
        .slice(0, count)
        .map(trend => ({
          name: trend.name || trend.hashtag || trend.text,
          volume: trend.volume || trend.count || 0,
          sentiment: trend.sentiment || 'neutral'
        }));
    }
    return [];
  } catch (error) {
    console.error('Error getting top trends:', error);
    return [];
  }
}

module.exports = router;