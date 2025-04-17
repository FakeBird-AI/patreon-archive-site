// auth.js
document.addEventListener("DOMContentLoaded", () => {
  const loginSec   = document.getElementById("login-section");
  const welcomeSec = document.getElementById("welcome-section");
  const contentSec = document.getElementById("content");
  const tagList    = document.getElementById("tag-list");  // サイドメニュー

  // ログイン前はサイドメニューも隠す
  tagList.style.display = "none";

  // 既存の login-status, username など取得...
  const loginStatus  = document.getElementById("login-status");
  const usernameSpan = document.getElementById("username");
  const loginBtn     = document.getElementById("login-btn");
  const logoutBtn    = document.getElementById("logout-btn");

  // トークン取得＆Cookieセット（略）

  // sessionCookie 取得...
  const sessionToken = getCookie("session");

  if (sessionToken) {
    fetch("https://patreon-archive-site.fakebird279.workers.dev/verify", {
      method: "GET",
      credentials: "include",
      headers: { "Authorization": `Bearer ${sessionToken}` }
    })
      .then(res => res.json())
      .then(data => {
        if (data.loggedIn) {
          // ログイン画面を隠し、メニュー・コンテンツを表示
          loginSec.style.display   = "none";
          welcomeSec.style.display = "block";
          contentSec.style.display = "block";
          tagList.style.display    = "block";

          usernameSpan.textContent = data.username || "ユーザー";
          window.userRoles = data.roles || [];

          // 初回ここでのみ initArchive() を呼ぶ
          if (typeof initArchive === "function") initArchive();
        } else {
          // 非ログイン状態
          loginSec.style.display   = "block";
          welcomeSec.style.display = "none";
          contentSec.style.display = "none";
          tagList.style.display    = "none";
        }
      })
      .catch(err => {
        console.error("Verify request failed:", err);
        loginSec.style.display   = "block";
        welcomeSec.style.display = "none";
        contentSec.style.display = "none";
        tagList.style.display    = "none";
      });
  } else {
    // トークンなし→ログインセクションのみ
    loginSec.style.display   = "block";
    welcomeSec.style.display = "none";
    contentSec.style.display = "none";
    tagList.style.display    = "none";
  }

  // Discordログイン／ログアウトボタンの処理はそのまま
  loginBtn.addEventListener("click", () => {
    window.location.href = "https://patreon-archive-site.fakebird279.workers.dev/login";
  });
  logoutBtn.addEventListener("click", () => {
    window.location.href = "https://patreon-archive-site.fakebird279.workers.dev/logout";
  });

  // getCookie() 関数は既存のものをそのまま
});
