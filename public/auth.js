// auth.js
document.addEventListener('DOMContentLoaded', () => {
  const loginBtn = document.getElementById('loginBtn');
  const logoutBtn = document.getElementById('logoutBtn');
  const usernameSpan = document.getElementById('username');
  const sidebar = document.getElementById('sidebar');
  const search = document.getElementById('search');
  const main = document.getElementById('main-content');

  function updateUI(loggedIn, username) {
    if (loggedIn) {
      loginBtn.classList.add('hidden');
      logoutBtn.classList.remove('hidden');
      usernameSpan.textContent = username;
      sidebar.classList.remove('hidden');
      search.classList.remove('hidden');
      main.classList.remove('hidden');
    } else {
      loginBtn.classList.remove('hidden');
      logoutBtn.classList.add('hidden');
      usernameSpan.textContent = '';
      sidebar.classList.add('hidden');
      search.classList.add('hidden');
      main.classList.add('hidden');
    }
  }

  // ログアウト処理
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('logout') === 'true') {
    document.cookie = 'session=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT';
    history.replaceState(null, '', window.location.pathname);
  }

  // ハッシュトークン保存
  if (window.location.hash.startsWith('#token=')) {
    const token = window.location.hash.substring(7);
    document.cookie = `session=${token}; Path=/; Secure; SameSite=Lax; Max-Age=86400`;
    history.replaceState(null, '', window.location.pathname);
  }

  const sessionToken = getSessionToken();
  if (sessionToken) {
    fetch(`${location.origin}/verify`, {
      credentials: 'include',
      headers: { Authorization: `Bearer ${sessionToken}` }
    })
      .then(res => res.json())
      .then(data => updateUI(data.loggedIn, data.username))
      .catch(() => updateUI(false));
  } else {
    updateUI(false);
  }

  loginBtn.addEventListener('click', () => window.location.href = `${location.origin}/login`);
  logoutBtn.addEventListener('click', () => window.location.href = `${location.origin}/logout`);

  function getSessionToken() {
    const m = document.cookie.match(/session=([^;]+)/);
    return m ? decodeURIComponent(m[1]) : null;
  }
});