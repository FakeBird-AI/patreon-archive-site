window.addEventListener("DOMContentLoaded", () => {
  const archiveDiv = document.getElementById("archive");
  const loginBtn = document.getElementById("login-btn");
  const status = document.getElementById("status");

  const VERIFY_URL = "https://patreon-archive-site.fakebird279.workers.dev/verify";
  const LOGIN_URL = "https://patreon-archive-site.fakebird279.workers.dev/login";

  // 初期状態では非表示にしておく（念のため）
  archiveDiv.classList.add("hidden");

  fetch(VERIFY_URL, { credentials: "include" })
    .then(res => res.json())
    .then(data => {
      console.log("🔁 /verify 結果:", data);
      if (data.authorized) {
        status.textContent = `ようこそ、${data.username} さん！`;
        archiveDiv.classList.remove("hidden");
        loginBtn.classList.add("hidden");
      } else {
        status.textContent = "ログインが必要です。";
        loginBtn.classList.remove("hidden");
        archiveDiv.classList.add("hidden"); // ← ❗明示的に隠す
      }
    })
    .catch(err => {
      console.error("❌ /verify 通信エラー:", err);
      status.textContent = "認証確認中にエラーが発生しました。";
      loginBtn.classList.remove("hidden");
      archiveDiv.classList.add("hidden");
    });

  loginBtn.addEventListener("click", () => {
    window.location.href = LOGIN_URL;
  });
});
