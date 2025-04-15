async function initArchive() {
  const archiveDiv = document.getElementById("archive");
  const tagList = document.getElementById("tag-list");
  const searchBox = document.getElementById("search-box");

  const data = await fetch("data.json").then(res => res.json());
  let selectedCharacter = null;

  // --- カテゴリツリー構築 ---
  const tree = {};
  data.forEach(item => {
    const { type, series, character } = item.category;
    if (!tree[type]) tree[type] = {};
    if (!tree[type][series]) tree[type][series] = [];
    if (!tree[type][series].includes(character)) {
      tree[type][series].push(character);
    }
  });

  for (const type in tree) {
    const typeContainer = document.createElement("div");
    const typeToggle = document.createElement("div");
    typeToggle.textContent = `▶ ${type}`;
    typeToggle.style.cursor = "pointer";
    typeToggle.style.fontWeight = "bold";
    typeToggle.style.margin = "0.5rem 0";

    const seriesContainer = document.createElement("div");
    seriesContainer.style.marginLeft = "1rem";
    seriesContainer.style.display = "none";

    typeToggle.addEventListener("click", () => {
      const isOpen = seriesContainer.style.display === "block";
      seriesContainer.style.display = isOpen ? "none" : "block";
      typeToggle.textContent = `${isOpen ? "▶" : "▼"} ${type}`;
    });

    typeContainer.appendChild(typeToggle);
    typeContainer.appendChild(seriesContainer);
    tagList.appendChild(typeContainer);

    for (const series in tree[type]) {
      const seriesWrapper = document.createElement("div");
      const seriesToggle = document.createElement("div");
      seriesToggle.textContent = `▶ ${series}`;
      seriesToggle.style.cursor = "pointer";
      seriesToggle.style.marginLeft = "0.5rem";

      const charContainer = document.createElement("div");
      charContainer.style.marginLeft = "1.5rem";
      charContainer.style.display = "none";

      seriesToggle.addEventListener("click", () => {
        const isOpen = charContainer.style.display === "block";
        charContainer.style.display = isOpen ? "none" : "block";
        seriesToggle.textContent = `${isOpen ? "▶" : "▼"} ${series}`;
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

  // --- 検索処理＋描画 ---
  function render() {
    archiveDiv.innerHTML = "";
    const keyword = searchBox.value.trim().toLowerCase();

    const filtered = data.filter(item => {
      const matchChar = selectedCharacter ? item.category.character === selectedCharacter : true;
      const matchKeyword =
        keyword === "" ||
        item.title.toLowerCase().includes(keyword) ||
        item.category.character.toLowerCase().includes(keyword) ||
        item.category.series.toLowerCase().includes(keyword) ||
        item.tags.some(tag => tag.toLowerCase().includes(keyword));
      return matchChar && matchKeyword;
    });

    if (filtered.length === 0) {
      archiveDiv.innerHTML = "<p>該当する作品が見つかりませんでした。</p>";
      return;
    }

    filtered.forEach(item => {
      const div = document.createElement("div");
      div.className = "item";
      div.innerHTML = `<strong>${item.title}</strong><br><a href="${item.url}" target="_blank">▶ アーカイブを見る</a>`;
      archiveDiv.appendChild(div);
    });
  }

  render(); // 初回表示
  searchBox.addEventListener("input", render);

  // --- ハンバーガーメニュー開閉 ---
  const hamburger = document.getElementById("hamburger");
  const aside = document.querySelector("aside");

  hamburger.addEventListener("click", () => {
    aside.classList.toggle("open");
  });
}
