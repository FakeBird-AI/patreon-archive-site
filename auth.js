// auth.js
document.addEventListener("DOMContentLoaded", () => {
  // --- Cookie取得ヘルパー ---
  function getCookie(name) {
    const m = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
    return m ? decodeURIComponent(m[1]) : null;
  }

  // --- 要素取得 ---
  const loginSec    = document.getElementById("login-section");
  const welcomeSec  = document.getElementById("welcome-section");
  const contentSec  = document.getElementById("content");
  const tagList     = document.getElementById("tag-list");    // サイドメニュー
  const hamburger   = document.getElementById("hamburger");   // ハンバーガー
  const loginStatus = document.getElementById("login-status");
  const usernameSpan = document.getElementById("username");
  const loginBtn    = document.getElementById("login-btn");
  const logoutBtn   = document.getElementById("logout-btn");

  // --- ログアウト時クエリ (?logout=true) の処理 ---
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get("logout") === "true") {
    // Cookie を削除
    document.cookie = "session=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT";
    loginStatus.textContent = "ログアウトしました。";
    // ?logout=true を URL から消す
    history.replaceState(null, "", window.location.pathname);
  }

  // ログイン前はサイドメニューとハンバーガーを隠す
  //if (tagList)   tagList.style.display   = "none";
  if (hamburger) hamburger.style.display = "none";

  // URLフラグメント (#token=…) があれば Cookie に保存
  if (window.location.hash.startsWith("#token=")) {
    const token = window.location.hash.substring(7);
    document.cookie = `session=${token}; Path=/; Secure; SameSite=Lax; Max-Age=86400`;
    history.replaceState(null, "", window.location.pathname + window.location.search);
  }

  // session トークン取得
  const sessionToken = getCookie("session");

  if (sessionToken) {
    // 認証確認API
    fetch("https://patreon-archive-site.fakebird279.workers.dev/verify", {
      method: "GET",
      credentials: "include",
      headers: { "Authorization": `Bearer ${sessionToken}` }
    })
      .then(res => res.json())
      .then(data => {
        if (data.loggedIn) {
          // ログイン成功：UI切り替え＋メニュー／ハンバーガー表示
          loginSec.style.display   = "none";
          welcomeSec.style.display = "block";
          contentSec.style.display = "block";
          tagList.style.display    = "block";
          hamburger.style.display  = "block";

          usernameSpan.textContent = data.username || "ユーザー";
          window.userRoles = data.roles || [];

          if (typeof initArchive === "function") initArchive();
        } else {
          // 認証失敗時：再度隠す
          loginSec.style.display   = "block";
          welcomeSec.style.display = "none";
          contentSec.style.display = "none";
          //tagList.style.display    = "none";
          hamburger.style.display  = "none";
        }
      })
      .catch(err => {
        console.error("Verify request failed:", err);
        loginSec.style.display   = "block";
        welcomeSec.style.display = "none";
        contentSec.style.display = "none";
        tagList.style.display    = "none";
        hamburger.style.display  = "none";
      });
  } else {
    // 未ログイントークン時
    loginSec.style.display   = "block";
    welcomeSec.style.display = "none";
    contentSec.style.display = "none";
    tagList.style.display    = "none";
    hamburger.style.display  = "none";
  }

  // Discordログイン／ログアウト
  loginBtn.addEventListener("click", () => {
    window.location.href = "https://patreon-archive-site.fakebird279.workers.dev/login";
  });
  logoutBtn.addEventListener("click", () => {
    window.location.href = "https://patreon-archive-site.fakebird279.workers.dev/logout";
  });
});
