window.addEventListener("DOMContentLoaded", async () => {
  const archiveDiv = document.getElementById("archive");
  const tagList = document.getElementById("tag-list");

  const data = await fetch("data.json").then(res => res.json());

  let selectedCharacter = null;

  // --- ① カテゴリツリーを構築 ---
  const tree = {};
  data.forEach(item => {
    const { type, series, character } = item.category;
    if (!tree[type]) tree[type] = {};
    if (!tree[type][series]) tree[type][series] = [];
    if (!tree[type][series].includes(character)) {
      tree[type][series].push(character);
    }
  });

  // --- ② 折りたたみツリー描画 ---
  for (const type in tree) {
    const typeContainer = document.createElement("div");
    const typeToggle = document.createElement("div");
    typeToggle.innerHTML = `▶ ${type}`;
    typeToggle.style.cursor = "pointer";
    typeToggle.style.fontWeight = "bold";
    typeToggle.style.margin = "0.5rem 0";
    
    const seriesContainer = document.createElement("div");
    seriesContainer.style.marginLeft = "1rem";
    seriesContainer.style.display = "none"; // 初期状態は閉じる

    typeToggle.addEventListener("click", () => {
      const isOpen = seriesContainer.style.display === "block";
      seriesContainer.style.display = isOpen ? "none" : "block";
      typeToggle.innerHTML = `${isOpen ? "▶" : "▼"} ${type}`;
    });

    typeContainer.appendChild(typeToggle);
    typeContainer.appendChild(seriesContainer);
    tagList.appendChild(typeContainer);

    for (const series in tree[type]) {
      const seriesWrapper = document.createElement("div");
      seriesWrapper.style.marginBottom = "0.3rem";

      const seriesToggle = document.createElement("div");
      seriesToggle.innerHTML = `📁 ${series}`;
      seriesToggle.style.cursor = "pointer";
      seriesToggle.style.marginLeft = "0.5rem";

      const charContainer = document.createElement("div");
      charContainer.style.marginLeft = "1.5rem";
      charContainer.style.display = "none";

      seriesToggle.addEventListener("click", () => {
        const isOpen = charContainer.style.display === "block";
        charContainer.style.display = isOpen ? "none" : "block";
      });

      tree[type][series].forEach(character => {
        const charBtn = document.createElement("div");
        charBtn.textContent = `👤 ${character}`;
        charBtn.style.cursor = "pointer";
        charBtn.style.margin = "0.2rem 0";
        charBtn.addEventListener("click", () => {
          selectedCharacter = character;
          render();
        });
        charContainer.appendChild(charBtn);
      });

      seriesWrapper.appendChild(seriesToggle);
      seriesWrapper.appendChild(charContainer);
      seriesContainer.appendChild(seriesWrapper);
    }
  }

  // --- ③ アーカイブ表示 ---
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
