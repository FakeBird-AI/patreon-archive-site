window.addEventListener("DOMContentLoaded", async () => {
  const archiveDiv = document.getElementById("archive");
  const tagList = document.getElementById("tag-list");

  const data = await fetch("data.json").then(res => res.json());

  let selectedCharacter = null;

  // --- ① カテゴリツリーを構築する ---
  const tree = {}; // { ゲーム: { スト6: [マリーザ, ルーク] }, Vtuber: {...} }

  data.forEach(item => {
    const { type, series, character } = item.category;
    if (!tree[type]) tree[type] = {};
    if (!tree[type][series]) tree[type][series] = [];
    if (!tree[type][series].includes(character)) {
      tree[type][series].push(character);
    }
  });

  // --- ② サイドバーに表示 ---
  for (const type in tree) {
    const typeDiv = document.createElement("div");
    typeDiv.innerHTML = `<strong>${type}</strong>`;
    tagList.appendChild(typeDiv);

    for (const series in tree[type]) {
      const seriesDiv = document.createElement("div");
      seriesDiv.style.marginLeft = "1rem";
      seriesDiv.textContent = `📁 ${series}`;
      tagList.appendChild(seriesDiv);

      tree[type][series].forEach(character => {
        const charBtn = document.createElement("div");
        charBtn.textContent = `👤 ${character}`;
        charBtn.style.marginLeft = "2rem";
        charBtn.style.cursor = "pointer";
        charBtn.style.color = "blue";

        charBtn.addEventListener("click", () => {
          selectedCharacter = character;
          render();
        });

        tagList.appendChild(charBtn);
      });
    }
  }

  // --- ③ 作品一覧を表示 ---
  function render() {
    archiveDiv.innerHTML = "";
    const filtered = selectedCharacter
      ? data.filter(item => item.category.character === selectedCharacter)
      : data;

    filtered.forEach(item => {
      const div = document.createElement("div");
      div.className = "item";
      div.innerHTML = `<strong>${item.title}</strong><br><a href="${item.url}" target="_blank">▶ アーカイブを見る</a>`;
      archiveDiv.appendChild(div);
    });
  }

  render();
});
