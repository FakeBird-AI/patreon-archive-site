// Worker のエンドポイント
const API_ORIGIN = "https://patreon-archive-site.fakebird279.workers.dev";

async function initArchive() {
  const archiveDiv = document.getElementById("archive");
  const tagList    = document.getElementById("tag-list");
  const searchBox  = document.getElementById("search-box");

  // 1) データ取得と JSON パース
  let data = [];
  try {
    const res = await fetch(`${API_ORIGIN}/data.json`, { credentials: "include" });
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

  // 以降は data を配列として扱ってOK…
  data.sort((a,b) => b.date.localeCompare(a.date));
  // ── タグツリー構築や render() 定義 省略 ──

   render();
  searchBox.addEventListener("input", render);

  // ── 左メニュー下部にボタン類を追加 ──
  // 1) キャラ選択解除
  const clearBtn = document.createElement("button");
  clearBtn.textContent = "キャラ選択解除";
  clearBtn.style.display = "block";
  clearBtn.style.margin  = "0.5rem";
  clearBtn.addEventListener("click", () => {
    selectedCharacter = null;
    render();
  });
  tagList.appendChild(clearBtn);

  // 2) 管理ページリンク（Owner のみ表示）
  appendAdminLink();

  // ── ハンバーガー開閉 ──
  document.getElementById("hamburger")
    .addEventListener("click", () => {
      document.querySelector("aside").classList.toggle("open");
    });
}
