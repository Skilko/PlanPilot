# ChatGPT Workflow Configuration Files

This directory contains all the configuration files needed to set up the ChatGPT Agent Builder Workflow for PlanPilot.

---

## 📁 Files in This Directory

### 1. **SETUP-GUIDE.md** 📖
**Complete step-by-step instructions** for configuring the ChatGPT Agent Workflow.

**Use this file to:**
- Set up ChatGPT Agent Builder from scratch
- Configure all required settings
- Test the workflow
- Connect it to your Vercel deployment
- Troubleshoot common issues

**Start here:** This is your main guide for Phase 4 implementation.

---

### 2. **system-prompt.md** 🤖
**Complete system prompt** for the AI agent.

**Contains:**
- Detailed instructions for the AI
- JSON format specifications
- Research requirements
- Quality guidelines
- Example outputs
- Validation rules

**How to use:**
1. Copy the entire contents of this file
2. Paste into the "Instructions" or "System Prompt" field in ChatGPT Agent Builder
3. This tells the AI exactly how to generate trip plans

---

### 3. **input-schema.json** 📥
**JSON Schema** defining what users input to generate a trip.

**Fields:**
- `destination` (required) - Where to travel
- `duration` (required) - How long
- `budget` (optional) - Budget level
- `interests` (optional) - User preferences
- `mustVisit` (optional) - Specific places to include

**How to use:**
- Copy/paste into "Input Schema" configuration in Agent Builder
- Or use it as reference when manually configuring input fields

---

### 4. **output-schema.json** 📤
**JSON Schema** defining the structure of generated trip plans.

**Structure:**
- `title` - Trip name
- `locations[]` - Array of places (key-locations, accommodations, attractions)
- `connections[]` - Travel routes between key locations

**How to use:**
- Copy/paste into "Output Schema" configuration in Agent Builder
- Ensures AI returns data in the correct format for PlanPilot

---

## 🚀 Quick Start

### If you're setting up for the first time:

1. **Read:** `SETUP-GUIDE.md` (start to finish)
2. **Copy:** `system-prompt.md` → ChatGPT Agent Builder Instructions
3. **Copy:** `input-schema.json` → Agent Builder Input Schema
4. **Copy:** `output-schema.json` → Agent Builder Output Schema
5. **Test:** Use example inputs from the setup guide
6. **Deploy:** Add API credentials to Vercel environment variables

---

## 🎯 What This Achieves

Once configured, users can:

1. **Fill out a form** on your PlanPilot app
2. **Click "Generate Trip Plan"**
3. **AI researches** destinations, hotels, attractions
4. **AI generates JSON** with real prices, links, coordinates
5. **Trip automatically loads** on the map
6. **No manual JSON creation** needed!

---

## 💡 Tips

- **Test thoroughly** in Agent Builder before connecting to Vercel
- **Start simple** - test with "Paris, 3 days" first
- **Check costs** - monitor OpenAI API usage dashboard
- **Keep system prompt updated** if you add new features to PlanPilot
- **Save your endpoint URL and API key** securely

---

## 🔗 Related Files

- **Backend API:** `../api/chat-workflow.js` - Serverless function that calls your workflow
- **Frontend Form:** `../public/index.html` - The planning modal users interact with
- **Environment Template:** `../env.template` - Template for required environment variables
- **Testing Guide:** `../TESTING.md` - How to test that everything works

---

## 📊 Expected Performance

- **Generation Time:** 15-30 seconds per trip
- **API Cost:** ~$0.01-0.05 per generation
- **Accuracy:** High (uses real-time web search)
- **Monthly Cost:** ~$1-5 for 100 trip generations

---

## ⚠️ Important Notes

### API Keys Security
- Never commit API keys to Git (they're in .gitignore)
- Store them only in Vercel environment variables
- Regenerate keys if accidentally exposed

### Agent Configuration
- Make sure web search is enabled (required for current data)
- Use GPT-4 or GPT-4 Turbo for best results
- Test output JSON validity before going live

### Maintenance
- Check OpenAI pricing updates periodically
- Monitor Vercel function logs for errors
- Update system prompt if PlanPilot format changes

---

## 🆘 Troubleshooting

**Problem:** Workflow returns invalid JSON
- **Solution:** Check system prompt is complete, test in Agent Builder

**Problem:** No data appears in app after generation
- **Solution:** Check Vercel logs, verify environment variables

**Problem:** "Failed to generate trip plan" error
- **Solution:** Verify API key and endpoint URL in Vercel settings

**More help:** See troubleshooting section in `SETUP-GUIDE.md`

---

## 📝 Customization

You can customize the workflow by editing:

- **system-prompt.md** - Change how AI generates trips
- **input-schema.json** - Add more input fields (e.g., dietary restrictions)
- **output-schema.json** - Extend the data structure (e.g., add opening hours)

After changes, update the Agent Builder configuration and redeploy.

---

**Ready to set up?** Open `SETUP-GUIDE.md` and follow the steps!

