// admin.js
document.addEventListener("DOMContentLoaded", () => {
  // Owner ロール以外は利用できないようにチェック
  if (!window.userRoles || !window.userRoles.includes("1350114997040316458")) {
    document.body.innerHTML = "<p>このページはOwnerロール保持者のみ利用できます。</p>";
    return;
  }

  const form = document.getElementById("archiveForm");
  const clearBtn = document.getElementById("clearForm");
  const formMessage = document.getElementById("formMessage");
  const entriesDiv = document.getElementById("entries");

  // data.json の内容を読み込み、エントリー一覧に表示
  let entries = [];
  fetch("data.json")
    .then(res => res.json())
    .then(data => {
      entries = data;
      renderEntries();
    })
    .catch(err => {
      console.error("data.json 読み込み失敗:", err);
      entriesDiv.innerHTML = "<p>既存エントリーの読み込みに失敗しました。</p>";
    });

  // 既存エントリー一覧を表示
  function renderEntries() {
    entriesDiv.innerHTML = "";
    if (entries.length === 0) {
      entriesDiv.innerHTML = "<p>エントリーはありません。</p>";
      return;
    }
    entries.forEach((entry, index) => {
      const div = document.createElement("div");
      div.style.border = "1px solid #ccc";
      div.style.padding = "0.5rem";
      div.style.marginBottom = "0.5rem";
      div.innerHTML = `
        <strong>${entry.title}</strong> (${entry.date})
        <button data-index="${index}" class="editEntry">編集</button>
      `;
      entriesDiv.appendChild(div);
    });
    // 編集ボタンにクリックイベントを設定
    document.querySelectorAll(".editEntry").forEach(btn => {
      btn.addEventListener("click", (e) => {
        const idx = e.target.getAttribute("data-index");
        fillForm(entries[idx], idx);
      });
    });
  }

  // フォームに値を反映（編集モード）
  function fillForm(entry, index) {
    form.title.value = entry.title;
    form.date.value = entry.date;
    form.thumbnail.value = entry.thumbnail;
    form.type.value = entry.category.type;
    form.series.value = entry.category.series;
    form.character.value = entry.category.character;
    form.tags.value = entry.tags.join(", ");
    form.url.value = entry.url;
    form.entryId.value = index; // 編集対象として index を保持
  }

  // フォームのクリア処理
  clearBtn.addEventListener("click", () => {
    form.reset();
    form.entryId.value = "";
    formMessage.textContent = "";
  });

  // フォームの保存処理（新規登録 or 編集更新）
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const newEntry = {
      title: form.title.value.trim(),
      date: form.date.value.trim(),
      thumbnail: form.thumbnail.value.trim(),
      category: {
        type: form.type.value.trim(),
        series: form.series.value.trim(),
        character: form.character.value.trim()
      },
      tags: form.tags.value.split(",").map(t => t.trim()).filter(t => t.length),
      url: form.url.value.trim()
    };
    const entryId = form.entryId.value;
    if (entryId === "") {
      // 新規登録（実際はバックエンド API への POST などで保存）
      entries.push(newEntry);
      formMessage.textContent = "新規エントリーを登録しました。";
    } else {
      // 編集更新（実際はバックエンド API への PUT などで更新）
      entries[entryId] = newEntry;
      formMessage.textContent = "エントリーを更新しました。";
    }
    renderEntries();
    // 実際のデータ保存はサーバー側 API との連携で行ってください
    form.reset();
    form.entryId.value = "";
  });
});
