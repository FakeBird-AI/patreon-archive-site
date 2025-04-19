// auth.js
document.addEventListener("DOMContentLoaded", () => {
  const API_ORIGIN = "https://patreon-archive-site.fakebird279.workers.dev";

  function getCookie(name) {
    const m = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
    return m ? decodeURIComponent(m[1]) : null;
  }

  const loginSec   = document.getElementById("login-section");
  const welcomeSec = document.getElementById("welcome-section");
  const contentSec = document.getElementById("content");
  const tagList    = document.getElementById("tag-list");
  const hamburger  = document.getElementById("hamburger");
  const loginBtn   = document.getElementById("login-btn");
  const logoutBtn  = document.getElementById("logout-btn");
  const usernameSpan = document.getElementById("username");

  // ログアウト後表示制御
  if (new URLSearchParams(location.search).get("logout")==="true") {
    document.cookie = "session=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT";
    loginSec.querySelector("#login-status").textContent = "ログアウトしました。";
    history.replaceState(null, "", location.pathname);
  }

  // コールバック後のトークン保存
  if (location.hash.startsWith("#token=")) {
    const token = location.hash.slice(7);
    document.cookie = `session=${token}; Path=/; Secure; SameSite=Lax; Max-Age=86400`;
    history.replaceState(null, "", location.pathname + location.search);
  }

  const sessionToken = getCookie("session");
  if (sessionToken) {
    fetch(`${API_ORIGIN}/verify`, {
      method: "GET",
      credentials: "include",
      headers: { "Authorization": `Bearer ${sessionToken}` }
    })
      .then(r => r.json())
      .then(data => {
        if (data.loggedIn) {
          loginSec.style.display   = "none";
          welcomeSec.style.display = "block";
          contentSec.style.display = "block";
          hamburger.style.display  = "block";
          usernameSpan.textContent = data.username;
          window.userRoles = data.roles || [];
          if (typeof initArchive === "function") initArchive();
        }
      })
      .catch(() => { /* 認証失敗は静かに */ });
  }

  loginBtn.addEventListener("click", () => {
    location.href = `${API_ORIGIN}/login`;
  });
  logoutBtn.addEventListener("click", () => {
    location.href = `${API_ORIGIN}/logout`;
  });
});
