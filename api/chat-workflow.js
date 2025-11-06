export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  // Handle preflight request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Extract trip parameters from request body
  const { destination, duration, budget, interests, mustVisit } = req.body;

  // Validate required fields
  if (!destination || !duration) {
    return res.status(400).json({ 
      error: 'Missing required fields: destination and duration are required' 
    });
  }

  try {
    // Call ChatGPT Agent Builder Workflow
    const response = await fetch(process.env.CHATGPT_WORKFLOW_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.CHATGPT_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        destination,
        duration,
        budget,
        interests,
        mustVisit
      })
    });

    // Check if the workflow API responded successfully
    if (!response.ok) {
      const errorText = await response.text();
      console.error('ChatGPT Workflow API error:', response.status, errorText);
      return res.status(response.status).json({ 
        error: `Workflow API error: ${response.statusText}`,
        details: errorText
      });
    }

    // Parse and return the workflow response
    const data = await response.json();
    return res.status(200).json(data);
    
  } catch (error) {
    console.error('Workflow error:', error);
    return res.status(500).json({ 
      error: 'Failed to generate trip plan',
      message: error.message 
    });
  }
}

