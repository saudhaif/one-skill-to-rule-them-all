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

// Enable after deploying the lacesAi function (see SETUP.md).
export const aiEnabled = false;
