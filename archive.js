let selectedCharacter = null;
let archiveStartDate = null; // ← ここで1ヶ月前日付をセットする

function getToken() {
  const hash = location.hash;
  const match = hash.match(/token=([^&]+)/);
  if (match) {
    const token = match[1];
    localStorage.setItem("token", token); // 保存しておく
    return token;
  }
  return localStorage.getItem("token");
}

async function initArchive(joinedDateStr) {
  console.log("✅ initArchive() 開始");

  const archiveDiv = document.getElementById("archive");
  const tagList = document.getElementById("tag-list");
  const searchBox = document.getElementById("search-box");

  // 🔽 ロールID 1350114379391045692 向けの制限がある場合、日付を算出
  if (joinedDateStr) {
    const joinedDate = new Date(joinedDateStr);
    const oneMonthAgo = new Date(joinedDate.getTime() - 30 * 24 * 60 * 60 * 1000);
    const y = oneMonthAgo.getFullYear();
    const m = String(oneMonthAgo.getMonth() + 1).padStart(2, '0');
    const d = String(oneMonthAgo.getDate()).padStart(2, '0');
    archiveStartDate = `${y}${m}${d}`;
    console.log("📅 閲覧可能な最古日付:", archiveStartDate);
  }

  const data = await fetch("data.json")
    .then(res => res.json())
    .catch(err => {
      console.error("❌ data.jsonの読み込み失敗:", err);
      return [];
    });

  // 🔽 新しい順に並び替え
  data.sort((a, b) => b.date.localeCompare(a.date));

  if (!Array.isArray(data) || data.length === 0) {
    archiveDiv.innerHTML = "<p>アーカイブがありません。</p>";
    return;
  }

  // --- カテゴリ構築 ---
  const tree = {};
  data.forEach(item => {
    if (archiveStartDate && item.date < archiveStartDate) return; // ❗制限対象
    const { type, series, character } = item.category;
    if (!tree[type]) tree[type] = {};
    if (!tree[type][series]) tree[type][series] = [];
    if (!tree[type][series].includes(character)) {
      tree[type][series].push(character);
    }
  });

  for (const type in tree) {
    const typeDiv = document.createElement("div");
    const typeToggle = document.createElement("div");
    typeToggle.textContent = `▶ ${type}`;
    typeToggle.style.fontWeight = "bold";
    typeToggle.style.cursor = "pointer";
    typeToggle.style.margin = "0.5rem 0";

    const seriesDiv = document.createElement("div");
    seriesDiv.style.display = "none";
    seriesDiv.style.marginLeft = "1rem";

    typeToggle.addEventListener("click", () => {
      const open = seriesDiv.style.display === "block";
      seriesDiv.style.display = open ? "none" : "block";
      typeToggle.textContent = `${open ? "▶" : "▼"} ${type}`;
    });

    typeDiv.appendChild(typeToggle);
    typeDiv.appendChild(seriesDiv);
    tagList.appendChild(typeDiv);

    for (const series in tree[type]) {
      const seriesToggle = document.createElement("div");
      seriesToggle.textContent = `▶ ${series}`;
      seriesToggle.style.cursor = "pointer";
      seriesToggle.style.marginLeft = "0.5rem";

      const charList = document.createElement("div");
      charList.style.display = "none";
      charList.style.marginLeft = "1.5rem";

      seriesToggle.addEventListener("click", () => {
        const open = charList.style.display === "block";
        charList.style.display = open ? "none" : "block";
        seriesToggle.textContent = `${open ? "▶" : "▼"} ${series}`;
      });

      tree[type][series].forEach(character => {
        const btn = document.createElement("div");
        btn.textContent = `👤 ${character}`;
        btn.style.cursor = "pointer";
        btn.style.margin = "0.2rem 0";
        btn.addEventListener("click", () => {
          selectedCharacter = character;
          render();
        });
        charList.appendChild(btn);
      });

      seriesDiv.appendChild(seriesToggle);
      seriesDiv.appendChild(charList);
    }
  }

  // --- 表示処理 ---
  function render() {
    archiveDiv.innerHTML = "";
    const keyword = searchBox.value.trim().toLowerCase();

    const filtered = data.filter(item => {
      if (archiveStartDate && item.date < archiveStartDate) return false;
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
      div.innerHTML = `
        <div style="display: flex; align-items: flex-start; gap: 1rem; margin-bottom: 1rem;">
          <img src="${item.thumbnail}" alt="サムネイル" style="width: 120px; height: auto; object-fit: cover; border: 1px solid #ccc;" />
          <div>
            <strong>${item.title}</strong><br>
            <small>${item.date}</small><br>
            <a href="${item.url}" target="_blank">▶ アーカイブを見る</a>
          </div>
        </div>
      `;
      archiveDiv.appendChild(div);
    });
  }

  render();
  searchBox.addEventListener("input", render);

  document.getElementById("hamburger").addEventListener("click", () => {
    document.querySelector("aside").classList.toggle("open");
  });
}

document.addEventListener("DOMContentLoaded", async () => {
  if (location.search.includes("error=unauthorized")) {
    console.warn("⛔ 認証エラーのため処理を中止");
    return;
  }

  const token = getToken();
  if (!token) {
    location.href = "/?error=unauthorized";
    return;
  }

  const permission = await fetch("https://your-worker-domain/get-permission", {
    headers: { Authorization: `Bearer ${token}` }
  }).then(res => res.json());

  if (permission.status !== "ok") {
    location.href = "/?error=unauthorized";
    return;
  }

  const joinedAt = permission.limitAfter
    ? new Date(new Date(permission.limitAfter).getTime() - 30 * 24 * 60 * 60 * 1000)
    : null;

  initArchive(joinedAt ? joinedAt.toISOString().slice(0, 10) : null);
});
