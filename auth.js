window.addEventListener("DOMContentLoaded", () => {
  const archiveDiv = document.getElementById("archive");
  const loginBtn = document.getElementById("login-btn");
  const status = document.getElementById("status");

  fetch("https://YOUR-WORKER-NAME.YOUR-SUBDOMAIN.workers.dev/verify", {
    credentials: "include"
  })
    .then(res => res.json())
    .then(data => {
      if (data.authorized) {
        status.textContent = `ようこそ、${data.username}さん！`;
        archiveDiv.classList.remove("hidden");
        loginBtn.classList.add("hidden");
      } else {
        status.textContent = "ログインが必要です。";
        loginBtn.classList.remove("hidden");
        archiveDiv.classList.add("hidden");
      }
    });
});

