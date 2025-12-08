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
    const { page, device, browser, os, referrer } = JSON.parse(event.body);

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
    
    // Get IP and location data
    const ip = event.headers['x-forwarded-for']?.split(',')[0].trim() || event.headers['client-ip'] || 'Unknown';
    let city = 'Unknown';
    let country = 'Unknown';
    
    // Only lookup location for real IPs (not localhost) - optional feature
    if (ip !== 'Unknown' && ip !== '::1' && !ip.startsWith('127.') && !ip.startsWith('192.168.')) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 2000); // 2 second timeout
        
        const geoResponse = await fetch(`https://ipapi.co/${ip}/json/`, {
          signal: controller.signal
        });
        clearTimeout(timeout);
        
        if (geoResponse.ok) {
          const geoData = await geoResponse.json();
          if (!geoData.error) {
            city = geoData.city || 'Unknown';
            country = geoData.country_name || 'Unknown';
          }
        }
      } catch (geoError) {
        console.log('Geolocation lookup skipped:', geoError.message);
        // Continue without location - not critical
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
    
    await base('PageViews').create([{ fields }]);

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
