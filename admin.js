// admin.js
// Worker のエンドポイント
const API_ORIGIN = "https://patreon-archive-site.fakebird279.workers.dev";

document.addEventListener("DOMContentLoaded", () => {
  // ① Cookie から session トークンを取得
  function getCookie(name) {
    const m = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
    return m ? decodeURIComponent(m[1]) : null;
  }
  const sessionToken = getCookie("session");
  if (!sessionToken) {
    document.body.innerHTML = "<p>ログインが必要です。</p>";
    return;
  }
  // ② verify API で認証チェック
  fetch(`${API_ORIGIN}/verify`, {
    method: "GET",
    credentials: "include",
    headers: { "Authorization": `Bearer ${sessionToken}` }
  })
    .then(res => res.json())
    .then(data => {
      if (!data.loggedIn || !data.roles.includes("1350114997040316458")) {
        document.body.innerHTML = "<p>このページはOwnerロール保持者のみ利用できます。</p>";
        return;
      }
      initAdmin();
    })
    .catch(() => {
      document.body.innerHTML = "<p>認証チェックに失敗しました。</p>";
    });
});

function initAdmin() {
  const form = document.getElementById("archiveForm");
  const clearBtn = document.getElementById("clearForm");
  const msgEl = document.getElementById("formMessage");
  const entriesDiv = document.getElementById("entries");
  let entries = [];

  // 既存データ読み込み
  fetch(`${API_ORIGIN}/data.json`, { credentials: "include" })
    .then(r => r.json())
    .then(data => { entries = data; renderEntries(); })
    .catch(() => { entriesDiv.innerHTML = "<p>既存エントリーの読み込みに失敗しました。</p>"; });

  function renderEntries() {
    entriesDiv.innerHTML = "";
    if (!entries.length) {
      entriesDiv.innerHTML = "<p>エントリーはありません。</p>";
      return;
    }
    entries.forEach((e, i) => {
      const div = document.createElement("div");
      div.style = "border:1px solid #ccc; padding:0.5rem; margin-bottom:0.5rem";
      div.innerHTML = `<strong>${e.title}</strong> (${e.date})
        <button data-index="${i}" class="editEntry">編集</button>`;
      entriesDiv.appendChild(div);
    });
    entriesDiv.querySelectorAll(".editEntry").forEach(btn => {
      btn.addEventListener("click", ev => {
        fillForm(entries[+ev.target.dataset.index], +ev.target.dataset.index);
      });
    });
  }

  function fillForm(e, idx) {
    form.title.value = e.title;
    form.date.value = e.date;
    form.thumbnail.value = e.thumbnail;
    form.type.value = e.category.type;
    form.series.value = e.category.series;
    form.character.value = e.category.character;
    form.tags.value = e.tags.join(", ");
    form.patreonUrl.value = e.patreonUrl || "";
    form.url.value = e.url;
    form.entryId.value = idx;
  }

  clearBtn.addEventListener("click", () => {
    form.reset();
    form.entryId.value = "";
    msgEl.textContent = "";
  });

  form.addEventListener("submit", async ev => {
    ev.preventDefault();
    const newEntry = {
      title: form.title.value.trim(),
      date: form.date.value.trim(),
      thumbnail: form.thumbnail.value.trim(),
      category: {
        type: form.type.value.trim(),
        series: form.series.value.trim(),
        character: form.character.value.trim()
      },
      tags: form.tags.value.split(",").map(t => t.trim()).filter(t => t),
      patreonUrl: form.patreonUrl.value.trim(),
      url: form.url.value.trim()
    };
    const id = form.entryId.value;
    if (id === "") {
      entries.push(newEntry);
      msgEl.textContent = "新規エントリーを登録しました。";
    } else {
      entries[id] = newEntry;
      msgEl.textContent = "エントリーを更新しました。";
    }
    renderEntries();
    form.reset();
    form.entryId.value = "";

    // 更新API呼び出し
    const res = await fetch(`${API_ORIGIN}/api/update-data`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(entries)
    });
    const result = await res.json();
    if (!res.ok || !result.success) {
      msgEl.textContent = `保存に失敗しました：${result.error||res.statusText}`;
    }
  });

  // ホーム戻る
  document.getElementById("goHome")
    .addEventListener("click", () => { location.href = "index.html"; });

  // 訪問ログ取得・表示
  fetch(`${API_ORIGIN}/admin/visits`, {
    method: 'GET',
    credentials: 'include',
    headers: { "Authorization": `Bearer ${getCookie("session")}` }
  })
    .then(res => res.json())
    .then(rows => {
      const tbody = document.getElementById("visits-body");
      rows.forEach(({ user, count }) => {
        const tr = document.createElement("tr");
        tr.innerHTML = `<td>${user}</td><td>${count}</td>`;
        tbody.appendChild(tr);
      });
    })
    .catch(err => console.error("訪問ログ取得失敗", err));

  // Cookieヘルパー
  function getCookie(name) {
    const m = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
    return m ? decodeURIComponent(m[1]) : null;
  }
}
