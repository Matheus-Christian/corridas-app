import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const sanitizeEnv = (val) => {
  if (typeof val !== 'string') return val;
  return val.replace(/^["']|["']$/g, '').trim();
};

const firebaseConfig = {
  apiKey: sanitizeEnv(import.meta.env.VITE_FIREBASE_API_KEY),
  authDomain: sanitizeEnv(import.meta.env.VITE_FIREBASE_AUTH_DOMAIN),
  projectId: sanitizeEnv(import.meta.env.VITE_FIREBASE_PROJECT_ID),
  storageBucket: sanitizeEnv(import.meta.env.VITE_FIREBASE_STORAGE_BUCKET),
  messagingSenderId: sanitizeEnv(import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID),
  appId: sanitizeEnv(import.meta.env.VITE_FIREBASE_APP_ID),
};

// Check if credentials are set and are not placeholders
const isConfigValid = 
  firebaseConfig.apiKey && 
  firebaseConfig.apiKey.toLowerCase() !== 'sua_api_key_aqui' &&
  firebaseConfig.apiKey !== '' &&
  firebaseConfig.projectId &&
  firebaseConfig.projectId.toLowerCase() !== 'seu_project_id_aqui' &&
  firebaseConfig.projectId !== '';

let db = null;
let app = null;

if (isConfigValid) {
  try {
    app = initializeApp(firebaseConfig);
    db = getFirestore(app);
  } catch (e) {
    console.error("Erro ao inicializar o Firebase. Verifique se as credenciais do seu .env são válidas.", e);
  }
} else {
  console.warn("Firebase não configurado ou utilizando credenciais de exemplo. O app salvará apenas no LocalStorage local.");
}

export { db };
