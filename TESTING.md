# PlanPilot Vercel Deployment Testing Guide

## 🎯 Overview

This guide will help you verify that Phases 1-3 of the PlanPilot deployment are working correctly on Vercel.

---

## Phase 1: Project Structure Testing ✅

### Test 1.1: Verify App Loads
**What it tests:** Vercel routing and static file serving

1. Open your Vercel deployment URL (e.g., `https://your-app.vercel.app`)
2. **Expected Result:** 
   - ✅ PlanPilot application loads
   - ✅ Map displays correctly
   - ✅ Logo/image appears in the header
   - ✅ All buttons and controls are visible

**If it fails:** Check that `vercel.json` routing is correct and `public/index.html` exists

### Test 1.2: Verify Static Assets
**What it tests:** Public directory file serving

1. In your browser, navigate to: `https://your-app.vercel.app/planpilot.png`
2. **Expected Result:**
   - ✅ Logo image displays directly
   - ✅ No 404 error

**If it fails:** Check `vercel.json` rewrites configuration

### Test 1.3: Check Developer Tools Console
**What it tests:** No deployment errors

1. Open browser DevTools (F12 or Right-click → Inspect)
2. Go to the Console tab
3. **Expected Result:**
   - ✅ No 404 errors for missing files
   - ✅ No JavaScript errors preventing app functionality

---

## Phase 2: Backend API Testing 🔧

### Prerequisites: Set Up Environment Variables

**IMPORTANT:** The API will not work without environment variables!

1. Go to your Vercel Dashboard: https://vercel.com/dashboard
2. Select your PlanPilot project
3. Go to **Settings** → **Environment Variables**
4. Add these two variables:

| Variable Name | Value | Environment |
|--------------|-------|-------------|
| `CHATGPT_WORKFLOW_URL` | Your ChatGPT Agent Workflow endpoint | Production, Preview, Development |
| `CHATGPT_API_KEY` | Your OpenAI API key | Production, Preview, Development |

5. Click **Save**
6. **Redeploy** your app (Settings → Deployments → click ⋯ on latest → Redeploy)

### Test 2.1: API Endpoint Exists
**What it tests:** Serverless function deployment

1. Open: `https://your-app.vercel.app/api/chat-workflow`
2. **Expected Result:**
   - ✅ Status: `405 Method Not Allowed`
   - ✅ JSON response: `{"error": "Method not allowed"}`

**Why this is correct:** The API only accepts POST requests, so GET returns 405

**If it fails (404):** The serverless function didn't deploy - check `api/chat-workflow.js` exists

### Test 2.2: Test API with Curl (Optional)
**What it tests:** API request handling

Open terminal and run:

```bash
curl -X POST https://your-app.vercel.app/api/chat-workflow \
  -H "Content-Type: application/json" \
  -d '{"destination":"Paris","duration":"5 days"}'
```

**Expected Results:**

**If env vars NOT set:**
```json
{
  "error": "Failed to generate trip plan",
  "message": "fetch failed"
}
```

**If env vars ARE set but workflow not configured:**
```json
{
  "error": "Workflow API error: ...",
  "details": "..."
}
```

**If everything is configured:**
```json
{
  "title": "Paris Trip",
  "locations": [...],
  "connections": [...]
}
```

### Test 2.3: Check Vercel Function Logs
**What it tests:** Backend is receiving requests

1. Go to Vercel Dashboard → Your Project → **Logs** tab
2. Try making a request (use the curl command above)
3. **Expected Result:**
   - ✅ You see function invocation logs
   - ✅ Any errors are visible here

---

## Phase 3: Frontend Integration Testing 🎨

### Test 3.1: Verify New Planning Modal
**What it tests:** Updated modal UI

1. Open your Vercel app
2. Click the **"Start Planning"** button in the header
3. **Expected Result:**
   - ✅ Modal opens with **in-app form** (NOT a message about external GPT)
   - ✅ Form has these fields:
     - Destination (required)
     - Trip Duration (required)
     - Budget Level (dropdown)
     - Interests (text input)
     - Must-Visit Locations (textarea)
   - ✅ Button says **"✨ Generate Trip Plan"**

**If it fails:** Old modal shows → Phase 3 not deployed correctly

### Test 3.2: Test Form Validation
**What it tests:** Frontend form handling

1. Open the planning modal
2. Click "Generate Trip Plan" **without filling any fields**
3. **Expected Result:**
   - ✅ Browser validation prevents submission
   - ✅ "Please fill out this field" message appears

4. Fill in only "Destination" and try again
5. **Expected Result:**
   - ✅ Browser asks for "Trip Duration"

### Test 3.3: Test Loading Overlay
**What it tests:** Loading UI during API call

1. Fill out the planning form:
   - Destination: `Test City`
   - Duration: `3 days`
2. Click **"Generate Trip Plan"**
3. **Expected Result:**
   - ✅ Modal closes immediately
   - ✅ **Loading overlay appears** with:
     - Spinning animation
     - "Generating Your Trip Plan..." title
     - "Researching destinations..." message
   - ✅ Overlay covers entire screen

**If it fails:** No loading overlay → Phase 3 CSS/HTML not deployed

### Test 3.4: Test API Integration (Without Workflow)
**What it tests:** Frontend → Backend communication

**Prerequisites:** Environment variables NOT yet configured

1. Fill out and submit the planning form
2. **Expected Result:**
   - ✅ Loading overlay appears
   - ✅ After a few seconds, loading overlay disappears
   - ✅ Alert shows error message like:
     ```
     ❌ Error generating trip: Failed to generate trip plan
     
     You can still use the Import button to manually add a JSON file.
     ```

**This is correct!** It means:
- ✅ Frontend successfully called the backend API
- ✅ Backend function is running
- ✅ Error handling is working
- ⚠️ Workflow is not configured yet (expected)

### Test 3.5: Test API Integration (With Workflow) - FUTURE
**What it tests:** Complete end-to-end workflow

**Prerequisites:** 
- Environment variables configured
- ChatGPT Agent Workflow created (Phase 4)

1. Fill out the planning form with real data
2. **Expected Result:**
   - ✅ Loading overlay appears
   - ✅ After 10-30 seconds, loading disappears
   - ✅ Alert shows success:
     ```
     🎉 Trip plan generated successfully!
     
     X location(s) added to your map.
     ```
   - ✅ Map shows new locations
   - ✅ Locations list populates

### Test 3.6: Verify Manual Import Still Works
**What it tests:** Existing functionality preserved

1. Click **"Export"** button (if you have data) or use this sample JSON:

```json
{
  "title": "Test Trip",
  "locations": [
    {
      "name": "Test Hotel",
      "type": "accommodation",
      "lat": 48.8566,
      "lng": 2.3522,
      "description": "Test location",
      "price": "$100/night",
      "link": "https://example.com"
    }
  ],
  "connections": []
}
```

2. Save as `test-trip.json`
3. Click **"Import"** button in app
4. Select the file
5. **Expected Result:**
   - ✅ Import modal works
   - ✅ Data loads successfully
   - ✅ Locations appear on map

---

## 📋 Quick Checklist Summary

Copy this checklist and check off as you test:

### Phase 1: Structure ✅
- [ ] App loads at Vercel URL
- [ ] Map displays correctly
- [ ] Images load properly
- [ ] No console errors

### Phase 2: Backend API ⚙️
- [ ] Environment variables added to Vercel
- [ ] `/api/chat-workflow` endpoint exists (returns 405)
- [ ] API accepts POST requests
- [ ] Function logs appear in Vercel Dashboard

### Phase 3: Frontend 🎨
- [ ] Planning modal shows **in-app form** (not external link)
- [ ] Form has all 5 fields (destination, duration, budget, interests, must-visit)
- [ ] Form validation works
- [ ] Loading overlay appears when submitting
- [ ] Error handling works (shows friendly message)
- [ ] Manual import/export still functional

---

## 🐛 Common Issues

### Issue: API returns "fetch failed"
**Cause:** Environment variables not set or incorrect
**Fix:** Add `CHATGPT_WORKFLOW_URL` and `CHATGPT_API_KEY` in Vercel Dashboard → Settings → Environment Variables → Redeploy

### Issue: Loading overlay doesn't appear
**Cause:** CSS not loading or Phase 3 not deployed
**Fix:** Clear browser cache, check DevTools console for errors

### Issue: Old modal appears (external GPT link)
**Cause:** Vercel serving cached version
**Fix:** Hard refresh (Ctrl+Shift+R or Cmd+Shift+R), check latest deployment

### Issue: 404 on `/api/chat-workflow`
**Cause:** Serverless function didn't deploy
**Fix:** Check `api/chat-workflow.js` exists in GitHub repo, redeploy in Vercel

---

## 🎯 Next Steps After Testing

Once Phases 1-3 are verified:
1. **Phase 4:** Configure ChatGPT Agent Builder Workflow
2. **Phase 5:** Test complete end-to-end trip generation
3. **Phase 6:** Monitor and optimize

---

## 💡 Tips

- **Check Vercel Logs:** Most backend issues are visible in the Logs tab
- **Check Browser Console:** Most frontend issues are visible in DevTools
- **Test Incremental:** Test each phase independently before testing the full flow
- **Keep Manual Import:** Even with AI generation working, manual import is a useful fallback

---

**Need Help?**
- Vercel Docs: https://vercel.com/docs
- Check `api/README.md` for API documentation
- Review `env.template` for required environment variables
