// ICE server configuration for Native WebRTC (RTCPeerConnection)
// Uses public STUN servers to discover public-facing network addresses.
const ICE_SERVERS = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ],
};

export function createPeerConnection() {
  return new RTCPeerConnection(ICE_SERVERS);
}
