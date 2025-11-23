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
    // Get Workflow ID from environment
    const workflowId = process.env.OPENAI_WORKFLOW_ID;
    
    if (!workflowId) {
      throw new Error('OPENAI_WORKFLOW_ID environment variable not set');
    }

    // Call OpenAI Workflows API
    const response = await fetch(`https://api.openai.com/v1/workflows/${workflowId}/runs`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        input: {
          destination,
          duration,
          budget,
          interests,
          mustVisit
        }
      })
    });

    // Check if the workflow API responded successfully
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('OpenAI Workflow API error:', {
        status: response.status,
        statusText: response.statusText,
        error: errorData
      });
      
      // Handle specific error codes
      if (response.status === 404) {
        return res.status(500).json({ 
          error: 'Workflow not found. Check OPENAI_WORKFLOW_ID is correct.' 
        });
      }
      
      return res.status(response.status).json({ 
        error: `Workflow API error: ${errorData.error?.message || response.statusText}`,
        details: errorData
      });
    }

    // Parse and extract the workflow response
    const result = await response.json();
    
    // Handle different response formats
    // Scenario A: Direct output
    if (result.title && result.locations) {
      return res.status(200).json(result);
    }
    
    // Scenario B: Wrapped in output property
    if (result.output) {
      return res.status(200).json(result.output);
    }
    
    // Scenario C: Async run (workflow still processing)
    if (result.run_id && result.status === 'in_progress') {
      return res.status(202).json({ 
        error: 'Workflow is still processing. This workflow may require polling.',
        run_id: result.run_id,
        status: result.status
      });
    }
    
    // Default: return as-is
    return res.status(200).json(result);
    
  } catch (error) {
    console.error('Workflow error:', error);
    return res.status(500).json({ 
      error: 'Failed to generate trip plan',
      message: error.message 
    });
  }
}

