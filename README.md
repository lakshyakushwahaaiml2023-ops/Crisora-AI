# Crisora AI: Intelligent Disaster Management Platform

Crisora AI is a next-generation, multi-role disaster response and early warning system designed to bridge the gap between citizens, district collectors, emergency responders, and state/national authorities. Developed for the **Coding Premier League LNCT** hackathon.

---

## 🛠️ Technology Stack

### Frontend
- **React 18 & Vite**: Fast, interactive single-page application framework.
- **Zustand**: Lightweight, reactive state management.
- **Leaflet & OpenStreetMap**: Interactive geospatial mapping for real-time risk zones and SOS clusters.
- **Tailwind CSS**: Modern utility-first styling for responsive dashboards.
- **Lucide Icons & React Hot Toast**: Premium UI details and notifications.

### Backend
- **Node.js & Express**: Extensible and high-performance server.
- **MongoDB & Mongoose**: NoSQL database for flexible schemas (SOS logs, events, regions, users).
- **Socket.IO**: Real-time bidirectional communication for immediate alert dispatching and dashboard sync.
- **Joi & JWT**: Robust request validation and secure role-based authentication.

### AI & Communication Integrations
- **Groq Cloud (LLaMA 3.3 70B Versatile)**: Fast AI model for real-time recommendations, disaster chatbot, and translating emergency alerts into Hindi.
- **Twilio API**: automated SMS notifications and broadcast voice calls.
- **Amazon Polly (Polly.Aditi - hi-IN)**: Natural Hindi Text-to-Speech (TTS) for emergency broadcast calls.
- **Third-Party Data Ingestion**: Automated cron jobs pulling real-time weather (OpenWeatherMap), river levels (Central Water Commission), and seismic data (USGS).

---

## 🌟 Key Features

### 1. Role-Based Dashboards
- **Citizen Portal**: Personal risk meter, quick-trigger SOS button, live evacuation status compliance, and a localized community help board.
- **District Collector & Authority Command Centers**: Full-scale situational maps, active distress event lists, resource allocation tabs, and real-time live SOS tables.

### 2. Multi-Channel Emergency Broadcast System
- **Dual-Channel Broadcast**: Instantly broadcasts emergency warnings via SMS and interactive voice calls.
- **Real-Time Hindi Localization**: Automatically translates English disaster alerts to Hindi using Groq AI and broadcasts them with natural-sounding Hindi voices via Twilio and AWS Polly.
- **Hardcoded Demo Endpoint**: Pre-configured to immediately call and message key demo numbers (+916268347442, +919669666845, +918109927290, +919302139664) simultaneously for evaluation.

### 3. Simulation & Decision Labs
- **Historical Simulation Lab**: Interactive scrubber timeline visualizing past Indian disasters (e.g., Kerala Floods, Cyclone Fani, Bhuj Earthquake) with risk progression graphs.
- **Bhopal Gas Tragedy (1984) Interactive Simulation**: An ultra-realistic simulation highlighting the 1984 disaster timeline with 8 critical decision checkpoints. It compares historical actions (Reality) with Crisora AI's proposed decisions, featuring animated gas dispersion maps, real-time distress alarms, and a live counter of simulated lives saved.

### 4. Advanced Analytics & Reporting
- **Reports Dashboard**: Aggregated KPIs, event classifications, and full CSV export capability for historical event and SOS logs.
- **Risk Engine**: Automated background worker calculating local region risk scores based on weather, water gauge levels, and seismic activity.

---

## 🇮🇳 Future Prospects: Deployment in Current India

If deployed across India's National Disaster Management Authority (NDMA) and State Disaster Management Authorities (SDMA), Crisora AI can revolutionize emergency responses:

1. **Direct Integration with India's Common Alerting Protocol (CAP)**
   - Connect directly with the C-DOT Alert Generator to broadcast localized cellular alerts (cell broadcasts) alongside SMS and IVR calls.

2. **Expanded Regional Language Support**
   - Leverage AI translation models to generate text and voice broadcasts in all 22 official Indian regional languages (e.g., Bengali, Marathi, Telugu, Tamil, Gujarati) for remote rural reach.

3. **IoT Sensor & Smart City Grid Ingestion**
   - Connect with telemetry systems from the India Meteorological Department (IMD), Central Water Commission (CWC) reservoirs, and urban smart city water/gas sensors for automated early warning triggers.

4. **Crowdsourced Damage Assessment & AID Coordination**
   - Empower local communities to submit geotagged images of infrastructure damage (bridges, roads, power lines) post-disaster, using AI vision to prioritize emergency repair queues.

5. **Offline P2P Mesh Communication**
   - Integrate with offline mesh networking apps or satellite-based distress messengers (e.g., NavIC-compatible systems) to ensure communication in regions where mobile towers are down.
