export const CONFIG = {
  brandName: import.meta.env.VITE_BRAND_NAME || "MasalaMunchies",
  FIREBASE_URL: import.meta.env.VITE_FIREBASE_URL,
  hiddenPhone: btoa(import.meta.env.VITE_PHONE_NUMBER),
  firebaseApiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  storageBucket: import.meta.env.VITE_STORAGE_BUCKET,
};