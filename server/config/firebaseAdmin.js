const fs = require("fs");
const path = require("path");
const { initializeApp, cert, getApps } = require("firebase-admin/app");

// Local development: if the gitignored service-account JSON file exists on
// disk, use it directly — zero setup beyond dropping the file in place.
//
// Production (Railway/etc): the JSON file is never present (it's
// gitignored on purpose — it's a private key), so credentials are built
// from three separate environment variables instead:
//   FIREBASE_PROJECT_ID
//   FIREBASE_CLIENT_EMAIL
//   FIREBASE_PRIVATE_KEY
const SERVICE_ACCOUNT_PATH = path.join(__dirname, "firebase-service-account.json");

function loadServiceAccount() {
  if (fs.existsSync(SERVICE_ACCOUNT_PATH)) {
    return require(SERVICE_ACCOUNT_PATH);
  }

  const { FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY } = process.env;

  const missing = ["FIREBASE_PROJECT_ID", "FIREBASE_CLIENT_EMAIL", "FIREBASE_PRIVATE_KEY"].filter(
    (key) => !process.env[key]
  );

  if (missing.length > 0) {
    throw new Error(
      `Firebase Admin init failed: no ${SERVICE_ACCOUNT_PATH.split("/").pop()} found and ` +
        `missing required environment variable(s): ${missing.join(", ")}. ` +
        "Set these in your deployment environment (e.g. Railway) or provide the service-account " +
        "JSON file locally."
    );
  }

  return {
    projectId: FIREBASE_PROJECT_ID,
    clientEmail: FIREBASE_CLIENT_EMAIL,
    // Env vars can't hold real newlines, so private keys are stored with
    // literal "\n" sequences and need converting back to actual newlines.
    privateKey: FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
  };
}

if (!getApps().length) {
  const serviceAccount = loadServiceAccount();
  initializeApp({
    credential: cert(serviceAccount),
  });
}
