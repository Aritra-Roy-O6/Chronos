# 🌍 CHRONOS
**The Autonomous Supply Chain Orchestrator**


Traditional logistics software tells you there’s a problem *after* your cargo is already delayed. **CHRONOS** is a proactive, self-healing AI agent that acts as a 24/7 digital bodyguard for your shipments. It constantly scans global feeds, predicts bottlenecks, and autonomously reroutes cargo via sea, rail, or road before localized disruptions cascade into global delays.

Built for the **Google Solution Challenge 2026**.

---

## ✨ Core Capabilities

* 🧠 **Multi-Agent Reflexion Loop:** CHRONOS doesn't just guess. It utilizes a dual-agent system (Planner & Critic) powered by Gemini 2.5. The Planner drafts routes, and the Critic audits them for cost, time, and carbon emissions. They debate recursively until a mathematically viable route is found.
* 🛰️ **Autonomous Threat Intelligence:** A background `cron` heartbeat cross-references active multimodal shipments against live global news and weather feeds.
* 🗺️ **AI Cartography & Tool Calling:** Gemini dynamically pauses its reasoning to call a real-world Geocoding REST API (OpenStreetMap Nominatim), fetching exact GPS coordinates to physically map detours.
* 🌐 **Real-time 3D Digital Twin:** A sleek, WebGL-powered 3D globe built with `react-globe.gl` that visualizes shipments, leaping arcs, and crisis zones in real-time.
* 📱 **Public Sentinel PWA:** A mobile-first Progressive Web App allowing ground workers to report disruptions directly into the AI’s ingestion engine.

---

## 🎯 UN Sustainable Development Goals (SDGs)
CHRONOS directly aligns with three critical UN SDGs:
1. **Goal 9 (Industry, Innovation & Infrastructure):** Builds resilient infrastructure by preventing cascading failures in global trade networks.
2. **Goal 12 (Responsible Consumption & Production):** Prevents the spoilage of perishable goods (food, medicine) by avoiding port bottlenecks.
3. **Goal 13 (Climate Action):** The Critic AI explicitly audits and optimizes alternate routes for minimal Carbon (kg) output.

---

## 🏗️ Technical Architecture

### **The Stack**
* **Frontend:** React, Vite, Tailwind CSS, Framer Motion, React-Globe.gl
* **Backend:** Node.js, Express.js, `node-cron`
* **AI Engine:** Google Gemini 2.5 Flash/Pro (`@google/genai` SDK)
* **Database:** Google Cloud Firestore (NoSQL, Real-time `onSnapshot` listeners)
* **External APIs:** Nominatim OpenStreetMap (Geocoding)

### **The Micro-Agent Flow**
1. **`shipment.service.js`**: Ingests user cargo data and structures it.
2. **`watchman.service.js`**: The background scraper looking for multimodal threats.
3. **`priority.service.js`**: Scores disruptions (1-10) and executes Tool Calls for GPS mapping.
4. **`orchestrator.service.js`**: The recursive Planner/Critic debate loop.
5. **`executor.service.js`**: Simulates carrier alerts and auto-drafts legal contract amendments.

---

## 🚀 Local Development Setup

### Prerequisites
* Node.js (v18+)
* A Google Gemini API Key
* A Firebase Project (with Firestore enabled)

### 1. Backend Setup
```bash
cd backend
npm install