// auth.js - 認証状態のチェックとUI制御

document.addEventListener("DOMContentLoaded", () => {
  const messageDiv   = document.getElementById("message");
  const welcomeSec   = document.getElementById("welcome-section");
  const loginSec     = document.getElementById("login-section");
  const usernameSpan = document.getElementById("username");
  const status       = document.getElementById("status");
  const contentSec   = document.getElementById("content");

  // 👋 初期化：表示をリセット
  status.textContent = "";
  loginSec.style.display   = "none";
  welcomeSec.style.display = "none";
  contentSec.style.display = "none";

  // ✅ 認証トークンがURLにある場合 → Cookieに保存
  if (window.location.hash.startsWith("#token=")) {
    const token = window.location.hash.substring(7);
    document.cookie = `session=${token}; Path=/; Secure; SameSite=Lax; Max-Age=86400`;
    history.replaceState(null, "", window.location.pathname + window.location.search);
  }

  // 🔄 パラメータ確認（ログアウト/認証エラー）
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get("logout") === "true") {
    document.cookie = "session=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT";
    messageDiv.textContent = "ログアウトしました。";
    messageDiv.classList.add("success");
    history.replaceState(null, "", window.location.pathname);
  }

  if (urlParams.get("error") === "unauthorized") {
    messageDiv.textContent = "必要なロールがないためコンテンツにアクセスできません。";
    messageDiv.classList.add("error");
    history.replaceState(null, "", window.location.pathname);
  }

  // 🍪 クッキーからセッショントークン取得
  const getCookie = (name) => {
    const match = document.cookie.match(new RegExp(`(^|\\s)${name}=([^;]+)`));
    return match ? match[2] : null;
  };
  const sessionToken = getCookie("session");

  if (sessionToken) {
    // ⏳ ローディング表示
    status.textContent = "ログイン確認中...";

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
        status.textContent = `ようこそ、${data.username} さん！`;

        // ✅ アーカイブ初期化
        initArchive();
      } else {
        document.cookie = "session=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT";
        status.textContent = "ログインが必要です。";
        loginSec.style.display = "block";
      }
    })
    .catch(err => {
      console.error("Verify request failed:", err);
      status.textContent = "認証エラーが発生しました。";
      loginSec.style.display = "block";
    });
  } else {
    // 未ログイン状態
    status.textContent = "ログインが必要です。";
    loginSec.style.display = "block";
  }

  // 🎫 ログイン・ログアウトボタン
  document.getElementById("login-btn").addEventListener("click", () => {
    window.location.href = "https://patreon-archive-site.fakebird279.workers.dev/login";
  });

  document.getElementById("logout-btn").addEventListener("click", () => {
    window.location.href = "https://patreon-archive-site.fakebird279.workers.dev/logout";
  });
});
