document.addEventListener('DOMContentLoaded', async () => {
  const $  = (s,p=document) => p.querySelector(s);

  // 認証・Owner チェック（省略せずそのまま）
  const token = localStorage.getItem('jwt_token');
  if (!token) { alert('ログインが必要です'); return location.href = '/login'; }
  const verifyRes = await fetch('/verify', { headers: { 'Authorization': `Bearer ${token}` } });
  const verifyData = await verifyRes.json();
  if (!verifyData.loggedIn || !verifyData.roles.includes('1350114997040316458')) {
    alert('権限がありません'); return location.href = '/';
  }

  // 全アイテム取得
  let items = [];
  try {
    items = await (await fetch('/data.json')).json();
  } catch {
    console.error('data.json読み込み失敗');
  }

  // 新規追加フォーム
  $('#add-form').addEventListener('submit', async e => {
    e.preventDefault();
    const f = new FormData(e.target);

    // タグ文字列を配列に
    const rawTags = f.get('tags') || '';
    const tags = rawTags
      .split(',')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    const newItem = {
      id: Date.now().toString(),
      title: f.get('title'),
      patreonUrl: f.get('patreonUrl'),
      boothUrl: f.get('boothUrl'),
      url: f.get('url'),
      thumbnail: f.get('thumbnail'),
      tags,
      date: f.get('date'),
      category: {
        type: f.get('type'),
        series: f.get('series'),
        character: f.get('character')
      }
    };

    items.push(newItem);
    await saveAll(items);
    e.target.reset();
    alert('エントリーを追加しました');
    renderSidebar();
  });

  // 訪問者統計取得（省略せずそのまま）
  const visits = await (await fetch('/admin/visits', {
    headers: { 'Authorization': `Bearer ${token}` }
  })).json();
  const tbody = $('#visits-stats');
  visits.forEach(({ user, pc, mobile }) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="border px-3 py-1">${user}</td>
      <td class="border px-3 py-1">${pc}</td>
      <td class="border px-3 py-1">${mobile}</td>
    `;
    tbody.appendChild(tr);
  });

  // 既存エントリー管理：サイドバー & エディタ描画
  function renderSidebar() {
    const tree = {};
    items.forEach(item => {
      const { type, series } = item.category;
      tree[type] = tree[type] || {};
      tree[type][series] = tree[type][series] || [];
      tree[type][series].push(item);
    });

    const sidebar = $('#editor-sidebar');
    sidebar.innerHTML = '';
    Object.entries(tree).forEach(([type, seriesObj]) => {
      const btnType = document.createElement('button');
      btnType.textContent = type;
      btnType.className = 'block w-full text-left px-2 py-1 bg-gray-200 rounded hover:bg-gray-300';
      const wrap   = document.createElement('div');
      wrap.className = 'hidden ml-4';
      btnType.addEventListener('click', () => wrap.classList.toggle('hidden'));
      sidebar.append(btnType, wrap);

      Object.entries(seriesObj).forEach(([series, arr]) => {
        const btnSeries = document.createElement('button');
        btnSeries.textContent = series;
        btnSeries.className = 'block w-full text-left px-2 py-1 bg-gray-100 rounded hover:bg-gray-200';
        btnSeries.addEventListener('click', () => renderEditor(arr));
        wrap.appendChild(btnSeries);
      });
    });
  }

  function renderEditor(list) {
    const main = $('#editor-main');
    main.innerHTML = '';
    list.forEach(item => {
      const form = document.createElement('form');
      form.className = 'mb-4 p-4 bg-white border rounded space-y-2';
      form.innerHTML = `
        <label class="block">タイトル:<input name="title" value="${item.title}" class="w-full border p-1 rounded"/></label>
        <label class="block">Patreon URL:<input name="patreonUrl" value="${item.patreonUrl||''}" class="w-full border p-1 rounded"/></label>
        <label class="block">BOOTH URL:<input name="boothUrl" value="${item.boothUrl||''}" class="w-full border p-1 rounded"/></label>
        <label class="block">ZIP URL:<input name="url" value="${item.url||''}" class="w-full border p-1 rounded"/></label>
        <label class="block">サムネイル URL:<input name="thumbnail" value="${item.thumbnail||''}" class="w-full border p-1 rounded"/></label>
        <label class="block">タグ:<input name="tags" value="${(item.tags||[]).join(',')}" class="w-full border p-1 rounded"/></label>
        <div class="mt-2 space-x-2">
          <button type="submit" class="px-3 py-1 bg-green-200 rounded hover:bg-green-300">更新</button>
          <button type="button" class="px-3 py-1 bg-red-200 rounded hover:bg-red-300">削除</button>
        </div>
      `;
      // 更新
      form.addEventListener('submit', async e => {
        e.preventDefault();
        const f = new FormData(form);
        item.title      = f.get('title');
        item.patreonUrl = f.get('patreonUrl');
        item.boothUrl   = f.get('boothUrl');
        item.url        = f.get('url');
        item.thumbnail  = f.get('thumbnail');
        item.tags       = (f.get('tags')||'').split(',').map(s=>s.trim()).filter(s=>s);
        await saveAll(items);
        alert('更新しました');
      });
      // 削除
      form.querySelector('button[type=button]').addEventListener('click', async () => {
        if (!confirm('本当に削除しますか？')) return;
        const idx = items.findIndex(i => i.id === item.id);
        items.splice(idx, 1);
        await saveAll(items);
        renderSidebar();
        main.innerHTML = '';
      });
      main.appendChild(form);
    });
  }

  async function saveAll(all) {
    await fetch('/api/update-data', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(all)
    });
  }

  // 初回描画
  renderSidebar();
});
