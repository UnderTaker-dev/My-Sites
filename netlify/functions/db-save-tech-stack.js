const Airtable = require('airtable');

exports.handler = async (event, context) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { skills } = JSON.parse(event.body);
    
    if (!Array.isArray(skills)) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Skills must be an array' })
      };
    }

    const base = new Airtable({ apiKey: process.env.AIRTABLE_TOKEN }).base(process.env.AIRTABLE_BASE_ID);
    
    // Delete all existing records
    const existingRecords = await base('TechStack').select().all();
    if (existingRecords.length > 0) {
      await base('TechStack').destroy(existingRecords.map(r => r.id));
    }

    // Add new records
    if (skills.length > 0) {
      await base('TechStack').create(
        skills.map((skill, index) => ({
          fields: {
            Icon: skill.icon,
            Name: skill.name,
            Order: index
          }
        }))
      );
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Tech stack saved' })
    };
  } catch (error) {
    console.error('Error saving tech stack:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to save tech stack' })
    };
  }
};
