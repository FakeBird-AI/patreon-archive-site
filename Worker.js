// Worker.js

const CLIENT_ID     = "1361347551244189888";
const GUILD_ID         = "1350113813818773534";
const ALLOWED_ROLE_IDS = [
  "1350114869780680734", // Premium
  "1350114736242557010", // Special
  "1350114379391045692", // Standard
  "1350114997040316458"  // Owner
];
const SITE_URL       = "https://patreon-archive-site.pages.dev";
const REDIRECT_URI   = "https://patreon-archive-site.fakebird279.workers.dev/callback";
const SESSION_SECRET = "mtVtbATYVJA66Y5FB7AsZ92EARjTy3XdkqTM73ZZ";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": SITE_URL,
  "Access-Control-Allow-Credentials": "true"
};

export default {
  async fetch(request, env) {
    const url  = new URL(request.url);
    const path = url.pathname;
    const CLIENT_ID     = env.CLIENT_ID;
    const CLIENT_SECRET = env.CLIENT_SECRET;

    // 1) CORS プリフライト対応
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: {
          ...CORS_HEADERS,
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization"
        }
      });
    }

    // 2) 訪問数トラッキング
    if (path === "/track" && request.method === "GET") {
      const auth    = request.headers.get("Authorization") || "";
      const token   = auth.startsWith("Bearer ") ? auth.slice(7) : null;
      const payload = token ? await verifySessionToken(token) : null;
      const userId  = payload?.sub || "anonymous";
      const key     = `visit#${userId}`;
      const prev    = Number(await env.VISITS_KV.get(key) || 0);
      await env.VISITS_KV.put(key, String(prev + 1));
      return new Response("OK", { status: 200, headers: CORS_HEADERS });
    }

    // 3) 管理画面用アクセスログ取得
    if (path === "/admin/visits" && request.method === "GET") {
      const auth    = request.headers.get("Authorization") || "";
      const token   = auth.startsWith("Bearer ") ? auth.slice(7) : null;
      const payload = token ? await verifySessionToken(token) : null;
      if (!payload?.roles?.includes(ALLOWED_ROLE_IDS[3])) {
        return new Response("Forbidden", { status: 403, headers: CORS_HEADERS });
      }
      let cursor;
      const list = [];
      do {
        const page = await env.VISITS_KV.list({ cursor, limit: 100 });
        cursor     = page.cursor;
        for (const k of page.keys) {
          const user  = k.name.replace("visit#","");
          const count = Number(await env.VISITS_KV.get(k.name));
          list.push({ user, count });
        }
      } while (cursor);
      return new Response(JSON.stringify(list), {
        status: 200,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" }
      });
    }

    // 4) data.json 取得
    if (path === "/data.json" && request.method === "GET") {
      const stored = await env.DATA_KV.get("data.json");
      if (stored) {
        return new Response(stored, {
          status: 200,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" }
        });
      }
    }

    // 5) data.json 更新
    if (path === "/api/update-data" && request.method === "POST") {
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

    // 6) Discord OAuth2 /login
    if (path === "/login") {
      const state = crypto.getRandomValues(new Uint8Array(16))
                          .reduce((s,b)=>s+b.toString(16).padStart(2,"0"),"");
      const headers = {
        ...CORS_HEADERS,
        "Set-Cookie": `oauth_state=${state}; Secure; HttpOnly; Path=/; Max-Age=300; SameSite=Lax`
      };
      const discordAuthURL =
        `https://discord.com/api/oauth2/authorize?client_id=${CLIENT_ID}`+
        `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}`+
        `&response_type=code&scope=identify&state=${state}`;
      return new Response(null, { status: 302, headers: { ...headers, Location: discordAuthURL } });
    }

    // 7) Discord OAuth2 コールバック
    if (path === "/callback") {
      const code  = url.searchParams.get("code");
      const state = url.searchParams.get("state");
      if (!code || !state) {
        return new Response("Invalid OAuth callback", { status: 400, headers: CORS_HEADERS });
      }
      const ck = request.headers.get("Cookie") || "";
      const m  = ck.match(/oauth_state=([^;]+)/);
      if (!m || m[1] !== state) {
        return new Response("Invalid state", { status: 400, headers: CORS_HEADERS });
      }
      const tokenRes = await fetch("https://discord.com/api/oauth2/token", {
        method: "POST",
        headers:{ "Content-Type":"application/x-www-form-urlencoded" },
        body:new URLSearchParams({
          client_id:     CLIENT_ID,
          client_secret: CLIENT_SECRET,
          grant_type:    "authorization_code",
          code, redirect_uri:REDIRECT_URI
        })
      });
      if (!tokenRes.ok) {
        return new Response("Token error", { status: 500, headers: CORS_HEADERS });
      }
      const { access_token } = await tokenRes.json();
      const userRes = await fetch("https://discord.com/api/v10/users/@me", {
        headers:{ "Authorization":`Bearer ${access_token}` }
      });
      if (!userRes.ok) {
        return new Response("User fetch error", { status:500, headers:CORS_HEADERS });
      }
      const user = await userRes.json();
      const memberRes = await fetch(
        `https://discord.com/api/v10/guilds/${GUILD_ID}/members/${user.id}`,
        { headers:{ "Authorization":`Bot ${env.DISCORD_BOT_TOKEN}` }}
      );
      if (!memberRes.ok) {
        return new Response(null, { status:302, headers:{...CORS_HEADERS, "Location":`${SITE_URL}/?error=unauthorized`} });
      }
      const member    = await memberRes.json();
      const userRoles = member.roles || [];
      if (!userRoles.some(r => ALLOWED_ROLE_IDS.includes(r))) {
        return new Response(null, { status:302, headers:{...CORS_HEADERS, "Location":`${SITE_URL}/?error=unauthorized`} });
      }
      const sessionToken = await createSessionToken(user, userRoles);
      return new Response(null, {
        status:302,
        headers:{ ...CORS_HEADERS, "Location":`${SITE_URL}/#token=${sessionToken}` }
      });
    }

    // 8) 認証確認 /verify
    if (path === "/verify") {
      let token = null;
      const authHeader = request.headers.get("Authorization");
      if (authHeader?.startsWith("Bearer ")) {
        token = authHeader.slice(7);
      } else {
        const ck = request.headers.get("Cookie") || "";
        const mm = ck.match(/session=([^;]+)/);
        if (mm) token = mm[1];
      }
      const result = { loggedIn:false };
      if (token) {
        const payload = await verifySessionToken(token);
        if (payload) {
          result.loggedIn = true;
          result.username = payload.username;
          result.roles    = payload.roles;
        }
      }
      return new Response(JSON.stringify(result), {
        status:200,
        headers:{ ...CORS_HEADERS, "Content-Type":"application/json", "Cache-Control":"no-store" }
      });
    }

    // 9) ログアウト /logout
    if (path === "/logout") {
      return new Response(null, {
        status:302,
        headers:{ ...CORS_HEADERS, "Location":`${SITE_URL}/?logout=true` }
      });
    }

    // 10) /admin ルートで管理画面を返す
    if (path === "/admin" || path === "/admin/") {
      return env.ASSETS.fetch(
        new Request(`${url.origin}/admin/index.html`, request)
      );
    }

    // 11) それ以外は public/ 以下の静的アセットを返す
    return env.ASSETS.fetch(request);
  }
};

// JWT トークン生成
async function createSessionToken(user, userRoles) {
  const header  = { alg:"HS256", typ:"JWT" };
  const payload = {
    sub:      user.id,
    username: `${user.username}#${user.discriminator||"0000"}`,
    roles:    userRoles,
    exp:      Math.floor(Date.now()/1000) + 3600
  };
  const b64 = obj =>
    btoa(String.fromCharCode(...new TextEncoder().encode(JSON.stringify(obj))))
      .replace(/\+/g,"-")
      .replace(/\//g,"_")
      .replace(/=+$/,"");
  const h = b64(header), p = b64(payload), data = `${h}.${p}`;
  const key = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(SESSION_SECRET),
    { name:"HMAC", hash:"SHA-256" }, false, ["sign"]
  );
  const sigBuf = await crypto.subtle.sign(
    "HMAC", key, new TextEncoder().encode(data)
  );
  let bin = ""; new Uint8Array(sigBuf).forEach(b=>bin+=String.fromCharCode(b));
  const s = btoa(bin).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");
  return `${data}.${s}`;
}

// JWT トークン検証
async function verifySessionToken(token) {
  const [h,p,s] = token.split(".");
  if (!h||!p||!s) return null;
  try {
    const key = await crypto.subtle.importKey(
      "raw", new TextEncoder().encode(SESSION_SECRET),
      { name:"HMAC", hash:"SHA-256" }, false, ["sign"]
    );
    const data = `${h}.${p}`;
    const buf  = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data));
    let bin = ""; new Uint8Array(buf).forEach(b=>bin+=String.fromCharCode(b));
    const expected = btoa(bin).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");
    if (expected !== s) return null;
    const pl = JSON.parse(atob(p.replace(/-/g,"+").replace(/_/g,"/")));
    if (pl.exp && Math.floor(Date.now()/1000) > pl.exp) return null;
    return pl;
  } catch {
    return null;
  }
}
