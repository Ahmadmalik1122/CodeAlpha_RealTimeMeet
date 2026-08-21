const TURN_USERNAME = import.meta.env.VITE_TURN_USERNAME;
const TURN_CREDENTIAL = import.meta.env.VITE_TURN_CREDENTIAL;

const ICE_SERVERS = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun.relay.metered.ca:80" },

    {
      urls: "turn:realtimemeet.metered.live:80",
      username: TURN_USERNAME,
      credential: TURN_CREDENTIAL,
    },
    {
      urls: "turn:realtimemeet.metered.live:80?transport=tcp",
      username: TURN_USERNAME,
      credential: TURN_CREDENTIAL,
    },
    {
      urls: "turn:realtimemeet.metered.live:443",
      username: TURN_USERNAME,
      credential: TURN_CREDENTIAL,
    },
    {
      urls: "turns:realtimemeet.metered.live:443?transport=tcp",
      username: TURN_USERNAME,
      credential: TURN_CREDENTIAL,
    },
  ],
};

export function createPeerConnection() {
  return new RTCPeerConnection(ICE_SERVERS);
}
