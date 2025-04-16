let selectedCharacter = null;

// YYYYMMDD形式の文字列をDateオブジェクトに変換する関数
function parseDate(dateStr) {
  const year  = parseInt(dateStr.substring(0,4),10);
  const month = parseInt(dateStr.substring(4,6),10) - 1;
  const day   = parseInt(dateStr.substring(6,8),10);
  return new Date(year, month, day);
}

// ZIPリンク表示／メッセージ切り替え
function getZipLinkContent(item) {
  // ロール優先度マップ
  const PRIORITY = {
    "1350114997040316458": 4,  // Owner
    "1350114869780680734": 3,  // Premium
    "1350114736242557010": 2,  // Special
    "1350114379391045692": 1   // Standard
  };
  // 最上位ロールを判定
  let max = 0, effectiveRole = null;
  (window.userRoles||[]).forEach(r=>{
    if (PRIORITY[r] > max) max = PRIORITY[r], effectiveRole = r;
  });

  const fileDate    = parseDate(item.date);
  const oneMonthAgo = new Date();
  oneMonthAgo.setMonth(oneMonthAgo.getMonth()-1);
  const recent = fileDate >= oneMonthAgo;

  switch (effectiveRole) {
    case "1350114997040316458": // Owner
    case "1350114869780680734": // Premium
      return `<a href="${item.url}" target="_blank">ZIPリンク</a>`;
    case "1350114736242557010": // Special
      return recent
        ? `<a href="${item.url}" target="_blank">ZIPリンク</a>`
        : "1ヶ月より前のアーカイブです。Premiumにアップグレードしてください。";
    case "1350114379391045692": // Standard
      return recent
        ? "PremiumもしくはSpecialにアップグレードしてください。"
        : "1ヶ月より前のアーカイブです。Premiumにアップグレードしてください。";
    default:
      return "このコンテンツにアクセスできません。";
  }
}

// 管理ページリンクをサイドバー下部に追加
function appendAdminLink() {
  if ((window.userRoles||[]).includes("1350114997040316458")) {
    const div = document.createElement("div");
    div.style.marginTop   = "2rem";
    div.style.textAlign   = "center";
    div.innerHTML         = '<a href="admin.html" target="_blank">管理ページへ</a>';
    document.getElementById("tag-list").appendChild(div);
  }
}

async function initArchive() {
  const archiveDiv = document.getElementById("archive");
  const tagList    = document.getElementById("tag-list");
  const searchBox  = document.getElementById("search-box");

  const data = await fetch("data.json")
    .then(r => r.json())
    .catch(e => {
      console.error(e);
      return [];
    });

  data.sort((a,b) => b.date.localeCompare(a.date));
  if (!data.length) {
    archiveDiv.innerHTML = "<p>アーカイブがありません。</p>";
    return;
  }

  // --- タグツリー構築（省略） ---
  // （既存のカテゴリ構築コードをそのままここに）

  // --- 検索＆描画 ---
  function render() {
    archiveDiv.innerHTML = "";
    const kw = searchBox.value.trim().toLowerCase();
    const filtered = data.filter(item => {
      const okChar = !selectedCharacter || item.category.character === selectedCharacter;
      const okKw = !kw
        || item.title.toLowerCase().includes(kw)
        || item.category.series.toLowerCase().includes(kw)
        || item.category.character.toLowerCase().includes(kw)
        || item.tags.some(t=>t.toLowerCase().includes(kw));
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
          <img src="${item.thumbnail}" style="width:120px;object-fit:cover;border:1px solid #ccc;" />
          <div>
            <strong>${item.title}</strong><br>
            <small>${item.date}</small><br>
            ${getZipLinkContent(item)}
          </div>
        </div>`;
      archiveDiv.appendChild(div);
    });
  }

  render();
  searchBox.addEventListener("input", render);

  // ハンバーガー開閉
  document.getElementById("hamburger")
    .addEventListener("click", ()=> document.querySelector("aside").classList.toggle("open"));

  // 管理リンクは一度だけ追加
  appendAdminLink();
}
