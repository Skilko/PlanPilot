<!-- 267bf141-6716-4a86-b6fe-234366c7a43f 7821e57a-1c0b-4b11-a9d6-e7bed384b7e5 -->
# Deploy PlanPilot to Vercel with ChatGPT Workflow Integration

## Phase 1: Project Restructure for Vercel

### 1.1 Create Project Structure

```
planpilot/
├── public/
│   ├── index.html (rename from holiday-planner.html)
│   └── planpilot.png
├── api/
│   └── chat-workflow.js (proxy to ChatGPT Agent)
├── package.json
├── vercel.json
└── .env.local
```

### 1.2 Create package.json

```json
{
  "name": "planpilot",
  "version": "1.0.0",
  "type": "module",
  "dependencies": {},
  "scripts": {
    "dev": "vercel dev",
    "deploy": "vercel --prod"
  }
}
```

### 1.3 Create vercel.json

```json
{
  "rewrites": [
    { "source": "/", "destination": "/public/index.html" },
    { "source": "/planpilot.png", "destination": "/public/planpilot.png" }
  ],
  "functions": {
    "api/**/*.js": {
      "maxDuration": 60
    }
  }
}
```

## Phase 2: Backend API - ChatGPT Workflow Proxy

### 2.1 Create api/chat-workflow.js

Serverless function that:

- Receives trip parameters from frontend
- Calls ChatGPT Agent Builder Workflow API endpoint
- Returns formatted JSON to frontend
```javascript
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { destination, duration, budget, interests, mustVisit } = req.body;

  try {
    // Call ChatGPT Agent Builder Workflow
    const response = await fetch(process.env.CHATGPT_WORKFLOW_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.CHATGPT_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        destination,
        duration,
        budget,
        interests,
        mustVisit
      })
    });

    const data = await response.json();
    return res.status(200).json(data);
  } catch (error) {
    console.error('Workflow error:', error);
    return res.status(500).json({ error: error.message });
  }
}
```


### 2.2 Environment Variables

Set in Vercel Dashboard:

- `CHATGPT_WORKFLOW_URL` - Your Agent Builder Workflow endpoint
- `CHATGPT_API_KEY` - ChatGPT API key for the workflow

## Phase 3: Frontend Updates

### 3.1 Replace "Start Planning" Modal

Update the modal (lines ~949-1016 in current HTML) to show an in-app questionnaire instead of linking to external GPT.

**New modal structure:**

- Destination input
- Trip duration input
- Budget selector (Budget/Mid-range/Luxury)
- Interests (checkboxes or multi-select)
- Must-visit locations (optional text)
- "Generate Trip Plan" button

### 3.2 Add Loading State UI

Create loading overlay that shows while waiting for workflow response:

```html
<div id="loadingOverlay" class="loading-overlay">
  <div class="loading-content">
    <div class="spinner"></div>
    <h3>Generating Your Trip Plan...</h3>
    <p>Researching destinations and gathering information</p>
  </div>
</div>
```

### 3.3 Implement API Call Function

Add to JavaScript section:

```javascript
async function generateTripWithWorkflow(formData) {
  showLoadingOverlay();
  
  try {
    const response = await fetch('/api/chat-workflow', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    });
    
    if (!response.ok) throw new Error('Failed to generate trip');
    
    const tripData = await response.json();
    
    // Auto-import the generated data
    importDataFromJSON(tripData);
    
    hideLoadingOverlay();
    closePlanningModal();
    
    alert(`Trip plan generated! ${tripData.locations.length} locations added.`);
  } catch (error) {
    hideLoadingOverlay();
    alert('Error generating trip: ' + error.message + '\n\nYou can still use the Import button to manually add a JSON file.');
  }
}
```

### 3.4 Keep Manual Import Option

- Keep existing Export/Import buttons
- Keep "Copy Guide for AI" button in info modal
- Users can still manually create/edit JSON files

## Phase 4: ChatGPT Agent Workflow Setup

### 4.1 In ChatGPT Agent Builder:

1. Create new workflow named "PlanPilot Trip Generator"
2. Enable GPT-5 with thinking mode
3. Enable web search tool
4. Enable Python code interpreter
5. Configure input schema:
   ```json
   {
     "destination": "string",
     "duration": "string",
     "budget": "string",
     "interests": "array",
     "mustVisit": "string"
   }
   ```

6. Configure output to return PlanPilot JSON format
7. Copy the workflow API endpoint URL
8. Generate API key for the workflow

### 4.2 System Prompt for Workflow

Paste the PlanPilot JSON format guide (from copyGuideToClipboard function) as the system prompt with instructions to:

- Research destinations using web search
- Find accommodation prices and links
- Locate attractions with entry fees
- Generate accurate GPS coordinates
- Create logical connections between key locations
- Return valid JSON matching the schema

## Phase 5: Testing & Deployment

### 5.1 Local Testing

```bash
npm install
vercel dev  # Run locally
# Test: http://localhost:3000
```

### 5.2 Deploy to Vercel

```bash
vercel login
vercel --prod
```

### 5.3 Configure Production Environment

- Add environment variables in Vercel dashboard
- Test the deployed app
- Monitor API usage and costs

## Phase 6: Error Handling & Fallbacks

### 6.1 Implement Robust Error Handling

- Network errors → Show retry button
- Invalid JSON → Show format error, suggest manual import
- Timeout (60s) → Show message, offer manual option
- Rate limits → Queue request or show wait message

### 6.2 User Feedback

- Progress indicators during generation
- Success confirmation with summary
- Clear error messages with next steps

---

## 💡 **Key Benefits of This Approach**

1. **Users Stay In-App** - Seamless experience
2. **ChatGPT Workflow Handles Complexity** - You configure it once in their UI
3. **Simple Backend** - Just a proxy function, minimal code
4. **Free Hosting** - Vercel free tier is generous
5. **Scalable** - Serverless auto-scales
6. **Fallback Options** - Manual import still available

---

## 📊 **Estimated Costs**

- **Vercel Hosting:** Free (unless high traffic)
- **ChatGPT Workflow API:** Based on OpenAI pricing (~$0.01-0.05 per generation)
- **Total for 100 trips/month:** ~$1-5

---

## ⏱️ **Implementation Timeline**

- **Phase 1-2:** 1-2 hours (project setup + backend)
- **Phase 3:** 2-3 hours (frontend modifications)
- **Phase 4:** 1 hour (workflow configuration)
- **Phase 5-6:** 1-2 hours (testing + deployment)

**Total:** ~6-9 hours development time

---

Would you like me to proceed with implementing this plan? I can start with any phase you prefer, or do them sequentially.

### To-dos

- [ ] Create Vercel project structure with public/ and api/ directories
- [ ] Create package.json with OpenAI dependency and Vercel scripts
- [ ] Create vercel.json with routing and function configuration
- [ ] Build api/chat-workflow.js serverless function to proxy ChatGPT Agent Workflow
- [ ] Replace Start Planning modal with in-app questionnaire form
- [ ] Create loading overlay with spinner and progress messages
- [ ] Add generateTripWithWorkflow function to call backend API and auto-import results
- [ ] Configure ChatGPT Agent Builder Workflow with GPT-5, tools, and PlanPilot JSON schema
- [ ] Test complete flow locally using vercel dev
- [ ] Deploy to Vercel production and configure environment variables