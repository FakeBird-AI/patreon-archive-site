// admin.js
const API_ORIGIN = "https://patreon-archive-site.fakebird279.workers.dev";

document.addEventListener("DOMContentLoaded", () => {
  function getCookie(name) {
    const m = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
    return m ? decodeURIComponent(m[1]) : null;
  }
  const sessionToken = getCookie("session");
  if (!sessionToken) {
    document.body.innerHTML = "<p>ログインが必要です。</p>"; return;
  }

  // 認証チェック
  fetch(`${API_ORIGIN}/verify`, {
    method: "GET",
    credentials: "include",
    headers: { "Authorization": `Bearer ${sessionToken}` }
  })
    .then(r => r.json())
    .then(data => {
      if (!data.loggedIn || !data.roles.includes("1350114997040316458")) {
        document.body.innerHTML = "<p>Ownerロールのみ利用可。</p>"; return;
      }
      initAdmin();
    })
    .catch(() => {
      document.body.innerHTML = "<p>認証エラー。</p>";
    });

  async function initAdmin() {
    const form      = document.getElementById("archiveForm");
    const clearBtn  = document.getElementById("clearForm");
    const msgEl     = document.getElementById("formMessage");
    const entriesDiv= document.getElementById("entries");
    let entries = [];

    // 既存データ読み込み
    try {
      const res = await fetch(`${API_ORIGIN}/data.json`, { credentials: "include" });
      entries = await res.json();
      renderEntries();
    } catch {
      entriesDiv.innerHTML = "<p>エントリー読み込み失敗。</p>";
    }

    function renderEntries() {
      entriesDiv.innerHTML = "";
      if (!entries.length) {
        entriesDiv.innerHTML = "<p>エントリーなし。</p>"; return;
      }
      entries.forEach((e,i) => {
        const div = document.createElement("div");
        div.style = "border:1px solid #ccc; padding:.5rem; margin-bottom:.5rem";
        div.innerHTML = `<strong>${e.title}</strong> (${e.date})
          <button data-index="${i}" class="editEntry">編集</button>`;
        entriesDiv.appendChild(div);
      });
      entriesDiv.querySelectorAll(".editEntry").forEach(btn => {
        btn.addEventListener("click", ev => fillForm(entries[+ev.target.dataset.index], +ev.target.dataset.index));
      });
    }

    function fillForm(e, idx) {
      form.title.value       = e.title;
      form.date.value        = e.date;
      form.thumbnail.value   = e.thumbnail;
      form.type.value        = e.category.type;
      form.series.value      = e.category.series;
      form.character.value   = e.category.character;
      form.tags.value        = e.tags.join(", ");
      form.patreonUrl.value  = e.patreonUrl || "";
      form.url.value         = e.url;
      form.entryId.value     = idx;
    }

    clearBtn.addEventListener("click", () => {
      form.reset(); form.entryId.value = ""; msgEl.textContent = "";
    });

    form.addEventListener("submit", async ev => {
      ev.preventDefault();
      // フォームから新規/更新エントリ作成…
      // （既存の処理を流用）
      // 更新後：
      try {
        const res = await fetch(`${API_ORIGIN}/api/update-data`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(entries)
        });
        const result = await res.json();
        if (!res.ok || !result.success) throw new Error(result.error || res.statusText);
        msgEl.textContent = "保存完了。";
      } catch (err) {
        msgEl.textContent = `保存失敗：${err.message}`;
      }
      renderEntries();
    });

    // ③ アクセスログ取得・表示
    try {
      const logRes = await fetch(`${API_ORIGIN}/admin/visits`, {
        method: "GET",
        credentials: "include",
        headers: { "Authorization": `Bearer ${sessionToken}` }
      });
      const rows = await logRes.json();
      const tbody = document.getElementById("visits-body");
      rows.forEach(({user,count}) => {
        const tr = document.createElement("tr");
        tr.innerHTML = `<td>${user}</td><td>${count}</td>`;
        tbody.appendChild(tr);
      });
    } catch {
      console.error("訪問ログ取得失敗");
    }
  }
});
