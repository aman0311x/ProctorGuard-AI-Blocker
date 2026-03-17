# 🛡️ ProctorGuard - Ultimate Hackathon Monitoring SaaS

![ProctorGuard Banner](https://via.placeholder.com/1200x300.png?text=ProctorGuard+-+Real-time+Hackathon+Monitoring)

**ProctorGuard** is a real-time, multi-tenant SaaS platform and Chrome Extension designed to ensure fair play during hackathons and competitive programming contests.  
It actively monitors participant behavior, blocks unauthorized AI tools (e.g., ChatGPT, Gemini), and provides a live monitoring dashboard for organizers.

---

## ✨ Key Features

- 🌐 **Multi-tenant Architecture**  
  Organizers can create isolated competitions. Each competition generates a unique `Secret Code` (e.g., `PRO-X7A2B`).

- ⚡ **Real-Time Dashboard**  
  Built with Socket.io, the dashboard updates instantly without reload when violations occur.

- 🚫 **AI & Website Blocking**  
  Chrome Extension blocks access to AI tools and restricted websites in real time.

- 👁️ **Activity Tracking**  
  Logs important participant actions:
  - Tab switching (leaving contest environment)
  - Copy & Paste attempts
  - Access to blocked websites

- 📊 **Team-Based Analytics**  
  Monitor participants by team and individual performance.

---

## 💻 Tech Stack

- **Frontend (Dashboard):** React.js, Vite, Tailwind CSS, Socket.io-client *(Vercel)*
- **Backend (API & WebSockets):** Node.js, Express.js, Socket.io *(Render)*
- **Database:** Supabase (PostgreSQL)
- **Client:** Chrome Extension (Manifest V3)

---

## 🚀 How It Works

1. **Organizer Setup**  
   Organizer creates a competition and receives a unique `Secret Code`.

2. **Participant Connection**  
   Participants install the Chrome Extension and enter:
   - Team Name  
   - Member Name  
   - Secret Code  

3. **Live Monitoring**  
   The extension tracks activity and sends violation events to the backend.  
   Events are instantly streamed to the organizer dashboard via WebSockets.

---

## 🛠️ Local Setup & Installation

### 1️⃣ Database Setup (Supabase)

Create a Supabase project and run:

```sql
CREATE TABLE competitions (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    name text NOT NULL,
    organizer text NOT NULL,
    secret_key text UNIQUE NOT NULL,
    created_at timestamp DEFAULT now()
);

CREATE TABLE logs (
    id bigserial PRIMARY KEY,
    competition_key text REFERENCES competitions(secret_key),
    participant_id text NOT NULL,
    event_type text NOT NULL,
    details text,
    created_at timestamp DEFAULT now()
);
