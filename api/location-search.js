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

CRITICAL JSON REQUIREMENTS:
1. You MUST respond with ONLY a valid JSON object - no text before or after
2. Do NOT wrap the JSON in markdown code blocks (no \`\`\`json or \`\`\`)
3. Do NOT include any explanatory text
4. Ensure all strings are properly quoted with double quotes
5. Ensure there are no trailing commas
6. lat and lng MUST be numbers, not strings
7. Search for CURRENT information using Google Search
8. Use REAL places with accurate information`;

    // System prompt for location search - emphasizing JSON output
    const systemPrompt = `You are a travel research assistant. You MUST respond with ONLY valid JSON - no other text, no markdown formatting, no code blocks.

CRITICAL: Your entire response must be parseable as JSON. Do not include any text outside the JSON object.

${searchType === 'tips' ? `
OUTPUT FORMAT (respond with exactly this structure):
{"type":"tips","locationName":"${locationName}","tips":"Your comprehensive tips here as a single string"}
` : `
OUTPUT FORMAT (respond with exactly this structure):
{"type":"${searchType}","locationName":"${locationName}","results":[{"id":"1","type":"${searchType === 'accommodations' ? 'accommodation' : 'attraction'}","name":"Place Name","description":"Description here","price":"$XX","link":"https://example.com","lat":${lat},"lng":${lng},"duration":"2 hours"}]}
`}

FIELD REQUIREMENTS:
- id: unique string identifier (use numbers like "1", "2", "3")
- type: "${searchType === 'accommodations' ? 'accommodation' : 'attraction'}"
- name: string with place name
- description: string with brief description
- price: string with price info or empty string ""
- link: string with URL or empty string "" (NO search result URLs)
- lat: NUMBER (not string) - the latitude coordinate
- lng: NUMBER (not string) - the longitude coordinate  
- duration: string like "2 hours" or "1 night"

ACCOMMODATION LINKS:
- Valid: "https://www.booking.com/hotel/xx/name.html"
- Valid: "https://www.hotels.com/hoXXXX/"
- INVALID: Any URL with "search", "/s/", "ss="

Provide 5-8 results. Respond with ONLY the JSON object.`;

    const modelName = 'gemini-2.5-flash';
    
    console.log(`Location search: ${searchType} for ${locationName}`);
    
    // Make the API request with retry logic
    let lastError = null;
    const maxRetries = 2;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              contents: [{
                parts: [{ text: attempt > 0 ? userPrompt + '\n\nREMINDER: Respond with ONLY valid JSON, no other text.' : userPrompt }]
              }],
              systemInstruction: {
                parts: [{
                  text: systemPrompt
                }]
              },
              generationConfig: {
                temperature: attempt > 0 ? 0.5 : 0.7, // Lower temperature on retry
                maxOutputTokens: 4096,
                responseMimeType: "application/json" // Request JSON response
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
          
          // Don't retry on auth/rate limit errors
          if (response.status === 401 || response.status === 403 || response.status === 429) {
            return res.status(response.status).json({ 
              error: `Gemini API error: ${errorData.error?.message || response.statusText}`,
              details: errorData
            });
          }
          
          lastError = new Error(`API error: ${response.status}`);
          continue;
        }

        const result = await response.json();
        
        // Extract the generated content
        if (!result.candidates || result.candidates.length === 0) {
          console.error('No candidates in response:', result);
          lastError = new Error('No response generated');
          continue;
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
          lastError = new Error('No content in response');
          continue;
        }

        const responseText = candidate.content.parts[0].text;
        
        // Try to parse JSON with robust extraction
        const searchData = extractAndParseJSON(responseText, searchType, locationName, lat, lng);
        
        if (searchData) {
          // Validate and clean the data
          const validatedData = validateAndCleanResults(searchData, searchType);
          
          // Log search metadata if available
          if (candidate.groundingMetadata) {
            console.log(`📊 Location Search (${searchType}) - Used ${candidate.groundingMetadata.groundingChunks?.length || 0} search result(s)`);
          }

          return res.status(200).json(validatedData);
        }
        
        lastError = new Error('Failed to parse JSON from response');
        console.error(`Attempt ${attempt + 1}: Failed to parse JSON. Response text:`, responseText.substring(0, 500));
        
      } catch (fetchError) {
        console.error(`Attempt ${attempt + 1} failed:`, fetchError);
        lastError = fetchError;
      }
    }
    
    // All retries failed
    console.error('All retry attempts failed:', lastError);
    return res.status(500).json({ 
      error: 'Failed to get valid response after multiple attempts',
      message: lastError?.message || 'Unknown error'
    });
    
  } catch (error) {
    console.error('Error in location search:', error);
    return res.status(500).json({ 
      error: 'Failed to perform location search',
      message: error.message 
    });
  }
}

/**
 * Extract and parse JSON from response text with multiple fallback strategies
 */
function extractAndParseJSON(responseText, searchType, locationName, lat, lng) {
  if (!responseText || typeof responseText !== 'string') {
    return null;
  }

  let jsonString = responseText.trim();
  
  // Strategy 1: Try direct parse first
  try {
    return JSON.parse(jsonString);
  } catch (e) {
    // Continue to other strategies
  }
  
  // Strategy 2: Extract from markdown code blocks
  const codeBlockPatterns = [
    /```json\s*\n?([\s\S]*?)\n?```/,
    /```\s*\n?([\s\S]*?)\n?```/,
  ];
  
  for (const pattern of codeBlockPatterns) {
    const match = jsonString.match(pattern);
    if (match) {
      try {
        return JSON.parse(match[1].trim());
      } catch (e) {
        // Continue to next pattern
      }
    }
  }
  
  // Strategy 3: Find JSON object boundaries
  const jsonObjectMatch = jsonString.match(/\{[\s\S]*\}/);
  if (jsonObjectMatch) {
    try {
      return JSON.parse(jsonObjectMatch[0]);
    } catch (e) {
      // Try to repair the JSON
      const repaired = repairJSON(jsonObjectMatch[0]);
      if (repaired) {
        try {
          return JSON.parse(repaired);
        } catch (e2) {
          // Continue
        }
      }
    }
  }
  
  // Strategy 4: Try to build a valid response from partial data
  const partialData = extractPartialData(jsonString, searchType, locationName);
  if (partialData) {
    return partialData;
  }
  
  return null;
}

/**
 * Attempt to repair common JSON issues
 */
function repairJSON(jsonString) {
  if (!jsonString) return null;
  
  let repaired = jsonString;
  
  // Remove any text before the first {
  const firstBrace = repaired.indexOf('{');
  if (firstBrace > 0) {
    repaired = repaired.substring(firstBrace);
  }
  
  // Remove any text after the last }
  const lastBrace = repaired.lastIndexOf('}');
  if (lastBrace !== -1 && lastBrace < repaired.length - 1) {
    repaired = repaired.substring(0, lastBrace + 1);
  }
  
  // Fix trailing commas before } or ]
  repaired = repaired.replace(/,\s*([}\]])/g, '$1');
  
  // Fix missing quotes around property names (simple cases)
  repaired = repaired.replace(/([{,]\s*)([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g, '$1"$2":');
  
  // Fix single quotes to double quotes (careful with apostrophes)
  repaired = repaired.replace(/:\s*'([^']*)'/g, ': "$1"');
  
  // Fix unquoted string values that should be quoted
  // This is tricky - only do simple cases
  
  // Remove control characters that can break JSON
  repaired = repaired.replace(/[\x00-\x1F\x7F]/g, (match) => {
    if (match === '\n') return '\\n';
    if (match === '\r') return '\\r';
    if (match === '\t') return '\\t';
    return '';
  });
  
  return repaired;
}

/**
 * Try to extract partial data when full JSON parsing fails
 */
function extractPartialData(text, searchType, locationName) {
  // For tips, try to extract any meaningful content
  if (searchType === 'tips') {
    // Look for tips-like content
    const tipsMatch = text.match(/"tips"\s*:\s*"([^"]+)"/);
    if (tipsMatch) {
      return {
        type: 'tips',
        locationName: locationName,
        tips: tipsMatch[1]
      };
    }
    
    // If no JSON structure, use the raw text as tips
    if (text.length > 50 && !text.includes('{')) {
      return {
        type: 'tips',
        locationName: locationName,
        tips: text.trim()
      };
    }
  }
  
  // For other types, try to extract results array
  const resultsMatch = text.match(/"results"\s*:\s*\[([\s\S]*?)\]/);
  if (resultsMatch) {
    try {
      const results = JSON.parse('[' + resultsMatch[1] + ']');
      if (Array.isArray(results) && results.length > 0) {
        return {
          type: searchType,
          locationName: locationName,
          results: results
        };
      }
    } catch (e) {
      // Continue
    }
  }
  
  return null;
}

/**
 * Validate and clean results data
 */
function validateAndCleanResults(data, searchType) {
  if (!data) return data;
  
  // Handle tips type
  if (searchType === 'tips' || data.type === 'tips') {
    return {
      type: 'tips',
      locationName: data.locationName || '',
      tips: data.tips || ''
    };
  }
  
  // Handle results array
  if (data.results && Array.isArray(data.results)) {
    data.results = data.results.map((item, index) => {
      // Ensure required fields exist
      const cleaned = {
        id: item.id || `result-${index + 1}`,
        type: item.type || (searchType === 'accommodations' ? 'accommodation' : 'attraction'),
        name: item.name || 'Unknown',
        description: item.description || '',
        price: item.price || '',
        link: '',
        lat: 0,
        lng: 0,
        duration: item.duration || ''
      };
      
      // Validate and convert lat/lng to numbers
      if (typeof item.lat === 'number' && !isNaN(item.lat)) {
        cleaned.lat = item.lat;
      } else if (typeof item.lat === 'string') {
        const parsed = parseFloat(item.lat);
        if (!isNaN(parsed)) cleaned.lat = parsed;
      }
      
      if (typeof item.lng === 'number' && !isNaN(item.lng)) {
        cleaned.lng = item.lng;
      } else if (typeof item.lng === 'string') {
        const parsed = parseFloat(item.lng);
        if (!isNaN(parsed)) cleaned.lng = parsed;
      }
      
      // Validate and clean links
      if (item.link && typeof item.link === 'string') {
        const link = item.link.toLowerCase();
        const invalidPatterns = ['searchresults', '/s/', 'ss=', '/search/', 'hotel-search', 'destination_id='];
        const isInvalid = invalidPatterns.some(pattern => link.includes(pattern));
        
        if (!isInvalid && item.link.startsWith('http')) {
          cleaned.link = item.link;
        }
      }
      
      return cleaned;
    });
    
    // Filter out results with invalid coordinates (0,0 unless that's actually the location)
    data.results = data.results.filter(item => {
      // Keep if coordinates are non-zero or if they're actually near 0,0
      return (item.lat !== 0 || item.lng !== 0) || 
             (Math.abs(item.lat) < 1 && Math.abs(item.lng) < 1);
    });
  }
  
  return data;
}
