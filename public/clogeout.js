// =====================================================================
// Zoro AI logout system (full replacement)
// Keep this AFTER script.js in index.html:
//   <script src="./script.js"></script>
//   <script src="./logout.js"></script>
// (The sign-in screen lives inside index.html. login.js is not needed.)
//
// What it does:
//  - Clicking Log out (sidebar, Profile or Settings) logs you out
//    immediately and shows the sign-in screen (built into index.html). No popup.
//  - Guests can log out too: every Log out button goes back to the sign-in screen.
//  - The Sign in / Google / Facebook buttons on Profile and Settings
//    open the sign-in page too.
// =====================================================================
(function () {
  function isSignedIn() {
    try {
      return !!localStorage.getItem("zoro-auth");
    } catch {
      return false;
    }
  }

  // Log out (or leave guest mode) and go to the sign-in page
  function doLogout() {
    // Tell Google and Facebook to forget this session (only if loaded)
    try {
      if (window.google && google.accounts && google.accounts.id) {
        google.accounts.id.disableAutoSelect();
      }
    } catch (error) {
      console.error("Google logout error:", error);
    }
    try {
      if (window.FB) FB.logout(() => {});
    } catch (error) {
      console.error("Facebook logout error:", error);
    }

    // Clear the account and reset the profile (chats, tasks and notes stay)
    try {
      localStorage.removeItem("zoro-auth");
      localStorage.removeItem("zoro-guest");
      localStorage.setItem(
        "zoro-profile",
        JSON.stringify({ name: "Anup", email: "", location: "", bio: "" }),
      );
    } catch (error) {
      console.error("Logout error:", error);
    }

    // Reload: index.html sees no account and no guest flag, so it shows the sign-in screen
    location.reload();
  }

  // Guests get a Log out button on Profile and Settings too
  const style = document.createElement("style");
  style.textContent =
    "#settings-logout{display:inline-flex !important}" +
    "#settings-go-profile{display:none !important}" +
    "#auth-signed-in{display:block !important}" +
    "#auth-signed-out{display:none !important}";
  document.head.appendChild(style);

  // Let other code call it too: window.zoroLogout()
  window.zoroLogout = doLogout;
  console.log("Zoro: logout.js loaded");

  // One click handler for every logout / sign-in button.
  // It runs first (capture phase), so other click code can't interfere.
  document.addEventListener(
    "click",
    (event) => {
      if (!event.target || !event.target.closest) return;

      const button = event.target.closest(
        "#logout-btn, #settings-logout, #sidebar-logout, #google-btn, #facebook-btn, #settings-go-profile",
      );
      if (!button) return;

      event.preventDefault();
      event.stopImmediatePropagation();
      doLogout();
    },
    true,
  );

  // Sidebar button: use the one in index.html, or create it if missing
  function setupSidebarButton() {
    const sidebar = document.querySelector("aside");
    if (!sidebar) return;

    let button = document.getElementById("sidebar-logout");

    if (!button) {
      button = document.createElement("button");
      button.id = "sidebar-logout";
      button.type = "button";
      button.className =
        "mt-2 flex w-full items-center rounded-xl px-2 py-3 text-left text-[color:var(--c-muted)] transition-colors hover:bg-[color:var(--c-surface)] hover:text-[color:var(--c-danger)]";
      button.innerHTML =
        '<span class="flex h-6 w-6 shrink-0 items-center justify-center text-lg">🚪</span>' +
        '<span id="sidebar-logout-label" class="ml-4 whitespace-nowrap opacity-0 transition-opacity duration-200 group-hover:opacity-100">Log out</span>';

      const settingsLink = sidebar.querySelector('[data-nav="settings"]');
      if (settingsLink && settingsLink.parentElement) {
        settingsLink.parentElement.appendChild(button);
      } else {
        sidebar.appendChild(button);
      }
    }

    // Label always says "Log out" (guests included)
    const label = button.querySelector("#sidebar-logout-label");

    function refreshLabel() {
      if (!label) return;
      label.textContent = "Log out";
      button.title = label.textContent;
    }

    refreshLabel();
    sidebar.addEventListener("mouseenter", refreshLabel);
    button.addEventListener("focus", refreshLabel);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", setupSidebarButton);
  } else {
    setupSidebarButton();
  }
})();
