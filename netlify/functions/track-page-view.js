const Airtable = require('airtable');
const fetch = require('node-fetch');

exports.handler = async (event, context) => {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const {
      page,
      device,
      browser,
      os,
      referrer,
      utmSource,
      utmMedium,
      utmCampaign,
      utmTerm,
      utmContent,
      screenWidth,
      screenHeight,
      viewportWidth,
      viewportHeight,
      language,
      timeZone,
      sessionId
    } = JSON.parse(event.body);

    // Normalize page path (strip domain/query/hash, ensure leading slash)
    const normalizePage = (raw) => {
      if (!raw) return '/';
      const value = raw.trim();
      try {
        if (value.startsWith('http://') || value.startsWith('https://')) {
          const url = new URL(value);
          return url.pathname || '/';
        }
      } catch (_) { /* fallthrough to manual cleanup */ }
      const cleaned = value.split('#')[0].split('?')[0];
      if (!cleaned) return '/';
      return cleaned.startsWith('/') ? cleaned : `/${cleaned}`;
    };

    // Normalize referrer to domain + path, default to Direct
    const normalizeReferrer = (raw) => {
      if (!raw || raw.trim() === '-' ) return 'Direct';
      const value = raw.trim();
      try {
        const url = new URL(value);
        const path = url.pathname === '/' ? '' : url.pathname;
        return `${url.hostname}${path}`;
      } catch (_) {
        return value;
      }
    };

    if (!page) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Page is required' })
      };
    }

    const base = new Airtable({ apiKey: process.env.AIRTABLE_TOKEN }).base(process.env.AIRTABLE_BASE_ID);
    
    // Check if tracking is enabled from Airtable settings
    try {
      const settingsRecords = await base('SiteSettings').select({ maxRecords: 1 }).firstPage();
      if (settingsRecords.length > 0 && settingsRecords[0].fields.TrackIPEnabled === false) {
        console.log('IP tracking is disabled via settings');
        return {
          statusCode: 200,
          body: JSON.stringify({ success: true, message: 'Tracking disabled' })
        };
      }
    } catch (settingsError) {
      console.log('Could not check tracking settings, proceeding with tracking:', settingsError.message);
    }
    
    // Get IP and location data
    let ip = event.headers['x-forwarded-for']?.split(',')[0].trim() || event.headers['client-ip'] || 'Unknown';
    console.log('Initial detected IP:', ip);
    
    // If localhost, fetch the real public IP for testing
    if (ip === '::1' || ip === '127.0.0.1' || ip.startsWith('10.') || ip.startsWith('192.168.')) {
      console.log('Localhost detected - fetching real public IP...');
      try {
        const realIpResponse = await fetch('https://api.ipify.org?format=json', { timeout: 3000 });
        if (realIpResponse.ok) {
          const realIpData = await realIpResponse.json();
          if (realIpData.ip) {
            console.log('Real public IP found:', realIpData.ip);
            ip = realIpData.ip;
          }
        }
      } catch (ipError) {
        console.log('Could not fetch real IP, using detected IP:', ipError.message);
      }
    }
    
    console.log('Using IP for tracking:', ip);
    let city = 'Unknown';
    let country = 'Unknown';
    let locationFound = false;
    
    // Always try to get location for ALL IPs
    if (ip !== 'Unknown') {
      console.log('Attempting geolocation lookup for IP:', ip);
      
      // Try ip-api.com first (free, no API key needed, 45 requests/minute)
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        
        const geoResponse = await fetch(`http://ip-api.com/json/${ip}`, {
          signal: controller.signal
        });
        clearTimeout(timeout);
        
        if (geoResponse.ok) {
          const geoData = await geoResponse.json();
          console.log('ip-api.com response:', geoData);
          if (geoData.status === 'success') {
            city = geoData.city || 'Unknown';
            country = geoData.country || 'Unknown';
            locationFound = true;
            console.log('✓ Location found:', city, country);
          } else {
            console.log('ip-api.com failed:', geoData.message);
          }
        } else {
          console.log('ip-api.com HTTP error:', geoResponse.status);
        }
      } catch (geoError) {
        console.log('ip-api.com exception:', geoError.message);
      }
      
      // Try fallback if first attempt failed
      if (!locationFound) {
        console.log('Trying fallback: ipapi.co...');
        try {
          const controller2 = new AbortController();
          const timeout2 = setTimeout(() => controller2.abort(), 5000);
          
          const fallbackResponse = await fetch(`https://ipapi.co/${ip}/json/`, {
            signal: controller2.signal
          });
          clearTimeout(timeout2);
          
          if (fallbackResponse.ok) {
            const fallbackData = await fallbackResponse.json();
            console.log('ipapi.co response:', fallbackData);
            if (!fallbackData.error && fallbackData.city) {
              city = fallbackData.city || 'Unknown';
              country = fallbackData.country_name || 'Unknown';
              locationFound = true;
              console.log('✓ Fallback location found:', city, country);
            } else {
              console.log('ipapi.co returned no valid data');
            }
          } else {
            console.log('ipapi.co HTTP error:', fallbackResponse.status);
          }
        } catch (fallbackError) {
          console.log('ipapi.co exception:', fallbackError.message);
        }
      }
      
      if (!locationFound) {
        console.log('⚠ No location found for IP:', ip);
      }
    }
    
    // Build fields object - only include fields that exist in your Airtable
    const fields = {
      Page: normalizePage(page),
      Timestamp: new Date().toISOString(),
      'IP Address': ip,
      'User Agent': event.headers['user-agent'] || 'Unknown',
      Device: device || 'Unknown',
      Browser: browser || 'Unknown',
      OS: os || 'Unknown'
    };
    
    // Add optional fields if they're provided
    const normalizedReferrer = normalizeReferrer(referrer);
    if (normalizedReferrer) fields.Referrer = normalizedReferrer;
    if (city !== 'Unknown') fields.City = city;
    if (country !== 'Unknown') fields.Country = country;
    if (screenWidth && screenHeight) fields.Screen = `${screenWidth}x${screenHeight}`;
    if (viewportWidth && viewportHeight) fields.Viewport = `${viewportWidth}x${viewportHeight}`;
    if (language) fields.Language = language;
    if (timeZone) fields.TimeZone = timeZone;
    if (sessionId) fields.SessionId = sessionId;
    if (utmSource) fields.UTMSource = utmSource;
    if (utmMedium) fields.UTMMedium = utmMedium;
    if (utmCampaign) fields.UTMCampaign = utmCampaign;
    if (utmTerm) fields.UTMTerm = utmTerm;
    if (utmContent) fields.UTMContent = utmContent;
    
    console.log('Saving to Airtable with fields:', JSON.stringify(fields, null, 2));
    const createRecord = async (targetFields) => {
      await base('PageViews').create([{ fields: targetFields }]);
    };

    let attempts = 0;
    const maxAttempts = 15;
    let currentFields = { ...fields };
    while (attempts < maxAttempts) {
      try {
        await createRecord(currentFields);
        break;
      } catch (err) {
        if (err?.error === 'UNKNOWN_FIELD_NAME' && err?.message) {
          const match = err.message.match(/"([^"]+)"/);
          const unknownField = match ? match[1] : null;
          if (unknownField && Object.prototype.hasOwnProperty.call(currentFields, unknownField)) {
            delete currentFields[unknownField];
            attempts += 1;
            continue;
          }
        }
        throw err;
      }
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true })
    };
  } catch (error) {
    console.error('Track page view error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to track page view' })
    };
  }
};
