const { initializeApp, cert, getApps } = require("firebase-admin/app");

// On Render/Railway/etc the service-account JSON isn't in the repo (it's
// gitignored on purpose — it's a private key). Paste the whole JSON file's
// contents into the FIREBASE_SERVICE_ACCOUNT env var there instead.
// Locally, drop the actual file at ./firebase-service-account.json and
// leave the env var unset — that keeps working with zero setup.
let serviceAccount;

if (process.env.FIREBASE_SERVICE_ACCOUNT) {
  serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
} else {
  serviceAccount = require("./firebase-service-account.json");
}

if (!getApps().length) {
  initializeApp({
    credential: cert(serviceAccount),
  });
}