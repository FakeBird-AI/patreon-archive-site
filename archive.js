// archive.js

// Worker のエンドポイント
const API_ORIGIN = "https://patreon-archive-site.fakebird279.workers.dev";

let selectedCharacter = null;

// YYYYMMDD形式 → Date オブジェクト変換
function parseDate(dateStr) {
  const y = parseInt(dateStr.slice(0, 4), 10);
  const m = parseInt(dateStr.slice(4, 6), 10) - 1;
  const d = parseInt(dateStr.slice(6, 8), 10);
  return new Date(y, m, d);
}

// ZIPリンク／メッセージを返す
function getZipLinkContent(item) {
  const PRIORITY = {
    "1350114997040316458": 4, // Owner
    "1350114869780680734": 3, // Premium
    "1350114736242557010": 2, // Special
    "1350114379391045692": 1  // Standard
  };
  let max = 0, role = null;
  (window.userRoles || []).forEach(r => {
    if ((PRIORITY[r] || 0) > max) {
      max = PRIORITY[r];
      role = r;
    }
  });

  const fileDate    = parseDate(item.date);
  const oneMonthAgo = new Date();
  oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
  const recent = fileDate >= oneMonthAgo;

  switch (role) {
    case "1350114997040316458": // Owner
    case "1350114869780680734": // Premium
      return `<a href="${item.url}" target="_blank">ZIPリンク</a>`;
    case "1350114736242557010": // Special
      return recent
        ? `<a href="${item.url}" target="_blank">ZIPリンク</a>`
        : "1ヶ月より前のアーカイブです。Premiumにアップグレードすると閲覧可能です。";
    case "1350114379391045692": // Standard
      return recent
        ? "PremiumもしくはSpecialにアップグレードすると閲覧可能です。"
        : "1ヶ月より前のアーカイブです。Premiumにアップグレードすると閲覧可能です。";
    default:
      return "このコンテンツにアクセスできません。";
  }
}

// 管理ページリンク（Owner のみ表示）
function appendAdminLink() {
  if ((window.userRoles || []).includes("1350114997040316458")) {
    const linkDiv = document.createElement("div");
    linkDiv.style.marginTop = "2rem";
    linkDiv.style.textAlign = "center";
    linkDiv.innerHTML = '<a href="admin.html" target="_blank">管理ページへ</a>';
    document.getElementById("tag-list").appendChild(linkDiv);
  }
}

async function initArchive() {
  console.log("✅ initArchive() 開始");

  const archiveDiv = document.getElementById("archive");
  const tagList    = document.getElementById("tag-list");
  const searchBox  = document.getElementById("search-box");

  // 1) データ取得と JSON パース
  let data = [];
  try {
    const res  = await fetch(`${API_ORIGIN}/data.json`, { credentials: "include" });
    data = await res.json();
  } catch (e) {
    console.error("data.json の取得失敗", e);
    archiveDiv.innerHTML = "<p>アーカイブの読み込みに失敗しました。</p>";
    return;
  }

  if (!Array.isArray(data) || data.length === 0) {
    archiveDiv.innerHTML = "<p>アーカイブがありません。</p>";
    return;
  }

  // 新しい順にソート
  data.sort((a, b) => b.date.localeCompare(a.date));

  // ── タグツリー構築 ──
  const tree = {};
  data.forEach(item => {
    const { type, series, character } = item.category;
    if (!tree[type]) tree[type] = {};
    if (!tree[type][series]) tree[type][series] = [];
    if (!tree[type][series].includes(character)) {
      tree[type][series].push(character);
    }
  });

  Object.entries(tree).forEach(([type, seriesMap]) => {
    // タイプ
    const typeDiv    = document.createElement("div");
    const typeToggle = document.createElement("div");
    typeToggle.textContent = `▶ ${type}`;
    typeToggle.classList.add("type-toggle");
    Object.assign(typeToggle.style, { fontWeight:"bold", cursor:"pointer", margin:"0.5rem 0" });
    const seriesDiv = document.createElement("div");
    seriesDiv.style.display    = "none";
    seriesDiv.style.marginLeft = "1rem";

    typeToggle.addEventListener("click", () => {
      const open = seriesDiv.style.display === "block";
      seriesDiv.style.display = open ? "none" : "block";
      typeToggle.textContent = `${open ? "▶" : "▼"} ${type}`;
    });

    typeDiv.append(typeToggle, seriesDiv);
    tagList.appendChild(typeDiv);

    // シリーズ
    Object.entries(seriesMap).forEach(([series, chars]) => {
      const seriesToggle = document.createElement("div");
      seriesToggle.textContent = `▶ ${series}`;
      seriesToggle.classList.add("series-toggle");
      Object.assign(seriesToggle.style, { cursor:"pointer", marginLeft:"0.5rem" });
      const charList = document.createElement("div");
      charList.style.display    = "none";
      charList.style.marginLeft = "1.5rem";

      seriesToggle.addEventListener("click", () => {
        const open = charList.style.display === "block";
        charList.style.display = open ? "none" : "block";
        seriesToggle.textContent = `${open ? "▶" : "▼"} ${series}`;
      });

      chars.forEach(character => {
        const btn = document.createElement("div");
        btn.textContent = `👤 ${character}`;
        Object.assign(btn.style, { cursor:"pointer", margin:"0.2rem 0" });
        btn.addEventListener("click", () => {
          selectedCharacter = character;
          render();
        });
        charList.appendChild(btn);
      });

      seriesDiv.append(seriesToggle, charList);
    });
  });

  // ── 検索＆描画 ──
  function render() {
    archiveDiv.innerHTML = "";
    const kw = searchBox.value.trim().toLowerCase();

    const filtered = data.filter(item => {
      const okChar = !selectedCharacter || item.category.character === selectedCharacter;
      const okKw = !kw
        || item.title.toLowerCase().includes(kw)
        || item.category.series.toLowerCase().includes(kw)
        || item.category.character.toLowerCase().includes(kw)
        || item.tags.some(t => t.toLowerCase().includes(kw));
      return okChar && okKw;
    });

    if (!filtered.length) {
      archiveDiv.innerHTML = "<p>該当する作品が見つかりませんでした。</p>";
      return;
    }

    filtered.forEach(item => {
      const div = document.createElement("div");
      div.className = "item";
      div.innerHTML = `
        <div style="display:flex;gap:1rem;margin-bottom:1rem;align-items:flex-start">
          <img src="${item.thumbnail}" style="width:120px;object-fit:cover;border:1px solid #ccc" />
          <div>
            <strong>${item.title}</strong><br>
            <small>${item.date}</small><br>
            ${item.patreonUrl
              ? `<a href="${item.patreonUrl}" target="_blank">▶ Patreonリンク</a><br>`
              : ""}
            ${getZipLinkContent(item)}
          </div>
        </div>
      `;
      archiveDiv.appendChild(div);
    });
  }

  // 初回描画＆検索連動
  render();
  searchBox.addEventListener("input", render);

  // ── 左メニュー下部にボタン類を追加 ──
  const clearBtn = document.createElement("button");
  clearBtn.textContent = "キャラ選択解除";
  clearBtn.style.display = "block";
  clearBtn.style.margin  = "0.5rem";
  clearBtn.addEventListener("click", () => {
    selectedCharacter = null;
    render();
  });
  tagList.appendChild(clearBtn);

  // 管理ページリンク
  appendAdminLink();

  // ── ハンバーガー開閉（モバイルのみ） ──
  const hamburger = document.getElementById("hamburger");
  const asideEl   = document.querySelector("aside");
  hamburger.addEventListener("click", () => {
    if (window.innerWidth <= 768) {
      asideEl.classList.toggle("open");
    }
  });

  // ── メニュー内選択時に自動で閉じる ──
  document
    .querySelectorAll("#tag-list .type-toggle, #tag-list .series-toggle, #tag-list div > button")
    .forEach(el => {
      el.addEventListener("click", () => {
        if (window.innerWidth <= 768) {
          asideEl.classList.remove("open");
        }
      });
    });
}

// initArchive() の呼び出しは auth.js から行います
