window.addEventListener("DOMContentLoaded", () => {
  const archiveDiv = document.getElementById("archive");
  const loginBtn = document.getElementById("login-btn");
  const status = document.getElementById("status");

  // あなたの Cloudflare Workers のURLに置き換えてください！
  const VERIFY_URL = "https://patreon-archive-site.fakebird279.workers.dev/verify";
  const LOGIN_URL = "https://patreon-archive-site.fakebird279.workers.dev/login";

  // Discordログイン後の状態をチェック
  fetch(VERIFY_URL, { credentials: "include" })
    .then(res => res.json())
    .then(data => {
      if (data.authorized) {
        status.textContent = `ようこそ、${data.username} さん！`;
        archiveDiv.classList.remove("hidden");
        loginBtn.classList.add("hidden");
      } else {
        status.textContent = "ログインが必要です。";
        loginBtn.classList.remove("hidden");
      }
    });

  loginBtn.addEventListener("click", () => {
    window.location.href = LOGIN_URL;
  });
});
