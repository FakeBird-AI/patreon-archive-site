document.addEventListener("DOMContentLoaded", () => {
  const loginSec      = document.getElementById("login-section");
  const welcomeSec    = document.getElementById("welcome-section");
  const contentSec    = document.getElementById("content");

  const loginStatus   = document.getElementById("login-status");
  const welcomeStatus = document.getElementById("welcome-status");
  const usernameSpan  = document.getElementById("username");

  const loginBtn      = document.getElementById("login-btn");
  const logoutBtn     = document.getElementById("logout-btn");

  if (window.location.hash.startsWith("#token=")) {
    const token = window.location.hash.substring(7);
    document.cookie = `session=${token}; Path=/; Secure; SameSite=Lax; Max-Age=86400`;
    history.replaceState(null, "", window.location.pathname + window.location.search);
  }

  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get("logout") === "true") {
    document.cookie = "session=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT";
    loginStatus.textContent = "ログアウトしました。";
    history.replaceState(null, "", window.location.pathname);
  }

  if (urlParams.get("error") === "unauthorized") {
    loginStatus.textContent = "必要なロールがないためコンテンツにアクセスできません。";
    history.replaceState(null, "", window.location.pathname);
  }

  function getCookie(name) {
    const match = document.cookie.match(new RegExp(`(^|\\s)${name}=([^;]+)`));
    return match ? match[2] : null;
  }
  const sessionToken = getCookie("session");

  if (sessionToken) {
    fetch("https://patreon-archive-site.fakebird279.workers.dev/verify", {
      method: "GET",
      credentials: "include",
      headers: {
        "Authorization": `Bearer ${sessionToken}`
      }
    })
      .then(res => res.json())
      .then(data => {
        if (data.loggedIn) {
          loginSec.style.display = "none";
          welcomeSec.style.display = "block";
          contentSec.style.display = "block";
          usernameSpan.textContent = data.username || "ユーザー";
          // 取得したロール情報をグローバル変数に保存（archive.js で利用）
          window.userRoles = data.roles;
          if (typeof initArchive === "function") {
            initArchive();
          }
        } else {
          document.cookie = "session=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT";
          loginSec.style.display = "block";
          welcomeSec.style.display = "none";
          contentSec.style.display = "none";
        }
      })
      .catch(err => {
        console.error("Verify request failed:", err);
        loginSec.style.display = "block";
        welcomeSec.style.display = "none";
        contentSec.style.display = "none";
      });
  } else {
    loginSec.style.display = "block";
    welcomeSec.style.display = "none";
    contentSec.style.display = "none";
  }

  loginBtn.addEventListener("click", () => {
    window.location.href = "https://patreon-archive-site.fakebird279.workers.dev/login";
  });

  logoutBtn.addEventListener("click", () => {
    window.location.href = "https://patreon-archive-site.fakebird279.workers.dev/logout";
  });
});
