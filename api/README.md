# PlanPilot API

This directory contains serverless functions that run on Vercel.

## Endpoints

### POST /api/chat-workflow

Proxies requests to the OpenAI Workflows API to generate trip plans using a configured workflow.

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

### OPENAI_WORKFLOW_ID
- **Format:** `wf_` followed by alphanumeric characters
- **Example:** `wf_69077644556c8190ae880fe26c11591202b869b697351d99`
- **Description:** Unique identifier for your OpenAI Workflow
- **Where to find:** OpenAI dashboard → Workflows → select your workflow → ID is in URL or details

### OPENAI_API_KEY
- **Format:** `sk-` followed by alphanumeric characters
- **Example:** `sk-proj-xxxxxxxxxxxxx`
- **Description:** Your OpenAI API key for authentication
- **Where to get:** https://platform.openai.com/api-keys

## Production Deployment

Environment variables must be configured in the Vercel Dashboard:
1. Go to Project Settings → Environment Variables
2. Add `OPENAI_WORKFLOW_ID` with your workflow ID
3. Add `OPENAI_API_KEY` with your OpenAI API key
4. Select all environments (Production, Preview, Development)
5. Save and redeploy if already deployed

## API Details

The serverless function calls the OpenAI Workflows API endpoint:
```
POST https://api.openai.com/v1/workflows/{WORKFLOW_ID}/runs
```

Request body is wrapped in an `input` object as required by the Workflows API.

