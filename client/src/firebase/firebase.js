import { initializeApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
} from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyAMzX-yFrQ3XR_s_lfpkCDvY-EfKanf4Ug",
  authDomain: "realtimemeet-c8e0d.firebaseapp.com",
  projectId: "realtimemeet-c8e0d",
  storageBucket: "realtimemeet-c8e0d.firebasestorage.app",
  messagingSenderId: "457179910474",
  appId: "1:457179910474:web:1ac3c1404690a53601b1b3",
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);

export const googleProvider =
  new GoogleAuthProvider();