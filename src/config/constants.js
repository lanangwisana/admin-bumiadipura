// App ID for Firestore collections
export const APP_ID = typeof __app_id !== 'undefined' ? __app_id : 'bumi-adipura-8ed0a';

import defaultEventImage from '../assets/defualt-image-events.png';

// Assets
export const LOGO_URL = "https://lh3.googleusercontent.com/d/1oPheVvQCJmnBBxqfBp1Ev9iHfebaOSvb";
export const DEFAULT_EVENT_IMAGE = defaultEventImage;

// Gemini API Configuration
export const GEMINI_API_KEY = ""; // Add your API key here or use environment variable
export const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent";
