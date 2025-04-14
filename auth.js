window.addEventListener("DOMContentLoaded", () => {
  const archiveDiv = document.getElementById("archive");
  const loginBtn = document.getElementById("login-btn");
  const status = document.getElementById("status");

  const VERIFY_URL = "https://patreon-archive-site.fakebird279.workers.dev/verify";
  const LOGIN_URL = "https://patreon-archive-site.fakebird279.workers.dev/login";

  fetch(VERIFY_URL, { credentials: "include" })
    .then(res => res.json())
    .then(data => {
      console.log("🔁 /verify 結果:", data); // ← デバッグ用ログ
      if (data.authorized) {
        status.textContent = `ようこそ、${data.username} さん！`;
        archiveDiv.classList.remove("hidden");
        loginBtn.classList.add("hidden");
      } else {
        status.textContent = "ログインが必要です。";
        loginBtn.classList.remove("hidden");
        archiveDiv.classList.add("hidden"); // ← 🔥 ここを追加！
      }
    })
    .catch(err => {
      console.error("❌ /verify 通信エラー:", err);
      status.textContent = "ログイン状態の確認中にエラーが発生しました。";
    });

  loginBtn.addEventListener("click", () => {
    window.location.href = LOGIN_URL;
  });
});
