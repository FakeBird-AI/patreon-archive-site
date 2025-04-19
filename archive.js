// archive.js
const API_ORIGIN = "https://patreon-archive-site.fakebird279.workers.dev";

// Cookie取得ヘルパー
function getCookie(name) {
  const m = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return m ? decodeURIComponent(m[1]) : null;
}

async function initArchive() {
  // ② ページアクセスごとにトラッキング
  const token = getCookie("session");
  if (token) {
    fetch(`${API_ORIGIN}/track`, {
      method: "GET",
      credentials: "include",
      headers: { "Authorization": `Bearer ${token}` }
    }).catch(()=>{ /* 無視 */ });
  }

  const archiveDiv = document.getElementById("archive");
  const tagList    = document.getElementById("tag-list");
  const searchBox  = document.getElementById("search-box");

  // データ取得
  let data = [];
  try {
    const res = await fetch(`${API_ORIGIN}/data.json`, { credentials: "include" });
    data = await res.json();
  } catch {
    archiveDiv.innerHTML = "<p>アーカイブの読み込みに失敗しました。</p>";
    return;
  }
  data.sort((a,b)=>b.date.localeCompare(a.date));

  // タグツリー構築・検索処理は既存ロジックを流用
  // （略）

  function render(filtered) {
    archiveDiv.innerHTML = "";
    filtered.forEach(item => {
      const div = document.createElement("div");
      div.className = "item";
      div.innerHTML = `
        <div class="card">
          <img src="${item.thumbnail}" class="thumb" alt="サムネ">
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

  // 初回レンダー
  render(data);

  // 検索ボックスイベント
  searchBox.addEventListener("input", ()=> render(data.filter(item => {
    const kw = searchBox.value.trim().toLowerCase();
    return item.title.toLowerCase().includes(kw)
        || item.category.series.toLowerCase().includes(kw)
        || item.category.character.toLowerCase().includes(kw);
  })));

  // ① ハンバーガー開閉／スライド
  const hamburger = document.getElementById("hamburger");
  hamburger.addEventListener("click", () => {
    const isClosed = tagList.classList.toggle("open");
    if (!isClosed) hamburger.classList.add("open");
    else hamburger.classList.remove("open");
  });

  // 管理者リンク追加（Ownerのみ）
  appendAdminLink();
}

// 既存の getZipLinkContent, appendAdminLink 関数は省略せず流用してください
