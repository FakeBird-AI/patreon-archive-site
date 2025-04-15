window.addEventListener("DOMContentLoaded", async () => {
  const archiveDiv = document.getElementById("archive");
  const tagList = document.getElementById("tag-list");

  let data = await fetch("data.json").then(res => res.json());
  let selectedTag = null;

  // タグ一覧を集める（重複なし）
  const allTags = [...new Set(data.flatMap(item => item.tags))];

  // タグボタン生成
  allTags.forEach(tag => {
    const btn = document.createElement("div");
    btn.textContent = tag;
    btn.className = "tag";
    btn.addEventListener("click", () => {
      document.querySelectorAll(".tag").forEach(t => t.classList.remove("active"));
      btn.classList.add("active");
      selectedTag = tag;
      render();
    });
    tagList.appendChild(btn);
  });

  // 表示関数
  function render() {
    archiveDiv.innerHTML = "";
    const filtered = selectedTag
      ? data.filter(item => item.tags.includes(selectedTag))
      : data;

    filtered.forEach(item => {
      const div = document.createElement("div");
      div.className = "item";
      div.innerHTML = `<strong>${item.title}</strong><br><a href="${item.url}" target="_blank">▶ アーカイブを見る</a>`;
      archiveDiv.appendChild(div);
    });
  }

  render(); // 初期表示（全件）
});
