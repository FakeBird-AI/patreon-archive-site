  else if (path === "/callback") {
    // Discordからのコールバック: 認可コードとstateを受け取る
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    if (!code || !state) {
      return new Response("Invalid OAuth callback request", { status: 400 });
    }
    // state検証（CSRF対策）
    const cookieHeader = request.headers.get("Cookie") || "";
    const stateCookieMatch = cookieHeader.match(/oauth_state=([^;]+)/);
    if (!stateCookieMatch) {
      return new Response("State cookie not found or expired. Please try login again.", { status: 400 });
    }
    const savedState = stateCookieMatch[1];
    if (savedState !== state) {
      return new Response("Invalid state parameter", { status: 400 });
    }
    // 認可コードをDiscordのトークンエンドポイントに交換
    const tokenResponse = await fetch("https://discord.com/api/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id:     CLIENT_ID,
        client_secret: CLIENT_SECRET,
        grant_type:    "authorization_code",
        code:          code,
        redirect_uri:  REDIRECT_URI
      })
    });
    if (!tokenResponse.ok) {
      return new Response("Failed to obtain access token from Discord", { status: 500 });
    }
    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;
    // Discordユーザー情報を取得（ユーザーIDや名前を得るため）
    const userRes = await fetch("https://discord.com/api/v10/users/@me", {
      headers: { "Authorization": `Bearer ${accessToken}` }
    });
    if (!userRes.ok) {
      return new Response("Failed to fetch Discord user info", { status: 500 });
    }
    const user = await userRes.json();  // ユーザーオブジェクト（id, username, discriminator等を含む）
    // 指定サーバ内のユーザーロール情報を取得（Botトークンを使用）
    const memberRes = await fetch(`https://discord.com/api/v10/guilds/${GUILD_ID}/members/${user.id}`, {
      headers: { "Authorization": `Bot ${BOT_TOKEN}` }
    });
    if (!memberRes.ok) {
      // サーバに未参加か取得失敗の場合、認可拒否
      return new Response(null, { status: 302, headers: { "Location": `${SITE_URL}/?error=unauthorized` } });
    }
    const member = await memberRes.json();
    console.log("joined_at:", member.joined_at);
    const userRoles = member.roles || [];

    // ★ 修正：「1350114379391045692」のみ過去1ヶ月分のアーカイブ制限を追加
    const limitedRoleId = "1350114379391045692";
    const hasLimitedRole = userRoles.includes(limitedRoleId);
    const hasOtherAllowedRole = userRoles.some(roleId => 
      ALLOWED_ROLE_IDS.includes(roleId) && roleId !== limitedRoleId
    );
    
    // joined_atはサーバー参加日時となるので、ロール付与日時の代用とします
    const joinedAt = new Date(member.joined_at);
    const now = new Date();
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(now.getMonth() - 1);
    
    let hasAccess = false;
    if (hasOtherAllowedRole) {
      // 他の許可されたロールがあれば、期間にかかわらずアクセス可能
      hasAccess = true;
    } else if (hasLimitedRole && joinedAt >= oneMonthAgo) {
      // 限定ロールの場合、サーバ参加が過去1ヶ月以内ならアクセス許可
      hasAccess = true;
    }
    
    if (!hasAccess) {
      return new Response(null, { status: 302, headers: { "Location": `${SITE_URL}/?error=unauthorized` } });
    }

    // 認証・ロール確認OK: セッショントークンを生成（JWT形式）
    const sessionToken = await createSessionToken(user);
    // Cloudflare Pagesサイトへリダイレクト（#トークンをフラグメントに付加）
    return new Response(null, { status: 302, headers: { "Location": `${SITE_URL}/#token=${sessionToken}` } });
  }
