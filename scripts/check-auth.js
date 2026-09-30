const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");

async function main() {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "fridgechef-auth-"));
  const usersFile = path.join(directory, "users.json");
  process.env.AUTH_DATA_FILE = usersFile;
  const app = require("../server/app");
  const server = await new Promise((resolve) => {
    const listener = app.listen(0, "127.0.0.1", () => resolve(listener));
  });
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  async function request(route, options = {}) {
    const response = await fetch(`${baseUrl}${route}`, options);
    const body = response.status === 204 ? null : await response.json();
    return { response, body };
  }

  const signup = {
    username: "Test Cook",
    email: "Test@Example.com",
    password: "a long test password",
    repeatPassword: "a long test password",
  };
  const jsonPost = (body, cookie) => ({
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(cookie ? { Cookie: cookie } : {}),
    },
    body: JSON.stringify(body),
  });

  try {
    for (const route of ["/", "/index.html", "/recipe.html?id=r001"]) {
      const protectedPage = await fetch(`${baseUrl}${route}`, { redirect: "manual" });
      assert.equal(protectedPage.status, 303, route);
      assert.equal(protectedPage.headers.get("location"), "/login.html");
    }
    assert.equal((await fetch(`${baseUrl}/login.html`)).status, 200);
    assert.equal((await fetch(`${baseUrl}/signup.html`)).status, 200);

    const created = await request("/api/auth/signup", jsonPost(signup));
    assert.equal(created.response.status, 201);
    assert.equal(created.body.user.email, "test@example.com");
    const setCookie = created.response.headers.get("set-cookie");
    assert.match(setCookie, /HttpOnly/);
    assert.match(setCookie, /SameSite=Strict/);
    const cookie = setCookie.split(";")[0];

    const home = await fetch(`${baseUrl}/`, { headers: { Cookie: cookie } });
    const homeHtml = await home.text();
    assert.equal(home.status, 200);
    assert.match(homeHtml, /Log out/);
    assert.doesNotMatch(homeHtml, /href="\/login\.html"|href="\/signup\.html"/);
    assert.equal((await fetch(`${baseUrl}/index.html`, { headers: { Cookie: cookie } })).status, 200);
    assert.equal((await fetch(`${baseUrl}/recipe.html?id=r001`, { headers: { Cookie: cookie } })).status, 200);

    const stored = await fs.readFile(usersFile, "utf8");
    assert(!stored.includes(signup.password));
    assert.equal(JSON.parse(stored)[0].email, "test@example.com");

    const duplicate = await request("/api/auth/signup", jsonPost(signup));
    assert.equal(duplicate.response.status, 409);

    const secondAccount = await request("/api/auth/signup", jsonPost({
      ...signup,
      username: "Second Cook",
      email: "second@example.com",
    }));
    assert.equal(secondAccount.response.status, 201);
    assert.equal(JSON.parse(await fs.readFile(usersFile, "utf8")).length, 2);

    const me = await request("/api/auth/me", { headers: { Cookie: cookie } });
    assert.equal(me.response.status, 200);
    assert.equal(me.body.user.username, "Test Cook");

    const wrongPassword = await request("/api/auth/login", jsonPost({
      email: signup.email,
      password: "wrong password",
    }));
    assert.equal(wrongPassword.response.status, 401);

    const logout = await request("/api/auth/logout", { method: "POST", headers: { Cookie: cookie } });
    assert.equal(logout.response.status, 204);
    const afterLogout = await request("/api/auth/me", { headers: { Cookie: cookie } });
    assert.equal(afterLogout.response.status, 401);
    const homeAfterLogout = await fetch(`${baseUrl}/`, {
      headers: { Cookie: cookie }, redirect: "manual",
    });
    assert.equal(homeAfterLogout.status, 303);

    const loggedIn = await request("/api/auth/login", jsonPost({
      email: "TEST@example.com",
      password: signup.password,
    }));
    assert.equal(loggedIn.response.status, 200);
    assert.equal(loggedIn.body.user.username, "Test Cook");
    const loggedInCookie = loggedIn.response.headers.get("set-cookie").split(";")[0];
    assert.equal((await fetch(`${baseUrl}/`, { headers: { Cookie: loggedInCookie } })).status, 200);

    const crossOrigin = await request("/api/auth/logout", {
      method: "POST",
      headers: { Origin: "https://other.example" },
    });
    assert.equal(crossOrigin.response.status, 403);

    console.log("Authentication signup, login, session, and logout checks passed.");
  } finally {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    await fs.rm(usersFile, { force: true });
    await fs.rmdir(directory);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
