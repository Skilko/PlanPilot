# PlanPilot 🗺️✈️

**AI-powered trip planning application** that automates destination research and creates interactive trip itineraries with maps, accommodations, attractions, and connections.

🔗 **Live Demo:** [plan-pilot-one.vercel.app](https://plan-pilot-one.vercel.app)  
📦 **Repository:** [github.com/Skilko/PlanPilot](https://github.com/Skilko/PlanPilot)

---

## ✨ Features

### 🤖 AI Trip Generation
- Fill out a simple form with your destination, duration, and preferences
- AI researches and generates a complete trip plan in seconds
- Includes real accommodations, attractions, prices, and booking links
- Automatic GPS coordinates and map visualization

### 🗺️ Interactive Map
- Leaflet-based interactive map with custom markers
- **Purple markers** (📍) - Key destinations/cities
- **Green markers** (🏨) - Accommodations with prices
- **Red markers** (⭐) - Attractions and places to visit
- Visual connections showing travel routes between destinations

### 📋 Trip Management
- **Export** trips as JSON files for backup or sharing
- **Import** JSON files to restore or load shared trips
- **Manual editing** - Add/edit locations through the interface
- Drag-and-drop location management

### 💾 Local Storage
- Automatic saving to browser storage
- Trips persist across sessions
- No account required

---

## 🚀 Tech Stack

- **Frontend:** Vanilla JavaScript, HTML5, CSS3
- **Map:** Leaflet.js with OpenStreetMap tiles
- **Backend:** Vercel Serverless Functions (Node.js)
- **AI:** ChatGPT Agent Builder Workflow (GPT-4)
- **Deployment:** Vercel
- **Storage:** Browser LocalStorage

---

## 📁 Project Structure

```
planpilot/
├── public/
│   ├── index.html           # Main application (single-page app)
│   └── planpilot.png        # Logo/branding
├── api/
│   ├── chat-workflow.js     # Serverless function for AI integration
│   └── README.md            # API documentation
├── workflow-config/
│   ├── SETUP-GUIDE.md       # Complete ChatGPT workflow setup guide
│   ├── system-prompt.md     # AI agent instructions
│   ├── input-schema.json    # API input format
│   ├── output-schema.json   # API output format
│   └── README.md            # Workflow config overview
├── package.json             # Vercel configuration
├── vercel.json              # Routing and serverless functions config
├── env.template             # Environment variables template
├── TESTING.md               # Testing guide for all phases
└── README.md                # This file
```

---

## 🛠️ Setup & Deployment

### Prerequisites

- Node.js (for local development)
- Vercel account (for deployment)
- OpenAI API key (for AI features)
- ChatGPT Plus (for Agent Builder access)

### Quick Start

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Skilko/PlanPilot.git
   cd PlanPilot
   ```

2. **Install Vercel CLI:**
   ```bash
   npm install -g vercel
   ```

3. **Set up environment variables:**
   ```bash
   cp env.template .env.local
   # Edit .env.local with your API credentials
   ```

4. **Run locally:**
   ```bash
   vercel dev
   # Open http://localhost:3000
   ```

5. **Deploy to Vercel:**
   ```bash
   vercel --prod
   ```

### Environment Variables

Required variables (set in Vercel Dashboard or `.env.local`):

- `CHATGPT_WORKFLOW_URL` - Your ChatGPT Agent workflow endpoint
- `CHATGPT_API_KEY` - Your OpenAI API key

See `env.template` for details.

---

## 📖 Documentation

### For Users
- **TESTING.md** - How to test each feature
- **public/index.html** - Built-in JSON format guide (click "ℹ️ Info" button)

### For Developers
- **workflow-config/SETUP-GUIDE.md** - Complete ChatGPT workflow setup
- **workflow-config/README.md** - Overview of workflow configuration
- **api/README.md** - Backend API documentation

---

## 🎯 Implementation Phases

### ✅ Phase 1: Project Structure
- Vercel-ready file structure
- Static file serving configuration
- Deployment setup

### ✅ Phase 2: Backend API
- Serverless function for ChatGPT integration
- Error handling and validation
- CORS configuration

### ✅ Phase 3: Frontend Integration
- In-app questionnaire form
- Loading states and UX improvements
- API integration with error handling

### ✅ Phase 4: ChatGPT Workflow Setup
- AI agent configuration
- System prompts and schemas
- End-to-end AI trip generation

### 🔜 Phase 5: Testing & Optimization
- Comprehensive testing
- Performance optimization
- Edge case handling

### 🔜 Phase 6: Monitoring & Maintenance
- Error tracking
- Usage analytics
- Cost monitoring

---

## 💰 Cost Estimate

- **Vercel Hosting:** Free tier (generous limits)
- **ChatGPT Plus:** $20/month (for Agent Builder access)
- **OpenAI API:** ~$0.01-0.05 per trip generation
- **Monthly total:** ~$21-25 for personal use with moderate traffic

---

## 🧪 Testing

Run through the testing checklist:

```bash
# See TESTING.md for complete testing guide
```

**Quick test:**
1. Open deployed app
2. Click "Start Planning"
3. Fill form and submit
4. Verify loading overlay appears
5. Check trip loads on map

---

## 📝 Changelog

### November 24, 2025 - Accommodation Link Validation Fix
**Problem:** Booking.com and accommodation links were returning 404 or "pack not found" errors.

**Solution:**
- Enhanced system prompt with explicit URL format requirements
- Added comprehensive platform-specific link validation
- Improved logging of Gemini's search metadata
- Invalid links now removed and marked with warnings

**Files Changed:**
- `api/chat-workflow.js` - Enhanced validation and instructions
- `workflow-config/gemini-system-prompt.txt` - Updated link requirements

**Documentation:**
- `Articles/accommodation-links-fix.md` - Detailed technical explanation
- `Articles/link-validation-summary.md` - Quick visual summary

**Impact:** Accommodation links now point to specific property pages or are clearly marked as unavailable.

---

## 🤝 Contributing

Contributions welcome! Areas for improvement:

- Day-by-day itinerary generation
- Budget tracking and calculations
- Multi-language support
- Trip sharing features
- Mobile app version
- Offline mode

---

## 📄 License

This project is open source. See repository for license details.

---

## 🆘 Support

- **Issues:** [GitHub Issues](https://github.com/Skilko/PlanPilot/issues)
- **Documentation:** Check `workflow-config/` and `TESTING.md`
- **Vercel Docs:** [vercel.com/docs](https://vercel.com/docs)

---

## 🙏 Acknowledgments

- **Leaflet.js** - Interactive maps
- **OpenStreetMap** - Map tiles
- **OpenAI** - GPT-4 and Agent Builder
- **Vercel** - Hosting and serverless functions

---

**Built with ❤️ for travelers who want AI-powered trip planning.** 
