const ICE_SERVERS = {
  iceServers: [
    // STUN — public IP discovery
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },

    // TURN — relay fallback (Open Relay Project, free)
    {
      urls: [
        "turn:openrelay.metered.ca:80",
        "turn:openrelay.metered.ca:443",
        "turn:openrelay.metered.ca:443?transport=tcp",
        "turn:openrelay.metered.ca:80?transport=tcp",
      ],
      username: "openrelayproject",
      credential: "openrelayproject",
    },
  ],
};

export function createPeerConnection() {
  return new RTCPeerConnection(ICE_SERVERS);
}
