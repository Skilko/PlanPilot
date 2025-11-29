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
  const { destination, duration, budget, interests, mustVisit, responseMode } = req.body;

  // Validate required fields
  if (!destination || !duration) {
    return res.status(400).json({ 
      error: 'Missing required fields: destination and duration are required' 
    });
  }

  // Determine which mode to use (default to flash for speed)
  const isProMode = responseMode === 'pro';
  const modelName = isProMode ? 'gemini-2.5-pro' : 'gemini-2.5-flash';

  try {
    const apiKey = process.env.GOOGLE_AI_API_KEY;
    
    if (!apiKey) {
      throw new Error('GOOGLE_AI_API_KEY environment variable not set');
    }

    // Build the prompt with trip parameters
    const modeInstruction = isProMode 
      ? '\n\nMODE: DETAILED - Provide MORE accommodation and attraction options than usual. Be thorough and comprehensive.' 
      : '\n\nMODE: QUICK - Provide a good selection of accommodations and attractions, but prioritize speed.';
    
    const userPrompt = `Generate a comprehensive trip plan in JSON format for the following trip:

Destination: ${destination}
Duration: ${duration}
Budget Level: ${budget || 'not specified'}
Interests: ${interests && interests.length > 0 ? interests.join(', ') : 'not specified'}
Must-Visit Locations: ${mustVisit || 'none specified'}${modeInstruction}

CRITICAL REQUIREMENTS: 
1. Search for CURRENT information about hotels, accommodations, attractions, and prices
2. Find REAL hotels with actual prices and booking links
3. When you find a hotel on Booking.com/Hotels.com/Airbnb, use the EXACT URL from the property page
4. NEVER provide search result URLs - only direct property/hotel page URLs
5. If you cannot find a direct property URL, leave the link field empty
6. Include popular attractions with current entry fees
7. Use accurate GPS coordinates
8. Return ONLY valid JSON, no other text
9. Follow the exact format specified in your instructions

⚠️ ACCOMMODATION LINKS MUST BE PROPERTY-SPECIFIC:
- Use the EXACT URL you found when viewing the specific hotel page
- Do NOT modify or reconstruct URLs
- Invalid links (search pages) will be rejected`;

    // Default system prompt (can be overridden by environment variable)
    const defaultSystemPrompt = `You are a professional travel research agent that creates comprehensive trip plans in JSON format.

SEARCH REQUIREMENT: Use Google Search to find CURRENT, REAL information about:
- Hotel names, prices, and booking links (Booking.com, Hotels.com, Airbnb)
- Attraction names, entry fees, and official websites
- Restaurant recommendations with price ranges
- Accurate GPS coordinates for all locations
- Current travel information and tips

CRITICAL - ACCOMMODATION LINK REQUIREMENTS:
⚠️ THESE ARE MANDATORY - VIOLATIONS WILL CAUSE THE RESPONSE TO BE REJECTED ⚠️

1. ALWAYS use the EXACT URL you found when searching - DO NOT modify or reconstruct URLs
2. When you search for hotels, save the EXACT booking page URL from your search results
3. ALL accommodation links MUST point to a SPECIFIC property page, never a search results page

VALID URL PATTERNS (Examples):
✓ Booking.com: "https://www.booking.com/hotel/[country]/[hotel-name].html"
✓ Hotels.com: "https://www.hotels.com/ho[property-id]/" or "https://www.hotels.com/h[id].Hotel-Information"
✓ Airbnb: "https://www.airbnb.com/rooms/[listing-id]"
✓ Direct hotel websites: "https://[hotelname].com/booking" or similar

INVALID URL PATTERNS (These will be REJECTED):
✗ Booking.com: "searchresults.html", "/s/[city]", "destination_id=", "ss=" (search pages)
✗ Hotels.com: "/search/", "/Hotel-Search"
✗ Airbnb: "/s/[location]" (search pages)
✗ Generic domains without specific property paths
✗ URLs that contain only city/region names without hotel identifiers

SEARCH INSTRUCTION:
- When searching, open the actual property page on the booking site
- Copy the EXACT URL from that property page (not the search results page)
- Include the property page URL in your response WITHOUT any modifications
- If you cannot find a direct property URL, omit the link rather than providing a search page

VERIFICATION:
Before including any accommodation link, verify it contains:
- A specific hotel/property identifier (not just a city name)
- A direct path to the property (not "searchresults", "/s/", or similar)
- The actual URL you used to view the property details

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
      "lng": number,
      "order": number,
      "duration": "string",
      "keyLocationId": "string (REQUIRED for accommodation/attraction - the ID of the key-location this belongs to)"
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
- key-location: Major destinations (cities, regions) - keyLocationId should be empty string ""
- accommodation: Hotels, hostels, Airbnb (MUST have price, link, AND keyLocationId)
- attraction: Places to visit (entry fees if applicable, MUST have keyLocationId)

CRITICAL - ASSOCIATING ITEMS WITH KEY LOCATIONS:
⚠️ Every accommodation and attraction MUST include a "keyLocationId" field that references the ID of the key-location it belongs to.
- This ensures hotels and attractions appear under the CORRECT key location in the trip itinerary
- The keyLocationId MUST match the "id" of an existing key-location
- Only associate items that are ACTUALLY relevant to that key location:
  * Hotels should be within reasonable distance of the key location (same city/town)
  * Attractions should be places to visit WHILE staying at that key location
  * Do NOT associate items from other cities or regions
- Example: A hotel in Paris should have keyLocationId pointing to the Paris key-location, NOT to Versailles

QUANTITY GUIDELINES (STANDARD):
- 3-5 days: 1 key location, 2-4 accommodations, 5-10 attractions
- 1 week: 2-3 key locations, 4-6 accommodations, 10-15 attractions
- 2+ weeks: 3-5 key locations, 6-10 accommodations, 15-25 attractions

REQUIREMENTS:
- lat/lng MUST be numbers (not strings)
- order MUST be a number indicating visit sequence (1, 2, 3, etc.)
- duration MUST be a string (e.g., "3 days", "2 nights", "2 hours")
- Order locations chronologically - start with first destination, its accommodation, then attractions
- Provide realistic durations: key-locations (days), accommodations (nights), attractions (hours)
- Use real hotels with real prices from search results
- Include booking links from major platforms
- Validate all coordinates are accurate
- Return ONLY valid JSON (no markdown, no explanation)`;

    // Pro mode system prompt with increased quantity requirements
    const proSystemPrompt = defaultSystemPrompt.replace(
      'QUANTITY GUIDELINES (STANDARD):',
      'QUANTITY GUIDELINES (DETAILED MODE - PROVIDE MORE OPTIONS):'
    ).replace(
      '- 3-5 days: 1 key location, 2-4 accommodations, 5-10 attractions',
      '- 3-5 days: 1-2 key locations, 4-6 accommodations, 10-15 attractions'
    ).replace(
      '- 1 week: 2-3 key locations, 4-6 accommodations, 10-15 attractions',
      '- 1 week: 2-4 key locations, 8-12 accommodations, 20-30 attractions'
    ).replace(
      '- 2+ weeks: 3-5 key locations, 6-10 accommodations, 15-25 attractions',
      '- 2+ weeks: 4-8 key locations, 12-20 accommodations, 30-50 attractions'
    );

    const systemPrompt = process.env.GEMINI_SYSTEM_PROMPT || (isProMode ? proSystemPrompt : defaultSystemPrompt);

    // Call Google Gemini API with grounding (requires billing)
    // Model selection based on user preference
    console.log(`Using ${modelName} model for ${isProMode ? 'detailed' : 'quick'} mode`);
    
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

    // Validate accommodation links to ensure they're property-specific
    const invalidAccommodations = [];
    const validatedLocations = tripData.locations.map(location => {
      if (location.type === 'accommodation' && location.link) {
        const link = location.link.toLowerCase();
        const originalLink = location.link;
        
        // Check for generic search URLs that don't point to specific properties
        const invalidPatterns = [
          { pattern: 'searchresults', reason: 'Search results page' },
          { pattern: '/s/', reason: 'Generic search page' },
          { pattern: 'destination_id=', reason: 'Search query with destination ID' },
          { pattern: '/search/', reason: 'Search page' },
          { pattern: 'hotel-search', reason: 'Hotel search page' },
        ];
        
        // Booking.com specific validation
        if (link.includes('booking.com')) {
          const hasHotelPath = link.includes('/hotel/');
          const hasPropertyId = link.match(/\/hotel\/[a-z]{2}\/[a-z0-9-]+\.html/i);
          const isSearchPage = link.includes('ss=') && !hasHotelPath;
          
          if (isSearchPage || (!hasHotelPath && !link.includes('.html'))) {
            invalidAccommodations.push({
              id: location.id,
              name: location.name,
              link: originalLink,
              issue: 'Booking.com link must be in format: /hotel/[country]/[hotel-name].html'
            });
            // Clear the invalid link
            location.link = '';
            location.description += ' ⚠️ [Booking link unavailable - was generic search page]';
          }
        }
        
        // Hotels.com specific validation
        if (link.includes('hotels.com')) {
          const hasPropertyId = link.match(/\/ho\d+/i) || link.match(/\/h\d+/i);
          
          if (!hasPropertyId || link.includes('/search/')) {
            invalidAccommodations.push({
              id: location.id,
              name: location.name,
              link: originalLink,
              issue: 'Hotels.com link must include property ID (e.g., /ho123456/)'
            });
            location.link = '';
            location.description += ' ⚠️ [Booking link unavailable - was generic search page]';
          }
        }
        
        // Airbnb specific validation
        if (link.includes('airbnb.com')) {
          const hasRoomId = link.match(/\/rooms\/\d+/i);
          
          if (!hasRoomId || link.includes('/s/')) {
            invalidAccommodations.push({
              id: location.id,
              name: location.name,
              link: originalLink,
              issue: 'Airbnb link must include specific listing ID (e.g., /rooms/12345)'
            });
            location.link = '';
            location.description += ' ⚠️ [Booking link unavailable - was generic search page]';
          }
        }
        
        // General pattern validation
        for (const { pattern, reason } of invalidPatterns) {
          if (link.includes(pattern)) {
            // Only add if not already added by platform-specific validation
            const alreadyMarked = invalidAccommodations.some(inv => inv.id === location.id);
            if (!alreadyMarked) {
              invalidAccommodations.push({
                id: location.id,
                name: location.name,
                link: originalLink,
                issue: reason
              });
              location.link = '';
              location.description += ` ⚠️ [Booking link unavailable - ${reason.toLowerCase()}]`;
            }
            break;
          }
        }
      }
      return location;
    });

    // Update locations with validated data
    tripData.locations = validatedLocations;

    // Log warnings and details for invalid accommodation links
    if (invalidAccommodations.length > 0) {
      console.error('❌ INVALID ACCOMMODATION LINKS DETECTED AND REMOVED:');
      console.error(`   Found ${invalidAccommodations.length} invalid link(s)\n`);
      invalidAccommodations.forEach((item, index) => {
        console.error(`${index + 1}. ${item.name} (ID: ${item.id})`);
        console.error(`   Issue: ${item.issue}`);
        console.error(`   Invalid URL: ${item.link}`);
        console.error('');
      });
      console.error('⚠️ These links have been removed and marked in the description.');
      console.error('⚠️ Consider regenerating the trip for better results.\n');
    }

    // Log search metadata if available - this shows what Gemini actually searched for
    if (candidate.groundingMetadata) {
      console.log('\n📊 GEMINI SEARCH METADATA:');
      console.log('==========================');
      
      if (candidate.groundingMetadata.groundingChunks) {
        console.log(`✓ Used ${candidate.groundingMetadata.groundingChunks.length} search result(s)`);
        
        // Log some of the sources used
        const chunks = candidate.groundingMetadata.groundingChunks.slice(0, 5);
        chunks.forEach((chunk, idx) => {
          if (chunk.web) {
            console.log(`  ${idx + 1}. ${chunk.web.title || 'Unknown'}`);
            console.log(`     URL: ${chunk.web.uri || 'N/A'}`);
          }
        });
        if (candidate.groundingMetadata.groundingChunks.length > 5) {
          console.log(`  ... and ${candidate.groundingMetadata.groundingChunks.length - 5} more`);
        }
      }
      
      if (candidate.groundingMetadata.searchEntryPoint) {
        console.log(`\n🔍 Search Entry: ${candidate.groundingMetadata.searchEntryPoint.renderedContent || 'N/A'}`);
      }
      
      if (candidate.groundingMetadata.retrievalQueries) {
        console.log('\n📝 Retrieval Queries:');
        candidate.groundingMetadata.retrievalQueries.forEach((query, idx) => {
          console.log(`  ${idx + 1}. ${query}`);
        });
      }
      
      console.log('==========================\n');
    } else {
      console.log('⚠️ No grounding metadata available - Gemini may not have used search');
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
