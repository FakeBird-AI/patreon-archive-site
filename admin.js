// admin.js
document.addEventListener("DOMContentLoaded", () => {
  // Cookie から session トークンを取得
  function getCookie(name) {
    const m = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
    return m ? decodeURIComponent(m[1]) : null;
  }
  const sessionToken = getCookie("session");
  if (!sessionToken) {
    document.body.innerHTML = "<p>ログインが必要です。</p>";
    return;
  }

  // verify API に問い合わせ
  fetch("https://patreon-archive-site.fakebird279.workers.dev/verify", {
    method: "GET",
    credentials: "include",
    headers: { "Authorization": `Bearer ${sessionToken}` }
  })
    .then(r => r.json())
    .then(data => {
      if (!data.loggedIn || !Array.isArray(data.roles)) {
        document.body.innerHTML = "<p>ログインが必要です。</p>";
        return;
      }
      if (!data.roles.includes("1350114997040316458")) {
        document.body.innerHTML = "<p>このページはOwnerロール保持者のみ利用できます。</p>";
        return;
      }
      // Owner 確認OK → 初期化
      initAdmin();
    })
    .catch(() => {
      document.body.innerHTML = "<p>認証チェックに失敗しました。</p>";
    });
});

function initAdmin() {
  // 「ホームに戻る」ボタン
  document.getElementById("goHome")
    .addEventListener("click", () => location.href = "index.html");

  const form       = document.getElementById("archiveForm");
  const clearBtn   = document.getElementById("clearForm");
  const msgEl      = document.getElementById("formMessage");
  const entriesDiv = document.getElementById("entries");

  // 更新用エンドポイント
  const UPDATE_ENDPOINT = "https://patreon-archive-site.fakebird279.workers.dev/api/update-data";

  let entries = [];
  fetch("data.json")
    .then(r => r.json())
    .then(data => {
      entries = data;
      renderEntries();
    })
    .catch(() => {
      entriesDiv.innerHTML = "<p>既存エントリーの読み込みに失敗しました。</p>";
    });

  function renderEntries() {
    entriesDiv.innerHTML = "";
    if (!entries.length) {
      entriesDiv.innerHTML = "<p>エントリーはありません。</p>";
      return;
    }
    entries.forEach((e, i) => {
      const d = document.createElement("div");
      d.style = "border:1px solid #ccc; padding:0.5rem; margin-bottom:0.5rem";
      d.innerHTML = `<strong>${e.title}</strong> (${e.date})
        <button data-index="${i}" class="editEntry">編集</button>`;
      entriesDiv.appendChild(d);
    });
    entriesDiv.querySelectorAll(".editEntry").forEach(btn => {
      btn.addEventListener("click", ev => fillForm(entries[+ev.target.dataset.index], +ev.target.dataset.index));
    });
  }

  function fillForm(e, idx) {
    form.title.value     = e.title;
    form.date.value      = e.date;
    form.thumbnail.value = e.thumbnail;
    form.type.value      = e.category.type;
    form.series.value    = e.category.series;
    form.character.value = e.category.character;
    form.tags.value      = e.tags.join(", ");
    form.url.value       = e.url;
    form.entryId.value   = idx;
  }

  clearBtn.addEventListener("click", () => {
    form.reset();
    form.entryId.value = "";
    msgEl.textContent  = "";
  });

  form.addEventListener("submit", async ev => {
    ev.preventDefault();
    const newEntry = {
      title:     form.title.value.trim(),
      date:      form.date.value.trim(),
      thumbnail: form.thumbnail.value.trim(),
      category: {
        type:      form.type.value.trim(),
        series:    form.series.value.trim(),
        character: form.character.value.trim()
      },
      tags: form.tags.value.split(",").map(t=>t.trim()).filter(t=>t),
      url: form.url.value.trim()
    };
    const id = form.entryId.value;
    if (id === "") entries.push(newEntry);
    else           entries[id] = newEntry;

    // バックエンドへ保存
  const res = await fetch(UPDATE_ENDPOINT, {
      method:  "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(entries)
  });

    let result;
    try {
      result = await res.json();
    } catch {
      msgEl.textContent = `保存に失敗しました（レスポンス解析エラー）。`;
      return;
    }

    if (!res.ok || !result.success) {
      msgEl.textContent = `保存に失敗しました：${result.error || res.statusText}`;
      return;
    }

    // 正常時
    renderEntries();
    msgEl.textContent = id==="" ? "新規登録しました。" : "更新しました。";
    form.reset();
    form.entryId.value = "";
  });
}
