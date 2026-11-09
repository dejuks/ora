/**
 * End-to-end smoke test for the ORA auth service.
 *
 * Needs: the service running, PostgreSQL seeded (npm run db:seed) and
 * Mailpit running (docker compose up -d mailpit).
 *
 *   ADMIN_IDENTIFIER=superadmin ADMIN_PASSWORD='...' npm run test:smoke
 *
 * Optional: BASE_URL, MAIL_API, SKIP_REUSE_TEST=1 (skips the 11 s wait).
 */
const BASE = process.env.BASE_URL || "http://127.0.0.1:4000/api/v1";
const MAIL = process.env.MAIL_API || "http://127.0.0.1:8025";
const ADMIN_ID = process.env.ADMIN_IDENTIFIER;
const ADMIN_PW = process.env.ADMIN_PASSWORD;

if (!ADMIN_ID || !ADMIN_PW) {
    console.error("Set ADMIN_IDENTIFIER and ADMIN_PASSWORD.");
    process.exit(2);
}

let passed = 0;
const failures = [];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function check(name, condition, detail = "") {
    if (condition) {
        passed++;
        console.log(`  ok   ${name}`);
    } else {
        failures.push(name);
        console.log(`  FAIL ${name} ${detail}`);
    }
}

/** Minimal client with its own cookie jar. */
function client() {
    const jar = {};
    return {
        jar,
        async call(method, path, { body, token } = {}) {
            const headers = { "Content-Type": "application/json" };
            if (token) headers.Authorization = `Bearer ${token}`;
            const cookie = Object.entries(jar)
                .map(([k, v]) => `${k}=${v}`)
                .join("; ");
            if (cookie) headers.Cookie = cookie;

            const res = await fetch(BASE + path, {
                method,
                headers,
                body: body ? JSON.stringify(body) : undefined,
            });

            for (const line of res.headers.getSetCookie?.() ?? []) {
                const [pair, ...attrs] = line.split(";");
                const [k, v] = pair.split("=");
                const expired = attrs.some((a) =>
                    /expires=Thu, 01 Jan 1970/i.test(a)
                );
                if (expired || !v) delete jar[k.trim()];
                else jar[k.trim()] = v;
            }

            let json = null;
            try {
                json = await res.json();
            } catch {}
            return { status: res.status, json, headers: res.headers };
        },
    };
}

async function mailTo(address, subjectPart, tries = 20) {
    for (let i = 0; i < tries; i++) {
        const res = await fetch(
            `${MAIL}/api/v1/search?query=${encodeURIComponent(`to:${address}`)}`
        );
        const { messages = [] } = await res.json();
        const match = messages.find((m) =>
            m.Subject.includes(subjectPart)
        );
        if (match) {
            const full = await (
                await fetch(`${MAIL}/api/v1/message/${match.ID}`)
            ).json();
            return full.Text;
        }
        await sleep(250);
    }
    return null;
}

const tokenFrom = (text) => /token=([A-Za-z0-9_-]+)/.exec(text ?? "")?.[1];
const decodeJwt = (jwt) =>
    JSON.parse(Buffer.from(jwt.split(".")[1], "base64url").toString());

const run = Date.now().toString(36);
const email = `author.${run}@ora.test`;
const username = `author${run}`;
const goodPassword = "Str0ng!Passw0rd";
const newPassword = "N3w!Passw0rd#Z";

async function main() {
    const anon = client();

    console.log("Health");
    check("health is up", (await anon.call("GET", "/health")).status === 200);

    console.log("Registration");
    let r = await anon.call("POST", "/auth/register", {
        body: { first_name: "Abdi", last_name: "Tola", email, username, password: "weak" },
    });
    check("weak password rejected (400)", r.status === 400 && r.json?.errors?.password);

    r = await anon.call("POST", "/auth/register", {
        body: { first_name: "Abdi", last_name: "Tola", email, username, password: goodPassword },
    });
    check("register ok (201)", r.status === 201, JSON.stringify(r.json));

    r = await anon.call("POST", "/auth/register", {
        body: { first_name: "Abdi", last_name: "Tola", email, username: `${username}x`, password: goodPassword },
    });
    check("duplicate email (409)", r.status === 409 && r.json?.code === "EMAIL_ALREADY_EXISTS");

    r = await anon.call("POST", "/auth/register", {
        body: { first_name: "Abdi", last_name: "Tola", email: `x.${email}`, username, password: goodPassword },
    });
    check("duplicate username (409)", r.status === 409 && r.json?.code === "USERNAME_ALREADY_EXISTS");

    console.log("E-mail verification");
    r = await anon.call("POST", "/auth/login", { body: { identifier: email, password: goodPassword } });
    check("login blocked until verified (403)", r.status === 403 && r.json?.code === "EMAIL_NOT_VERIFIED");

    r = await anon.call("POST", "/auth/login", { body: { identifier: email, password: "Wrong!Pass1" } });
    check("wrong password gives generic 401", r.status === 401 && r.json?.code === "INVALID_CREDENTIALS");

    const verifyMail = await mailTo(email, "Verify");
    const verifyToken = tokenFrom(verifyMail);
    check("verification e-mail received", Boolean(verifyToken));

    r = await anon.call("POST", "/auth/verify-email", { body: { token: "x".repeat(30) } });
    check("bad verification token (400)", r.status === 400);

    r = await anon.call("POST", "/auth/verify-email", { body: { token: verifyToken } });
    check("verify e-mail (200)", r.status === 200 && r.json?.data?.alreadyVerified === false);

    r = await anon.call("POST", "/auth/verify-email", { body: { token: verifyToken } });
    check("verify again is idempotent", r.status === 200 && r.json?.data?.alreadyVerified === true);

    console.log("Login, /me and roles");
    const user = client();
    r = await user.call("POST", "/auth/login", { body: { identifier: email.toUpperCase(), password: goodPassword } });
    check("login with e-mail (case-insensitive) (200)", r.status === 200, JSON.stringify(r.json));
    let access = r.json?.data?.accessToken;
    check("refresh cookie set", Boolean(user.jar.ora_refresh_token));

    const claims = decodeJwt(access);
    check("JWT carries JMS/AUTHOR", claims.modules?.JMS?.includes("AUTHOR"), JSON.stringify(claims));
    check("JWT has mcp=false", claims.mcp === false);

    r = await user.call("GET", "/auth/me", { token: access });
    check("/me returns user + JMS Author", r.status === 200 && r.json?.data?.user?.modules?.[0]?.code === "JMS" && r.json.data.user.modules[0].roles[0].code === "AUTHOR", JSON.stringify(r.json));

    r = await anon.call("GET", "/auth/me");
    check("/me without token (401)", r.status === 401);

    r = await user.call("GET", "/users", { token: access });
    check("author cannot list users (403)", r.status === 403);

    r = await user.call("PATCH", "/auth/me", { token: access, body: { job_title: "Researcher", organization: "ORA" } });
    check("update profile", r.status === 200 && r.json?.data?.user?.profile?.jobTitle === "Researcher", JSON.stringify(r.json));

    console.log("Refresh and logout");
    const oldCookie = user.jar.ora_refresh_token;
    r = await user.call("POST", "/auth/refresh");
    check("refresh rotates the token", r.status === 200 && user.jar.ora_refresh_token !== oldCookie);
    access = r.json?.data?.accessToken;

    const replay = client();
    replay.jar.ora_refresh_token = oldCookie;
    r = await replay.call("POST", "/auth/refresh");
    check("immediate replay is a benign race (401, session kept)", r.status === 401 && r.json?.code === "REFRESH_TOKEN_RACE");
    r = await user.call("GET", "/auth/me", { token: access });
    check("session still valid after race", r.status === 200);

    if (!process.env.SKIP_REUSE_TEST) {
        console.log("  ...waiting 11s for the reuse grace window");
        await sleep(11000);
        r = await replay.call("POST", "/auth/refresh");
        check("late replay detected as reuse (401)", r.status === 401 && r.json?.code === "REFRESH_TOKEN_REUSED");
        r = await user.call("GET", "/auth/me", { token: access });
        check("reuse revokes the whole session", r.status === 401);
        r = await user.call("POST", "/auth/login", { body: { identifier: username, password: goodPassword } });
        access = r.json?.data?.accessToken;
        check("can sign in again", r.status === 200);
    }

    r = await user.call("POST", "/auth/logout");
    check("logout (200) clears cookie", r.status === 200 && !user.jar.ora_refresh_token);
    r = await user.call("GET", "/auth/me", { token: access });
    check("access token dead after logout (401)", r.status === 401);

    console.log("Forgot / reset password");
    r = await anon.call("POST", "/auth/forgot-password", { body: { email: "nobody@ora.test" } });
    check("unknown e-mail gets the same 200", r.status === 200);
    r = await anon.call("POST", "/auth/forgot-password", { body: { email } });
    check("known e-mail 200", r.status === 200);
    const resetToken = tokenFrom(await mailTo(email, "Reset"));
    check("reset e-mail received", Boolean(resetToken));

    r = await anon.call("POST", "/auth/reset-password", { body: { token: resetToken, password: "short" } });
    check("reset with weak password (400)", r.status === 400);
    r = await anon.call("POST", "/auth/reset-password", { body: { token: resetToken, password: `${username}A1!` } });
    check("password containing username rejected (422)", r.status === 422 && r.json?.code === "WEAK_PASSWORD", JSON.stringify(r.json));
    r = await anon.call("POST", "/auth/reset-password", { body: { token: resetToken, password: newPassword } });
    check("reset password (200)", r.status === 200, JSON.stringify(r.json));
    r = await anon.call("POST", "/auth/reset-password", { body: { token: resetToken, password: newPassword } });
    check("reset token is single-use (400)", r.status === 400);
    r = await anon.call("POST", "/auth/login", { body: { identifier: email, password: goodPassword } });
    check("old password no longer works", r.status === 401);
    r = await anon.call("POST", "/auth/login", { body: { identifier: email, password: newPassword } });
    check("new password works", r.status === 200);

    console.log("Change password");
    const u2 = client();
    r = await u2.call("POST", "/auth/login", { body: { identifier: email, password: newPassword } });
    const other = client();
    await other.call("POST", "/auth/login", { body: { identifier: email, password: newPassword } });
    let t2 = r.json.data.accessToken;
    r = await u2.call("POST", "/auth/change-password", { token: t2, body: { current_password: "Nope!Nope1x", new_password: goodPassword } });
    check("wrong current password (400)", r.status === 400 && r.json?.code === "INVALID_CURRENT_PASSWORD");
    r = await u2.call("POST", "/auth/change-password", { token: t2, body: { current_password: newPassword, new_password: goodPassword } });
    check("change password (200) returns fresh token", r.status === 200 && Boolean(r.json?.data?.accessToken), JSON.stringify(r.json));
    t2 = r.json.data.accessToken;
    r = await other.call("POST", "/auth/refresh");
    check("other devices signed out after change", r.status === 401);
    r = await u2.call("GET", "/auth/me", { token: t2 });
    check("current session stays signed in", r.status === 200);

    console.log("Admin: create, list, suspend");
    const admin = client();
    r = await admin.call("POST", "/auth/login", { body: { identifier: ADMIN_ID, password: ADMIN_PW } });
    check("super admin login", r.status === 200, JSON.stringify(r.json));
    let adminToken = r.json?.data?.accessToken;
    check("admin JWT has SUPER_ADMIN", decodeJwt(adminToken).roles?.includes("SUPER_ADMIN"));

    if (r.json?.data?.user?.mustChangePassword) {
        // The seeded admin has a temporary password: the guard must block
        // admin routes until it is changed. Change it, then change it back
        // so this test stays repeatable.
        check("admin JWT has mcp=true", decodeJwt(adminToken).mcp === true);
        r = await admin.call("GET", "/users", { token: adminToken });
        check("admin routes blocked until password changed (403)", r.status === 403 && r.json?.code === "PASSWORD_CHANGE_REQUIRED");
        const tmp = `${ADMIN_PW}-tmp1`;
        r = await admin.call("POST", "/auth/change-password", { token: adminToken, body: { current_password: ADMIN_PW, new_password: tmp } });
        check("admin changes temporary password", r.status === 200, JSON.stringify(r.json));
        r = await admin.call("POST", "/auth/change-password", { token: r.json?.data?.accessToken, body: { current_password: tmp, new_password: ADMIN_PW } });
        check("admin restores the original password", r.status === 200, JSON.stringify(r.json));
        adminToken = r.json?.data?.accessToken;
        check("admin JWT has mcp=false afterwards", decodeJwt(adminToken).mcp === false);
    }

    r = await admin.call("GET", "/roles/permissions", { token: adminToken });
    check("GET /roles/permissions no longer shadowed by /:id", r.status === 200, `status ${r.status}`);

    r = await admin.call("GET", "/users/options", { token: adminToken });
    check("user form options", r.status === 200 && r.json?.data?.modules?.length >= 6);

    r = await admin.call("GET", "/roles?module_code=JMS&scope=MODULE&limit=100", { token: adminToken });
    const roles = r.json?.data?.items ?? r.json?.data?.roles ?? r.json?.data ?? [];
    const editor = (Array.isArray(roles) ? roles : []).find((x) => x.code === "EDITOR");
    check("found JMS EDITOR role", Boolean(editor), JSON.stringify(r.json)?.slice(0, 200));

    const adminEmail = `editor.${run}@ora.test`;
    const adminUser = `editor${run}`;
    r = await admin.call("POST", "/users", {
        token: adminToken,
        body: { first_name: "Hana", last_name: "Bekele", email: adminEmail, username: adminUser, password: "T3mp!Passw0rd", module_code: "JMS", role_id: editor?.id },
    });
    check("admin creates user (201, ACTIVE)", r.status === 201 && r.json?.data?.user?.status === "ACTIVE", JSON.stringify(r.json));
    const newId = r.json?.data?.user?.id;
    check("welcome e-mail received", Boolean(await mailTo(adminEmail, "account has been created")));

    const created = client();
    r = await created.call("POST", "/auth/login", { body: { identifier: adminUser, password: "T3mp!Passw0rd" } });
    check("admin-created user can sign in", r.status === 200 && r.json?.data?.user?.mustChangePassword === true, JSON.stringify(r.json));
    const createdToken = r.json?.data?.accessToken;
    check("JWT has mcp=true for temporary password", decodeJwt(createdToken).mcp === true);

    r = await admin.call("GET", `/users?search=${run}&limit=10`, { token: adminToken });
    check("list/search finds the new users", r.status === 200 && r.json?.data?.items?.length >= 2, JSON.stringify(r.json)?.slice(0, 200));

    r = await admin.call("PATCH", `/users/${newId}/status`, { token: adminToken, body: { status: "SUSPENDED" } });
    check("suspend user (200)", r.status === 200);
    r = await created.call("GET", "/auth/me", { token: createdToken });
    check("suspended user's session is revoked (401)", r.status === 401);
    r = await created.call("POST", "/auth/login", { body: { identifier: adminUser, password: "T3mp!Passw0rd" } });
    check("suspended user cannot sign in (403)", r.status === 403 && r.json?.code === "ACCOUNT_NOT_ACTIVE");
    r = await admin.call("PATCH", `/users/${newId}/status`, { token: adminToken, body: { status: "ACTIVE" } });
    check("re-activate user (200)", r.status === 200);

    console.log("Lockout");
    const lockUser = client();
    for (let i = 0; i < 5; i++) {
        await lockUser.call("POST", "/auth/login", { body: { identifier: email, password: "Wrong!Guess1" } });
    }
    r = await lockUser.call("POST", "/auth/login", { body: { identifier: email, password: goodPassword } });
    check("account locked after 5 failures (429)", r.status === 429 && r.json?.code === "ACCOUNT_LOCKED" && r.headers.get("retry-after"), JSON.stringify(r.json));
    r = await lockUser.call("POST", "/auth/login", { body: { identifier: "ghost.user", password: "Wrong!Guess1" } });
    check("unknown account answers like a normal failure", r.status === 401);

    console.log(`\n${passed} passed, ${failures.length} failed`);
    if (failures.length) {
        console.log("Failed:", failures.join("; "));
        process.exit(1);
    }
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
