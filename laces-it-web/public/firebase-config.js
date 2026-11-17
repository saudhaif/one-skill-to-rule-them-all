// Paste the web app config from Firebase console → Project settings → Your apps.
export const firebaseConfig = {
  apiKey: "",
  authDomain: "",
  projectId: "",
  storageBucket: "",
  appId: ""
};

// UAE PASS signs in through Firebase Identity Platform as an OpenID Connect
// provider. Turn it on once the provider is added in the console (SETUP.md).
export const uaePass = {
  enabled: false,
  providerId: "oidc.uaepass",
  scopes: ["openid"]
};

// Firebase JS SDK, loaded from Google's CDN.
export const sdk = "https://www.gstatic.com/firebasejs/10.12.2";

// Local testing against the Firebase emulators (firebase emulators:start).
export const emulators = location.hostname === "localhost" && new URLSearchParams(location.search).has("emu");

// Voice rooms connect members directly (WebRTC). STUN finds each phone's public address;
// add a TURN server here (for example from Cloudflare Calls or Metered) so members on
// strict mobile networks can still hear each other.
export const iceServers = [
  { urls: "stun:stun.l.google.com:19302" }
];

// Google Maps key (Maps JavaScript API + Maps Static API) for the meeting-points map in satellite view.
// Google Cloud console → APIs & Services → Credentials → Create API key, and limit it to this site's address
// (HTTP referrers). Empty = the map uses Esri satellite imagery instead.
export const googleMapsKey = "";

// Earning: payment links (e.g. Stripe Payment Links, Telr or Network International pay-by-link) for Laces It Pro
// and featured listings, and a WhatsApp number members can message to subscribe. Leave empty to hide them.
// After a payment arrives, an admin switches the plan on in the app (Me → Revenue panel).
export const payments = {
  proMonthly: "",   // link for AED 14.99 / month
  proYearly: "",    // link for AED 119 / year
  featured: "",     // link for a featured listing, AED 10 for 7 days
  whatsapp: ""      // e.g. "9715XXXXXXXX"
};
