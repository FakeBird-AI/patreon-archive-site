let selectedCharacter = null;
let cutoffDate = null;
let userRole = "unknown"; // standard, special, premium, owner

async function initArchive() {
  console.log("✅ initArchive() 開始");

  const archiveDiv = document.getElementById("archive");
  const tagList = document.getElementById("tag-list");
  const searchBox = document.getElementById("search-box");

  // --- ユーザーのパーミッション取得 ---
  const sessionToken = (document.cookie.match(/session=([^;]+)/) || [])[1];
  const permission = await fetch("https://patreon-archive-site.fakebird279.workers.dev/verify", {
    headers: {
      Authorization: `Bearer ${sessionToken}`,
    },
    credentials: "include"
  }).then(res => res.json());

  cutoffDate = permission.cutoffDate || null;

  // ロール決定（cutoffDate が存在すれば special 扱い、それ以外は premium/owner）
  userRole = "premium";
  if (cutoffDate) userRole = "special";

  console.log("🛂 認証:", permission.username, "cutoff:", cutoffDate, "role:", userRole);

  const data = await fetch("data.json")
    .then(res => res.json())
    .catch(err => {
      console.error("❌ data.jsonの読み込み失敗:", err);
      return [];
    });

  // 🔽 新しい順にソート
  data.sort((a, b) => b.date.localeCompare(a.date));

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

      const showZip =
        userRole === "premium" || userRole === "owner" ||
        (userRole === "special" && item.date >= cutoffDate);

      const zipContent = showZip
        ? `<a href="${item.url}" target="_blank">▶ アーカイブを見る</a>`
        : `<span style="color: gray;">${userRole === "special" ? "Premiumにアップグレードすると閲覧可能です" : "SpecialまたはPremiumにアップグレードすると閲覧可能です"}</span>`;

      div.innerHTML = `
        <div style="display: flex; align-items: flex-start; gap: 1rem; margin-bottom: 1rem;">
          <img src="${item.thumbnail}" alt="サムネイル" style="width: 120px; height: auto; object-fit: cover; border: 1px solid #ccc;" />
          <div>
            <strong>${item.title}</strong><br>
            <small>${item.date}</small><br>
            ${zipContent}
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
