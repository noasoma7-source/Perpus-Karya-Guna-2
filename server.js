const crypto = require("node:crypto");
const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");

const host = "127.0.0.1";
const port = Number(process.env.PORT || 3000);
const root = __dirname;
const databasePath = path.join(root, "data.json");
const sessions = new Map();
const allowedOrigins = new Set([
  `http://${host}:5500`,
  "http://localhost:5500"
]);
const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".svg": "image/svg+xml"
};

let database;

function readDatabase() {
  let databaseContents;
  try {
    databaseContents = fs.readFileSync(databasePath, "utf8");
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
    databaseContents = fs.readFileSync(path.join(root, "data.example.json"), "utf8");
  }
  const parsed = JSON.parse(databaseContents);
  for (const key of ["books", "students", "teachers", "loans", "accounts"]) {
    if (!Array.isArray(parsed[key])) throw new Error(`Kolom ${key} di data.json harus berupa array.`);
  }
  return parsed;
}

function saveDatabase(nextDatabase) {
  const temporaryPath = `${databasePath}.tmp`;
  fs.writeFileSync(temporaryPath, `${JSON.stringify(nextDatabase, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
  fs.renameSync(temporaryPath, databasePath);
  database = nextDatabase;
}

function publicUser(account) {
  if (!account) return null;
  const { passwordHash, ...safeAccount } = account;
  return safeAccount;
}

function publicData() {
  return {
    books: database.books,
    students: database.students,
    teachers: database.teachers,
    loans: database.loans,
    accounts: database.accounts.map(publicUser),
    nextLoanNumber: database.nextLoanNumber
  };
}

function sendJson(response, statusCode, payload, headers = {}) {
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
    ...headers
  });
  response.end(JSON.stringify(payload));
}

function readBody(request) {
  return new Promise((resolve, reject) => {
    let body = "";
    request.on("data", (chunk) => {
      body += chunk;
      if (body.length > 1024 * 1024) {
        reject(Object.assign(new Error("Permintaan terlalu besar."), { statusCode: 413 }));
        request.destroy();
      }
    });
    request.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        reject(Object.assign(new Error("Format JSON tidak valid."), { statusCode: 400 }));
      }
    });
    request.on("error", reject);
  });
}

function currentSession(request) {
  const cookie = request.headers.cookie || "";
  const match = cookie.match(/(?:^|;\s*)sid=([a-f0-9-]+)/);
  const accountId = match && sessions.get(match[1]);
  return accountId ? database.accounts.find((account) => account.id === accountId) || null : null;
}

function setSession(response, account) {
  const token = crypto.randomUUID();
  sessions.set(token, account.id);
  response.setHeader("Set-Cookie", `sid=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=28800`);
}

function requireUser(request, response) {
  const user = currentSession(request);
  if (!user) {
    sendJson(response, 401, { error: "Silakan masuk terlebih dahulu." });
    return null;
  }
  return user;
}

function hashPassword(password, salt = crypto.randomBytes(16)) {
  return `${salt.toString("hex")}:${crypto.scryptSync(password, salt, 64).toString("hex")}`;
}

function verifyPassword(password, passwordHash) {
  const [saltHex, hashHex] = String(passwordHash).split(":");
  if (!/^[\da-f]{32}$/i.test(saltHex) || !/^[\da-f]{128}$/i.test(hashHex)) return false;
  const salt = Buffer.from(saltHex, "hex");
  const expected = Buffer.from(hashHex, "hex");
  const actual = crypto.scryptSync(password, salt, expected.length);
  return crypto.timingSafeEqual(actual, expected);
}

function makeAccount({ name, email, identifier, role, detail = "", phone = "", password }) {
  return {
    id: crypto.randomUUID(),
    role,
    name,
    email: email.toLowerCase(),
    identifier,
    detail,
    phone,
    passwordHash: hashPassword(password),
    createdAt: new Date().toISOString()
  };
}

function validateAccountFields(body, role) {
  const name = String(body.name || "").trim();
  const email = String(body.email || "").trim().toLowerCase();
  const identifier = String(body.identifier || "").trim();
  const detail = String(body.detail || "").trim();
  const phone = String(body.phone || "").trim();
  const password = String(body.password || "");
  if (!name || !email || !identifier || !detail || password.length < 8) {
    return { error: "Lengkapi semua data wajib. Kata sandi minimal 8 karakter." };
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "Format email tidak valid." };
  const people = role === "Guru" ? database.teachers : database.students;
  if (database.accounts.some((account) => account.email.toLowerCase() === email)
    || database.accounts.some((account) => account.identifier.toLowerCase() === identifier.toLowerCase())
    || people.some((person) => person.id.toLowerCase() === identifier.toLowerCase())) {
    return { error: "Email atau nomor NIS/NIP sudah terdaftar." };
  }
  return { name, email, identifier, detail, phone, password };
}

function updateData(body) {
  const collections = ["books", "students", "teachers", "loans", "accounts"];
  if (!body || collections.some((key) => !Array.isArray(body[key]))
    || !Number.isSafeInteger(body.nextLoanNumber) || body.nextLoanNumber < 1) {
    return { error: "Format data yang dikirim tidak valid." };
  }
  const submittedAccounts = body.accounts;
  const submittedIds = submittedAccounts.map((account) => account.id);
  if (new Set(submittedIds).size !== submittedIds.length
    || submittedIds.some((id) => !database.accounts.some((account) => account.id === id))) {
    return { error: "Data akun yang dikirim tidak valid." };
  }
  const nextAccounts = database.accounts
    .filter((account) => submittedIds.includes(account.id))
    .map((account) => {
      const submitted = submittedAccounts.find((item) => item.id === account.id);
      return {
        ...account,
        name: String(submitted.name || account.name),
        email: String(submitted.email || account.email).toLowerCase(),
        identifier: String(submitted.identifier || account.identifier),
        detail: String(submitted.detail || ""),
        phone: String(submitted.phone || "")
      };
    });
  const nextDatabase = {
    books: body.books,
    students: body.students,
    teachers: body.teachers,
    loans: body.loans,
    accounts: nextAccounts,
    nextLoanNumber: body.nextLoanNumber
  };
  saveDatabase(nextDatabase);
  return { ok: true };
}

async function handleApi(request, response, pathname) {
  if (request.method === "GET" && pathname === "/api/status") {
    const user = currentSession(request);
    sendJson(response, 200, {
      setupRequired: !database.accounts.some((account) => account.role === "Admin"),
      user: publicUser(user)
    });
    return;
  }

  if (request.method === "POST" && pathname === "/api/admin/setup") {
    const body = await readBody(request);
    if (database.accounts.some((account) => account.role === "Admin")) {
      sendJson(response, 409, { error: "Akun Admin sudah dibuat." });
      return;
    }
    const username = String(body.username || "").trim();
    const password = String(body.password || "");
    if (username.length < 3 || username.length > 64 || password.length < 12) {
      sendJson(response, 400, { error: "Nama Admin minimal 3 karakter dan kata sandi minimal 12 karakter." });
      return;
    }
    const admin = makeAccount({
      name: username,
      email: username.includes("@") ? username : `${username}@localhost.local`,
      identifier: username,
      role: "Admin",
      detail: "Administrator",
      password
    });
    saveDatabase({ ...database, accounts: [...database.accounts, admin] });
    setSession(response, admin);
    sendJson(response, 201, { user: publicUser(admin), data: publicData() });
    return;
  }

  if (request.method === "POST" && pathname === "/api/login") {
    const body = await readBody(request);
    const login = String(body.login || "").trim().toLowerCase();
    const account = database.accounts.find((item) => item.email.toLowerCase() === login
      || item.identifier.toLowerCase() === login);
    if (!account || !verifyPassword(String(body.password || ""), account.passwordHash)) {
      sendJson(response, 401, { error: "Email/NIS/NIP atau kata sandi tidak sesuai." });
      return;
    }
    setSession(response, account);
    sendJson(response, 200, { user: publicUser(account) });
    return;
  }

  if (request.method === "POST" && pathname === "/api/signup") {
    const body = await readBody(request);
    const role = body.role;
    if (role !== "Siswa" && role !== "Guru") {
      sendJson(response, 400, { error: "Pendaftaran hanya tersedia untuk Siswa atau Guru." });
      return;
    }
    const fields = validateAccountFields(body, role);
    if (fields.error) {
      sendJson(response, 400, { error: fields.error });
      return;
    }
    const account = makeAccount({ ...fields, role });
    const member = {
      id: account.identifier,
      name: account.name,
      detail: account.detail,
      phone: account.phone,
      email: account.email,
      accountId: account.id
    };
    const nextDatabase = {
      ...database,
      accounts: [...database.accounts, account],
      students: role === "Siswa" ? [...database.students, member] : database.students,
      teachers: role === "Guru" ? [...database.teachers, member] : database.teachers
    };
    saveDatabase(nextDatabase);
    setSession(response, account);
    sendJson(response, 201, { user: publicUser(account), data: publicData() });
    return;
  }

  if (request.method === "POST" && pathname === "/api/logout") {
    const cookie = request.headers.cookie || "";
    const match = cookie.match(/(?:^|;\s*)sid=([a-f0-9-]+)/);
    if (match) sessions.delete(match[1]);
    sendJson(response, 200, { ok: true }, { "Set-Cookie": "sid=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0" });
    return;
  }

  const user = requireUser(request, response);
  if (!user) return;
  if (request.method === "GET" && pathname === "/api/data") {
    sendJson(response, 200, publicData());
    return;
  }
  if (request.method === "PUT" && pathname === "/api/data") {
    if (user.role !== "Admin") {
      sendJson(response, 403, { error: "Hanya Admin yang dapat mengubah data perpustakaan." });
      return;
    }
    const body = await readBody(request);
    const result = updateData(body);
    if (result.error) {
      sendJson(response, 400, { error: result.error });
      return;
    }
    sendJson(response, 200, publicData());
    return;
  }
  sendJson(response, 404, { error: "API tidak ditemukan." });
}

function serveStatic(request, response, pathname) {
  const relativePath = pathname === "/" ? "index.html" : decodeURIComponent(pathname.slice(1));
  const filePath = path.resolve(root, relativePath);
  if (filePath !== root && !filePath.startsWith(`${root}${path.sep}`)) {
    response.writeHead(403);
    response.end("Forbidden");
    return;
  }
  if (filePath === databasePath || filePath === `${databasePath}.tmp`) {
    response.writeHead(404);
    response.end("Not found");
    return;
  }
  let stats;
  try {
    stats = fs.statSync(filePath);
  } catch {
    response.writeHead(404);
    response.end("Not found");
    return;
  }
  if (!stats.isFile()) {
    response.writeHead(404);
    response.end("Not found");
    return;
  }
  response.writeHead(200, {
    "Content-Type": mimeTypes[path.extname(filePath).toLowerCase()] || "application/octet-stream",
    "X-Content-Type-Options": "nosniff",
    "Cache-Control": "no-cache"
  });
  fs.createReadStream(filePath).pipe(response);
}

database = readDatabase();

const server = http.createServer(async (request, response) => {
  try {
    const origin = request.headers.origin;
    const allowOrigin = origin && allowedOrigins.has(origin);
    if (allowOrigin) {
      response.setHeader("Access-Control-Allow-Origin", origin);
      response.setHeader("Access-Control-Allow-Credentials", "true");
      response.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, OPTIONS");
      response.setHeader("Access-Control-Allow-Headers", "Content-Type");
      response.setHeader("Vary", "Origin");
    }
    if (request.method === "OPTIONS") {
      if (!allowOrigin) {
        response.writeHead(403);
        response.end();
        return;
      }
      response.writeHead(204);
      response.end();
      return;
    }
    const url = new URL(request.url, `http://${host}:${port}`);
    if (url.pathname.startsWith("/api/")) {
      await handleApi(request, response, url.pathname);
      return;
    }
    if (request.method !== "GET" && request.method !== "HEAD") {
      response.writeHead(405, { Allow: "GET, HEAD" });
      response.end("Method not allowed");
      return;
    }
    serveStatic(request, response, url.pathname);
  } catch (error) {
    console.error("Request gagal:", error);
    if (!response.headersSent) {
      sendJson(response, error.statusCode || 500, {
        error: error.statusCode ? error.message : "Terjadi kesalahan server."
      });
    } else {
      response.destroy();
    }
  }
});

server.listen(port, host, () => {
  console.log(`Perpustakaan berjalan di http://${host}:${port}`);
});
