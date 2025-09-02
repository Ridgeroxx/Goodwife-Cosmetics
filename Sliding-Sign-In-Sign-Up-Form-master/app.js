// Panels toggle + deep-link (?mode=signup)
const sign_in_btn = document.querySelector("#sign-in-btn");
const sign_up_btn = document.querySelector("#open-signup-btn"); // <-- changed
const container = document.querySelector(".container");

sign_up_btn?.addEventListener("click", (e) => {
  e.preventDefault();
  container?.classList.add("sign-up-mode");
});
sign_in_btn?.addEventListener("click", (e) => {
  e.preventDefault();
  container?.classList.remove("sign-up-mode");
});

// Open sign-up by URL param
try {
  const params = new URLSearchParams(location.search);
  if (params.get("mode") === "signup") {
    container?.classList.add("sign-up-mode");
  }
} catch {}



// ---------- Simple localStorage auth ----------
const ACCOUNTS_KEY = "gw_accounts";
const CURRENT_KEY  = "gw_current_user";

function getAccounts() {
  try { return JSON.parse(localStorage.getItem(ACCOUNTS_KEY) || "[]"); }
  catch { return []; }
}
function saveAccounts(list) {
  try { localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(list)); } catch {}
}
function setCurrentUser(user) {
  try { localStorage.setItem(CURRENT_KEY, JSON.stringify(user)); } catch {}
}
function getCurrentUser() {
  try { return JSON.parse(localStorage.getItem(CURRENT_KEY) || "null"); }
  catch { return null; }
}

// Helpers
const byId = (id) => document.getElementById(id);
function showAlert(el, msg, type = "error") {
  if (!el) return;
  el.textContent = msg || "";
  el.style.color = type === "error" ? "#c0392b" : "#0f7b0f";
}

// ---------- SIGN UP ----------
const signupForm = document.getElementById("signup-form");
signupForm && signupForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const alertBox = byId("signup-alert");

  const username = (byId("signup-username")?.value || "").trim();
  const email    = (byId("signup-email")?.value || "").trim().toLowerCase();
  const password = (byId("signup-password")?.value || "").trim();

  if (!username || !email || !password) {
    showAlert(alertBox, "Please fill all fields.");
    return;
  }

  const accounts = getAccounts();
  const exists = accounts.some(a =>
    a.username.toLowerCase() === username.toLowerCase() || a.email === email
  );
  if (exists) {
    showAlert(alertBox, "Username or email already exists.");
    return;
  }

  accounts.push({ username, email, password });
  saveAccounts(accounts);

  showAlert(alertBox, "Account created! Please sign in.", "ok");

  // Switch UI to sign-in mode and prefill identifier
  container && container.classList.remove("sign-up-mode");
  const idInput = byId("login-identifier");
  if (idInput) {
    idInput.value = email || username;
    idInput.focus();
  }
});

// ---------- SIGN IN ----------
const signinForm = document.getElementById("signin-form");
signinForm && signinForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const alertBox  = byId("signin-alert");
  const identifier = (byId("login-identifier")?.value || "").trim();
  const password   = (byId("login-password")?.value || "").trim();

  if (!identifier || !password) {
    showAlert(alertBox, "Please enter your username/email and password.");
    return;
  }

  const idLower = identifier.toLowerCase();
  const accounts = getAccounts();
  const match = accounts.find(a =>
    a.email.toLowerCase() === idLower || a.username.toLowerCase() === idLower
  );

  if (!match || match.password !== password) {
    showAlert(alertBox, "Invalid credentials. Please try again.");
    return;
  }

  // Remember user and go back home
  setCurrentUser({ username: match.username, email: match.email });
  showAlert(alertBox, "Welcome back!", "ok");

  // Redirect to site home (login.html is inside Sliding-Sign-In-Sign-Up-Form-master/)
  setTimeout(() => {
    window.location.href = "../index.html";
  }, 250);
});


// REMOVE the old "DOMContentLoaded -> window.location.replace(...)" block

document.addEventListener("DOMContentLoaded", () => {
  const u = getCurrentUser?.();
  if (u && (u.username || u.email)) {
    const note = document.createElement("div");
    note.style.cssText = `
      position: fixed; left: 50%; transform: translateX(-50%);
      top: 12px; z-index: 9999; background: #111; color: #fff;
      padding: 10px 14px; border-radius: 999px; font-size: 14px;
      box-shadow: 0 10px 24px rgba(0,0,0,.18);
    `;
    note.innerHTML = `
      Signed in as <strong>${u.username || u.email}</strong>.
      <button id="go-home" style="margin-left:10px" class="btn">Home</button>
      <button id="logout-here" class="btn">Log out</button>
    `;
    document.body.appendChild(note);
    document.getElementById("go-home").onclick = () => location.href = "../index.html";
    document.getElementById("logout-here").onclick = () => {
      localStorage.removeItem("gw_current_user");
      location.reload();
    };
  }
});


