// const DEFAULT_BACKEND_URL = "https://scaler-chatbot-ragner.onrender.com";
const DEFAULT_BACKEND_URL = "http://localhost:8000";

export const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || DEFAULT_BACKEND_URL;
export const API_BASE = `${BACKEND_URL}/api/v1`;
