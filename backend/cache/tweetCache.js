// cache/tweetCache.js

const cache = {};
const TTL = 15 * 60 * 1000; // 15 minutes

function setCache(keyword, data) {
  cache[keyword] = {
    data,
    time: Date.now()
  };
}

function getCache(keyword) {
  const entry = cache[keyword];
  if (!entry) return null;

  const isExpired = Date.now() - entry.time > TTL;
  if (isExpired) {
    delete cache[keyword];
    return null;
  }

  return entry.data;
}

module.exports = {
  setCache,
  getCache
};
