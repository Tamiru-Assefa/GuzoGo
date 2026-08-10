# GuzoGo
**Professional Networking Platform**

Real-time voice/video spaces, AI-powered peer matching, and community rooms.

GuzoGo combines the best of LinkedIn, Omegle, and Discord into a single modern platform where professionals can connect, network, and collaborate.

---

## ✨ Features

- 🔐 **Secure Authentication**
  - Register/Login with JWT access + refresh tokens
  - Email verification and password reset
- 👤 **User Profiles**
  - Profession, skills, bio, social links, and profile picture
- 🏠 **Spaces (Group Rooms)**
  - Public or password-protected rooms with up to 6 participants
  - Real-time voice/video, screen sharing, chat, host controls (mute/kick), and hand raise
- 🤝 **Peer Match (Omegle-style)**
  - AI-powered 1-on-1 matching based on profession, skills, and goals
  - Instant video call with next-match capability
- 📧 **Email Integration**
  - Beautiful HTML emails for verification and password reset
  - Built with MailKit + Gmail SMTP
- 📱 **Responsive UI**
  - Dark glassmorphism design optimized for desktop
  - Mobile notice provided for best experience
- ⚡ **Real-time Communication**
  - SignalR for signaling and chat
  - WebRTC for peer-to-peer media streaming

---

## 🧠 AI Matching

A Python FastAPI microservice performs semantic similarity matching using Sentence Transformers.

- Compares user preferences: goals, profession, skills, description
- Ranks candidates by relevance
- .NET backend calls the AI service and creates match sessions
- Includes a repeat-match penalty to improve variety

---

## 🛠 Tech Stack

| Layer       | Technology                                   |
|------------|----------------------------------------------|
| Frontend   | Angular 22 (standalone components, signals)  |
| Backend    | .NET 10 (ASP.NET Core Web API, EF Core)      |
| Database   | SQL Server                                   |
| Real-time  | SignalR, WebRTC                              |
| AI Service | Python 3.13, FastAPI, Sentence-Transformers  |
| Email      | MailKit + Gmail SMTP                         |
| Auth       | JWT (access + refresh tokens), BCrypt        |

---

## 📁 Project Structure

```
GuzoGo_APP/
├── Front-End/          # Angular 22 application
│   ├── src/app/
│   │   ├── core/       # Services, interceptors, guards
│   │   ├── features/   # Auth, profile, space, dashboard
│   │   ├── shared/     # Shared components and layout
│   │   └── environments/
│   └── angular.json
│
├── Back-End/           # .NET 10 solution
│   ├── guzogo/
│   │   ├── Controllers/
│   │   ├── DTOs/
│   │   ├── Entities/
│   │   ├── Services/
│   │   ├── Hubs/       # SignalR hubs
│   │   ├── Helpers/    # JWT generator
│   │   └── Data/       # DbContext
│   └── guzogo.sln
│
├── AI-Matcher/         # Python matching microservice
│   ├── main.py
│   ├── matcher.py
│   ├── models.py
│   └── requirements.txt
│
└── README.md
```

---

## 🚀 Getting Started

### Prerequisites

- Node.js ≥ 18
- Angular CLI
- .NET 10 SDK
- SQL Server
- Python 3.13
- Gmail account with App Password for email sending

### Backend Setup

```bash
cd Back-End/guzogo/guzogo
# Update connection string in appsettings.json
dotnet ef database update
dotnet run
```

### Frontend Setup

```bash
cd Front-End
npm install
ng serve
```

### AI Service Setup

```bash
cd AI-Matcher
python -m venv venv
# Windows:
venv\Scripts\activate
# macOS / Linux:
# source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

---

## ⚙️ Configuration

### Backend `appsettings.json`

```json
{
  "Jwt": {
    "Key": "your-256-bit-secret",
    "DurationInMinutes": 30
  },
  "Smtp": {
    "Username": "you@gmail.com",
    "Password": "your-app-password"
  },
  "AppUrl": "http://localhost:4200"
}
```

### Frontend `environment.ts`

```ts
export const environment = {
  production: false,
  apiUrl: 'http://localhost:5011/api'
};
```

---

## 📡 API Endpoints

### Authentication

- `POST /api/Auth/register`
- `POST /api/Auth/login`
- `POST /api/Auth/refresh`
- `POST /api/Auth/verify-email`
- `POST /api/Auth/resend-verification`
- `POST /api/Auth/forgot-password`
- `POST /api/Auth/reset-password`

### Profiles

- `GET /api/Profile`
- `GET /api/Profile/user/{userId}`
- `POST /api/Profile/create`
- `PUT /api/Profile/{id}`
- `GET /api/Profile/{id}`

### Match Preferences

- `POST /api/MatchPreference/{userId}` — Create/update match preferences
- `GET /api/MatchPreference/{userId}` — Get match preference
- `GET /api/MatchPreference/searching` — Get currently searching users

### Spaces

- `GET /api/Spaces/categories`
- `GET /api/Spaces`
- `POST /api/Spaces`
- `GET /api/Spaces/{roomId}`
- `POST /api/Spaces/{roomId}/join`
- `POST /api/Spaces/{roomId}/leave`
- `DELETE /api/Spaces/{roomId}`
- `POST /api/Spaces/{roomId}/mute/{userId}`
- `POST /api/Spaces/{roomId}/kick/{userId}`

### Matching

- `POST /api/Matching/find/{userId}`

### AI Matcher

- `POST http://localhost:8000/match/{userId}`

---

## 🧪 Testing Email Locally

- Use the same Gmail address for sending and receiving test emails
- Check the spam folder if emails do not arrive
- Monitor backend logs for sent token activity

---

Developed by Tamiru Assefa.

For contributions, open issues or pull requests on GitHub.
