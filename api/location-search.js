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

  // Extract search parameters from request body
  const { locationName, lat, lng, searchType, customQuery, additionalDetails, budget } = req.body;

  // Validate required fields
  if (!locationName || lat === undefined || lng === undefined || !searchType) {
    return res.status(400).json({ 
      error: 'Missing required fields: locationName, lat, lng, and searchType are required' 
    });
  }

  // Validate search type
  const validSearchTypes = ['accommodations', 'attractions', 'restaurants', 'transportation', 'tips', 'custom'];
  if (!validSearchTypes.includes(searchType)) {
    return res.status(400).json({ 
      error: `Invalid searchType. Must be one of: ${validSearchTypes.join(', ')}` 
    });
  }

  // Custom search requires a query
  if (searchType === 'custom' && !customQuery) {
    return res.status(400).json({ 
      error: 'customQuery is required when searchType is "custom"' 
    });
  }

  try {
    const apiKey = process.env.GOOGLE_AI_API_KEY;
    
    if (!apiKey) {
      throw new Error('GOOGLE_AI_API_KEY environment variable not set');
    }

    // Build search-type specific prompts
    const searchPrompts = {
      accommodations: `Search for the best hotels, Airbnb listings, hostels, and other accommodations near ${locationName} (coordinates: ${lat}, ${lng}).
Include a variety of options at different price points.
For each accommodation, find:
- Real hotel/property names with accurate prices
- Direct booking links (Booking.com, Hotels.com, Airbnb property pages - NOT search pages)
- Accurate GPS coordinates
- Brief description of amenities and location`,

      attractions: `Search for the best attractions, activities, and things to do near ${locationName} (coordinates: ${lat}, ${lng}).
Include popular tourist spots, hidden gems, outdoor activities, and cultural experiences.
For each attraction, find:
- Name and description
- Entry fees/prices if applicable
- Official website or booking link
- Accurate GPS coordinates
- Recommended visit duration`,

      restaurants: `Search for the best restaurants, cafes, and dining options near ${locationName} (coordinates: ${lat}, ${lng}).
Include local cuisine, popular restaurants, and hidden gems at various price points.
For each restaurant, find:
- Name and cuisine type
- Price range (e.g., "$", "$$", "$$$")
- Website or reservation link if available
- Accurate GPS coordinates
- Brief description of atmosphere and signature dishes`,

      transportation: `Search for transportation options and getting around near ${locationName} (coordinates: ${lat}, ${lng}).
Include:
- Public transit options (metro, bus, tram)
- Car rental locations
- Bike/scooter rental services
- Airport/train station connections
- Taxi and ride-share information
For each option, provide name, description, prices if applicable, and relevant links.`,

      tips: `Search for local tips, travel advice, and practical information about ${locationName} (coordinates: ${lat}, ${lng}).
Include:
- Best times to visit
- Local customs and etiquette
- Safety tips
- Money-saving advice
- Weather considerations
- Local events or festivals
- Insider tips from travelers
Return this as a comprehensive text summary.`,

      custom: `Search for information about: "${customQuery}" near ${locationName} (coordinates: ${lat}, ${lng}).
Provide relevant results with names, descriptions, prices (if applicable), links, and GPS coordinates where relevant.`
    };

    const userPrompt = `${searchPrompts[searchType]}

${budget ? `Budget Level: ${budget}` : ''}
${additionalDetails ? `Additional Requirements/Preferences: ${additionalDetails}` : ''}

CRITICAL REQUIREMENTS:
1. Search for CURRENT information using Google Search
2. Use REAL places with accurate information
3. For accommodations: use EXACT property page URLs (not search pages)
4. Include accurate GPS coordinates for all location-based results
5. Return ONLY valid JSON, no other text
6. Follow the exact format specified in your instructions`;

    // System prompt for location search
    const systemPrompt = `You are a travel research assistant that finds specific information about locations.

SEARCH REQUIREMENT: Use Google Search to find CURRENT, REAL information.

${searchType === 'tips' ? `
For TIPS searches, return JSON in this format:
{
  "type": "tips",
  "locationName": "string",
  "tips": "string (comprehensive markdown-formatted tips and advice)"
}
` : `
For all other searches, return JSON in this format:
{
  "type": "${searchType}",
  "locationName": "string",
  "results": [
    {
      "id": "string (unique identifier)",
      "type": "${searchType === 'accommodations' ? 'accommodation' : 'attraction'}",
      "name": "string",
      "description": "string",
      "price": "string (e.g., '$150/night', '€17 entry', 'Free', '$$')",
      "link": "string (direct URL or empty string)",
      "lat": number,
      "lng": number,
      "duration": "string (e.g., '2 hours', '1 night')"
    }
  ]
}
`}

ACCOMMODATION LINK REQUIREMENTS (when searching for accommodations):
- Use the EXACT URL from the property page, NOT search results
- Valid: "https://www.booking.com/hotel/[country]/[hotel-name].html"
- Valid: "https://www.hotels.com/ho[property-id]/"
- Valid: "https://www.airbnb.com/rooms/[listing-id]"
- INVALID: URLs containing "searchresults", "/s/", "ss=", "/search/"

REQUIREMENTS:
- lat/lng MUST be numbers (not strings)
- Provide 5-10 results for most searches
- All coordinates must be accurate and near the specified location
- Return ONLY valid JSON (no markdown code blocks, no explanation)`;

    // Use flash model for faster responses
    const modelName = 'gemini-2.5-flash';
    
    console.log(`Location search: ${searchType} for ${locationName}`);
    
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`,
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
            maxOutputTokens: 4096
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
    let searchData;
    try {
      // Strip markdown code blocks if present
      let jsonString = responseText.trim();
      
      const jsonMatch = jsonString.match(/```json\s*\n?([\s\S]*?)\n?```/) || 
                        jsonString.match(/```\s*\n?([\s\S]*?)\n?```/);
      
      if (jsonMatch) {
        jsonString = jsonMatch[1].trim();
      }
      
      searchData = JSON.parse(jsonString);
    } catch (parseError) {
      console.error('Failed to parse JSON response:', parseError);
      console.error('Response text:', responseText);
      return res.status(500).json({ 
        error: 'Invalid JSON response from model',
        details: 'The model did not return valid JSON',
        rawResponse: responseText.substring(0, 500)
      });
    }

    // Validate and clean accommodation links if applicable
    if (searchData.results && Array.isArray(searchData.results)) {
      searchData.results = searchData.results.map(item => {
        if (item.type === 'accommodation' && item.link) {
          const link = item.link.toLowerCase();
          
          // Check for invalid search page URLs
          const invalidPatterns = ['searchresults', '/s/', 'ss=', '/search/', 'hotel-search', 'destination_id='];
          const isInvalid = invalidPatterns.some(pattern => link.includes(pattern));
          
          if (isInvalid) {
            item.link = '';
            item.description += ' ⚠️ [Direct booking link unavailable]';
          }
        }
        
        // Generate unique ID if missing
        if (!item.id) {
          item.id = `search-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        }
        
        return item;
      });
    }

    // Log search metadata if available
    if (candidate.groundingMetadata) {
      console.log(`\n📊 Location Search (${searchType}) - Used ${candidate.groundingMetadata.groundingChunks?.length || 0} search result(s)`);
    }

    // Return the search data
    return res.status(200).json(searchData);
    
  } catch (error) {
    console.error('Error in location search:', error);
    return res.status(500).json({ 
      error: 'Failed to perform location search',
      message: error.message 
    });
  }
}

