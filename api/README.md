# PlanPilot API

This directory contains serverless functions that run on Vercel.

## Endpoints

### POST /api/chat-workflow

Calls Google Gemini 1.5 Pro API with search grounding to generate trip plans with real-time travel information.

**Request Body:**
```json
{
  "destination": "string (required)",
  "duration": "string (required)",
  "budget": "string (optional)",
  "interests": "array (optional)",
  "mustVisit": "string (optional)"
}
```

**Response:**
```json
{
  "tripName": "string",
  "locations": [...],
  "connections": [...],
  "days": [...]
}
```

**Error Response:**
```json
{
  "error": "string",
  "message": "string"
}
```

## Features

- ✅ CORS enabled for frontend integration
- ✅ Input validation for required fields
- ✅ Comprehensive error handling
- ✅ 60-second timeout for long-running workflows
- ✅ Secure API key handling via environment variables

## Local Testing

```bash
# Install Vercel CLI if needed
npm i -g vercel

# Copy environment template
cp env.template .env.local

# Add your API credentials to .env.local

# Start local development server
vercel dev

# Test endpoint
curl -X POST http://localhost:3000/api/chat-workflow \
  -H "Content-Type: application/json" \
  -d '{"destination":"Paris","duration":"5 days","budget":"mid-range"}'
```

## Environment Variables

Required environment variables:

### GOOGLE_AI_API_KEY
- **Format:** Starts with `AIza`
- **Example:** `AIzaSyABC123def456GHI789jkl...`
- **Description:** Google AI API key for Gemini access
- **Where to get:** https://aistudio.google.com/app/apikey
- **Free tier:** Yes - 1,500 requests/day

### GEMINI_SYSTEM_PROMPT (Optional)
- **Description:** Custom system instructions for Gemini model
- **Default:** Uses embedded prompt if not set
- **Format:** Plain text, multi-line
- **When to use:** For custom prompt modifications
- **Location:** Can be copied from `workflow-config/gemini-system-prompt.txt`

## Production Deployment

Environment variables must be configured in the Vercel Dashboard:
1. Go to Project Settings → Environment Variables
2. Add `GOOGLE_AI_API_KEY` with your Google AI API key
3. (Optional) Add `GEMINI_SYSTEM_PROMPT` for custom instructions
4. Select all environments (Production, Preview, Development)
5. Save and redeploy if already deployed

## API Details

The serverless function calls Google Gemini 1.5 Pro API:
```
POST https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent
```

With search grounding enabled via `googleSearchRetrieval` tool for real-time web search capabilities.

**Features:**
- Native JSON response format (`responseMimeType: "application/json"`)
- Google Search grounding for current travel information
- Dynamic retrieval threshold (0.3) for balanced search usage
- Temperature 0.7 for creative but accurate outputs
- Max 8192 output tokens for detailed trip plans

