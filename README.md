# Apna Video Call 🎥💬

**Apna Video Call** is a premium, full-stack, real-time video conferencing application designed to deliver secure, zero-latency WebRTC meetings directly inside modern web browsers. Built with a gorgeous glassmorphic dark interface, the system supports multi-peer video/audio calls, dynamic screen sharing, synchronized instant text chat, and historical meeting logs.

Designed with interview-grade engineering patterns, the platform solves critical WebRTC resource management issues, hardware track leaks, double-event subscriptions, and React 19 flickering glitches.

---

## ✨ Features

### 📡 Real-Time & Real-World WebRTC Call Capabilities
*   **Zero-Latency P2P Video/Audio**: Built directly on the native browser WebRTC API, establishing direct peer connections without passing media payloads through the server.
*   **Dual Stream & Track Modernization**: Implements modern `addTrack` and `replaceTrack` APIs to enable hot-swapping between webcam streams and high-definition screen sharing.
*   **Universal Browser Fallbacks**: Robust single-prompt media initialization that gracefully falls back to audio-only, video-only, or preview-only modes based on device permissions.
*   **Anti-Leak Hardware Management**: Automatically stops physical hardware tracks (`track.stop()`) on call termination, releasing webcam controls immediately.

### 💬 Synchronized Real-Time Chat Room
*   **Socket.io Broadcasts**: Synchronized instant text messaging powered by a low-overhead Node.js signaling gateway.
*   **Badge Counter Notifications**: Keeps participants informed of unread messages with custom badge counts when the chat drawer is closed.

### 🔐 High-Security User Auth & History Portal
*   **JWT Token Protection**: User authentication powered by signed JSON Web Tokens stored securely in the browser.
*   **Historical Logs**: Keep track of all past meetings joined, formatted dynamically with custom times and search keys.
*   **Defensive API Handling**: Backend route controllers fortified against invalid session tokens to prevent crashes and ensure absolute deploy-readiness.

---

## 🏗️ System Architecture

```
                                  +-----------------------+
                                  |   Browser A (Client)  |
                                  +-----------+-----------+
                                              |
                                     (Signaling via Websocket)
                                              |
+--------------------------+                  v                  +--------------------------+
|  Vercel Static Hosting   +-------> +--------+--------+ <-------+  Render Cloud Service    |
| (Frontend React Bundle)  |         |   Socket.IO     |         |  (Backend Node/Express)  |
+--------------------------+         |   Gateway       |         +------------+-------------+
                                     +--------+--------+                      |
                                              |                         (Mongoose Driver)
                                     (Signaling via Websocket)                |
                                              |                               v
                                              v                         +-----+-----+
                                  +-----------+-----------+             |  MongoDB  |
                                  |   Browser B (Client)  |             |   Atlas   |
                                  +-----------+-----------+             +-----------+
                                              |
                                      (Direct P2P Stream)
                                              |
                                              v
                                   [WebRTC P2P Media Pipe]
```

---

## 📁 Project Directory Structure

```
apnavideocall/
├── backend/
│   ├── src/
│   │   ├── controllers/
│   │   │   ├── socketManager.js       # WebRTC Signaling & Socket Broadcast logic
│   │   │   └── user.controller.js     # User registration, login, and call logs history
│   │   ├── models/
│   │   │   ├── meeting.model.js       # Meeting Schema
│   │   │   └── user.model.js          # User Schema
│   │   ├── routes/
│   │   │   └── users.routes.js        # User Express endpoints
│   │   └── app.js                     # Core Express initialization & Database boot
│   ├── .env                           # Backend environment configurations
│   └── package.json                   # Backend dependencies
├── frontend/
│   ├── src/
│   │   ├── contexts/
│   │   │   └── AuthContext.jsx        # Auth token, history sync, and API context
│   │   ├── pages/
│   │   │   ├── authentication.jsx     # Sleek Login & Register page
│   │   │   ├── history.jsx            # Dynamic user logs with Grid matrices
│   │   │   ├── landing.jsx            # Responsive hero section with guest join
│   │   │   ├── VideoMeet.jsx          # WebRTC/Socket Meeting orchestrator
│   │   │   └── walkthrough.md         # Full Technical & Interview Q&A guide
│   │   ├── styles/
│   │   │   └── videoComponent.module.css  # Premium glassmorphic styling system
│   │   ├── utils/
│   │   │   └── withAuth.jsx           # Higher-Order Component routing guard
│   │   ├── App.css                    # Responsive layouts and global fonts
│   │   ├── App.js                     # React Router configurations
│   │   ├── environment.js             # Dynamic Host-Detection environment switcher
│   │   └── index.js                   # React entrypoint
│   └── package.json                   # Frontend dependencies
└── README.md                          # Platform Documentation
```

---

## 🛠️ Local Installation & Setup

### Prerequisites
*   Node.js (v18+ recommended)
*   MongoDB Atlas cluster connection URI

### 1. Backend Configuration
1.  Navigate to the backend:
    ```bash
    cd backend
    ```
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Create a `.env` file in the `backend` folder:
    ```env
    PORT=8000
    MONGO_URI=your_mongodb_connection_string
    JWT_SECRET=your_jwt_signature_secret
    FRONTEND_URL=http://localhost:3000
    ```
4.  Launch the development server:
    ```bash
    npm run dev
    ```

### 2. Frontend Configuration
1.  Navigate to the frontend:
    ```bash
    cd ../frontend
    ```
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Create a `.env` file in the `frontend` folder (Optional, auto-detects `localhost:8000` by default):
    ```env
    REACT_APP_BACKEND_URL=http://localhost:8000
    ```
4.  Launch the React web server:
    ```bash
    npm start
    ```
5.  Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🚀 Production Cloud Deployments

### 1. Backend Deployed to Render
1.  Sign in to [Render](https://render.com) and click **New > Web Service**.
2.  Connect your GitHub repository.
3.  Set the following configuration:
    *   **Root Directory**: `backend`
    *   **Build Command**: `npm install`
    *   **Start Command**: `npm start`
4.  Under **Environment Variables**, add:
    *   `MONGO_URI` = `your_mongodb_production_uri`
    *   `PORT` = `8000`
    *   `JWT_SECRET` = `your_production_secret`
    *   `FRONTEND_URL` = `your_vercel_frontend_url`
5.  Click **Deploy Web Service**.

### 2. Frontend Deployed to Vercel
1.  Sign in to [Vercel](https://vercel.com) and click **Add New > Project**.
2.  Connect your GitHub repository.
3.  Select your root folder and set the following configuration:
    *   **Framework Preset**: `Create React App`
    *   **Root Directory**: `frontend`
4.  Under **Environment Variables**, add:
    *   `REACT_APP_BACKEND_URL` = `your_render_backend_url` (e.g. `https://apnavideocall-backend.onrender.com`)
5.  Click **Deploy**.

---

## 📡 WebRTC Signaling Exchange Sequence

```
[Local Peer A]                  [Socket.IO Server]                 [Remote Peer B]
      |                                 |                                 |
      |--------- (join-call) ---------->|                                 |
      |                                 |-------- (user-joined) --------->|
      |                                 |                                 |
      |                                 |<------- Create SDP Offer --------|
      |                                 |<------- (signal: offer) --------|
      |<------- (signal: offer) --------|                                 |
      |                                 |                                 |
      |--------- Create SDP Answer ---->|                                 |
      |--------- (signal: answer) ----->|                                 |
      |                                 |-------- (signal: answer) ------>|
      |                                 |                                 |
      | <============ GATHER & SHARE ICE CANDIDATES ================> |
      |                                 |                                 |
      | <================ DIRECT P2P MEDIA STREAM ESTABLISHED ========> |
```

---

## 🎓 Technology Stack
*   **Frontend**: React.js, React 19 (Rendering optimizations), CSS Modules, Material-UI (MUI), React Router.
*   **Backend**: Node.js, Express.js (Model-View-Controller framework), Socket.io (Websocket Signaling gateway).
*   **Database**: MongoDB, Mongoose ODM.
*   **Protocol Standards**: WebRTC (P2P Media Channel), SDP, ICE Candidates, JWT Auth.
