// App ID for Firestore collections
export const APP_ID = import.meta.env.VITE_APP_ID || 'bumi-adipura-8ed0a';

import defaultEventImage from '../assets/defualt-image-events.png';

// Assets
export const LOGO_URL = "https://lh3.googleusercontent.com/d/1oPheVvQCJmnBBxqfBp1Ev9iHfebaOSvb";
export const DEFAULT_EVENT_IMAGE = defaultEventImage;

// Gemini API Configuration
export const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || "";
export const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent";
