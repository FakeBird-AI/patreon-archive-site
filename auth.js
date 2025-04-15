// auth.js - 認証状態のチェックとUI制御

document.addEventListener("DOMContentLoaded", () => {
  const messageDiv   = document.getElementById("message");
  const welcomeSec   = document.getElementById("welcome-section");
  const loginSec     = document.getElementById("login-section");
  const usernameSpan = document.getElementById("username");
  
  // URLに認証後のトークン(#token=...)がある場合は取得してクッキーに保存
  if (window.location.hash.startsWith("#token=")) {
    const token = window.location.hash.substring(7);  // "#token="より後の部分
    // セッショントークンをクッキーにセット（Cloudflare Pagesドメインに保存）
    document.cookie = `session=${token}; Path=/; Secure; SameSite=Lax; Max-Age=86400`;
    // URLからトークン部分を削除（履歴に残さない）
    history.replaceState(null, "", window.location.pathname + window.location.search);
  }
  
  // ログアウト指示がある場合（?logout=true）
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get("logout") === "true") {
    // セッションCookieを削除
    document.cookie = "session=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT";
    messageDiv.textContent = "ログアウトしました。";
    messageDiv.classList.add("success");
    // URLパラメータを消去
    history.replaceState(null, "", window.location.pathname);
  }
  
  // 未認可エラーがある場合（?error=unauthorized）
  if (urlParams.get("error") === "unauthorized") {
    messageDiv.textContent = "必要なロールがないためコンテンツにアクセスできません。";
    messageDiv.classList.add("error");
    history.replaceState(null, "", window.location.pathname);
  }
  
  // クッキーからセッショントークンを取得
  function getCookie(name) {
    const match = document.cookie.match(new RegExp(`(^|\\s)${name}=([^;]+)`));
    return match ? match[2] : null;
  }
  const sessionToken = getCookie("session");
  
  if (sessionToken) {
    // トークンが存在する場合、/verify APIに問い合わせ
    fetch("https://patreon-archive-site.fakebird279.workers.dev/verify", {
      method: "GET",
      credentials: "include",  // Cookie送信を許可（クロスドメインの場合は必要）
      headers: {
        "Authorization": `Bearer ${sessionToken}`
      }
    })
    .then(res => res.json())
    .then(data => {
      if (data.loggedIn) {
        // 認証OK: コンテンツ表示、ユーザー名表示
        loginSec.style.display = "none";
        welcomeSec.style.display = "block";
        document.getElementById("content").style.display = "block";
        if (data.username) {
          usernameSpan.textContent = data.username;
        }
      } else {
        // 認証NG: クッキー無効のため削除し、ログイン画面を表示
        document.cookie = "session=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT";
        welcomeSec.style.display = "none";
        document.getElementById("content").style.display = "none";
        loginSec.style.display = "block";
      }
    })
    .catch(err => {
      console.error("Verify request failed:", err);
      // エラー時は未ログイン扱い
      welcomeSec.style.display = "none";
      document.getElementById("content").style.display = "none";
      loginSec.style.display = "block";
    });
  } else {
    // トークン未所持（未ログイン）
    welcomeSec.style.display = "none";
    document.getElementById("content").style.display = "none";
    loginSec.style.display = "block";
  }
  
  // 「Discordでログイン」ボタン押下時、Workersの/loginへリダイレクト
  document.getElementById("login-btn").addEventListener("click", () => {
    window.location.href = "https://patreon-archive-site.fakebird279.workers.dev/login";
  });
  
  // 「ログアウト」ボタン押下時、Workersの/logoutへリダイレクト
  document.getElementById("logout-btn").addEventListener("click", () => {
    window.location.href = "https://patreon-archive-site.fakebird279.workers.dev/logout";
  });
if (data.loggedIn) {
  status.textContent = `ようこそ、${data.username} さん！`;
  archiveDiv.classList.remove("hidden");
  loginBtn.classList.add("hidden");

  // ✅ archive 機能の初期化
  initArchive();
}
});
