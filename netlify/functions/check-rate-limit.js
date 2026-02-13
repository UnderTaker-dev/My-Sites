const Airtable = require('airtable');
const fetch = require('node-fetch');

// In-memory rate limit cache (resets on cold start)
const rateLimitCache = new Map();
const vpnAlertCache = new Map();

// Configuration
const RATE_LIMITS = {
  newsletter: { maxRequests: 3, windowMinutes: 60 },
  donation: { maxRequests: 10, windowMinutes: 60 },
  contact: { maxRequests: 5, windowMinutes: 30 },
  signup: { maxRequests: 3, windowMinutes: 60 }
};

const VPN_RATE_LIMITS = {
  newsletter: { maxRequests: 2, windowMinutes: 60 },
  donation: { maxRequests: 5, windowMinutes: 60 },
  contact: { maxRequests: 3, windowMinutes: 30 },
  signup: { maxRequests: 3, windowMinutes: 60 }
};

// Known spam IP patterns (will be stored in Airtable)
const SPAM_IPS_PATTERNS = [
  /^45\.155\./,
  /^185\.220\./
];

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const { action } = JSON.parse(event.body || '{}');

    if (!action) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Action required' })
      };
    }

    // Get real IP from headers
    const ip = event.headers['x-forwarded-for']?.split(',')[0].trim() || event.headers['client-ip'] || 'Unknown';

    const base = new Airtable({ apiKey: process.env.AIRTABLE_TOKEN }).base(process.env.AIRTABLE_BASE_ID);
    const allowlisted = await isAllowlisted(base, ip);

    let vpnDetected = false;
    let vpnType = 'Unknown';
    let vpnRisk = 'Unknown';
    let vpnAsn = 'Unknown';

    if (!allowlisted) {
      const proxyInfo = await checkProxyStatus(ip);
      vpnDetected = Boolean(proxyInfo && proxyInfo.proxy);
      vpnType = proxyInfo?.type || 'Unknown';
      vpnRisk = proxyInfo?.risk || 'Unknown';
      vpnAsn = proxyInfo?.asn || 'Unknown';

      if (vpnDetected) {
        await logVpnAlert(base, { ip, action, vpnType, vpnRisk, vpnAsn });
        await notifyVpnDetection({ event, ip, action, vpnType, vpnRisk, vpnAsn });
      }
    }

    if (!allowlisted) {
      // Check if IP is blocked
      try {
        const blockedRecords = await base('BlockedIPs').select({
          filterByFormula: `{IP} = '${ip}'`,
          maxRecords: 1
        }).firstPage();

        if (blockedRecords.length > 0) {
          const record = blockedRecords[0];
          const reason = record.get('Reason') || 'Spam activity detected';
          const expiresAt = record.get('ExpiresAt');

          if (!expiresAt || new Date(expiresAt).getTime() > Date.now()) {
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
        }
      } catch (e) {
        // BlockedIPs table may not exist
      }

      // Check spam IP patterns
      for (const pattern of SPAM_IPS_PATTERNS) {
        if (pattern.test(ip)) {
          try {
            await base('BlockedIPs').create([
              {
                fields: {
                  IP: ip,
                  Reason: 'Matched known spam IP pattern',
                  BlockedDate: new Date().toISOString(),
                  AutoBlocked: true
                }
              }
            ]);
          } catch (e) {
            // Non-fatal
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
    }

    // Check rate limit
    const limitMap = vpnDetected ? VPN_RATE_LIMITS : RATE_LIMITS;
    const limit = limitMap[action] || limitMap.newsletter;
    const cacheKey = `${ip}:${action}`;
    const now = Date.now();
    const windowMs = limit.windowMinutes * 60 * 1000;

    if (rateLimitCache.has(cacheKey)) {
      const requests = rateLimitCache.get(cacheKey);
      const recentRequests = requests.filter(time => now - time < windowMs);

      if (recentRequests.length >= limit.maxRequests) {
        const oldestRequest = Math.min(...recentRequests);
        const resetIn = Math.ceil((oldestRequest + windowMs - now) / 1000 / 60);

        return {
          statusCode: 429,
          body: JSON.stringify({
            allowed: false,
            reason: `Too many requests. Please try again in ${resetIn} minute(s).`,
            rateLimited: true,
            retryAfterMinutes: resetIn,
            vpnDetected,
            vpnType,
            vpnRisk,
            allowlisted
          })
        };
      }

      recentRequests.push(now);
      rateLimitCache.set(cacheKey, recentRequests);
    } else {
      rateLimitCache.set(cacheKey, [now]);
    }

    // Clean up old cache entries periodically
    if (Math.random() < 0.1) {
      for (const [key, requests] of rateLimitCache.entries()) {
        const recentRequests = requests.filter(time => now - time < 3600000);
        if (recentRequests.length === 0) {
          rateLimitCache.delete(key);
        } else {
          rateLimitCache.set(key, recentRequests);
        }
      }
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        allowed: true,
        message: 'Request allowed',
        vpnDetected,
        vpnType,
        vpnRisk,
        allowlisted
      })
    };
  } catch (error) {
    return {
      statusCode: 200,
      body: JSON.stringify({
        allowed: true,
        message: 'Check failed, allowing request'
      })
    };
  }
};

async function checkProxyStatus(ip) {
  const apiKey = process.env.PROXYCHECK_API_KEY;
  if (!apiKey || !ip || ip === 'Unknown') return null;

  try {
    const url = `https://proxycheck.io/v2/${ip}?key=${apiKey}&vpn=1&asn=1&risk=1`;
    const response = await fetch(url, { method: 'GET' });
    const data = await response.json();

    if (data?.status !== 'ok') return null;
    const result = data[ip];
    if (!result) return null;

    return {
      proxy: result.proxy === 'yes',
      type: result.type || 'Unknown',
      risk: result.risk || 'Unknown',
      asn: result.asn || 'Unknown'
    };
  } catch (error) {
    return null;
  }
}

async function isAllowlisted(base, ip) {
  try {
    const allowRecords = await base('AllowlistIPs').select({
      filterByFormula: `{IP} = '${ip}'`,
      maxRecords: 1
    }).firstPage();
    return allowRecords.length > 0;
  } catch (e) {
    return false;
  }
}

async function logVpnAlert(base, { ip, action, vpnType, vpnRisk, vpnAsn }) {
  try {
    const existing = await base('VpnAlerts').select({
      filterByFormula: `AND({IP} = '${ip}', {Action} = '${action}', {Status} != 'Resolved')`,
      maxRecords: 1,
      sort: [{ field: 'LastSeen', direction: 'desc' }]
    }).firstPage();

    if (existing.length > 0) {
      const record = existing[0];
      const count = record.get('Count') || 1;
      await base('VpnAlerts').update([
        {
          id: record.id,
          fields: {
            LastSeen: new Date().toISOString(),
            Count: count + 1,
            Type: vpnType,
            Risk: vpnRisk,
            ASN: vpnAsn
          }
        }
      ]);
      return;
    }

    await base('VpnAlerts').create([
      {
        fields: {
          IP: ip,
          Action: action,
          Status: 'Open',
          FirstSeen: new Date().toISOString(),
          LastSeen: new Date().toISOString(),
          Count: 1,
          Type: vpnType,
          Risk: vpnRisk,
          ASN: vpnAsn
        }
      }
    ]);
  } catch (e) {
    // Non-fatal
  }
}

async function notifyVpnDetection({ event, ip, action, vpnType, vpnRisk, vpnAsn }) {
  try {
    const cacheKey = `${ip}:${action}`;
    const now = Date.now();
    const cooldownMs = 15 * 60 * 1000;

    if (vpnAlertCache.has(cacheKey)) {
      const lastSent = vpnAlertCache.get(cacheKey);
      if (now - lastSent < cooldownMs) {
        return;
      }
    }

    vpnAlertCache.set(cacheKey, now);

    const baseUrl = event.headers.origin || process.env.SITE_URL || 'https://mathi4s.com';
    await fetch(`${baseUrl}/.netlify/functions/send-discord-notification`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'vpn_detected',
        data: { ip, action, vpnType, vpnRisk, vpnAsn }
      })
    });
  } catch (error) {
    // Non-fatal
  }
}
