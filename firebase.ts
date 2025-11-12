import {getApp, getApps, initializeApp} from "firebase/app"
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage"; 

const firebaseConfig = {
    apiKey: "AIzaSyB2Bprw2PtTi0hwkzOiMUenKv8AB0PfeT4",
    authDomain: "chat-with-pdf-challenge-211b3.firebaseapp.com",
    projectId: "chat-with-pdf-challenge-211b3",
    storageBucket: "chat-with-pdf-challenge-211b3.appspot.com",
    messagingSenderId: "178643264049",
    appId: "1:178643264049:web:6fe2dfaaa4b59cb5722b10",
    measurementId: "G-63PY10CGNP"
  };

const app = getApps().length ===0 ? initializeApp(firebaseConfig) : getApp()

const db = getFirestore(app)
const storage = getStorage(app)

export {db, storage}