"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = exports.isRepostAllowed = exports.formatTimeSince = exports.addFromSearch = exports.scrapeReplyEngagement = exports.updateLinkedInEngagementMetrics = exports.updateEngagementMetrics = exports.deleteLinkedInPost = exports.deletePost = exports.repostLinkedInPost = exports.repostPost = exports.getLinkedInPostHistory = exports.getPostHistoryall = exports.getPostHistory = exports.getLinkedInAccounts = exports.getAccounts = void 0;
var BASE_URL = 'http://localhost:5000/api'; // Helper function for GET requests

var apiGet = function apiGet(endpoint) {
  var token,
      headers,
      userStr,
      res,
      result,
      _args = arguments;
  return regeneratorRuntime.async(function apiGet$(_context) {
    while (1) {
      switch (_context.prev = _context.next) {
        case 0:
          token = _args.length > 1 && _args[1] !== undefined ? _args[1] : null;
          _context.prev = 1;
          headers = {
            'Content-Type': 'application/json'
          }; // Always include Authorization header, even with a dummy token for development

          headers.Authorization = "Bearer ".concat(token || 'dummy-token'); // Add user data from localStorage if available

          userStr = localStorage.getItem('user');

          if (userStr) {
            headers['X-User-Data'] = userStr;
          }

          _context.next = 8;
          return regeneratorRuntime.awrap(fetch("".concat(BASE_URL).concat(endpoint), {
            method: 'GET',
            headers: headers
          }));

        case 8:
          res = _context.sent;
          _context.next = 11;
          return regeneratorRuntime.awrap(res.json());

        case 11:
          result = _context.sent;

          if (res.ok) {
            _context.next = 14;
            break;
          }

          throw new Error(result.message || 'API error');

        case 14:
          return _context.abrupt("return", result);

        case 17:
          _context.prev = 17;
          _context.t0 = _context["catch"](1);
          throw new Error(_context.t0.message || 'Network error');

        case 20:
        case "end":
          return _context.stop();
      }
    }
  }, null, null, [[1, 17]]);
}; // Helper function for POST requests


var apiPost = function apiPost(endpoint) {
  var data,
      token,
      headers,
      res,
      result,
      _args2 = arguments;
  return regeneratorRuntime.async(function apiPost$(_context2) {
    while (1) {
      switch (_context2.prev = _context2.next) {
        case 0:
          data = _args2.length > 1 && _args2[1] !== undefined ? _args2[1] : {};
          token = _args2.length > 2 && _args2[2] !== undefined ? _args2[2] : null;
          _context2.prev = 2;
          headers = {
            'Content-Type': 'application/json'
          }; // Always include Authorization header, even with a dummy token for development

          headers.Authorization = "Bearer ".concat(token || 'dummy-token');
          _context2.next = 7;
          return regeneratorRuntime.awrap(fetch("".concat(BASE_URL).concat(endpoint), {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(data)
          }));

        case 7:
          res = _context2.sent;
          _context2.next = 10;
          return regeneratorRuntime.awrap(res.json());

        case 10:
          result = _context2.sent;

          if (res.ok) {
            _context2.next = 13;
            break;
          }

          throw new Error(result.message || 'API error');

        case 13:
          return _context2.abrupt("return", result);

        case 16:
          _context2.prev = 16;
          _context2.t0 = _context2["catch"](2);
          throw new Error(_context2.t0.message || 'Network error');

        case 19:
        case "end":
          return _context2.stop();
      }
    }
  }, null, null, [[2, 16]]);
}; // Get all social media accounts for the user


var getAccounts = function getAccounts() {
  var token,
      userId,
      userStr,
      user,
      _args3 = arguments;
  return regeneratorRuntime.async(function getAccounts$(_context3) {
    while (1) {
      switch (_context3.prev = _context3.next) {
        case 0:
          token = _args3.length > 0 && _args3[0] !== undefined ? _args3[0] : null;
          // Get user ID from localStorage
          userId = null;
          userStr = localStorage.getItem('user');

          if (userStr) {
            try {
              user = JSON.parse(userStr);
              userId = user.id;
            } catch (error) {
              console.error("Error parsing user data:", error);
            }
          } // If userId is available, include it in the request


          if (!userId) {
            _context3.next = 10;
            break;
          }

          _context3.next = 7;
          return regeneratorRuntime.awrap(apiGet("/accounts/twitter?userId=".concat(userId), token));

        case 7:
          return _context3.abrupt("return", _context3.sent);

        case 10:
          _context3.next = 12;
          return regeneratorRuntime.awrap(apiGet('/accounts/twitter', token));

        case 12:
          return _context3.abrupt("return", _context3.sent);

        case 13:
        case "end":
          return _context3.stop();
      }
    }
  });
}; // Get LinkedIn accounts for the user


exports.getAccounts = getAccounts;

var getLinkedInAccounts = function getLinkedInAccounts() {
  var token,
      userId,
      userStr,
      user,
      _args4 = arguments;
  return regeneratorRuntime.async(function getLinkedInAccounts$(_context4) {
    while (1) {
      switch (_context4.prev = _context4.next) {
        case 0:
          token = _args4.length > 0 && _args4[0] !== undefined ? _args4[0] : null;
          // Get user ID from localStorage
          userId = null;
          userStr = localStorage.getItem('user');

          if (userStr) {
            try {
              user = JSON.parse(userStr);
              userId = user.id;
            } catch (error) {
              console.error("Error parsing user data:", error);
            }
          } // If userId is available, include it in the request


          if (!userId) {
            _context4.next = 10;
            break;
          }

          _context4.next = 7;
          return regeneratorRuntime.awrap(apiGet("/accounts/linkedin?userId=".concat(userId), token));

        case 7:
          return _context4.abrupt("return", _context4.sent);

        case 10:
          _context4.next = 12;
          return regeneratorRuntime.awrap(apiGet('/accounts/linkedin', token));

        case 12:
          return _context4.abrupt("return", _context4.sent);

        case 13:
        case "end":
          return _context4.stop();
      }
    }
  });
}; // Get post history for a specific account


exports.getLinkedInAccounts = getLinkedInAccounts;

var getPostHistory = function getPostHistory(id) {
  var token,
      _args5 = arguments;
  return regeneratorRuntime.async(function getPostHistory$(_context5) {
    while (1) {
      switch (_context5.prev = _context5.next) {
        case 0:
          token = _args5.length > 1 && _args5[1] !== undefined ? _args5[1] : null;
          _context5.next = 3;
          return regeneratorRuntime.awrap(apiGet("/history/".concat(id), token));

        case 3:
          return _context5.abrupt("return", _context5.sent);

        case 4:
        case "end":
          return _context5.stop();
      }
    }
  });
};

exports.getPostHistory = getPostHistory;

var getPostHistoryall = function getPostHistoryall() {
  return regeneratorRuntime.async(function getPostHistoryall$(_context6) {
    while (1) {
      switch (_context6.prev = _context6.next) {
        case 0:
          _context6.next = 2;
          return regeneratorRuntime.awrap(apiGet('/historyAll'));

        case 2:
          return _context6.abrupt("return", _context6.sent);

        case 3:
        case "end":
          return _context6.stop();
      }
    }
  });
}; // Get LinkedIn post history for a specific account


exports.getPostHistoryall = getPostHistoryall;

var getLinkedInPostHistory = function getLinkedInPostHistory(id) {
  var token,
      _args7 = arguments;
  return regeneratorRuntime.async(function getLinkedInPostHistory$(_context7) {
    while (1) {
      switch (_context7.prev = _context7.next) {
        case 0:
          token = _args7.length > 1 && _args7[1] !== undefined ? _args7[1] : null;
          _context7.next = 3;
          return regeneratorRuntime.awrap(apiGet("/history/linkedin/".concat(id), token));

        case 3:
          return _context7.abrupt("return", _context7.sent);

        case 4:
        case "end":
          return _context7.stop();
      }
    }
  });
}; // Repost a specific post


exports.getLinkedInPostHistory = getLinkedInPostHistory;

var repostPost = function repostPost(postId) {
  var token,
      _args8 = arguments;
  return regeneratorRuntime.async(function repostPost$(_context8) {
    while (1) {
      switch (_context8.prev = _context8.next) {
        case 0:
          token = _args8.length > 1 && _args8[1] !== undefined ? _args8[1] : null;
          _context8.next = 3;
          return regeneratorRuntime.awrap(apiPost("/repost/".concat(postId), {}, token));

        case 3:
          return _context8.abrupt("return", _context8.sent);

        case 4:
        case "end":
          return _context8.stop();
      }
    }
  });
}; // Repost a specific LinkedIn post


exports.repostPost = repostPost;

var repostLinkedInPost = function repostLinkedInPost(postId) {
  var token,
      _args9 = arguments;
  return regeneratorRuntime.async(function repostLinkedInPost$(_context9) {
    while (1) {
      switch (_context9.prev = _context9.next) {
        case 0:
          token = _args9.length > 1 && _args9[1] !== undefined ? _args9[1] : null;
          _context9.next = 3;
          return regeneratorRuntime.awrap(apiPost("/repost/linkedin/".concat(postId), {}, token));

        case 3:
          return _context9.abrupt("return", _context9.sent);

        case 4:
        case "end":
          return _context9.stop();
      }
    }
  });
}; // Delete a post from history


exports.repostLinkedInPost = repostLinkedInPost;

var deletePost = function deletePost(postId) {
  var token,
      headers,
      res,
      result,
      _args10 = arguments;
  return regeneratorRuntime.async(function deletePost$(_context10) {
    while (1) {
      switch (_context10.prev = _context10.next) {
        case 0:
          token = _args10.length > 1 && _args10[1] !== undefined ? _args10[1] : null;
          _context10.prev = 1;
          headers = {
            'Content-Type': 'application/json'
          }; // Always include Authorization header, even with a dummy token for development

          headers.Authorization = "Bearer ".concat(token || 'dummy-token');
          _context10.next = 6;
          return regeneratorRuntime.awrap(fetch("".concat(BASE_URL, "/history/").concat(postId), {
            method: 'DELETE',
            headers: headers
          }));

        case 6:
          res = _context10.sent;
          _context10.next = 9;
          return regeneratorRuntime.awrap(res.json());

        case 9:
          result = _context10.sent;

          if (res.ok) {
            _context10.next = 12;
            break;
          }

          throw new Error(result.message || 'API error');

        case 12:
          return _context10.abrupt("return", result);

        case 15:
          _context10.prev = 15;
          _context10.t0 = _context10["catch"](1);
          throw new Error(_context10.t0.message || 'Network error');

        case 18:
        case "end":
          return _context10.stop();
      }
    }
  }, null, null, [[1, 15]]);
}; // Delete a LinkedIn post from history


exports.deletePost = deletePost;

var deleteLinkedInPost = function deleteLinkedInPost(postId) {
  var token,
      headers,
      res,
      result,
      _args11 = arguments;
  return regeneratorRuntime.async(function deleteLinkedInPost$(_context11) {
    while (1) {
      switch (_context11.prev = _context11.next) {
        case 0:
          token = _args11.length > 1 && _args11[1] !== undefined ? _args11[1] : null;
          _context11.prev = 1;
          headers = {
            'Content-Type': 'application/json'
          }; // Always include Authorization header, even with a dummy token for development

          headers.Authorization = "Bearer ".concat(token || 'dummy-token');
          _context11.next = 6;
          return regeneratorRuntime.awrap(fetch("".concat(BASE_URL, "/history/linkedin/").concat(postId), {
            method: 'DELETE',
            headers: headers
          }));

        case 6:
          res = _context11.sent;
          _context11.next = 9;
          return regeneratorRuntime.awrap(res.json());

        case 9:
          result = _context11.sent;

          if (res.ok) {
            _context11.next = 12;
            break;
          }

          throw new Error(result.message || 'API error');

        case 12:
          return _context11.abrupt("return", result);

        case 15:
          _context11.prev = 15;
          _context11.t0 = _context11["catch"](1);
          throw new Error(_context11.t0.message || 'Network error');

        case 18:
        case "end":
          return _context11.stop();
      }
    }
  }, null, null, [[1, 15]]);
}; // Update engagement metrics for a post


exports.deleteLinkedInPost = deleteLinkedInPost;

var updateEngagementMetrics = function updateEngagementMetrics(postId, metrics) {
  var token,
      headers,
      res,
      result,
      _args12 = arguments;
  return regeneratorRuntime.async(function updateEngagementMetrics$(_context12) {
    while (1) {
      switch (_context12.prev = _context12.next) {
        case 0:
          token = _args12.length > 2 && _args12[2] !== undefined ? _args12[2] : null;
          // Ensure postId is a string
          postId = String(postId);
          _context12.prev = 2;
          console.log("Updating engagement metrics for post ID: ".concat(postId), metrics);
          headers = {
            'Content-Type': 'application/json'
          }; // Always include Authorization header, even with a dummy token for development

          headers.Authorization = "Bearer ".concat(token || 'dummy-token');
          console.log('Request URL:', "".concat(BASE_URL, "/update-engagement/").concat(postId));
          console.log('Request headers:', headers);
          _context12.next = 10;
          return regeneratorRuntime.awrap(fetch("".concat(BASE_URL, "/update-engagement/").concat(postId), {
            method: 'PUT',
            headers: headers,
            body: JSON.stringify(metrics)
          }));

        case 10:
          res = _context12.sent;
          console.log('Response status:', res.status);
          _context12.next = 14;
          return regeneratorRuntime.awrap(res.json());

        case 14:
          result = _context12.sent;
          console.log('Response data:', result);

          if (res.ok) {
            _context12.next = 19;
            break;
          }

          console.error('API error:', result);
          return _context12.abrupt("return", {
            success: false,
            message: result.message || "API error: ".concat(res.status),
            error: result
          });

        case 19:
          return _context12.abrupt("return", result);

        case 22:
          _context12.prev = 22;
          _context12.t0 = _context12["catch"](2);
          console.error('Network or parsing error:', _context12.t0);
          return _context12.abrupt("return", {
            success: false,
            message: _context12.t0.message || 'Network error',
            error: _context12.t0
          });

        case 26:
        case "end":
          return _context12.stop();
      }
    }
  }, null, null, [[2, 22]]);
}; // Update engagement metrics for a LinkedIn post


exports.updateEngagementMetrics = updateEngagementMetrics;

var updateLinkedInEngagementMetrics = function updateLinkedInEngagementMetrics(postId, metrics) {
  var token,
      headers,
      res,
      result,
      _args13 = arguments;
  return regeneratorRuntime.async(function updateLinkedInEngagementMetrics$(_context13) {
    while (1) {
      switch (_context13.prev = _context13.next) {
        case 0:
          token = _args13.length > 2 && _args13[2] !== undefined ? _args13[2] : null;
          // Ensure postId is a string
          postId = String(postId);
          _context13.prev = 2;
          console.log("Updating LinkedIn engagement metrics for post ID: ".concat(postId), metrics);
          headers = {
            'Content-Type': 'application/json'
          }; // Always include Authorization header, even with a dummy token for development

          headers.Authorization = "Bearer ".concat(token || 'dummy-token');
          console.log('Request URL:', "".concat(BASE_URL, "/update-engagement/linkedin/").concat(postId));
          console.log('Request headers:', headers);
          _context13.next = 10;
          return regeneratorRuntime.awrap(fetch("".concat(BASE_URL, "/update-engagement/linkedin/").concat(postId), {
            method: 'PUT',
            headers: headers,
            body: JSON.stringify(metrics)
          }));

        case 10:
          res = _context13.sent;
          console.log('Response status:', res.status);
          _context13.next = 14;
          return regeneratorRuntime.awrap(res.json());

        case 14:
          result = _context13.sent;
          console.log('Response data:', result);

          if (res.ok) {
            _context13.next = 19;
            break;
          }

          console.error('API error:', result);
          return _context13.abrupt("return", {
            success: false,
            message: result.message || "API error: ".concat(res.status),
            error: result
          });

        case 19:
          return _context13.abrupt("return", result);

        case 22:
          _context13.prev = 22;
          _context13.t0 = _context13["catch"](2);
          console.error('Network or parsing error:', _context13.t0);
          return _context13.abrupt("return", {
            success: false,
            message: _context13.t0.message || 'Network error',
            error: _context13.t0
          });

        case 26:
        case "end":
          return _context13.stop();
      }
    }
  }, null, null, [[2, 22]]);
}; // Scrape engagement data for a reply ID


exports.updateLinkedInEngagementMetrics = updateLinkedInEngagementMetrics;

var scrapeReplyEngagement = function scrapeReplyEngagement(replyId, accountId) {
  var token,
      headers,
      body,
      res,
      result,
      _args14 = arguments;
  return regeneratorRuntime.async(function scrapeReplyEngagement$(_context14) {
    while (1) {
      switch (_context14.prev = _context14.next) {
        case 0:
          token = _args14.length > 2 && _args14[2] !== undefined ? _args14[2] : null;
          _context14.prev = 1;
          console.log("Scraping engagement for reply ID: ".concat(replyId));
          headers = {
            'Content-Type': 'application/json',
            Authorization: "Bearer ".concat(token || 'dummy-token')
          };
          body = JSON.stringify({
            replyId: replyId,
            accountId: accountId
          });
          console.log('Request URL:', "".concat(BASE_URL, "/scrape-reply-engagement"));
          console.log('Request headers:', headers);
          console.log('Request body:', body);
          _context14.next = 10;
          return regeneratorRuntime.awrap(fetch("".concat(BASE_URL, "/scrape-reply-engagement"), {
            method: 'POST',
            headers: headers,
            body: body
          }));

        case 10:
          res = _context14.sent;
          console.log(body, "body");
          console.log('Response status:', res.status);
          _context14.next = 15;
          return regeneratorRuntime.awrap(res.json());

        case 15:
          result = _context14.sent;
          console.log('Response data:', result);

          if (res.ok) {
            _context14.next = 20;
            break;
          }

          console.error('API error:', result);
          return _context14.abrupt("return", {
            success: false,
            message: result.message || "API error: ".concat(res.status),
            error: result
          });

        case 20:
          return _context14.abrupt("return", result);

        case 23:
          _context14.prev = 23;
          _context14.t0 = _context14["catch"](1);
          console.error('Network or parsing error:', _context14.t0);
          return _context14.abrupt("return", {
            success: false,
            message: _context14.t0.message || 'Network error',
            error: _context14.t0
          });

        case 27:
        case "end":
          return _context14.stop();
      }
    }
  }, null, null, [[1, 23]]);
}; // Add a post from search history to post_history


exports.scrapeReplyEngagement = scrapeReplyEngagement;

var addFromSearch = function addFromSearch(postData) {
  var token,
      _args15 = arguments;
  return regeneratorRuntime.async(function addFromSearch$(_context15) {
    while (1) {
      switch (_context15.prev = _context15.next) {
        case 0:
          token = _args15.length > 1 && _args15[1] !== undefined ? _args15[1] : null;
          _context15.next = 3;
          return regeneratorRuntime.awrap(apiPost('/add-from-search', postData, token));

        case 3:
          return _context15.abrupt("return", _context15.sent);

        case 4:
        case "end":
          return _context15.stop();
      }
    }
  });
}; // Format time since fetch


exports.addFromSearch = addFromSearch;

var formatTimeSince = function formatTimeSince(timeSinceMs) {
  var minutes = Math.floor(timeSinceMs / (1000 * 60));

  if (minutes < 60) {
    return "".concat(minutes, " minute").concat(minutes !== 1 ? 's' : '', " ago");
  }

  var hours = Math.floor(minutes / 60);

  if (hours < 24) {
    return "".concat(hours, " hour").concat(hours !== 1 ? 's' : '', " ago");
  }

  var days = Math.floor(hours / 24);
  return "".concat(days, " day").concat(days !== 1 ? 's' : '', " ago");
}; // Check if repost is allowed (not within 2 hours of fetching)


exports.formatTimeSince = formatTimeSince;

var isRepostAllowed = function isRepostAllowed(timeSinceMs) {
  var twoHoursInMs = 2 * 60 * 60 * 1000;
  return timeSinceMs >= twoHoursInMs;
};

exports.isRepostAllowed = isRepostAllowed;
var _default = {
  getAccounts: getAccounts,
  getLinkedInAccounts: getLinkedInAccounts,
  getPostHistory: getPostHistory,
  getLinkedInPostHistory: getLinkedInPostHistory,
  repostPost: repostPost,
  repostLinkedInPost: repostLinkedInPost,
  deletePost: deletePost,
  deleteLinkedInPost: deleteLinkedInPost,
  addFromSearch: addFromSearch,
  updateEngagementMetrics: updateEngagementMetrics,
  updateLinkedInEngagementMetrics: updateLinkedInEngagementMetrics,
  scrapeReplyEngagement: scrapeReplyEngagement,
  formatTimeSince: formatTimeSince,
  isRepostAllowed: isRepostAllowed
};
exports["default"] = _default;