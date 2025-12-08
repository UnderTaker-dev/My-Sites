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
    
    // Delete all existing records in batches of 10 (Airtable limit)
    const existingRecords = await base('TechStack').select().all();
    if (existingRecords.length > 0) {
      const batchSize = 10;
      for (let i = 0; i < existingRecords.length; i += batchSize) {
        const batch = existingRecords.slice(i, i + batchSize);
        await base('TechStack').destroy(batch.map(r => r.id));
      }
    }

    // Add new records in batches of 10 (Airtable limit)
    if (skills.length > 0) {
      const batchSize = 10;
      for (let i = 0; i < skills.length; i += batchSize) {
        const batch = skills.slice(i, i + batchSize);
        await base('TechStack').create(
          batch.map((skill, index) => ({
            fields: {
              Icon: skill.icon,
              Name: skill.name,
              Order: i + index
            }
          }))
        );
      }
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
