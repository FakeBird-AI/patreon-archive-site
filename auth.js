// auth.js - 認証状態のチェックとUI制御

document.addEventListener("DOMContentLoaded", () => {
  const loginSec      = document.getElementById("login-section");
  const welcomeSec    = document.getElementById("welcome-section");
  const contentSec    = document.getElementById("content");

  const loginStatus   = document.getElementById("login-status");
  const welcomeStatus = document.getElementById("welcome-status");
  const usernameSpan  = document.getElementById("username");

  const loginBtn      = document.getElementById("login-btn");
  const logoutBtn     = document.getElementById("logout-btn");

  // URLに認証後のトークン（#token=...）がある場合はCookieに保存
  if (window.location.hash.startsWith("#token=")) {
    const token = window.location.hash.substring(7);
    document.cookie = `session=${token}; Path=/; Secure; SameSite=Lax; Max-Age=86400`;
    history.replaceState(null, "", window.location.pathname + window.location.search);
  }

  // ログアウト指示がある場合（?logout=true）
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get("logout") === "true") {
    document.cookie = "session=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT";
    loginStatus.textContent = "ログアウトしました。";
    history.replaceState(null, "", window.location.pathname);
  }

  // 未認可エラーがある場合（?error=unauthorized）
  if (urlParams.get("error") === "unauthorized") {
    loginStatus.textContent = "必要なロールがないためコンテンツにアクセスできません。";
    history.replaceState(null, "", window.location.pathname);
  }

  // クッキーからセッションを取得
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
          // アーカイブ表示機能を起動
          if (typeof initArchive === "function") {
            initArchive();
          }
        } else {
          // 無効トークンなら削除
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

  // Discordログイン
  loginBtn.addEventListener("click", () => {
    window.location.href = "https://patreon-archive-site.fakebird279.workers.dev/login";
  });

  // ログアウト
  logoutBtn.addEventListener("click", () => {
    window.location.href = "https://patreon-archive-site.fakebird279.workers.dev/logout";
  });
});
