# Phase 4: ChatGPT Agent Workflow Setup Guide

This guide walks you through setting up the ChatGPT Agent Builder Workflow for PlanPilot.

---

## Prerequisites

- ChatGPT Plus or Enterprise account with access to Agent Builder
- OpenAI API key (for authentication)
- Completed Phases 1-3 (Vercel deployment working)

---

## Step 1: Access ChatGPT Agent Builder

1. Go to [ChatGPT](https://chat.openai.com)
2. Click on your profile (bottom left)
3. Select **"Build a GPT"** or **"Create new agent"**
4. Choose **"Workflow"** mode (if available) or **"Agent Builder"**

---

## Step 2: Configure Basic Settings

### 2.1 Name and Description

- **Name:** `PlanPilot Trip Generator`
- **Description:** `Professional travel research agent that creates comprehensive trip plans with accommodations, attractions, and prices in JSON format for the PlanPilot application.`

### 2.2 Model Selection

- **Model:** GPT-4 or GPT-4 Turbo (latest available)
- **Enable:** Extended thinking (if available)
- **Temperature:** 0.7 (balanced creativity and accuracy)

---

## Step 3: Enable Required Tools

Enable these tools for the agent:

✅ **Web Search / Browsing**
- Required for finding current prices, availability, and links
- Enables real-time information gathering

✅ **Code Interpreter** (Python)
- Useful for processing coordinates and validating JSON
- Helps with data formatting

❌ **DALL-E** (NOT needed)
- Image generation not required for this workflow

---

## Step 4: Configure System Prompt

Copy the **ENTIRE contents** of `system-prompt.md` file from the `workflow-config/` directory.

**Location:** `workflow-config/system-prompt.md`

**How to add:**
1. In Agent Builder, find the **"Instructions"** or **"System Prompt"** section
2. Paste the entire content from `system-prompt.md`
3. Save the configuration

**Important:** The system prompt includes:
- JSON format specifications
- Research requirements
- Quality guidelines
- Validation checklist
- Example outputs

---

## Step 5: Configure Input Schema

This defines what information users provide to the agent.

**Important:** When Agent Builder asks for a "schema name", use: `planpilot_trip_request`
- ✅ Use underscores or hyphens (no spaces, dots, or brackets)
- The schema name must follow Agent Builder naming rules
- ⚠️ **Strict Mode:** All properties are marked as required for strict mode compliance. The frontend sends empty strings for optional fields (budget, interests, mustVisit)

### Option A: If Agent Builder has Schema Editor

1. Find **"Input Schema"** or **"Parameters"** section
2. Set schema name to: `planpilot_trip_request`
3. Add these fields:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `destination` | string | ✅ Yes | Destination city/country |
| `duration` | string | ✅ Yes | Trip length (e.g., "5 days") |
| `budget` | string | ❌ No | Budget level: "budget", "mid-range", or "luxury" |
| `interests` | array of strings | ❌ No | User interests (e.g., ["art", "food"]) |
| `mustVisit` | string | ❌ No | Specific places to include |

### Option B: If Using JSON Schema

Use the file: `workflow-config/input-schema.json`

Copy and paste the entire JSON schema into the input configuration.

---

## Step 6: Configure Output Schema

This defines the format of the agent's response.

**Important:** When Agent Builder asks for a "schema name", use: `planpilot_trip_plan`
- ✅ Use underscores or hyphens (no spaces, dots, or brackets)
- The schema name must follow Agent Builder naming rules

### Option A: Manual Configuration

1. Set schema name to: `planpilot_trip_plan`
2. Specify that output should be:
   - **Format:** JSON
   - **Structure:** Object with `title`, `locations`, and `connections` fields
   - **Validation:** Must match PlanPilot format

### Option B: If Using JSON Schema

Use the file: `workflow-config/output-schema.json`

1. Set schema name to: `planpilot_trip_plan`
2. Copy and paste the entire JSON schema into the output configuration

---

## Step 7: Test the Workflow

### Test Input Example

```json
{
  "destination": "Paris, France",
  "duration": "5 days",
  "budget": "mid-range",
  "interests": ["art", "food", "history"],
  "mustVisit": "Eiffel Tower, Louvre Museum"
}
```

### Expected Output

You should receive a JSON response like:

```json
{
  "title": "5-Day Paris Art & Cuisine Experience",
  "locations": [
    {
      "id": "1",
      "type": "key-location",
      "name": "Paris",
      "description": "City of Light, main destination",
      "price": "",
      "link": "",
      "lat": 48.8566,
      "lng": 2.3522
    },
    {
      "id": "2",
      "type": "accommodation",
      "name": "Hotel Atmospheres",
      "description": "Boutique hotel in Le Marais, 4-star",
      "price": "$180/night",
      "link": "https://www.booking.com/hotel/fr/atmospheres.html",
      "lat": 48.8584,
      "lng": 2.3615
    }
    // ... more locations
  ],
  "connections": []
}
```

### Validation Checklist

✅ Response is valid JSON (can be parsed)
✅ Has `title`, `locations`, and `connections` fields
✅ Locations have all required fields
✅ `lat` and `lng` are numbers (not strings)
✅ Location types are exactly "key-location", "accommodation", or "attraction"
✅ Accommodations have prices and links
✅ Coordinates are accurate

---

## Step 8: Get API Credentials

### 8.1 Get Workflow Endpoint URL

1. In Agent Builder, find **"API"** or **"Integration"** section
2. Look for **"Endpoint URL"** or **"Webhook URL"**
3. Copy the full URL (example: `https://api.openai.com/v1/assistants/asst_xxxxx/...`)
4. Save this URL - you'll need it for Vercel

### 8.2 Generate API Key

**Option A: Use existing OpenAI API key**
1. Go to [OpenAI Platform](https://platform.openai.com/api-keys)
2. Create new key or use existing key
3. Copy the key (starts with `sk-`)

**Option B: Create workflow-specific key (if available)**
1. In Agent Builder, look for **"Generate API Key"**
2. Create a key specifically for this workflow
3. Copy and save securely

---

## Step 9: Configure Vercel Environment Variables

Now connect your workflow to the Vercel deployment:

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your **PlanPilot** project
3. Go to **Settings** → **Environment Variables**
4. Add/Update these variables:

### Variable 1: CHATGPT_WORKFLOW_URL
- **Key:** `CHATGPT_WORKFLOW_URL`
- **Value:** (Paste the endpoint URL from Step 8.1)
- **Environment:** Select all (Production, Preview, Development)

### Variable 2: CHATGPT_API_KEY
- **Key:** `CHATGPT_API_KEY`
- **Value:** (Paste your API key from Step 8.2)
- **Environment:** Select all (Production, Preview, Development)

5. Click **Save**
6. **Redeploy** your application:
   - Go to **Deployments** tab
   - Click ⋯ on the latest deployment
   - Select **Redeploy**
   - Wait for deployment to complete

---

## Step 10: Test End-to-End Integration

### Test in Production

1. Open your Vercel app: `https://your-app.vercel.app`
2. Click **"Start Planning"** button
3. Fill out the form:
   - **Destination:** Paris, France
   - **Duration:** 5 days
   - **Budget:** Mid-range
   - **Interests:** art, food, history
   - **Must-Visit:** Eiffel Tower
4. Click **"Generate Trip Plan"**
5. Watch for loading overlay
6. Wait 15-30 seconds for AI to research and generate

### Expected Success

✅ Loading overlay appears with spinner
✅ After processing, overlay disappears
✅ Success message shows: "🎉 Trip plan generated successfully! X location(s) added to your map."
✅ Map displays new locations with markers
✅ Locations list shows all items

### Troubleshooting Failed Tests

#### Error: "Failed to generate trip plan"
**Cause:** Environment variables not set or incorrect
**Fix:** 
- Check Vercel environment variables are saved
- Verify API key is valid
- Ensure endpoint URL is correct
- Redeploy after changing variables

#### Error: "Invalid response format from API"
**Cause:** Workflow returning invalid JSON
**Fix:**
- Test workflow directly in Agent Builder
- Check system prompt is complete
- Verify output schema is configured
- Review workflow logs for errors

#### Error: "Workflow API error"
**Cause:** API authentication or endpoint issue
**Fix:**
- Verify API key has correct permissions
- Check endpoint URL is accessible
- Review OpenAI API usage limits
- Check API key is not expired

---

## Step 11: Monitor and Optimize

### Check Vercel Logs

1. Go to Vercel Dashboard → Your Project → **Logs**
2. Monitor function invocations
3. Look for errors or slow responses

### Check OpenAI Usage

1. Go to [OpenAI Usage Dashboard](https://platform.openai.com/usage)
2. Monitor API costs (expect ~$0.01-0.05 per trip generation)
3. Set usage limits if desired

### Optimize Performance

If responses are slow:
- Simplify system prompt (remove verbose sections)
- Reduce number of locations requested
- Use caching for common destinations (future enhancement)

If costs are high:
- Use GPT-3.5 instead of GPT-4 (less accurate but cheaper)
- Reduce web search usage
- Implement rate limiting

---

## Alternative Setup: Custom API Endpoint

If you don't want to use ChatGPT Agent Builder, you can create a custom endpoint using OpenAI's API directly:

### Option: Direct OpenAI API Integration

1. Modify `api/chat-workflow.js` to call OpenAI API directly:

```javascript
const response = await fetch('https://api.openai.com/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    model: 'gpt-4-turbo-preview',
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: JSON.stringify(formData) }
    ],
    response_format: { type: 'json_object' }
  })
});
```

2. Include system prompt from `system-prompt.md` as a constant
3. Parse the response and return to frontend

**Pros:** More control, direct integration
**Cons:** More code to maintain, no built-in web search

---

## Success Checklist

Phase 4 is complete when:

- [ ] ChatGPT Agent/Workflow is created
- [ ] System prompt is configured with full instructions
- [ ] Web search and code interpreter are enabled
- [ ] Input schema is configured (5 fields)
- [ ] Output schema is configured (PlanPilot JSON format)
- [ ] Workflow tested in Agent Builder successfully
- [ ] API endpoint URL obtained
- [ ] API key obtained
- [ ] Both environment variables added to Vercel
- [ ] Vercel application redeployed
- [ ] End-to-end test successful (form → AI → map)
- [ ] Multiple test trips generated successfully
- [ ] Monitoring in place (logs, usage, costs)

---

## Estimated Costs

- **ChatGPT Plus:** $20/month (includes Agent Builder access)
- **OpenAI API Usage:** ~$0.01-0.05 per trip generation
- **Monthly cost for 100 trips:** ~$1-5 in API calls

**Total:** $21-25/month for ChatGPT Plus + moderate usage

---

## Support Resources

- **OpenAI Agent Builder:** https://platform.openai.com/docs/assistants/overview
- **ChatGPT API Docs:** https://platform.openai.com/docs/api-reference
- **Vercel Environment Variables:** https://vercel.com/docs/environment-variables
- **PlanPilot Repository:** https://github.com/Skilko/PlanPilot

---

## Next Steps

After Phase 4 is complete:
- **Phase 5:** Test with multiple destinations and edge cases
- **Phase 6:** Implement error handling improvements, caching, and optimization
- **Future:** Add day-by-day itinerary generation, budget tracking, sharing features

---

**Need help?** Check the troubleshooting section above or review the TESTING.md guide for diagnostic steps.

