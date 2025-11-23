# Setting Up Google Gemini for PlanPilot

This guide walks you through setting up Google Gemini 1.5 Pro with search grounding for PlanPilot's AI-powered trip generation.

---

## Why Gemini?

**Benefits over OpenAI Assistants:**
- ✅ **Built-in Google Search** - Access real-time travel information
- ✅ **95% cost reduction** - $0.001-0.005 vs $0.01-0.03 per trip  
- ✅ **Simpler architecture** - Single API call vs multi-step threading
- ✅ **Faster responses** - 10-30 seconds vs 15-60 seconds
- ✅ **Better travel data** - Google's search is ideal for hotels and attractions
- ✅ **Free tier** - 1,500 requests/day included

---

## Prerequisites

- Google account (free)
- Access to https://aistudio.google.com
- Vercel account for deployment

---

## Step 1: Get Google AI API Key

### 1.1 Access Google AI Studio

1. Go to https://aistudio.google.com/app/apikey
2. Sign in with your Google account
3. Accept terms of service if prompted

### 1.2 Create API Key

1. Click **"Get API Key"** or **"Create API Key"**
2. Choose **"Create API key in new project"** (recommended) or select existing project
3. The API key will be generated immediately
4. **Copy the key** - it starts with `AIza`
5. Store it securely (you can always regenerate if lost)

**Example format:** `AIzaSyABC123def456GHI789jkl0MNO123pqr456`

### 1.3 Understand Free Tier Limits

**Free tier includes:**
- 1,500 requests per day
- 1 million tokens per minute
- No credit card required

**For PlanPilot:**
- Each trip generation = 1 request
- 1,500 trips/day = more than enough for most users
- Monitor usage at https://aistudio.google.com/app/apikey

---

## Step 2: Configure PlanPilot

### 2.1 Update Vercel Environment Variables

1. Go to https://vercel.com/dashboard
2. Select your **PlanPilot** project
3. Go to **Settings** → **Environment Variables**

**Add this variable:**

| Variable Name | Value | Environment |
|--------------|-------|-------------|
| `GOOGLE_AI_API_KEY` | Your API key from Step 1.2 | Production, Preview, Development |

**Optional variable:**

| Variable Name | Value | Environment |
|--------------|-------|-------------|
| `GEMINI_SYSTEM_PROMPT` | Custom system prompt (leave empty for default) | Production, Preview, Development |

4. Click **Save**
5. **Important:** You MUST redeploy after adding environment variables

### 2.2 Redeploy Application

1. Go to **Deployments** tab in Vercel
2. Find the latest deployment
3. Click **⋯** (three dots)
4. Select **"Redeploy"**
5. Wait for deployment to complete (~1-2 minutes)

---

## Step 3: Test the Integration

### 3.1 Basic Functionality Test

1. Open your deployed PlanPilot app (e.g., `https://your-app.vercel.app`)
2. Click **"Start Planning"** button
3. Fill out the trip form:
   - **Destination:** Paris, France
   - **Duration:** 3 days  
   - **Budget:** Mid-range
   - **Interests:** art, food
   - **Must-Visit:** Eiffel Tower
4. Click **"Generate Trip Plan"**
5. **Wait 10-30 seconds** (watch for loading overlay)

**Expected result:**
- ✅ Loading spinner appears
- ✅ After 10-30 seconds, trip appears on map
- ✅ Success message shows number of locations added
- ✅ Map displays markers for hotels, attractions, key locations

### 3.2 Verify Search Grounding

Check Vercel function logs to confirm search is being used:

1. Go to Vercel Dashboard → Your Project → **Logs** tab
2. Look for recent function invocations
3. Search for log entries containing "Search grounding used"
4. You should see search queries that were executed

**Example log output:**
```
Search grounding used: {
  searchQueries: 'hotels in Paris France mid-range',
  retrievalQueries: ['Paris attractions', 'Louvre Museum entry fee']
}
```

### 3.3 Validate Output Quality

Check that generated trips include:
- ✅ **Real hotels** with actual names (not "Hotel 1", "Generic Hotel")
- ✅ **Current prices** (e.g., "$180/night", "€17 entry")  
- ✅ **Booking links** to Booking.com, Hotels.com, Airbnb
- ✅ **Accurate coordinates** (verify a few on Google Maps)
- ✅ **Popular attractions** with entry fees

---

## Step 4: Understand How It Works

### 4.1 Request Flow

```
User fills form 
    ↓
Frontend sends POST to /api/chat-workflow
    ↓
Backend constructs prompt with trip parameters
    ↓
Gemini API called with search grounding enabled
    ↓
Google Search retrieves real-time travel data
    ↓
Gemini generates JSON with search results
    ↓
Backend validates and returns JSON
    ↓
Frontend displays trip on map
```

### 4.2 Search Grounding

Gemini automatically searches Google when it needs current information:

**What it searches for:**
- Hotel names and prices in the destination
- Attraction names and entry fees
- Restaurant recommendations
- Current travel tips and information

**Dynamic retrieval mode:**
- Searches only when needed (not every request)
- Threshold: 0.3 (balanced - searches for ~30% of information)
- Can be adjusted in `api/chat-workflow.js`

### 4.3 JSON Response Format

Gemini is configured to return only valid JSON:

```javascript
generationConfig: {
  responseMimeType: "application/json"
}
```

This guarantees the response is parseable JSON matching PlanPilot's format.

---

## Step 5: Local Development (Optional)

### 5.1 Setup Local Environment

```bash
# Navigate to project
cd PlanPilot

# Copy environment template
cp env.template .env.local

# Edit .env.local and add your API key
# GOOGLE_AI_API_KEY=AIzaSy...your-key-here...

# Install Vercel CLI if needed
npm i -g vercel

# Start local dev server
vercel dev
```

### 5.2 Test Locally

Open http://localhost:3000 and test the trip generation flow.

**Or test via curl:**

```bash
curl -X POST http://localhost:3000/api/chat-workflow \
  -H "Content-Type: application/json" \
  -d '{
    "destination": "Tokyo",
    "duration": "5 days",
    "budget": "mid-range",
    "interests": ["food", "culture"],
    "mustVisit": "Mount Fuji"
  }'
```

---

## Troubleshooting

### Issue: "GOOGLE_AI_API_KEY environment variable not set"

**Cause:** API key not configured in Vercel

**Fix:**
1. Verify you added the environment variable in Vercel dashboard
2. Ensure you selected all environments (Production, Preview, Development)
3. **Important:** Redeploy after adding environment variables
4. Check there are no typos in the variable name

### Issue: "No response generated"

**Cause:** API quota exceeded or invalid API key

**Fix:**
1. Check API key is valid at https://aistudio.google.com/app/apikey
2. Verify you haven't exceeded 1,500 requests/day
3. Try regenerating the API key
4. Check Vercel function logs for detailed error messages

### Issue: "Content was filtered for safety reasons"

**Cause:** Gemini's safety filters triggered

**Fix:**
1. This is rare for travel queries
2. Try different search terms or destination names
3. Avoid potentially sensitive destination names
4. Check Vercel logs to see what triggered the filter

### Issue: Invalid JSON or missing data

**Cause:** Gemini didn't follow the format

**Fix:**
1. Check the system prompt is correct in `api/chat-workflow.js`
2. The prompt is embedded in the code (default) or can be set via `GEMINI_SYSTEM_PROMPT`
3. Verify `responseMimeType: "application/json"` is set
4. Check Vercel logs for the actual response

### Issue: No real hotel data or generic responses

**Cause:** Search grounding not working

**Fix:**
1. Check Vercel logs for "Search grounding used" messages
2. Verify the `googleSearchRetrieval` tool is configured
3. Try adjusting `dynamicThreshold` (lower = more searches):
   ```javascript
   dynamicThreshold: 0.2  // Search more aggressively
   ```
4. Google Search may have rate limits - check API usage

### Issue: Responses too slow (>60 seconds)

**Cause:** Large requests or network issues

**Fix:**
1. Normal response time is 10-30 seconds
2. Try shorter trips (fewer days = faster)
3. Reduce number of interests
4. Check your network connection
5. Verify Vercel function timeout is set to 60 seconds

---

## Advanced Configuration

### Customize System Prompt

To modify how Gemini generates trips:

1. Edit `workflow-config/gemini-system-prompt.txt`
2. Copy the entire contents
3. Add to Vercel environment variables:
   - **Key:** `GEMINI_SYSTEM_PROMPT`
   - **Value:** Paste your custom prompt
4. Redeploy

**Or** edit directly in `api/chat-workflow.js` (line 56-96).

### Adjust Search Behavior

Edit `api/chat-workflow.js` line 122-127:

```javascript
googleSearchRetrieval: {
  dynamicRetrievalConfig: {
    mode: "MODE_DYNAMIC",
    dynamicThreshold: 0.3  // 0.0-1.0
  }
}
```

**Threshold values:**
- `0.1-0.2` - Search aggressively (more current data, slower, higher quota usage)
- `0.3-0.5` - Balanced (recommended)
- `0.6-0.9` - Search sparingly (faster, may use cached data)

### Adjust Response Creativity

Edit `api/chat-workflow.js` line 115:

```javascript
generationConfig: {
  temperature: 0.7  // 0.0-1.0
}
```

**Temperature values:**
- `0.0-0.3` - More focused, consistent, predictable
- `0.4-0.7` - Balanced creativity (recommended)
- `0.8-1.0` - More creative, varied, less predictable

---

## Cost Monitoring

### Free Tier Usage

Monitor your usage at https://aistudio.google.com/app/apikey

**Included:**
- 1,500 requests/day
- Resets daily
- No credit card required

### If You Exceed Free Tier

**Option 1:** Wait for daily reset

**Option 2:** Upgrade to paid tier in Google Cloud

**Paid pricing (if needed):**
- Gemini 1.5 Pro: ~$0.00125-0.005 per request
- Still 90%+ cheaper than OpenAI

### Cost Comparison

| Provider | Cost/Trip | 100 Trips/Month | Notes |
|----------|-----------|-----------------|-------|
| **Google Gemini** | $0.001-0.005 | $0.10-0.50 | 95% cheaper, includes search |
| OpenAI Assistants | $0.01-0.03 | $1-3 | No search capability |
| OpenAI + Search API | $0.02-0.08 | $2-8 | Complex implementation |

---

## Summary Checklist

- [ ] Got Google AI API key from https://aistudio.google.com/app/apikey
- [ ] Added `GOOGLE_AI_API_KEY` to Vercel environment variables
- [ ] Selected all environments (Production, Preview, Development)
- [ ] Redeployed application in Vercel
- [ ] Tested trip generation in production
- [ ] Verified real hotels with prices appear
- [ ] Checked Vercel logs for search grounding confirmation
- [ ] Confirmed responses are under 30 seconds
- [ ] Validated coordinates on map are accurate

---

## Support Resources

- **Google AI Studio:** https://aistudio.google.com
- **Gemini API Docs:** https://ai.google.dev/docs
- **PlanPilot Repo:** https://github.com/Skilko/PlanPilot
- **System Prompt:** `workflow-config/gemini-system-prompt.txt`
- **API Code:** `api/chat-workflow.js`

---

**Setup time:** ~15 minutes  
**Cost:** Free (1,500 requests/day included)  
**Search capability:** ✅ Built-in Google Search  
**Response time:** 10-30 seconds  

🎉 **You're all set! Start generating AI-powered trip plans with real-time search.**

