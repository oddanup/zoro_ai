// =====================================================================
// Zoro AI login screen (Google, Facebook, or guest)
// Load this BEFORE script.js:
//   <script src="./login.js"></script>
//   <script src="./script.js"></script>
// =====================================================================
(function () {
  // ---------- PUT YOUR KEYS HERE (the only place you need them) ----------
  //  Google:   OAuth "Web" Client ID from console.cloud.google.com
  //  Facebook: App ID from developers.facebook.com
  // Never put a client secret or app secret in this file.
  const GOOGLE_CLIENT_ID = "";
  const FACEBOOK_APP_ID = "";
  // ------------------------------------------------------------------------

  // script.js reads the keys from here, so you only fill them in once
  window.ZORO_CONFIG = { GOOGLE_CLIENT_ID, FACEBOOK_APP_ID };

  // Lines shown under the title (they rotate)
  const SLOGANS = [
    "Think faster. Learn deeper. Build anything.",
    "Your personal AI, one question away.",
    "Ask anything. Create everything.",
    "Smarter answers, right when you need them.",
  ];

  function load(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  }

  function store(key, value) {
    try {
      localStorage.setItem(
        key,
        typeof value === "string" ? value : JSON.stringify(value),
      );
    } catch (error) {
      console.error("Could not save:", error);
    }
  }

  // Already signed in, or already chose guest: no login screen needed
  let isGuest = false;
  try {
    isGuest = localStorage.getItem("zoro-guest") === "1";
  } catch {}
  if (load("zoro-auth", null) || isGuest) return;

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = src;
      script.async = true;
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  // Google sends a signed token; we only read the name, email and picture from it
  function decodeJwt(token) {
    const payload = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    const json = decodeURIComponent(
      atob(payload)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join(""),
    );
    return JSON.parse(json);
  }

  // ---------- animated background + card styles ----------
  function addStyles() {
    if (document.getElementById("login-styles")) return;

    const style = document.createElement("style");
    style.id = "login-styles";
    style.textContent = `
      #login-screen { background: var(--c-bg); }

      .zl-bg { position: absolute; inset: 0; overflow: hidden; pointer-events: none; }

      /* soft glowing color blobs that drift around */
      .zl-blob { position: absolute; border-radius: 9999px; filter: blur(90px); opacity: .45; will-change: transform; }
      .zl-blob.a { width: 46vmax; height: 46vmax; left: -14vmax; top: -16vmax;
        background: var(--c-accent); animation: zl-drift-a 18s ease-in-out infinite alternate; }
      .zl-blob.b { width: 40vmax; height: 40vmax; right: -12vmax; bottom: -14vmax;
        background: color-mix(in srgb, var(--c-accent) 55%, #3b82f6); animation: zl-drift-b 22s ease-in-out infinite alternate; }
      .zl-blob.c { width: 28vmax; height: 28vmax; left: 38%; top: 42%; opacity: .28;
        background: color-mix(in srgb, var(--c-accent) 55%, #ec4899); animation: zl-drift-c 26s ease-in-out infinite alternate; }
      :root[data-theme="light"] .zl-blob { opacity: .3; }
      :root[data-theme="light"] .zl-blob.c { opacity: .2; }

      /* faint moving grid that fades out toward the edges */
      .zl-grid { position: absolute; inset: 0; opacity: .35;
        background-image: linear-gradient(var(--c-border) 1px, transparent 1px),
                          linear-gradient(90deg, var(--c-border) 1px, transparent 1px);
        background-size: 56px 56px;
        -webkit-mask-image: radial-gradient(ellipse at center, #000 15%, transparent 72%);
        mask-image: radial-gradient(ellipse at center, #000 15%, transparent 72%);
        animation: zl-grid-move 30s linear infinite; }

      /* tiny lights floating upward */
      .zl-dot { position: absolute; bottom: -12px; border-radius: 9999px; opacity: 0;
        background: var(--c-accent-text); box-shadow: 0 0 10px var(--c-accent);
        animation: zl-rise linear infinite; }

      /* the card */
      .zl-card { position: relative; z-index: 1;
        background: color-mix(in srgb, var(--c-surface) 72%, transparent);
        -webkit-backdrop-filter: blur(18px); backdrop-filter: blur(18px);
        animation: zl-in .8s cubic-bezier(.2,.8,.2,1) both; }
      .zl-fade { animation: zl-in .7s cubic-bezier(.2,.8,.2,1) both; }

      .zl-logo { position: relative; isolation: isolate; }
      .zl-logo::before { content: ""; position: absolute; inset: -10px; z-index: -1; border-radius: 26px;
        background: var(--c-accent); filter: blur(20px); opacity: .5;
        animation: zl-pulse 3s ease-in-out infinite; }

      .zl-title { background: linear-gradient(90deg, var(--c-text) 0%, var(--c-accent-text) 50%, var(--c-text) 100%);
        background-size: 200% auto; -webkit-background-clip: text; background-clip: text;
        -webkit-text-fill-color: transparent; color: transparent;
        animation: zl-shine 6s linear infinite; }

      .zl-slogan { min-height: 1.5rem; transition: opacity .4s ease, transform .4s ease; }

      @keyframes zl-in { from { opacity: 0; transform: translateY(24px) scale(.97); } to { opacity: 1; transform: none; } }
      @keyframes zl-pulse { 0%, 100% { opacity: .35; transform: scale(.95); } 50% { opacity: .7; transform: scale(1.08); } }
      @keyframes zl-shine { to { background-position: 200% center; } }
      @keyframes zl-grid-move { to { background-position: 56px 56px; } }
      @keyframes zl-rise {
        0% { transform: translateY(0) scale(.6); opacity: 0; }
        10% { opacity: .85; }
        90% { opacity: .6; }
        100% { transform: translateY(-110vh) scale(1.1); opacity: 0; }
      }
      @keyframes zl-drift-a { to { transform: translate(14vmax, 10vmax) scale(1.15); } }
      @keyframes zl-drift-b { to { transform: translate(-12vmax, -9vmax) scale(1.1); } }
      @keyframes zl-drift-c { to { transform: translate(-14vmax, 8vmax) scale(1.3); } }

      @media (prefers-reduced-motion: reduce) {
        .zl-blob, .zl-grid, .zl-card, .zl-fade, .zl-logo::before, .zl-title { animation: none !important; }
        .zl-dot { display: none; }
      }
    `;
    document.head.appendChild(style);
  }

  function buildScreen() {
    addStyles();

    const overlay = document.createElement("div");
    overlay.id = "login-screen";
    overlay.className =
      "fixed inset-0 z-[200] flex items-center justify-center overflow-y-auto p-6";

    // static markup only (no user data goes in here)
    overlay.innerHTML = `
      <div class="zl-bg" aria-hidden="true">
        <div class="zl-blob a"></div>
        <div class="zl-blob b"></div>
        <div class="zl-blob c"></div>
        <div class="zl-grid"></div>
      </div>

      <div class="zl-card w-full max-w-md rounded-3xl border border-[color:var(--c-border)] p-8 text-center shadow-2xl shadow-black/30 sm:p-10">
        <div class="zl-logo zl-fade mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-[color:var(--c-border-strong)] bg-[color:var(--c-raised)] text-3xl text-[color:var(--c-accent)]" style="animation-delay:.1s">乙</div>

        <h1 class="zl-title zl-fade mt-6 text-3xl font-bold sm:text-4xl" style="animation-delay:.2s">Welcome to Zoro AI</h1>

        <p id="login-slogan" class="zl-slogan zl-fade mt-3 text-base text-[color:var(--c-muted)]" style="animation-delay:.3s">${SLOGANS[0]}</p>

        <p class="zl-fade mt-8 text-xs font-medium uppercase tracking-widest text-[color:var(--c-faint)]" style="animation-delay:.4s">Sign in to continue</p>

        <div class="zl-fade mt-4 space-y-3" style="animation-delay:.45s">
          <div id="login-google-slot" class="flex justify-center">
            <button id="login-google" type="button"
              class="flex w-full items-center justify-center gap-3 rounded-xl border border-[color:var(--c-border)] bg-[color:var(--c-panel)] px-4 py-3 text-sm font-medium transition-all duration-200 hover:-translate-y-0.5 hover:border-[color:var(--c-accent)]/60">
              <svg class="h-5 w-5" viewBox="0 0 48 48">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
              </svg>
              Continue with Google
            </button>
          </div>

          <button id="login-facebook" type="button"
            class="flex w-full items-center justify-center gap-3 rounded-xl border border-[color:var(--c-border)] bg-[color:var(--c-panel)] px-4 py-3 text-sm font-medium transition-all duration-200 hover:-translate-y-0.5 hover:border-[color:var(--c-accent)]/60">
            <svg class="h-5 w-5" viewBox="0 0 24 24" fill="#1877F2">
              <path d="M24 12.07C24 5.4 18.63 0 12 0S0 5.4 0 12.07C0 18.1 4.39 23.1 10.13 24v-8.44H7.08v-3.49h3.05V9.41c0-3.02 1.79-4.7 4.53-4.7 1.31 0 2.68.24 2.68.24v2.97h-1.51c-1.49 0-1.96.93-1.96 1.89v2.26h3.33l-.53 3.49h-2.8V24C19.61 23.1 24 18.1 24 12.07z"/>
            </svg>
            Continue with Facebook
          </button>
        </div>

        <div class="zl-fade my-6 flex items-center gap-3 text-xs text-[color:var(--c-faint)]" style="animation-delay:.55s">
          <span class="h-px flex-1 bg-[color:var(--c-border)]"></span>
          or
          <span class="h-px flex-1 bg-[color:var(--c-border)]"></span>
        </div>

        <button id="login-guest" type="button"
          class="zl-fade w-full rounded-xl px-4 py-3 text-sm text-[color:var(--c-muted)] transition-colors hover:bg-[color:var(--c-raised)] hover:text-[color:var(--c-text)]" style="animation-delay:.6s">
          Continue as guest
        </button>

        <p id="login-status" class="mt-4 min-h-5 text-sm text-[color:var(--c-muted)]"></p>
      </div>`;

    // floating lights (random size, position and speed)
    const bg = overlay.querySelector(".zl-bg");
    for (let i = 0; i < 26; i++) {
      const dot = document.createElement("span");
      const size = 2 + Math.random() * 4;
      dot.className = "zl-dot";
      dot.style.cssText =
        `left:${Math.random() * 100}%;width:${size}px;height:${size}px;` +
        `animation-duration:${10 + Math.random() * 14}s;` +
        `animation-delay:-${(Math.random() * 20).toFixed(1)}s`;
      bg.appendChild(dot);
    }

    document.body.appendChild(overlay);

    // the slogan slowly changes (skipped if you prefer reduced motion)
    const sloganEl = overlay.querySelector("#login-slogan");
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    if (!reduceMotion) {
      let sloganIndex = 0;
      const timer = setInterval(() => {
        if (!overlay.isConnected) {
          clearInterval(timer);
          return;
        }
        sloganEl.style.opacity = "0";
        sloganEl.style.transform = "translateY(6px)";
        setTimeout(() => {
          sloganIndex = (sloganIndex + 1) % SLOGANS.length;
          sloganEl.textContent = SLOGANS[sloganIndex];
          sloganEl.style.opacity = "1";
          sloganEl.style.transform = "none";
        }, 400);
      }, 3800);
    }

    const status = overlay.querySelector("#login-status");
    const googleBtn = overlay.querySelector("#login-google");
    const googleSlot = overlay.querySelector("#login-google-slot");
    const facebookBtn = overlay.querySelector("#login-facebook");
    const guestBtn = overlay.querySelector("#login-guest");

    // Save the account, then reload so the whole app starts signed in
    function finish(provider, data) {
      store("zoro-auth", {
        provider,
        name: data.name || "",
        email: data.email || "",
        picture: data.picture || "",
      });

      const profile = load("zoro-profile", {}) || {};
      store("zoro-profile", {
        ...profile,
        name: data.name || profile.name || "Anup",
        email: data.email || profile.email || "",
      });

      location.reload();
    }

    // ----- guest -----
    guestBtn.addEventListener("click", () => {
      store("zoro-guest", "1");
      overlay.remove();
    });

    // ----- Google -----
    googleBtn.addEventListener("click", () => {
      status.textContent =
        "Google sign-in isn't set up yet. Add your GOOGLE_CLIENT_ID in login.js, or continue as guest.";
    });

    if (GOOGLE_CLIENT_ID) {
      loadScript("https://accounts.google.com/gsi/client")
        .then(() => {
          google.accounts.id.initialize({
            client_id: GOOGLE_CLIENT_ID,
            callback: (response) => {
              try {
                const user = decodeJwt(response.credential);
                finish("Google", {
                  name: user.name,
                  email: user.email,
                  picture: user.picture,
                });
              } catch (error) {
                console.error("Google sign-in error:", error);
                status.textContent = "Google sign-in failed. Please try again.";
              }
            },
          });
          googleBtn.classList.add("hidden");
          google.accounts.id.renderButton(googleSlot, {
            theme:
              document.documentElement.dataset.theme === "light"
                ? "outline"
                : "filled_black",
            size: "large",
            text: "continue_with",
            shape: "rectangular",
            width: 300,
          });
        })
        .catch(() => {
          status.textContent =
            "Could not load Google sign-in. Check your internet connection.";
        });
    }

    // ----- Facebook -----
    let facebookReady = false;

    if (FACEBOOK_APP_ID) {
      // load early so the login popup can open straight from the click
      loadScript("https://connect.facebook.net/en_US/sdk.js")
        .then(() => {
          FB.init({
            appId: FACEBOOK_APP_ID,
            cookie: true,
            xfbml: false,
            version: "v23.0",
          });
          facebookReady = true;
        })
        .catch(() => {
          status.textContent =
            "Could not load Facebook sign-in. Check your internet connection.";
        });
    }

    facebookBtn.addEventListener("click", () => {
      if (!FACEBOOK_APP_ID) {
        status.textContent =
          "Facebook sign-in isn't set up yet. Add your FACEBOOK_APP_ID in login.js, or continue as guest.";
        return;
      }
      if (!facebookReady) {
        status.textContent =
          "Facebook is still loading. Try again in a moment.";
        return;
      }

      FB.login(
        (response) => {
          if (!response.authResponse) {
            status.textContent = "Facebook sign-in was cancelled.";
            return;
          }
          FB.api("/me", { fields: "name,email,picture.width(200)" }, (user) => {
            finish("Facebook", {
              name: user.name,
              email: user.email,
              picture:
                user.picture && user.picture.data && user.picture.data.url,
            });
          });
        },
        { scope: "public_profile,email" },
      );
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", buildScreen);
  } else {
    buildScreen();
  }
})();
