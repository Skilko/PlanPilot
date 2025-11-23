# DEPRECATED: Setting Up OpenAI Assistant for PlanPilot

**⚠️ NOTICE:** PlanPilot now uses Google Gemini 1.5 Pro with search grounding instead of OpenAI Assistants.

**Reasons for migration:**
- ✅ Built-in Google Search for real-time travel information
- ✅ 95% cost reduction ($0.001-0.005 vs $0.01-0.03 per trip)
- ✅ Simpler implementation (single API call vs multi-step threading)
- ✅ Faster responses (10-30 seconds vs 15-60 seconds)

**See the current setup guide:** `GEMINI-SETUP.md`

---

## Legacy Documentation (For Reference Only)

This guide walks you through creating an OpenAI Assistant that integrates with PlanPilot for AI-powered trip generation.

---

## Prerequisites

- OpenAI account with API access
- API credits (paid account) - Assistants API requires a paid account
- Access to https://platform.openai.com

---

## Step 1: Access the Assistants Section

1. Go to https://platform.openai.com
2. Log in with your OpenAI account
3. In the left sidebar, click on **"Assistants"**
4. Click the **"+ Create"** button (or "+ New Assistant")

---

## Step 2: Configure Basic Settings

### 2.1 Name and Description

- **Name:** `PlanPilot Trip Generator`
- **Description:** `Generates comprehensive trip plans with accommodations, attractions, prices, and GPS coordinates in JSON format`

### 2.2 Model Selection

- **Model:** Select **`gpt-4-turbo`** or **`gpt-4o`** (latest available)
  - GPT-4 Turbo provides the best balance of quality and speed
  - GPT-4o is faster but may be slightly less detailed
  - Do NOT use GPT-3.5 - it's not reliable enough for complex JSON generation

### 2.3 Instructions (System Prompt)

Copy the **ENTIRE contents** from the file `workflow-config/system-prompt.md` and paste it into the **Instructions** field.

**To copy the system prompt:**

1. Open `workflow-config/system-prompt.md` in your project
2. Select all (Cmd/Ctrl + A)
3. Copy (Cmd/Ctrl + C)
4. Paste into the Instructions field in the OpenAI interface

**The prompt is 255 lines and includes:**
- Your task description
- Research requirements
- JSON format specifications
- Location types (key-location, accommodation, attraction)
- Validation checklist
- Example outputs
- Error handling guidelines

### 2.4 Enable Tools

**Enable these tools:**

✅ **Code Interpreter**
- Useful for validating JSON structure
- Helps with coordinate calculations
- Can process and format data

**Optional (but not required):**
- ❌ **File Search** - Not needed for this use case
- ❌ **Function Calling** - Not needed (we handle via JSON response)

**Note:** Web browsing/search is NOT available in the Assistants API. The assistant will work with its training data (current through April 2024 for GPT-4 Turbo).

---

## Step 3: Configure Response Format (Important!)

In the **"Response format"** section:

- Set to: **`JSON object`** or **`JSON mode`** (if available)
- This ensures the assistant always returns valid JSON

**If you don't see this option:**
- That's okay - the system prompt instructs it to return JSON
- The backend code will parse JSON from the response

---

## Step 4: Set Temperature and Parameters (Optional)

If available in the settings:

- **Temperature:** `0.7` (balanced creativity and accuracy)
- **Top P:** `1.0` (default)
- **Max tokens:** Leave at default or set to `4096` (enough for detailed responses)

---

## Step 5: Save and Get Assistant ID

1. Click **"Save"** or **"Create Assistant"**
2. Once created, you'll see the **Assistant ID** displayed
3. **Copy the Assistant ID** - it will look like: `asst_ABC123xyz789DEF456ghi`
4. This is what you'll use in your Vercel environment variables

---

## Step 6: Test the Assistant (Recommended)

Before integrating with PlanPilot, test it in the OpenAI interface:

### Test Input:

Send this JSON as a message:

```json
{
  "destination": "Paris, France",
  "duration": "5 days",
  "budget": "mid-range",
  "interests": ["art", "food", "history"],
  "mustVisit": "Eiffel Tower, Louvre Museum"
}
```

### Expected Output:

The assistant should return a JSON response like:

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
      "description": "Boutique hotel in Le Marais",
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

### Validation Checklist:

- ✅ Response is valid JSON
- ✅ Has `title`, `locations`, and `connections` fields
- ✅ Locations have all required properties
- ✅ `lat` and `lng` are numbers (not strings)
- ✅ At least 1 key-location, 1 accommodation, and multiple attractions

---

## Step 7: Configure PlanPilot Integration

### 7.1 Update Vercel Environment Variables

1. Go to https://vercel.com/dashboard
2. Select your **PlanPilot** project
3. Go to **Settings** → **Environment Variables**
4. Update `OPENAI_WORKFLOW_ID`:
   - **Key:** `OPENAI_WORKFLOW_ID`
   - **Value:** Your Assistant ID (e.g., `asst_ABC123xyz789DEF456ghi`)
   - **Environment:** Select all (Production, Preview, Development)
5. Verify `OPENAI_API_KEY` is set:
   - **Key:** `OPENAI_API_KEY`
   - **Value:** Your OpenAI API key (starts with `sk-`)
   - Get from: https://platform.openai.com/api-keys
6. Click **Save**

### 7.2 Redeploy

1. Go to **Deployments** tab in Vercel
2. Click **⋯** on the latest deployment
3. Select **"Redeploy"**
4. Wait for deployment to complete

---

## Step 8: Test End-to-End

1. Open your deployed PlanPilot app
2. Click **"Start Planning"**
3. Fill out the form:
   - **Destination:** Paris, France
   - **Duration:** 5 days
   - **Budget:** Mid-range
   - **Interests:** art, food, history
   - **Must-Visit:** Eiffel Tower
4. Click **"Generate Trip Plan"**
5. Wait 15-60 seconds (Assistants API can take time)
6. **Success!** Trip should appear on the map

---

## Alternative: Create Assistant via API

If you prefer to create the assistant programmatically:

```bash
curl https://api.openai.com/v1/assistants \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $OPENAI_API_KEY" \
  -H "OpenAI-Beta: assistants=v2" \
  -d '{
    "name": "PlanPilot Trip Generator",
    "instructions": "YOUR_SYSTEM_PROMPT_HERE",
    "model": "gpt-4-turbo",
    "tools": [{"type": "code_interpreter"}],
    "response_format": {"type": "json_object"}
  }'
```

**Replace:**
- `$OPENAI_API_KEY` with your API key
- `YOUR_SYSTEM_PROMPT_HERE` with the full contents of `system-prompt.md`

The response will include the `id` field with your Assistant ID.

---

## Troubleshooting

### Issue: "Assistant not found" error

**Cause:** Assistant ID is incorrect or assistant was deleted

**Fix:**
1. Go to platform.openai.com → Assistants
2. Verify the assistant exists
3. Copy the correct Assistant ID
4. Update Vercel environment variable

### Issue: "No response from assistant"

**Cause:** Assistant isn't configured to return JSON

**Fix:**
1. Check the Instructions contain the full system prompt
2. Verify response format is set to JSON
3. Test the assistant in OpenAI playground first

### Issue: "Invalid response format from assistant"

**Cause:** Assistant returned text but not valid JSON

**Fix:**
1. Make sure the system prompt emphasizes returning ONLY JSON
2. Check that response format is set to JSON mode
3. Test with simple inputs first

### Issue: Response takes too long (timeout)

**Cause:** Assistant is processing but takes > 60 seconds

**Fix:**
- The code times out after 60 seconds
- Try simpler inputs first (shorter trips, fewer interests)
- Consider using GPT-4o instead of GPT-4 Turbo (faster)

### Issue: Responses are low quality

**Cause:** Model or prompt configuration

**Fix:**
- Ensure you're using GPT-4 Turbo or GPT-4o (not GPT-3.5)
- Verify the complete system prompt is in Instructions
- Check that Code Interpreter is enabled

---

## Cost Estimates

With OpenAI Assistants API:

- **GPT-4 Turbo:** ~$0.01-0.03 per trip generation
- **GPT-4o:** ~$0.005-0.015 per trip generation
- **GPT-3.5 Turbo:** ~$0.001-0.005 per trip (not recommended - quality too low)

**Monthly estimate for 100 trips:**
- GPT-4 Turbo: ~$1-3
- GPT-4o: ~$0.50-1.50

---

## Summary Checklist

- [ ] Created Assistant at platform.openai.com
- [ ] Named it "PlanPilot Trip Generator"
- [ ] Selected GPT-4 Turbo or GPT-4o model
- [ ] Pasted complete system prompt (255 lines)
- [ ] Enabled Code Interpreter tool
- [ ] Set response format to JSON
- [ ] Saved and copied Assistant ID (starts with `asst_`)
- [ ] Updated `OPENAI_WORKFLOW_ID` in Vercel
- [ ] Verified `OPENAI_API_KEY` is set in Vercel
- [ ] Redeployed application in Vercel
- [ ] Tested end-to-end in production

---

## Next Steps

Once your assistant is working:

1. **Monitor usage** - Check costs in OpenAI dashboard
2. **Refine prompts** - Adjust system prompt based on output quality
3. **Add features** - Consider adding file search or other tools
4. **Scale up** - Test with various destinations and trip lengths

---

## Support Resources

- **OpenAI Assistants Docs:** https://platform.openai.com/docs/assistants/overview
- **API Reference:** https://platform.openai.com/docs/api-reference/assistants
- **PlanPilot Repo:** https://github.com/Skilko/PlanPilot
- **System Prompt:** `workflow-config/system-prompt.md`

---

**Need help?** Check the troubleshooting section above or review the Vercel function logs for detailed error messages.

