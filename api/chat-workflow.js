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
    const apiKey = process.env.GOOGLE_AI_API_KEY;
    
    if (!apiKey) {
      throw new Error('GOOGLE_AI_API_KEY environment variable not set');
    }

    // Build the prompt with trip parameters
    const userPrompt = `Generate a comprehensive trip plan in JSON format for the following trip:

Destination: ${destination}
Duration: ${duration}
Budget Level: ${budget || 'not specified'}
Interests: ${interests && interests.length > 0 ? interests.join(', ') : 'not specified'}
Must-Visit Locations: ${mustVisit || 'none specified'}

IMPORTANT: 
1. Search for CURRENT information about hotels, accommodations, attractions, and prices
2. Find REAL hotels with actual prices and booking links
3. Include popular attractions with current entry fees
4. Use accurate GPS coordinates
5. Return ONLY valid JSON, no other text
6. Follow the exact format specified in your instructions`;

    // Default system prompt (can be overridden by environment variable)
    const defaultSystemPrompt = `You are a professional travel research agent that creates comprehensive trip plans in JSON format.

SEARCH REQUIREMENT: Use Google Search to find CURRENT, REAL information about:
- Hotel names, prices, and booking links (Booking.com, Hotels.com, Airbnb)
- Attraction names, entry fees, and official websites
- Restaurant recommendations with price ranges
- Accurate GPS coordinates for all locations
- Current travel information and tips

JSON FORMAT (REQUIRED):
{
  "title": "Trip Name",
  "locations": [
    {
      "id": "string",
      "type": "key-location|accommodation|attraction",
      "name": "string",
      "description": "string",
      "price": "string",
      "link": "string",
      "lat": number,
      "lng": number
    }
  ],
  "connections": [
    {
      "id": "string",
      "from": "string",
      "to": "string"
    }
  ]
}

LOCATION TYPES:
- key-location: Major destinations (cities, regions)
- accommodation: Hotels, hostels, Airbnb (MUST have price and link)
- attraction: Places to visit (entry fees if applicable)

QUANTITY GUIDELINES:
- 3-5 days: 1 key location, 2-4 accommodations, 5-10 attractions
- 1 week: 2-3 key locations, 4-6 accommodations, 10-15 attractions
- 2+ weeks: 3-5 key locations, 6-10 accommodations, 15-25 attractions

REQUIREMENTS:
- lat/lng MUST be numbers (not strings)
- Use real hotels with real prices from search results
- Include booking links from major platforms
- Validate all coordinates are accurate
- Return ONLY valid JSON (no markdown, no explanation)`;

    const systemPrompt = process.env.GEMINI_SYSTEM_PROMPT || defaultSystemPrompt;

    // Call Google Gemini API with grounding (requires billing)
    // Using Gemini 2.5 Pro - latest model with enhanced capabilities
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: userPrompt }]
          }],
          systemInstruction: {
            parts: [{
              text: systemPrompt
            }]
          },
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 8192
          },
          tools: [{
            google_search: {}
          }]
        })
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Google Gemini API error:', {
        status: response.status,
        statusText: response.statusText,
        error: errorData
      });
      
      return res.status(response.status).json({ 
        error: `Gemini API error: ${errorData.error?.message || response.statusText}`,
        details: errorData
      });
    }

    const result = await response.json();
    
    // Extract the generated content
    if (!result.candidates || result.candidates.length === 0) {
      console.error('No candidates in response:', result);
      return res.status(500).json({ 
        error: 'No response generated',
        details: 'The model did not generate a response'
      });
    }

    const candidate = result.candidates[0];
    
    // Check for content filtering
    if (candidate.finishReason === 'SAFETY') {
      return res.status(500).json({ 
        error: 'Content was filtered for safety reasons',
        details: 'Please try different search terms'
      });
    }

    if (!candidate.content || !candidate.content.parts || candidate.content.parts.length === 0) {
      console.error('No content parts in response:', candidate);
      return res.status(500).json({ 
        error: 'Invalid response format',
        details: 'No content returned from model'
      });
    }

    const responseText = candidate.content.parts[0].text;
    
    // Parse JSON response
    let tripData;
    try {
      // Strip markdown code blocks if present (Gemini often wraps JSON in ```json ... ```)
      let jsonString = responseText.trim();
      
      // Check for markdown code blocks
      const jsonMatch = jsonString.match(/```json\s*\n?([\s\S]*?)\n?```/) || 
                        jsonString.match(/```\s*\n?([\s\S]*?)\n?```/);
      
      if (jsonMatch) {
        jsonString = jsonMatch[1].trim();
      }
      
      // Parse the cleaned JSON
      tripData = JSON.parse(jsonString);
    } catch (parseError) {
      console.error('Failed to parse JSON response:', parseError);
      console.error('Response text:', responseText);
      return res.status(500).json({ 
        error: 'Invalid JSON response from model',
        details: 'The model did not return valid JSON',
        rawResponse: responseText.substring(0, 500)
      });
    }

    // Validate required fields
    if (!tripData.title || !tripData.locations || !Array.isArray(tripData.locations)) {
      return res.status(500).json({ 
        error: 'Invalid trip data format',
        details: 'Response missing required fields (title, locations)',
        data: tripData
      });
    }

    // Log search metadata if available
    if (candidate.groundingMetadata) {
      console.log('Search grounding used:', {
        searchQueries: candidate.groundingMetadata.searchEntryPoint?.renderedContent,
        retrievalQueries: candidate.groundingMetadata.retrievalQueries
      });
    }

    // Return the trip data
    return res.status(200).json(tripData);
    
  } catch (error) {
    console.error('Error generating trip:', error);
    return res.status(500).json({ 
      error: 'Failed to generate trip plan',
      message: error.message 
    });
  }
}
