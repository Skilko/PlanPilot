# PlanPilot API

This directory contains serverless functions that run on Vercel.

## Endpoints

### POST /api/chat-workflow

Proxies requests to the ChatGPT Agent Builder Workflow to generate trip plans.

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

## Production Deployment

Environment variables must be configured in the Vercel Dashboard:
1. Go to Project Settings → Environment Variables
2. Add `CHATGPT_WORKFLOW_URL`
3. Add `CHATGPT_API_KEY`
4. Redeploy if already deployed

