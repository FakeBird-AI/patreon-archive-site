window.addEventListener("DOMContentLoaded", () => {
  const archiveDiv = document.getElementById("archive");
  const loginBtn = document.getElementById("login-btn");
  const status = document.getElementById("status");

  const VERIFY_URL = "https://patreon-archive-site.fakebird279.workers.dev/verify";
  const LOGIN_URL = "https://patreon-archive-site.fakebird279.workers.dev/login";

  // 初期状態で非表示にしておく（保険）
  archiveDiv.classList.add("hidden");
  loginBtn.classList.add("hidden");

  // /verify に問い合わせてログイン状態を確認
  fetch(VERIFY_URL, { credentials: "include" })
    .then(res => res.json())
    .then(data => {
      console.log("🔁 /verify 結果:", data);

      if (data.authorized) {
        // ✅ 認証成功
        status.textContent = `ようこそ、${data.username} さん！`;
        archiveDiv.classList.remove("hidden");
        loginBtn.classList.add("hidden");

        // ✅ Cookieが存在 → archive.js 側が描画を開始できるようにする（何もしなくてもOK）
      } else {
        // ❌ 未認証
        status.textContent = "ログインが必要です。";
        loginBtn.classList.remove("hidden");
        archiveDiv.classList.add("hidden");
      }
    })
    .catch(err => {
      console.error("❌ /verify 通信エラー:", err);
      status.textContent = "認証確認中にエラーが発生しました。";
      loginBtn.classList.remove("hidden");
      archiveDiv.classList.add("hidden");
    });

  // ログインボタン押下でDiscord認証へ
  loginBtn.addEventListener("click", () => {
    window.location.href = LOGIN_URL;
  });
});
