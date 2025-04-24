document.addEventListener('DOMContentLoaded', async () => {
  const $  = (s,p=document) => p.querySelector(s);
  const $$ = (s,p=document) => Array.from(p.querySelectorAll(s));

  // ── モバイルメニュー開閉 ──
  $('#menu-button').addEventListener('click', () =>
    $('#mobile-menu').classList.toggle('hidden')
  );

  // ── トークン取得＆ハッシュ消去 ──
  if (location.hash.includes('token=')) {
    const params = new URLSearchParams(location.hash.slice(1));
    const t = params.get('token');
    if (t) localStorage.setItem('jwt_token', t);
    history.replaceState(null, '', location.pathname);
  }

  // ── 認証・ロール取得 ──
  const token = localStorage.getItem('jwt_token');
  if (!token) return showLogin();
  let data;
  try {
    const res = await fetch('/verify', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    data = await res.json();
    if (!data.loggedIn) throw '';
  } catch {
    return showLogin();
  }
  const roles      = data.roles || [];
  const isOwner    = roles.includes('1350114997040316458');
  const isPremium  = roles.includes('1350114869780680734');
  const isSpecial  = roles.includes('1350114736242557010');
  const isStandard = roles.includes('1350114379391045692');

  // ── データ取得 ──
  let items = [];
  try {
    items = await (await fetch('data.json')).json();
    items.sort((a,b) => Number(b.date) - Number(a.date));
  } catch {
    $('#archive-container').innerHTML =
      '<p class="text-red-600">アーカイブ読み込み失敗</p>';
    return;
  }

  // ── カテゴリツリー構築 ──
  const tree = {};
  items.forEach(item => {
    const cat = item.category || {};
    const t = cat.type      || '未分類';
    const s = cat.series    || '未分類';
    const c = cat.character || '未分類';
    tree[t]         = tree[t] || {};
    tree[t][s]      = tree[t][s] || new Set();
    tree[t][s].add(c);
  });

  // ── サイドバー／モバイルNav構築 ──
  buildSidebar(tree, '#sidebar-nav');
  buildSidebar(tree, '#mobile-nav');

  // ── Owner 用管理ページリンク ──
  if (isOwner) {
    const adminBtn = document.createElement('a');
    adminBtn.href = '/admin';
    adminBtn.textContent = '管理者ページ';
    adminBtn.className = 'sidebar-link type bg-green-200 hover:bg-green-300 mt-4';
    $('#admin-link-container').appendChild(adminBtn);
    $('#mobile-admin-container').appendChild(adminBtn.cloneNode(true));
  }

  // ── 絞り込み処理 ──
  let activeFilter = null;
  $('#sidebar').addEventListener('click', e => onFilterClick(e, '#clear-filter'));
  $('#mobile-menu').addEventListener('click', e => onFilterClick(e, '#mobile-clear'));
  $('#clear-filter').addEventListener('click', clearFilter);
  $('#mobile-clear').addEventListener('click', clearFilter);

  function onFilterClick(e, clearSel) {
    const btn = e.target.closest('.sidebar-link.character');
    if (!btn) return;
    activeFilter = JSON.parse(btn.dataset.filter);
    $$('.sidebar-link').forEach(el => el.classList.remove('active'));
    btn.classList.add('active');
    $(clearSel).classList.remove('hidden');
    if (clearSel === '#mobile-clear') $('#mobile-menu').classList.add('hidden');
    renderArchive();
  }

  function clearFilter() {
    activeFilter = null;
    $$('.sidebar-link').forEach(el => el.classList.remove('active'));
    $('#clear-filter').classList.add('hidden');
    $('#mobile-clear').classList.add('hidden');
    renderArchive();
  }

  // ── アーカイブ描画 ──
  renderArchive();
  function renderArchive() {
    const container = $('#archive-container');
    container.innerHTML = '';
    const list = activeFilter
      ? items.filter(it => {
          const cat = it.category || {};
          return cat.type === activeFilter.type &&
                 cat.series === activeFilter.series &&
                 cat.character === activeFilter.character;
        })
      : items;

    if (list.length === 0) {
      container.innerHTML = '<p class="text-gray-600">該当するアーカイブがありません</p>';
      return;
    }
    list.forEach(item => container.append(createCard(item)));
  }

  function createCard(item) {
    const card = document.createElement('div');
    card.className = 'archive-card';

    if (item.thumbnail) {
      const img = document.createElement('img');
      img.src = item.thumbnail;
      img.alt = item.title;
      img.className = 'thumbnail';
      card.append(img);
    }

    const h2 = document.createElement('h2');
    h2.textContent = item.title;
    h2.className = 'text-lg font-semibold mb-2';
    card.append(h2);

    const links = document.createElement('div');
    links.className = 'mt-2';

    // ▶ Patreon / BOOTH
    if (item.patreonUrl) addLink(links, item.patreonUrl, 'Patreonリンク');
    if (item.boothUrl)   addLink(links, item.boothUrl,   'BOOTHリンク');

    // ▶ ZIP or disabled
    const created     = new Date(item.date.replace(/^(\d{4})(\d{2})(\d{2})$/, '$1-$2-$3'));
    const oneMonthAgo = new Date(); oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

    if (isOwner || isPremium || (isSpecial && created >= oneMonthAgo)) {
      addLink(links, item.url, 'ZIPリンク');
    } else if (isSpecial && created < oneMonthAgo) {
      // Special かつ 1ヶ月より前
      addDisabled(links, 'ZIPリンク(Premiumで閲覧可能です)');
    } else if (isStandard && created < oneMonthAgo) {
      // Standard かつ 1ヶ月より前
      addDisabled(links, 'ZIPリンク(Premiumで閲覧可能です)');
    }  else {
      // Standard
      addDisabled(links, 'ZIPリンク(Special,Premiumで閲覧可能です)');
    }

    card.append(links);
    return card;
  }

  function addLink(parent, href, label) {
    const a = document.createElement('a');
    a.href = href;
    a.target = '_blank';
    a.textContent = '▶ ' + label;
    a.className = 'archive-link text-blue-600';
    parent.append(a);
  }

  function addDisabled(parent, text) {
    const span = document.createElement('span');
    span.textContent = '▶ ' + text;
    span.className = 'archive-link disabled';
    parent.append(span);
  }

  function buildSidebar(tree, sel) {
    const nav = $(sel);
    nav.innerHTML = '';
    for (const [type, seriesObj] of Object.entries(tree)) {
      const btnType = createBtn(type, 'type');
      const wrapSeries = document.createElement('div');
      wrapSeries.className = 'hidden';
      btnType.addEventListener('click', () => wrapSeries.classList.toggle('hidden'));
      nav.append(btnType, wrapSeries);

      for (const [series, chars] of Object.entries(seriesObj)) {
        const btnSeries = createBtn(series, 'series');
        const wrapChar = document.createElement('div');
        wrapChar.className = 'hidden';
        btnSeries.addEventListener('click', () => wrapChar.classList.toggle('hidden'));
        wrapSeries.append(btnSeries, wrapChar);

        chars.forEach(ch => {
          const btnChar = createBtn(ch, 'character', { type, series, character: ch });
          wrapChar.append(btnChar);
        });
      }
    }
    if (sel === '#sidebar-nav') $('#clear-filter').classList.add('hidden');
    else                         $('#mobile-clear').classList.add('hidden');
  }

  function createBtn(text, level, filter = null) {
    const btn = document.createElement('button');
    btn.textContent = text;
    btn.className = `sidebar-link ${level}`;
    if (filter) btn.dataset.filter = JSON.stringify(filter);
    return btn;
  }

  function showLogin() {
    document.body.innerHTML =
      `<p class="text-center mt-20">ログインが必要です。` +
      `<a href="/login" class="text-blue-600 underline">ログインページへ</a></p>`;
  }
});
