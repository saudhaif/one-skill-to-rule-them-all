// Runs the Laces It page outside Claude: sign-in with Google (and UAE PASS when
// configured), Firestore for rides, sign-ups and listings, Storage for photos.
// It serves the same small `claude.use(name)` surface the page was written for,
// so the page code stays the same as the Claude-hosted version.
import { firebaseConfig, uaePass, sdk, emulators } from "./firebase-config.js";

const TXT = {
  ar: { title: "سجّل دخولك", sub: "طلعات السياكل والجري وسوق العدّة في الإمارات.", google: "المتابعة بحساب Google", uae: "الدخول بـ UAE PASS", soon: "قريباً", out: "خروج",
    noCfg: "التطبيق ما انربط بـ Firebase للحين. عبّ ملف firebase-config.js (شوف SETUP.md).", fail: "ما تم تسجيل الدخول، جرّب مرة ثانية.", blocked: "المتصفح منع نافذة الدخول، جاري التحويل…" },
  en: { title: "Sign in", sub: "Cycling and running rides and a gear market in the UAE.", google: "Continue with Google", uae: "Sign in with UAE PASS", soon: "Coming soon", out: "Sign out",
    noCfg: "The app isn't connected to Firebase yet. Fill in firebase-config.js (see SETUP.md).", fail: "Sign-in didn't complete. Try again.", blocked: "The browser blocked the sign-in window, redirecting…" },
  fil: { title: "Mag-sign in", sub: "Mga ride ng bisikleta at takbo, at market ng gamit sa UAE.", google: "Magpatuloy gamit ang Google", uae: "Mag-sign in gamit ang UAE PASS", soon: "Malapit na", out: "Mag-sign out",
    noCfg: "Hindi pa nakakonekta ang app sa Firebase. Punan ang firebase-config.js (tingnan ang SETUP.md).", fail: "Hindi natapos ang sign-in. Subukan ulit.", blocked: "Na-block ang sign-in window, nire-redirect…" },
  hi: { title: "साइन इन करें", sub: "UAE में साइकिलिंग और रनिंग राइड्स और सामान का मार्केट।", google: "Google से जारी रखें", uae: "UAE PASS से साइन इन करें", soon: "जल्द आ रहा है", out: "साइन आउट",
    noCfg: "ऐप अभी Firebase से जुड़ा नहीं है। firebase-config.js भरें (SETUP.md देखें)।", fail: "साइन इन पूरा नहीं हुआ। फिर कोशिश करें।", blocked: "ब्राउज़र ने साइन-इन विंडो रोकी, रीडायरेक्ट हो रहा है…" }
};
const lang = () => { try { return TXT[localStorage.getItem("yc-lang")] ? localStorage.getItem("yc-lang") : "ar"; } catch { return "ar"; } };
const tx = (k) => TXT[lang()][k];

// ---------- Sign-in screen ----------
const gate = document.createElement("div");
gate.id = "gate";
gate.innerHTML = `
  <div class="gate-card" role="dialog" aria-modal="true" aria-labelledby="gateTitle">
    <p class="gate-logo">Laces <span>It</span></p>
    <h2 id="gateTitle"></h2>
    <p class="gate-sub"></p>
    <button type="button" class="gate-btn google" id="gGoogle">
      <svg viewBox="0 0 48 48" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.6l6.7-6.7C35.6 2.4 30.2 0 24 0 14.6 0 6.6 5.4 2.6 13.3l7.8 6C12.3 13.6 17.7 9.5 24 9.5z"/><path fill="#4285F4" d="M46.1 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.4c-.5 2.9-2.2 5.3-4.6 6.9l7.4 5.7c4.3-4 6.9-9.9 6.9-17.1z"/><path fill="#FBBC05" d="M10.4 28.7c-.5-1.4-.8-3-.8-4.7s.3-3.3.8-4.7l-7.8-6C1 16.6 0 20.2 0 24s1 7.4 2.6 10.7l7.8-6z"/><path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.4-5.7c-2.1 1.4-4.8 2.3-8.5 2.3-6.3 0-11.7-4.1-13.6-9.8l-7.8 6C6.6 42.6 14.6 48 24 48z"/></svg>
      <span></span>
    </button>
    <button type="button" class="gate-btn uae" id="gUae"><span></span><small></small></button>
    <p class="gate-err" id="gErr" role="alert"></p>
  </div>`;
const css = document.createElement("style");
css.textContent = `
  #gate { position: fixed; inset: 0; z-index: 50; display: grid; place-items: center; padding: 16px; background: var(--bg); }
  #gate[hidden] { display: none !important; }
  .gate-card { width: 100%; max-width: 400px; background: var(--card); border-radius: 26px; padding: 28px 22px; display: grid; gap: 12px; text-align: center; }
  .gate-logo { margin: 0 0 6px; font: 800 30px/1 var(--logo); letter-spacing: -.03em; }
  .gate-logo span { color: var(--accent-text); }
  .gate-card h2 { margin: 0; font: 700 20px var(--font); }
  .gate-sub { margin: 0 0 8px; color: var(--muted); font-size: 14px; }
  .gate-btn { display: flex; align-items: center; justify-content: center; gap: 10px; min-height: 52px; border-radius: 16px; font: 700 15px var(--font); cursor: pointer; }
  .gate-btn svg { width: 22px; height: 22px; }
  .gate-btn.google { background: var(--card); color: var(--ink); border: 1px solid var(--field); }
  .gate-btn.uae { background: #00843d; color: #fff; border: 0; }
  .gate-btn small { font-size: 12px; font-weight: 600; opacity: .85; }
  .gate-btn:disabled { opacity: .55; cursor: default; }
  .gate-err { margin: 0; min-height: 1.2em; color: var(--danger); font-size: 13px; }
  .signout { border: 1px solid var(--band-field); background: transparent; color: var(--band-ink); border-radius: 999px; min-height: 44px; padding: 6px 14px; font: 600 13px var(--font); cursor: pointer; }
  .appbar .bar-end { display: flex; gap: 8px; align-items: center; }`;
document.head.appendChild(css);
document.body.appendChild(gate);

function paintGate() {
  const L = lang(), dir = L === "ar" ? "rtl" : "ltr";
  gate.dir = dir; gate.lang = L;
  gate.querySelector("#gateTitle").textContent = tx("title");
  gate.querySelector(".gate-sub").textContent = tx("sub");
  gate.querySelector("#gGoogle span").textContent = tx("google");
  gate.querySelector("#gUae span").textContent = tx("uae");
  gate.querySelector("#gUae small").textContent = uaePass.enabled ? "" : "· " + tx("soon");
  gate.querySelector("#gUae").disabled = !uaePass.enabled;
}
paintGate();
document.addEventListener("change", (e) => { if (e.target.id === "langSel") setTimeout(() => { paintGate(); paintOut(); }, 0); });
const err = (m) => { gate.querySelector("#gErr").textContent = m || ""; };

const configured = firebaseConfig.apiKey && firebaseConfig.projectId;
if (!configured) {
  err(tx("noCfg"));
  gate.querySelectorAll("button").forEach((b) => { b.disabled = true; });
} else {
  // Buttons wait for the SDK so a quick tap is never lost.
  gate.querySelector("#gGoogle").disabled = true;
  start().catch((e) => { console.error(e); err(tx("fail")); });
}

async function start() {
  const [{ initializeApp }, A, F, S] = await Promise.all([
    import(sdk + "/firebase-app.js"), import(sdk + "/firebase-auth.js"),
    import(sdk + "/firebase-firestore.js"), import(sdk + "/firebase-storage.js")
  ]);
  const app = initializeApp(firebaseConfig);
  const auth = A.getAuth(app), fs = F.getFirestore(app), st = S.getStorage(app);
  if (emulators) {
    A.connectAuthEmulator(auth, "http://localhost:9099", { disableWarnings: true });
    F.connectFirestoreEmulator(fs, "localhost", 8080);
    S.connectStorageEmulator(st, "localhost", 9199);
    // Emulator only: sign in as a fake Google user without the Google popup.
    window.__lacesEmuSignIn = (name = "Test Rider") => A.signInWithCredential(auth,
      A.GoogleAuthProvider.credential(JSON.stringify({ sub: "emu-" + name, email: name.replace(/\W/g, "") + "@example.com", name })));
  }
  A.getRedirectResult(auth).catch((e) => err(tx("fail") + " (" + e.code + ")"));

  async function signIn(provider) {
    err("");
    try { await A.signInWithPopup(auth, provider); }
    catch (e) {
      if (e.code === "auth/popup-blocked" || e.code === "auth/operation-not-supported-in-this-environment") { err(tx("blocked")); await A.signInWithRedirect(auth, provider); }
      else if (e.code !== "auth/popup-closed-by-user" && e.code !== "auth/cancelled-popup-request") err(tx("fail") + " (" + e.code + ")");
    }
  }
  gate.querySelector("#gGoogle").addEventListener("click", () => signIn(new A.GoogleAuthProvider()));
  gate.querySelector("#gGoogle").disabled = false;
  gate.querySelector("#gUae").addEventListener("click", () => {
    if (!uaePass.enabled) return;
    const p = new A.OAuthProvider(uaePass.providerId);
    for (const s of uaePass.scopes || []) p.addScope(s);
    signIn(p);
  });

  let ready = false;
  A.onAuthStateChanged(auth, async (u) => {
    if (!u) { if (ready) location.reload(); gate.hidden = false; return; }
    gate.hidden = true;
    if (ready) return;
    ready = true;
    // Profiles let other members see a name and photo next to sign-ups.
    F.setDoc(F.doc(fs, "profiles/" + u.uid), { name: u.displayName || "", photo: u.photoURL || "", updatedAt: new Date().toISOString() }, { merge: true }).catch(() => {});
    addSignOut(() => A.signOut(auth));
    window.__lacesResolve(api(u, F, fs, S, st));
  });
}

let outBtn = null;
function addSignOut(fn) {
  const bar = document.querySelector(".appbar"), sel = document.querySelector("#langSel");
  if (!bar || !sel) return;
  const wrap = document.createElement("div"); wrap.className = "bar-end";
  outBtn = document.createElement("button"); outBtn.type = "button"; outBtn.className = "signout";
  outBtn.addEventListener("click", fn);
  sel.replaceWith(wrap); wrap.append(sel, outBtn);
  paintOut();
}
function paintOut() { if (outBtn) outBtn.textContent = tx("out"); }

// ---------- claude.use(...) surface over Firebase ----------
function api(u, F, fs, S, st) {
  const code = (e) => {
    const c = String(e?.code || "");
    if (c.includes("permission-denied") || c.includes("unauthorized")) return "invalid_argument";
    if (c.includes("resource-exhausted") || c.includes("quota")) return "quota_exceeded";
    if (c.includes("invalid-argument")) return "invalid_argument";
    return "unavailable";
  };
  const fail = (e) => { throw { code: code(e), message: String(e?.message || e) }; };
  const wrapDoc = (d) => ({ id: d.id, exists: d.exists(), data: () => d.data(), metadata: d.metadata });
  const wrapQuery = (s) => ({ docs: s.docs.map(wrapDoc), size: s.size, empty: s.empty, metadata: s.metadata, docChanges: () => s.docChanges().map((c) => ({ type: c.type, doc: wrapDoc(c.doc), oldIndex: c.oldIndex, newIndex: c.newIndex })) });

  function docRef(path) {
    const r = F.doc(fs, path);
    return {
      id: r.id, path,
      get: () => F.getDoc(r).then(wrapDoc, fail),
      set: (data) => F.setDoc(r, data).catch(fail),
      // Merges nested maps, as the Claude store's update does.
      update: (data) => F.setDoc(r, data, { merge: true }).catch(fail),
      delete: () => F.deleteDoc(r).catch(fail),
      onSnapshot: (next, onErr) => F.onSnapshot(r, (s) => next(wrapDoc(s)), (e) => onErr?.({ code: code(e), message: e.message })),
      collection: (sub) => collection(path + "/" + sub)
    };
  }
  function query(base, cons) {
    return {
      where: (f, op, v) => query(base, [...cons, F.where(f, op, v)]),
      orderBy: (f, dir) => query(base, [...cons, F.orderBy(f, dir || "asc")]),
      limit: (n) => query(base, [...cons, F.limit(n)]),
      get: () => F.getDocs(F.query(base, ...cons)).then(wrapQuery, fail),
      onSnapshot: (next, onErr) => F.onSnapshot(F.query(base, ...cons), (s) => next(wrapQuery(s)), (e) => onErr?.({ code: code(e), message: e.message }))
    };
  }
  function collection(path) {
    const col = F.collection(fs, path);
    return {
      ...query(col, []), path,
      doc: (id) => docRef(id ? path + "/" + id : F.doc(col).path),
      add: (data) => F.addDoc(col, data).then((r) => docRef(r.path), fail)
    };
  }
  const db = { doc: docRef, collection };

  const cache = {};
  const initials = (name, uid) => {
    const ch = (name || "?").trim().charAt(0).toUpperCase() || "?";
    const hue = [...uid].reduce((a, c) => a + c.charCodeAt(0), 0) % 360;
    return "data:image/svg+xml," + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40"><rect width="40" height="40" fill="hsl(${hue} 55% 45%)"/><text x="20" y="26" font-size="18" font-family="sans-serif" fill="#fff" text-anchor="middle">${ch.replace(/[<&>]/g, "")}</text></svg>`);
  };
  const user = {
    id: async () => u.uid,
    isOwner: async () => false,
    canEdit: async () => false,
    can: async (name) => name === "data.write",
    me: async () => ({ id: u.uid, name: u.displayName || "", avatarUrl: u.photoURL || initials(u.displayName, u.uid), color: "#888", email: u.email, isOwner: false, canEdit: false }),
    name: async () => u.displayName || "",
    profiles: async (ids) => {
      const list = [...new Set(typeof ids === "string" ? [ids] : ids)];
      await Promise.all(list.filter((id) => !cache[id]).map(async (id) => {
        let p = {};
        try { const d = await F.getDoc(F.doc(fs, "profiles/" + id)); p = d.exists() ? d.data() : {}; } catch {}
        cache[id] = { id, name: p.name || "", avatarUrl: p.photo || initials(p.name, id), color: "#888", email: null, isMe: id === u.uid, guest: false };
      }));
      return Object.fromEntries(list.map((id) => [id, cache[id]]));
    },
    search: async () => []
  };

  // Photos live under photos/<uid>/; the stored id is the download URL.
  const assets = {
    upload: async (blob, opts = {}) => {
      const type = opts.type || blob.type || "image/jpeg";
      const ext = { "image/png": "png", "image/webp": "webp", "image/gif": "gif" }[type] || "jpg";
      const r = S.ref(st, `photos/${u.uid}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`);
      try {
        const res = await S.uploadBytes(r, blob, { contentType: type });
        const url = await S.getDownloadURL(r);
        return { id: url, url, sizeBytes: res.metadata.size, contentType: type };
      } catch (e) {
        const c = String(e?.code || "");
        throw { code: c.includes("unauthorized") ? "not_granted" : c.includes("quota") ? "quota_or_state" : "upstream_error", message: String(e?.message || e) };
      }
    },
    delete: async (ref) => { try { await S.deleteObject(S.ref(st, ref)); return { deleted: true }; } catch { return { deleted: false }; } },
    list: async () => ({ assets: [], usage: { files: 0, bytes: 0, maxFiles: 0, maxBytes: 0 } })
  };

  // The page offers live location sharing only where this is set.
  // Saving a generated file (the ride poster) as a normal browser download.
  const downloads = {
    save: async ({ filename, data }) => {
      const url = URL.createObjectURL(data instanceof Blob ? data : new Blob([data]));
      const a = document.createElement("a"); a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10000);
      return { status: "saved" };
    }
  };
  return { db, user, assets, sample: null, downloads, geo: !!navigator.geolocation };
}
