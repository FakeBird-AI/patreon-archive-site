let selectedCharacter = null;

// YYYYMMDD形式の文字列をDateオブジェクトに変換する関数
function parseDate(dateStr) {
  const year = parseInt(dateStr.substring(0, 4), 10);
  const month = parseInt(dateStr.substring(4, 6), 10) - 1; // 月は0～11
  const day = parseInt(dateStr.substring(6, 8), 10);
  return new Date(year, month, day);
}

// ユーザーのロールとファイルの日付に応じたZIPリンクまたはメッセージを返す関数
function getZipLinkContent(item) {
  // ユーザーのロール情報（Discord連携の結果）から最も優先度の高いロールを判定
  let effectiveRole = "None";
  if (window.userRoles && Array.isArray(window.userRoles)) {
    const ROLE_PRIORITY = {
      "1350114997040316458": 4,  // Owner
      "1350114869780680734": 3,  // Premium
      "1350114736242557010": 2,  // Special
      "1350114379391045692": 1   // Standard
    };
    let maxPriority = 0;
    window.userRoles.forEach(role => {
      if (ROLE_PRIORITY[role] && ROLE_PRIORITY[role] > maxPriority) {
        maxPriority = ROLE_PRIORITY[role];
      }
    });
    if (maxPriority === 4) {
      effectiveRole = "Owner";
    } else if (maxPriority === 3) {
      effectiveRole = "Premium";
    } else if (maxPriority === 2) {
      effectiveRole = "Special";
    } else if (maxPriority === 1) {
      effectiveRole = "Standard";
    }
  }

  // ファイルの日付をパースし、「一ヶ月以内」かどうか判定
  const fileDate = parseDate(item.date);
  const now = new Date();
  const oneMonthAgo = new Date(now);
  oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
  const isWithinOneMonth = fileDate >= oneMonthAgo;

  // ロール毎の条件
  switch (effectiveRole) {
    case "Owner":
    case "Premium":
      // 期間に関係なく常にZIPリンクを表示
      return `<a href="${item.url}" target="_blank">ZIPリンク</a>`;
    case "Special":
      if (isWithinOneMonth) {
        return `<a href="${item.url}" target="_blank">ZIPリンク</a>`;
      } else {
        return "1ヶ月より前のアーカイブです。Premiumにアップグレードすると閲覧可能です。";
      }
    case "Standard":
      if (isWithinOneMonth) {
        return "PremiumもしくはSpecialにアップグレードすると閲覧可能です。";
      } else {
        return "1ヶ月より前のアーカイブです。Premiumにアップグレードすると閲覧可能です。";
      }
    default:
      return "このコンテンツにアクセスできません。";
  }
}

async function initArchive() {
  console.log("✅ initArchive() 開始");

  const archiveDiv = document.getElementById("archive");
  const tagList = document.getElementById("tag-list");
  const searchBox = document.getElementById("search-box");

  const data = await fetch("data.json")
    .then(res => res.json())
    .catch(err => {
      console.error("❌ data.jsonの読み込み失敗:", err);
      return [];
    });

  // 新しい順にソート（dateが文字列として比較可能である前提）
  data.sort((a, b) => b.date.localeCompare(a.date));

  if (!Array.isArray(data) || data.length === 0) {
    archiveDiv.innerHTML = "<p>アーカイブがありません。</p>";
    return;
  }

  // --- カテゴリ構築 ---
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

  // --- 検索＆描画 ---
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

      div.innerHTML = `
        <div style="display: flex; align-items: flex-start; gap: 1rem; margin-bottom: 1rem;">
          <img src="${item.thumbnail}" alt="サムネイル" style="width: 120px; height: auto; object-fit: cover; border: 1px solid #ccc;" />
          <div>
            <strong>${item.title}</strong><br>
            <small>${item.date}</small><br>
            ${getZipLinkContent(item)}
          </div>
        </div>
      `;
      archiveDiv.appendChild(div);
    });
  }

  render();
  searchBox.addEventListener("input", render);

  // ハンバーガー開閉
  document.getElementById("hamburger").addEventListener("click", () => {
    document.querySelector("aside").classList.toggle("open");
  });
}
