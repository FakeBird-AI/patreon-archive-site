// admin.js
document.addEventListener("DOMContentLoaded", () => {
  // ① Cookie から session トークンを取得
  function getCookie(name) {
    const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
    return match ? decodeURIComponent(match[1]) : null;
  }
  const sessionToken = getCookie("session");
  if (!sessionToken) {
    document.body.innerHTML = "<p>ログインが必要です。</p>";
    return;
  }

  // ② verify API に Authorization ヘッダ付きで問い合わせ
  fetch("https://patreon-archive-site.fakebird279.workers.dev/verify", {
    method: "GET",
    credentials: "include",
    headers: {
      "Authorization": `Bearer ${sessionToken}`
    }
  })
    .then(res => res.json())
    .then(data => {
      if (!data.loggedIn || !Array.isArray(data.roles)) {
        document.body.innerHTML = "<p>ログインが必要です。</p>";
        return;
      }
      if (!data.roles.includes("1350114997040316458")) {
        document.body.innerHTML = "<p>このページはOwnerロール保持者のみ利用できます。</p>";
        return;
      }
      // ③ Owner 確認OK → 管理画面初期化
      initAdmin();
    })
    .catch(() => {
      document.body.innerHTML = "<p>認証チェックに失敗しました。</p>";
    });
});

// Owner ロール保持者向けの画面ロジック
function initAdmin() {
  const form       = document.getElementById("archiveForm");
  const clearBtn   = document.getElementById("clearForm");
  const msgEl      = document.getElementById("formMessage");
  const entriesDiv = document.getElementById("entries");

  let entries = [];
  // data.json を読み込んで一覧表示
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
      const div = document.createElement("div");
      div.style = "border:1px solid #ccc; padding:0.5rem; margin-bottom:0.5rem";
      div.innerHTML = `<strong>${e.title}</strong> (${e.date})
        <button data-index="${i}" class="editEntry">編集</button>`;
      entriesDiv.appendChild(div);
    });
    entriesDiv.querySelectorAll(".editEntry").forEach(btn => {
      btn.addEventListener("click", ev => {
        const idx = +ev.target.dataset.index;
        fillForm(entries[idx], idx);
      });
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

  form.addEventListener("submit", ev => {
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
      tags: form.tags.value.split(",").map(t => t.trim()).filter(t => t),
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
    // 実運用ではここで POST/PUT をサーバーAPIに投げて保存する
  });
}
