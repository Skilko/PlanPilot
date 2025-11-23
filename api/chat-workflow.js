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
    // Get Assistant ID from environment (Agent Builder creates Assistants, not Workflows)
    const assistantId = process.env.OPENAI_WORKFLOW_ID;
    const apiKey = process.env.OPENAI_API_KEY;
    
    if (!assistantId) {
      throw new Error('OPENAI_WORKFLOW_ID environment variable not set');
    }

    if (!apiKey) {
      throw new Error('OPENAI_API_KEY environment variable not set');
    }

    const baseHeaders = {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'OpenAI-Beta': 'assistants=v2'
    };

    // Step 1: Create a thread
    const threadResponse = await fetch('https://api.openai.com/v1/threads', {
      method: 'POST',
      headers: baseHeaders,
      body: JSON.stringify({})
    });

    if (!threadResponse.ok) {
      const errorData = await threadResponse.json().catch(() => ({}));
      console.error('Failed to create thread:', errorData);
      return res.status(500).json({ 
        error: 'Failed to create conversation thread',
        details: errorData
      });
    }

    const thread = await threadResponse.json();
    const threadId = thread.id;

    // Step 2: Add user message to thread
    const userMessage = JSON.stringify({
      destination,
      duration,
      budget: budget || '',
      interests: interests || [],
      mustVisit: mustVisit || ''
    });

    const messageResponse = await fetch(`https://api.openai.com/v1/threads/${threadId}/messages`, {
      method: 'POST',
      headers: baseHeaders,
      body: JSON.stringify({
        role: 'user',
        content: userMessage
      })
    });

    if (!messageResponse.ok) {
      const errorData = await messageResponse.json().catch(() => ({}));
      console.error('Failed to add message:', errorData);
      return res.status(500).json({ 
        error: 'Failed to send request to assistant',
        details: errorData
      });
    }

    // Step 3: Create a run
    const runResponse = await fetch(`https://api.openai.com/v1/threads/${threadId}/runs`, {
      method: 'POST',
      headers: baseHeaders,
      body: JSON.stringify({
        assistant_id: assistantId
      })
    });

    if (!runResponse.ok) {
      const errorData = await runResponse.json().catch(() => ({}));
      console.error('Failed to create run:', errorData);
      
      if (runResponse.status === 404) {
        return res.status(500).json({ 
          error: 'Assistant not found. Check OPENAI_WORKFLOW_ID is correct (should be the Assistant ID from Agent Builder).' 
        });
      }
      
      return res.status(500).json({ 
        error: `Assistant API error: ${errorData.error?.message || runResponse.statusText}`,
        details: errorData
      });
    }

    const run = await runResponse.json();
    const runId = run.id;

    // Step 4: Poll for completion (with timeout)
    let runStatus = run.status;
    let attempts = 0;
    const maxAttempts = 60; // 60 seconds max

    while (runStatus !== 'completed' && runStatus !== 'failed' && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
      
      const statusResponse = await fetch(`https://api.openai.com/v1/threads/${threadId}/runs/${runId}`, {
        method: 'GET',
        headers: baseHeaders
      });

      if (statusResponse.ok) {
        const statusData = await statusResponse.json();
        runStatus = statusData.status;
      }
      
      attempts++;
    }

    if (runStatus === 'failed') {
      return res.status(500).json({ 
        error: 'Assistant run failed',
        details: 'The assistant encountered an error while processing your request'
      });
    }

    if (runStatus !== 'completed') {
      return res.status(500).json({ 
        error: 'Assistant run timed out',
        details: 'The request took too long to process. Please try again.'
      });
    }

    // Step 5: Retrieve messages
    const messagesResponse = await fetch(`https://api.openai.com/v1/threads/${threadId}/messages`, {
      method: 'GET',
      headers: baseHeaders
    });

    if (!messagesResponse.ok) {
      const errorData = await messagesResponse.json().catch(() => ({}));
      console.error('Failed to retrieve messages:', errorData);
      return res.status(500).json({ 
        error: 'Failed to retrieve assistant response',
        details: errorData
      });
    }

    const messages = await messagesResponse.json();
    
    // Get the latest assistant message
    const assistantMessage = messages.data.find(msg => msg.role === 'assistant');
    
    if (!assistantMessage || !assistantMessage.content || !assistantMessage.content[0]) {
      return res.status(500).json({ 
        error: 'No response from assistant',
        details: 'The assistant did not provide a response'
      });
    }

    // Extract the text content
    const responseText = assistantMessage.content[0].text.value;
    
    // Try to parse as JSON
    let tripData;
    try {
      // Remove markdown code blocks if present
      const jsonMatch = responseText.match(/```json\n?([\s\S]*?)\n?```/) || 
                       responseText.match(/```\n?([\s\S]*?)\n?```/);
      const jsonString = jsonMatch ? jsonMatch[1] : responseText;
      
      tripData = JSON.parse(jsonString.trim());
    } catch (parseError) {
      console.error('Failed to parse assistant response as JSON:', parseError);
      console.error('Response text:', responseText);
      return res.status(500).json({ 
        error: 'Invalid response format from assistant',
        details: 'The assistant did not return valid JSON. Please check the assistant configuration.',
        rawResponse: responseText.substring(0, 500)
      });
    }

    // Return the parsed trip data
    return res.status(200).json(tripData);
    
  } catch (error) {
    console.error('Workflow error:', error);
    return res.status(500).json({ 
      error: 'Failed to generate trip plan',
      message: error.message 
    });
  }
}

