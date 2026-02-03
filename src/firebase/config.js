import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

// ✅ SECURITY FIX: Firebase configuration moved to environment variables
// Теперь API ключи не хранятся в исходном коде

const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID,
};

// Проверка что все переменные загружены
if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
  console.error('❌ Firebase configuration is incomplete!');
  console.error('Make sure .env file exists and contains all required variables');
  throw new Error('Firebase configuration is missing');
}

// Инициализация Firebase
const app = initializeApp(firebaseConfig);

// Инициализация Firestore
export const db = getFirestore(app);

// Инициализация Auth
export const auth = getAuth(app);

export default app;