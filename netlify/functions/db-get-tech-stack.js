const Airtable = require('airtable');

exports.handler = async (event, context) => {
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const base = new Airtable({ apiKey: process.env.AIRTABLE_TOKEN }).base(process.env.AIRTABLE_BASE_ID);
    
    const records = await base('TechStack').select({
      sort: [{ field: 'Order', direction: 'asc' }]
    }).all();
    
    const techStack = records.map(record => ({
      id: record.id,
      icon: record.get('Icon'),
      name: record.get('Name'),
      order: record.get('Order')
    }));

    return {
      statusCode: 200,
      body: JSON.stringify(techStack)
    };
  } catch (error) {
    console.error('Error fetching tech stack:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to fetch tech stack' })
    };
  }
};
