// archive.js
// Worker のエンドポイント
const API_ORIGIN = "https://patreon-archive-site.fakebird279.workers.dev";

let selectedCharacter = null;

function parseDate(dateStr) {
  const y = +dateStr.slice(0, 4), m = +dateStr.slice(4, 6) - 1, d = +dateStr.slice(6, 8);
  return new Date(y, m, d);
}

function getZipLinkContent(item) {
  const PRIORITY = {
    "1350114997040316458": 4, // Owner
    "1350114869780680734": 3, // Premium
    "1350114736242557010": 2, // Special
    "1350114379391045692": 1  // Standard
  };
  let max = 0, role = null;
  (window.userRoles || []).forEach(r => {
    if ((PRIORITY[r]||0) > max) { max = PRIORITY[r]; role = r; }
  });
  const fileDate = parseDate(item.date);
  const oneMonthAgo = new Date();
  oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
  const recent = fileDate >= oneMonthAgo;
  switch (role) {
    case "1350114997040316458":
    case "1350114869780680734":
      return `<a href="${item.url}" target="_blank">ZIPリンク</a>`;
    case "1350114736242557010":
      return recent
        ? `<a href="${item.url}" target="_blank">ZIPリンク</a>`
        : "1ヶ月より前のアーカイブです。Premiumにアップグレードすると閲覧可能です。";
    case "1350114379391045692":
      return "PremiumもしくはSpecialにアップグレードすると閲覧可能です。";
    default:
      return "このコンテンツにアクセスできません。";
  }
}

function appendAdminLink() {
  if ((window.userRoles||[]).includes("1350114997040316458")) {
    const linkDiv = document.createElement("div");
    linkDiv.style.marginTop = "2rem"; linkDiv.style.textAlign = "center";
    linkDiv.innerHTML = '<a href="admin.html" target="_blank">管理ページへ</a>';
    document.getElementById("tag-list").appendChild(linkDiv);
  }
}

async function initArchive() {
  const archiveDiv = document.getElementById("archive");
  const tagList = document.getElementById("tag-list");
  const searchBox = document.getElementById("search-box");

  // モバイル右スライド用クラスをリセット
  tagList.classList.remove("open");

  let data = [];
  try {
    const res = await fetch(`${API_ORIGIN}/data.json`, { credentials: "include" });
    data = await res.json();
  } catch {
    archiveDiv.innerHTML = "<p>アーカイブの読み込みに失敗しました。</p>";
    return;
  }
  if (!data.length) {
    archiveDiv.innerHTML = "<p>アーカイブがありません。</p>";
    return;
  }
  data.sort((a,b)=>b.date.localeCompare(a.date));

  // タグツリー構築（略）

  function render() {
    // 検索／フィルタ処理（略）
    filtered.forEach(item => {
      const div = document.createElement("div");
      div.className = "item";
      div.innerHTML = `
        <div class="card">
          <img src="${item.thumbnail}" class="thumb" />
          <div class="info">
            <strong>${item.title}</strong><br>
            <small>${item.date}</small><br>
            ${item.patreonUrl?`<a href="${item.patreonUrl}" target="_blank">Patreonリンク</a><br>`:""}
            ${getZipLinkContent(item)}
          </div>
        </div>`;
      archiveDiv.appendChild(div);
    });
  }
  render();
  searchBox.addEventListener("input", render);

  // キャラ選択解除ボタン（略）
  appendAdminLink();

  // ハンバーガー開閉
  document.getElementById("hamburger")
    .addEventListener("click", () => tagList.classList.toggle("open"));
}

// トークン取得＋認証済みなら initArchive() が呼ばれます
