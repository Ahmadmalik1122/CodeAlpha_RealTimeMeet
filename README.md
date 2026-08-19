 CodeAlpha Real-Time Meet
> **Ultra-Low Latency WebRTC Video Conferencing Platform**
[![Node.js](https://img.shields.io/badge/Node.js-v18+-green.svg?style=for-thebadge&logo=nodedotjs)](https://nodejs.org/)
[![WebRTC](https://img.shields.io/badge/WebRTC-PeerToPeer-orange.svg?style=for-thebadge&logo=webrtc)](https://webrtc.org/)
[![Socket.io](https://img.shields.io/badge/Socket.io-RealTime-black.svg?style=forthe-badge&logo=socketdotio)](https://socket.io/)
[![Express](https://img.shields.io/badge/Express.js-Backend-lightgrey.svg?style=forthe-badge&logo=express)](https://expressjs.com/)
[![License](https://img.shields.io/badge/License-MIT-blue.svg?style=for-the-badge)]
(LICENSE)
---
## Executive Overview
**CodeAlpha Real-Time Meet** is a high-performance, real-time video conferencing web 
application engineered using WebRTC and WebSockets. Designed specifically for the 
**CodeAlpha Internship Program**, it provides high-definition audio/video streaming, 
instant in-call messaging, and seamless screen sharing capabilities with a modern 
glassmorphic interface.
---
## Key Features
- **HD Video & High-Quality Audio**: Peer-to-peer, low-latency media streaming 
powered by native WebRTC APIs with STUN/TURN traversal.
- **In-Call Real-Time Chat**: Instant text messaging integrated directly into 
call sessions via Socket.io media signaling.
- **Dynamic Media Controls**: One-tap microphone mute/unmute, video camera 
toggling, and output device selection.
- **Screen Sharing**: Instant desktop, application window, or browser tab 
presentation during live calls.
- **Secure Peer Connections**: Fully encrypted media streams using standard SRTP 
and DTLS security protocols.
- **Responsive Glassmorphism UI**: Dark-themed, sleek UI layout optimized across 
desktop and mobile browsers.
---
## Technical Architecture & Stack
| Component | Technology / Protocol |
| :--- | :--- |
| **Frontend Layer** | HTML5, CSS3 (Glassmorphism & Flexbox/Grid), JavaScript (ES6+) 
|
| **Media Protocol** | WebRTC API (Peer-to-Peer Data Channels & MediaStreams) |
| **Backend Runtime** | Node.js & Express.js Framework |
 **Signaling Engine** | Socket.io / WebSockets (ICE Candidate & SDP Exchange) |
---
## Quick Start & Installation Guide
### 1. System Prerequisites
Ensure Node.js and Git are installed on your environment:
```bash
node -v
npm -v
git -v
```
### 2. Repository Cloning & Setup
```bash
# Clone the project repository
git clone https://github.com/Ahmadmalik1122/CodeAlpha_RealTimeMeet.git
# Navigate into project directory
cd CodeAlpha_RealTimeMeet
# Install required node modules
npm install
```
### 3. Launching the Application
```bash
# Start the server
npm start
# Access application in your browser at:
http://localhost:3000
```
---
## Directory & File Structure
```text
CodeAlpha_RealTimeMeet/
├── public/
│ ├── css/ # Custom Glassmorphic styles & animations
│ ├── js/ # WebRTC peer connection logic & Socket handlers
│ └── index.html # Video conference dashboard UI
├── server.js # Express backend server & Socket.io signaling server
├── package.json # Dependencies and scripts configuration
└── README.md # Project documentation
```
---
## Author & Contributor
**Malik Ahmad**
- **GitHub**: [@Ahmadmalik1122](https://github.com/Ahmadmalik1122)
-  **Role**: Full Stack Developer / Software Engineering Student
---
<div align="center">
 <sub>Developed for CodeAlpha Internship Program Tasks</sub>
</div>
Developer: Malik
