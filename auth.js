// auth.js
document.addEventListener("DOMContentLoaded", () => {
  // --- Cookie取得ヘルパー ---
  function getCookie(name) {
    const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
    return match ? decodeURIComponent(match[1]) : null;
  }
  
  // --- ハンバーガーボタンはログイン前は非表示 ---
  const hamburger = document.getElementById("hamburger");
  if (hamburger) hamburger.style.display = "none";
  
  // 要素取得
  const loginSec   = document.getElementById("login-section");
  const welcomeSec = document.getElementById("welcome-section");
  const contentSec = document.getElementById("content");
  const tagList    = document.getElementById("tag-list");  // サイドメニュー

  // ログイン前はサイドメニューを隠す
  if (tagList) tagList.style.display = "none";

  const loginStatus  = document.getElementById("login-status");
  const usernameSpan = document.getElementById("username");
  const loginBtn     = document.getElementById("login-btn");
  const logoutBtn    = document.getElementById("logout-btn");

  // URLフラグメントにトークンがあれば Cookie に保存
  if (window.location.hash.startsWith("#token=")) {
    const token = window.location.hash.substring(7);
    document.cookie = `session=${token}; Path=/; Secure; SameSite=Lax; Max-Age=86400`;
    history.replaceState(null, "", window.location.pathname + window.location.search);
  }

  // session トークン取得
  const sessionToken = getCookie("session");

  if (sessionToken) {
    // verify API に問い合わせ
    fetch("https://patreon-archive-site.fakebird279.workers.dev/verify", {
      method: "GET",
      credentials: "include",
      headers: { "Authorization": `Bearer ${sessionToken}` }
    })
      .then(res => res.json())
      .then(data => {
        if (data.loggedIn) {
          // ログイン成功：UI切り替え＋サイドメニュー表示＋archive起動
          loginSec.style.display   = "none";
          welcomeSec.style.display = "block";
          contentSec.style.display = "block";
          // --- サイドメニュー＆ハンバーガーを表示 ---
          tagList.style.display    = "block";
          if (hamburger) hamburger.style.display = "block";

          usernameSpan.textContent = data.username || "ユーザー";
          window.userRoles = data.roles || [];

          if (typeof initArchive === "function") initArchive();
        } else {
          // トークンはあるが非ログイン扱い
          loginSec.style.display   = "block";
          welcomeSec.style.display = "none";
          contentSec.style.display = "none";
          tagList.style.display    = "none";
          if (hamburger) hamburger.style.display = "none";
        }
      })
      .catch(err => {
        console.error("Verify request failed:", err);
        loginSec.style.display   = "block";
        welcomeSec.style.display = "none";
        contentSec.style.display = "none";
        tagList.style.display    = "none";
        if (hamburger) hamburger.style.display = "none";
      });
  } else {
    // 未トークン時：ログイン画面のみ
    loginSec.style.display   = "block";
    welcomeSec.style.display = "none";
    contentSec.style.display = "none";
    tagList.style.display    = "none";
  }

  // Discordログイン
  loginBtn.addEventListener("click", () => {
    window.location.href = "https://patreon-archive-site.fakebird279.workers.dev/login";
  });
  // Discordログアウト
  logoutBtn.addEventListener("click", () => {
    window.location.href = "https://patreon-archive-site.fakebird279.workers.dev/logout";
  });
});
