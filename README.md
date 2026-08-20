# 🎥 RealTimeMeet

```{=html}
<p align="center">
```
`<strong>`{=html}A modern full-stack real-time video meeting platform
built for secure communication, collaboration, and interactive online
meetings.`</strong>`{=html}
```{=html}
</p>
```
```{=html}
<p align="center">
```
`<a href="https://realtimemeet.up.railway.app/">`{=html}🌐 Live
Demo`</a>`{=html}  • 
`<a href="https://github.com/Ahmadmalik1122/CodeAlpha_RealTimeMeet">`{=html}💻
GitHub Repository`</a>`{=html}
```{=html}
</p>
```
```{=html}
<p align="center">
```
`<img src="https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white" alt="React 19">`{=html}
`<img src="https://img.shields.io/badge/Node.js-Backend-339933?logo=node.js&logoColor=white" alt="Node.js">`{=html}
`<img src="https://img.shields.io/badge/Express.js-API-000000?logo=express&logoColor=white" alt="Express.js">`{=html}
`<img src="https://img.shields.io/badge/MongoDB-Database-47A248?logo=mongodb&logoColor=white" alt="MongoDB">`{=html}
`<img src="https://img.shields.io/badge/Socket.IO-Realtime-010101?logo=socket.io&logoColor=white" alt="Socket.IO">`{=html}
`<img src="https://img.shields.io/badge/WebRTC-Video%20%26%20Audio-333333" alt="WebRTC">`{=html}
```{=html}
</p>
```

------------------------------------------------------------------------

## ✨ Overview

**RealTimeMeet** is a production-oriented real-time meeting application
that combines video conferencing, authentication, meeting management,
and live participant communication in one web experience.

The project was designed as a complete full-stack application rather
than a static UI demo. The frontend communicates with a Node.js/Express
backend, MongoDB stores application data, Socket.IO handles real-time
events, and WebRTC provides peer-to-peer media communication.

### 🎯 Core goals

-   🔐 Secure authentication and authorization
-   📧 Email-based account verification
-   🔑 Password reset workflow
-   🎥 Real-time video and audio communication
-   ⚡ Live meeting events with Socket.IO
-   👥 Host-controlled participant admission
-   🚪 Waiting-room experience for participants
-   🧩 Meeting creation and joining through shareable links
-   📱 Responsive modern interface
-   🚀 Production deployment support

------------------------------------------------------------------------

## 🚀 Live Application

### 🌐 Live Demo

**https://realtimemeet.up.railway.app/**

### 💻 Source Code

**https://github.com/Ahmadmalik1122/CodeAlpha_RealTimeMeet**

------------------------------------------------------------------------

## 🧠 How It Works

``` text
                    ┌──────────────────────┐
                    │      React Client    │
                    │   Vite + React UI    │
                    └──────────┬───────────┘
                               │
                 REST API + Socket.IO
                               │
                    ┌──────────▼───────────┐
                    │   Node.js / Express  │
                    │   Authentication     │
                    │   Meeting API        │
                    └───────┬───────┬──────┘
                            │       │
                       MongoDB   Socket.IO
                            │       │
                    ┌───────▼───┐   │
                    │  Database │   │
                    └───────────┘   │
                                    │
                              Real-time Events
                                    │
                              ┌─────▼─────┐
                              │  WebRTC   │
                              │ Video/Audio│
                              └───────────┘
```

------------------------------------------------------------------------

## 🔥 Key Features

### 🔐 Authentication

-   User registration and login
-   JWT-based authentication
-   Protected application routes
-   Persistent authentication state
-   Secure password handling
-   Email verification
-   Verification token expiry
-   Verification email resend flow
-   Password reset functionality

### 📧 Email Verification

The application includes a complete verification lifecycle:

1.  User creates an account
2.  A secure verification token is generated
3.  The token is stored as a hash
4.  A verification email is sent
5.  User opens the verification link
6.  Account is marked as verified
7.  Verification token is invalidated

The mail layer supports production SMTP configuration and
development/test mail workflows.

### 🎥 Real-Time Meetings

-   Create a meeting
-   Generate a unique meeting ID
-   Join through a meeting URL
-   Host and participant roles
-   Waiting-room flow
-   Host admission/approval
-   Real-time participant events
-   Camera and microphone controls
-   WebRTC media communication

### ⚡ Real-Time Architecture

Socket.IO is used for events that need to happen immediately, including:

-   Participant connection/disconnection
-   Meeting presence
-   Waiting-room notifications
-   Host admission events
-   Meeting state synchronization
-   Real-time communication between clients

### 🛡️ Host Authorization

The meeting host is identified through the authenticated Socket.IO
connection.

The client sends its JWT during the Socket.IO handshake, allowing the
server to associate the socket with the authenticated user.

This prevents the application from relying only on client-side state
when determining meeting ownership.

------------------------------------------------------------------------

## 🧰 Technology Stack

  Layer             Technology
  ----------------- --------------------
  Frontend          React 19
  Build Tool        Vite
  Backend           Node.js
  API               Express.js
  Database          MongoDB + Mongoose
  Authentication    JWT
  Real-Time Layer   Socket.IO
  Video / Audio     WebRTC
  Email             Nodemailer / SMTP
  Deployment        Railway
  Version Control   Git + GitHub

------------------------------------------------------------------------

## 📁 Project Structure

``` text
RealTimeMeet/
│
├── client/
│   ├── src/
│   │   ├── components/
│   │   ├── context/
│   │   ├── pages/
│   │   ├── socket/
│   │   ├── hooks/
│   │   └── ...
│   │
│   ├── public/
│   ├── package.json
│   └── vite.config.*
│
├── server/
│   ├── config/
│   ├── controllers/
│   ├── middleware/
│   ├── models/
│   ├── routes/
│   ├── services/
│   ├── socket/
│   ├── utils/
│   ├── app.js
│   └── package.json
│
├── .gitignore
├── render.yaml
└── README.md
```

> Folder names can evolve as the project grows; the important separation
> is between the React client and Node.js server.

------------------------------------------------------------------------

## ⚙️ Local Development

### 1. Clone the repository

``` bash
git clone https://github.com/Ahmadmalik1122/CodeAlpha_RealTimeMeet.git
cd CodeAlpha_RealTimeMeet
```

### 2. Install frontend dependencies

``` bash
cd client
npm install
```

### 3. Install backend dependencies

Open another terminal:

``` bash
cd server
npm install
```

### 4. Configure environment variables

Create:

``` text
server/.env
```

Example:

``` env
PORT=5000

MONGODB_URI=your_mongodb_connection_string

JWT_SECRET=your_long_random_jwt_secret

CLIENT_URL=http://localhost:5173

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_gmail_app_password

MAIL_FROM="RealTimeMeet <your_email@gmail.com>"
```

For production, configure these values through your hosting platform's
secret/environment-variable manager rather than committing `.env` files.

### 5. Start the backend

``` bash
cd server
npm start
```

### 6. Start the frontend

``` bash
cd client
npm run dev
```

The Vite development server will normally be available at:

``` text
http://localhost:5173
```

------------------------------------------------------------------------

## 🔒 Environment & Security

Never commit secrets such as:

-   MongoDB credentials
-   JWT secrets
-   SMTP passwords
-   Gmail App Passwords
-   API keys
-   Production environment variables

If a secret has ever been exposed publicly, rotate it immediately.

------------------------------------------------------------------------

## 📡 Production Deployment

The application can be deployed as separate frontend and backend
services.

### Backend

Configure:

``` text
MONGODB_URI
JWT_SECRET
CLIENT_URL
SMTP_HOST
SMTP_PORT
SMTP_USER
SMTP_PASS
MAIL_FROM
```

### Frontend

Configure the API and Socket.IO URLs, for example:

``` env
VITE_API_URL=https://your-backend-domain/api
VITE_SOCKET_URL=https://your-backend-domain
```

Then rebuild the frontend:

``` bash
npm run build
```

For a production deployment, make sure the hosting platform runs a fresh
frontend build from the current source instead of serving an old `dist/`
directory.

------------------------------------------------------------------------

## 🧪 Recommended Testing Flow

### Authentication

-   [ ] Register a new user
-   [ ] Receive verification email
-   [ ] Verify account
-   [ ] Login
-   [ ] Logout
-   [ ] Test invalid credentials
-   [ ] Test password reset

### Meetings

-   [ ] Create meeting as User A
-   [ ] Join as host
-   [ ] Copy meeting URL
-   [ ] Join from another browser as User B
-   [ ] Confirm User B enters the waiting room
-   [ ] Approve User B as host
-   [ ] Confirm User B joins the meeting
-   [ ] Test camera/microphone
-   [ ] Test participant disconnect/reconnect

### Security

-   [ ] Test protected API routes without JWT
-   [ ] Test invalid/expired JWT
-   [ ] Confirm host authorization is server-side
-   [ ] Confirm secrets are not exposed in the frontend bundle

------------------------------------------------------------------------

## 🧩 Important Architecture Detail

RealTimeMeet uses two different communication paths:

### REST API

Used for operations such as:

``` text
Register
Login
Email verification
Password reset
Create meeting
Fetch meeting data
```

### Socket.IO

Used for:

``` text
Realtime connection
Meeting presence
Waiting room
Host approval
Participant events
Live meeting state
```

This separation keeps request/response operations in the API layer while
time-sensitive meeting events are handled through a persistent real-time
connection.

------------------------------------------------------------------------

## 🌟 Why This Project Is Different

RealTimeMeet is not just a video-call interface.

It demonstrates several production-level full-stack concepts:

-   Authentication architecture
-   JWT authorization
-   Secure token lifecycle
-   MongoDB data modeling
-   REST API design
-   WebSocket-style real-time communication
-   Socket.IO authentication
-   WebRTC media communication
-   Email delivery
-   Protected routes
-   Role-based meeting behavior
-   Deployment and environment management

------------------------------------------------------------------------

## 📈 Future Roadmap

Potential improvements:

-   [ ] Screen sharing
-   [ ] Meeting chat
-   [ ] Host mute controls
-   [ ] Participant management panel
-   [ ] Meeting history
-   [ ] User profile management
-   [ ] Meeting recording
-   [ ] Background effects
-   [ ] Dark/light theme switcher
-   [ ] Push notifications
-   [ ] Calendar integration
-   [ ] TURN server configuration for difficult networks
-   [ ] Automated tests
-   [ ] CI/CD pipeline

------------------------------------------------------------------------

## 🛠️ Troubleshooting

### Socket.IO returns `404`

Check that:

1.  The frontend uses the correct backend Socket.IO URL.
2.  The backend is running the Socket.IO server.
3.  The production frontend was rebuilt after source changes.
4.  The browser is not serving a stale cached bundle.
5.  `VITE_SOCKET_URL` points to the backend origin, not the frontend
    origin.

### Authentication works but host enters the waiting room

Check that the deployed client bundle sends the JWT during the Socket.IO
handshake.

The expected client configuration should effectively behave like:

``` js
io(SOCKET_URL, {
  autoConnect: false,
  auth: {
    token: localStorage.getItem("token") || ""
  }
});
```

After changing socket authentication code, always perform a fresh
production build.

------------------------------------------------------------------------

## 🤝 Contributing

Contributions, suggestions, and improvements are welcome.

``` bash
git checkout -b feature/your-feature
git add .
git commit -m "Add your feature"
git push origin feature/your-feature
```

Then open a Pull Request.

------------------------------------------------------------------------

## 👨‍💻 Author

**Muhammad Ahmad**

Software Engineering Student\
MNS UET Multan

-   GitHub: https://github.com/Ahmadmalik1122
-   LinkedIn: https://www.linkedin.com/in/muhammad-ahmad-en

------------------------------------------------------------------------

## 📄 License

This project is available for educational and portfolio purposes.

------------------------------------------------------------------------

```{=html}
<p align="center">
```
`<strong>`{=html}⭐ If you found RealTimeMeet useful, consider starring
the repository.`</strong>`{=html}
```{=html}
</p>
```
```{=html}
<p align="center">
```
Built with ❤️ using React, Node.js, MongoDB, Socket.IO & WebRTC.
```{=html}
</p>
```
