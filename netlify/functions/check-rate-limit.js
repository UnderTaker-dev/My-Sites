const Airtable = require('airtable');

// In-memory rate limit cache (resets when function cold-starts)
const rateLimitCache = new Map();

// Configuration
const RATE_LIMITS = {
  newsletter: { maxRequests: 3, windowMinutes: 60 }, // 3 submissions per hour per IP
  donation: { maxRequests: 10, windowMinutes: 60 }, // 10 donations per hour
  contact: { maxRequests: 5, windowMinutes: 30 } // 5 contact forms per 30 mins
};

// Known spam IP patterns (will be stored in Airtable)
const SPAM_IPS_PATTERNS = [
  /^45\.155\./,  // Known spam range
  /^185\.220\./, // Tor exit nodes
];

exports.handler = async (event, context) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const { action } = JSON.parse(event.body);
    
    if (!action) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Action required' })
      };
    }
    
    // Get real IP from headers
    const ip = event.headers['x-forwarded-for']?.split(',')[0].trim() || event.headers['client-ip'] || 'Unknown';

    const base = new Airtable({ apiKey: process.env.AIRTABLE_TOKEN }).base(process.env.AIRTABLE_BASE_ID);

    // Check if IP is blocked
    try {
      const blockedRecords = await base('BlockedIPs').select({
        filterByFormula: `{IP} = '${ip}'`,
        maxRecords: 1
      }).firstPage();

      if (blockedRecords.length > 0) {
        const record = blockedRecords[0];
        const reason = record.get('Reason') || 'Spam activity detected';
        
        console.log(`Blocked IP attempt: ${ip} - ${reason}`);
        
        return {
          statusCode: 403,
          body: JSON.stringify({
            allowed: false,
            reason: 'Your IP has been blocked due to suspicious activity',
            blocked: true,
            appealUrl: `/blocked.html?reason=${encodeURIComponent(reason)}`
          })
        };
      }
    } catch (e) {
      console.log('BlockedIPs table may not exist yet:', e.message);
    }

    // Check spam IP patterns
    for (const pattern of SPAM_IPS_PATTERNS) {
      if (pattern.test(ip)) {
        console.log(`Spam IP pattern matched: ${ip}`);
        
        // Auto-block this IP
        try {
          await base('BlockedIPs').create([{
            fields: {
              IP: ip,
              Reason: 'Matched known spam IP pattern',
              BlockedDate: new Date().toISOString(),
              AutoBlocked: true
            }
          }]);
        } catch (e) {
          console.log('Could not auto-block IP:', e.message);
        }

        return {
          statusCode: 403,
          body: JSON.stringify({
            allowed: false,
            reason: 'Suspicious IP address detected',
            blocked: true
          })
        };
      }
    }

    // Check rate limit
    const limit = RATE_LIMITS[action] || RATE_LIMITS.newsletter;
    const cacheKey = `${ip}:${action}`;
    const now = Date.now();
    const windowMs = limit.windowMinutes * 60 * 1000;

    if (rateLimitCache.has(cacheKey)) {
      const requests = rateLimitCache.get(cacheKey);
      // Remove old requests outside the window
      const recentRequests = requests.filter(time => now - time < windowMs);
      
      if (recentRequests.length >= limit.maxRequests) {
        const oldestRequest = Math.min(...recentRequests);
        const resetIn = Math.ceil((oldestRequest + windowMs - now) / 1000 / 60);
        
        console.log(`Rate limit exceeded for ${ip} on action ${action}`);
        
        return {
          statusCode: 429,
          body: JSON.stringify({
            allowed: false,
            reason: `Too many requests. Please try again in ${resetIn} minute(s).`,
            rateLimited: true,
            retryAfterMinutes: resetIn
          })
        };
      }
      
      // Add current request
      recentRequests.push(now);
      rateLimitCache.set(cacheKey, recentRequests);
    } else {
      rateLimitCache.set(cacheKey, [now]);
    }

    // Clean up old cache entries periodically
    if (Math.random() < 0.1) { // 10% chance to clean up
      for (const [key, requests] of rateLimitCache.entries()) {
        const recentRequests = requests.filter(time => now - time < 3600000); // Keep last hour
        if (recentRequests.length === 0) {
          rateLimitCache.delete(key);
        } else {
          rateLimitCache.set(key, recentRequests);
        }
      }
    }

    // IP is allowed
    return {
      statusCode: 200,
      body: JSON.stringify({
        allowed: true,
        message: 'Request allowed'
      })
    };

  } catch (error) {
    console.error('Rate limit check error:', error);
    // Fail open - allow request if check fails
    return {
      statusCode: 200,
      body: JSON.stringify({
        allowed: true,
        message: 'Check failed, allowing request'
      })
    };
  }
};
