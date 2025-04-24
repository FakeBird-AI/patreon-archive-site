// Worker.js
export default {
  async fetch(request, env) {
    // ───── 環境変数 ─────
    const {
      DISCORD_CLIENT_ID:     CLIENT_ID,
      DISCORD_CLIENT_SECRET: CLIENT_SECRET,
      DISCORD_BOT_TOKEN:     BOT_TOKEN,
      DISCORD_GUILD_ID:      GUILD_ID,
      SITE_URL,
      SESSION_SECRET
    } = env;

    // ───── ロールID ─────
    const ALLOWED_ROLE_IDS = [
      "1350114869780680734", // Premium
      "1350114736242557010", // Special
      "1350114379391045692", // Standard
      "1350114997040316458"  // Owner
    ];

    // ───── CORS ヘッダー ─────
    const CORS_HEADERS = {
      "Access-Control-Allow-Origin":      SITE_URL,
      "Access-Control-Allow-Credentials": "true"
    };

    try {
      const url    = new URL(request.url);
      const path   = url.pathname;
      const method = request.method.toUpperCase();

      // ── CORS preflight ──
      if (method === "OPTIONS") {
        return new Response(null, {
          status: 204,
          headers: {
            ...CORS_HEADERS,
            "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, Authorization"
          }
        });
      }

      // ── /track: ユーザー別・デバイスタイプ別訪問記録 ──
      if (path === "/track" && method === "GET") {
        const auth    = request.headers.get("Authorization") || "";
        const token   = auth.startsWith("Bearer ") ? auth.slice(7) : null;
        const payload = token ? await verifySessionToken(token, SESSION_SECRET) : null;
        const userId  = payload?.sub || "anonymous";
        const ua      = request.headers.get("User-Agent") || "";
        const device  = /Mobi|Android|iPhone|iPad/.test(ua) ? "mobile" : "pc";
        const key     = `visit#${userId}#${device}`;
        const prev    = Number(await env.VISITS_KV.get(key) || 0);
        await env.VISITS_KV.put(key, String(prev + 1));
        return new Response("OK", { status: 200, headers: CORS_HEADERS });
      }

      // ── /admin/visits: Owner 向け訪問者統計 ──
      if (path === "/admin/visits" && method === "GET") {
        const auth    = request.headers.get("Authorization") || "";
        const token   = auth.startsWith("Bearer ") ? auth.slice(7) : null;
        const payload = token ? await verifySessionToken(token, SESSION_SECRET) : null;
        if (!payload?.roles?.includes(ALLOWED_ROLE_IDS[3])) {
          return new Response("Forbidden", { status: 403, headers: CORS_HEADERS });
        }
        let cursor;
        const stats = {};
        do {
          const page = await env.VISITS_KV.list({ cursor, limit: 100 });
          cursor = page.cursor;
          for (const { name } of page.keys) {
            const [, user, device] = name.split("#");
            stats[user] = stats[user] || { pc: 0, mobile: 0 };
            stats[user][device] = Number(await env.VISITS_KV.get(name)) || 0;
          }
        } while (cursor);
        const list = Object.entries(stats).map(([user, v]) => ({
          user,
          pc: v.pc,
          mobile: v.mobile
        }));
        return new Response(JSON.stringify(list), {
          status: 200,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" }
        });
      }

      // ── /data.json: アーカイブデータ取得 ──
      if (path === "/data.json" && method === "GET") {
        const body = await env.DATA_KV.get("data.json") || "[]";
        return new Response(body, {
          status: 200,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" }
        });
      }

      // ── /api/update-data: アーカイブデータ更新 ──
      if (path === "/api/update-data" && method === "POST") {
        try {
          const newData = await request.json();
          await env.DATA_KV.put("data.json", JSON.stringify(newData));
          return new Response(JSON.stringify({ success: true }), {
            status: 200,
            headers: { ...CORS_HEADERS, "Content-Type": "application/json" }
          });
        } catch (err) {
          return new Response(JSON.stringify({ success: false, error: err.message }), {
            status: 500,
            headers: { ...CORS_HEADERS, "Content-Type": "application/json" }
          });
        }
      }

      // ── /login: Discord OAuth2 認可リクエスト ──
      if (path === "/login" && method === "GET") {
        const state = crypto.getRandomValues(new Uint8Array(16))
          .reduce((s, b) => s + b.toString(16).padStart(2, "0"), "");
        const headers = {
          ...CORS_HEADERS,
          "Set-Cookie": `oauth_state=${state}; Secure; HttpOnly; Path=/; Max-Age=300; SameSite=Lax`
        };
        const redirectUri = encodeURIComponent(SITE_URL + "/callback");
        const discordAuthURL =
          `https://discord.com/api/oauth2/authorize` +
          `?client_id=${CLIENT_ID}` +
          `&redirect_uri=${redirectUri}` +
          `&response_type=code&scope=identify&state=${state}`;
        return new Response(null, {
          status: 302,
          headers: { ...headers, Location: discordAuthURL }
        });
      }

      // ── /callback: OAuth2 コールバック受信 ──
      if (path === "/callback" && method === "GET") {
        const code  = url.searchParams.get("code");
        const state = url.searchParams.get("state");
        if (!code || !state) {
          return new Response("Invalid OAuth callback", {
            status: 400,
            headers: CORS_HEADERS
          });
        }
        const ck = request.headers.get("Cookie") || "";
        const m  = ck.match(/oauth_state=([^;]+)/);
        if (!m || m[1] !== state) {
          return new Response("Invalid state", {
            status: 400,
            headers: CORS_HEADERS
          });
        }
        // トークン取得
        const tokenRes = await fetch("https://discord.com/api/oauth2/token", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            client_id:     CLIENT_ID,
            client_secret: CLIENT_SECRET,
            grant_type:    "authorization_code",
            code,
            redirect_uri:  SITE_URL + "/callback"
          })
        });
        if (!tokenRes.ok) {
          return new Response("Token error", {
            status: 500,
            headers: CORS_HEADERS
          });
        }
        const { access_token } = await tokenRes.json();
        // ユーザー情報取得
        const userRes = await fetch("https://discord.com/api/v10/users/@me", {
          headers: { Authorization: `Bearer ${access_token}` }
        });
        if (!userRes.ok) {
          return new Response("User fetch error", {
            status: 500,
            headers: CORS_HEADERS
          });
        }
        const user = await userRes.json();
        // ギルド参加確認
        const memberRes = await fetch(
          `https://discord.com/api/v10/guilds/${GUILD_ID}/members/${user.id}`,
          { headers: { Authorization: `Bot ${BOT_TOKEN}` } }
        );
        if (!memberRes.ok) {
          return new Response(null, {
            status: 302,
            headers: { ...CORS_HEADERS, Location: SITE_URL + "/?error=unauthorized" }
          });
        }
        const member    = await memberRes.json();
        const userRoles = member.roles || [];
        if (!userRoles.some(r => ALLOWED_ROLE_IDS.includes(r))) {
          return new Response(null, {
            status: 302,
            headers: { ...CORS_HEADERS, Location: SITE_URL + "/?error=unauthorized" }
          });
        }
        // セッション JWT 発行
        const sessionToken = await createSessionToken(user, userRoles, SESSION_SECRET);
        return new Response(null, {
          status: 302,
          headers: { ...CORS_HEADERS, Location: SITE_URL + "/#token=" + sessionToken }
        });
      }

      // ── /verify: ログイン状態・ロール返却 ──
      if (path === "/verify" && method === "GET") {
        let token = null;
        const authHeader = request.headers.get("Authorization") || "";
        if (authHeader.startsWith("Bearer ")) {
          token = authHeader.slice(7);
        } else {
          const ck = request.headers.get("Cookie") || "";
          const m  = ck.match(/session=([^;]+)/);
          if (m) token = m[1];
        }

        const result = { loggedIn: false, roles: [] };
        if (token) {
          const payload = await verifySessionToken(token, SESSION_SECRET);
          if (payload) {
            result.loggedIn = true;
            result.username = payload.username;
            result.roles    = Array.isArray(payload.roles) ? payload.roles : [];
          }
        }

        return new Response(JSON.stringify(result), {
          status: 200,
          headers: {
            ...CORS_HEADERS,
            "Content-Type": "application/json",
            "Cache-Control": "no-store"
          }
        });
      }

      // ── /logout: ログアウト ──
      if (path === "/logout" && method === "GET") {
        return new Response(null, {
          status: 302,
          headers: { ...CORS_HEADERS, Location: SITE_URL + "/?logout=true" }
        });
      }

      // ── 静的アセット配信 ──
      return env.ASSETS.fetch(request);

    } catch (err) {
      console.error("fetch error:", err);
      return new Response("Internal Server Error", {
        status: 500,
        headers: CORS_HEADERS
      });
    }
  }
};

// ─── JWT 発行／検証ユーティリティ ───
async function createSessionToken(user, userRoles, secret) {
  const header  = { alg: "HS256", typ: "JWT" };
  const payload = {
    sub: user.id,
    username: `${user.username}#${user.discriminator || "0000"}`,
    roles: userRoles,
    exp: Math.floor(Date.now() / 1000) + 3600
  };
  const b64url = obj =>
    btoa(String.fromCharCode(...new TextEncoder().encode(JSON.stringify(obj))))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
  const h = b64url(header);
  const p = b64url(payload);
  const data = `${h}.${p}`;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sigBuf = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(data)
  );
  let bin = "";
  new Uint8Array(sigBuf).forEach(b => (bin += String.fromCharCode(b)));
  const s = btoa(bin)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
  return `${data}.${s}`;
}

async function verifySessionToken(token, secret) {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [h, p, s] = parts;
  try {
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    const data = `${h}.${p}`;
    const buf  = await crypto.subtle.sign(
      "HMAC",
      key,
      new TextEncoder().encode(data)
    );
    let bin = "";
    new Uint8Array(buf).forEach(b => (bin += String.fromCharCode(b)));
    const expected = btoa(bin)
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
    if (expected !== s) return null;
    const json = atob(p.replace(/-/g, "+").replace(/_/g, "/"));
    const pl   = JSON.parse(json);
    if (pl.exp && Math.floor(Date.now() / 1000) > pl.exp) return null;
    return pl;
  } catch {
    return null;
  }
}
