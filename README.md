# 🧠 DeepCost
> **The AI-Powered FinOps Commander** | *Built for the Google DeepMind Vibe Code Hackathon*

![DeepCost Banner](https://via.placeholder.com/1200x400/764ba2/ffffff?text=DeepCost+AI+Commander)
*(Add your actual screenshot here!)*

## 🚀 The Vision
Cloud bills are terrifying. **DeepCost** turns fear into power.
Combining **Gemma 3 Intelligence** with a "Vibe-First" UI, DeepCost gives you a chat-based commander that doesn't just show you charts—it **understands** your infrastructure.

### ✨ Key Features
*   **🤖 AI Cost Commander**: Powered by **Gemma 3 4B-IT**. Ask *"Why is my EC2 bill up?"* and get real answers.
*   **🔮 Vibe UI**: Glassmorphism, neon accents, and breathing animations that make FinOps feel alive.
*   **⚡ Real-Time Anomaly Detection**: Spot cost spikes before they bleed your budget.
*   **📊 Predictive Analytics**: ARIMA-based forecasting model running locally.

---

## 🛠️ Tech Stack
*   **Brain**: [Google Gemma 3 4B-IT](https://ai.google.dev/gemma) (via Google AI Studio)
*   **Frontend**: React, TypeScript, Material UI, Framer Motion
*   **Backend**: Node.js, Express, PostgreSQL
*   **Database**: PostgreSQL (Render/Local)
*   **Deployment**: Vercel (Frontend) + Render (Backend)

---

## 🏁 Quick Start

### 1. Prerequisites
*   Node.js v18+
*   PostgreSQL (or Docker)
*   Google AI Studio API Key

### 2. Installation

**Clone the repo:**
```bash
git clone https://github.com/Start-Up-Glitch/DeepCost.git
cd DeepCost
```

**Backend Setup:**
```bash
cd backend
npm install
# Create .env file with your GEMINI_API_KEY and DB credentials
npm start
```

**Frontend Setup:**
```bash
cd frontend
npm install
npm start
```

### 3. Usage
1.  Open `http://localhost:3000`.
2.  Click the **Cost Commander** FAB in the bottom right.
3.  Ask: *"Analyze my S3 spending trends."*

---

## 🏆 Hackathon Tracks
this project submits to:
*   **Gemini 3 Pro**: Leveraging the latest multimodal reasoning for complex cost analysis.
*   **Vibe Code**: Prioritizing a stunning, fluid user experience.

---

## 📄 License
MIT License. See [LICENSE](LICENSE) for details.

---
*Built with ❤️ by Rahul*
