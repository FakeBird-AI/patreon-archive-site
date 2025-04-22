// admin.js
const API_ORIGIN = "https://patreon-archive-site.fakebird279.workers.dev";

async function getCookie(name) { /* ... */ }

document.addEventListener("DOMContentLoaded", async () => {
  const token = getCookie("session");
  if (!token) return document.body.innerHTML = "<p>ログインが必要です。</p>";
  const verify = await fetch(`${API_ORIGIN}/verify`, { headers:{ 'Authorization': `Bearer ${token}` }, credentials:'include' });
  const data = await verify.json();
  if (!data.loggedIn || !data.roles.includes("1350114997040316458")) {
    return document.body.innerHTML = "<p>Ownerのみアクセス可。</p>";
  }
  initAdmin(token);
});

async function initAdmin(token) {
  // ① 統計取得
  try {
    const res = await fetch(`${API_ORIGIN}/admin/visits`, {
      headers:{ 'Authorization': `Bearer ${token}` }, credentials:'include'
    });
    const list = await res.json();
    const map = Object.fromEntries(list.map(({user,count}) => [user, count]));
    document.getElementById('visitorTotal').textContent   = map['visit_total'] || 0;
    document.getElementById('visitorMobile').textContent  = map['visit_mobile'] || 0;
    document.getElementById('visitorDesktop').textContent = map['visit_desktop'] || 0;
  } catch(e) { console.error(e); }

  // ② アーカイブ一覧取得
  let entries = await fetch(`${API_ORIGIN}/data.json`, { credentials:'include' }).then(r=>r.json());
  renderEntries(entries);
}

function renderEntries(entries) {
  const container = document.getElementById('entries');
  container.innerHTML = '';
  const grouped = {};
  entries.forEach(e => {
    const t=e.category.type, s=e.category.series, c=e.category.character;
    grouped[t] ??= {};
    grouped[t][s] ??= {};
    grouped[t][s][c] ??= [];
    grouped[t][s][c].push(e);
  });
  for (const t in grouped) {
    const h3 = document.createElement('h3'); h3.textContent = t; container.appendChild(h3);
    for (const s in grouped[t]) {
      const h4 = document.createElement('h4'); h4.textContent = s; container.appendChild(h4);
      for (const c in grouped[t][s]) {
        const h5 = document.createElement('h5'); h5.textContent = c; container.appendChild(h5);
        grouped[t][s][c].forEach((e,i) => {
          const div = document.createElement('div');
          div.className = 'entry-card';
          div.innerHTML = `<strong>${e.title}</strong> (${e.date})
            <button data-index="${i}" class="editEntry">編集</button>`;
          container.appendChild(div);
        });
      }
    }
  }
  // 編集機能は省略（元のまま）
}