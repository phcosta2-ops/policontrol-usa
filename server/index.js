const express = require("express");
const fs = require("fs");
const path = require("path");
const bcrypt = require("bcryptjs");
const multer = require("multer");
const crypto = require("crypto");

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, "data");
const UPLOAD_DIR = path.join(__dirname, "uploads");

[DATA_DIR, UPLOAD_DIR].forEach(d => { if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true }); });

const DATA_FILE = path.join(DATA_DIR, "app-data.json");
const USERS_FILE = path.join(DATA_DIR, "users.json");

function loadData() { try { return JSON.parse(fs.readFileSync(DATA_FILE, "utf8")); } catch { return {}; } }
function saveData(data) { fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2)); }
function loadUsers() {
  try { return JSON.parse(fs.readFileSync(USERS_FILE, "utf8")); }
  catch {
    const users = [
      { username: "admin", password: bcrypt.hashSync("admin123", 10), name: "Admin", role: "admin" },
      { username: "operator1", password: bcrypt.hashSync("op123", 10), name: "Operator 1", role: "operator" },
    ];
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
    return users;
  }
}

const sessions = {};
function createSession(user) {
  const token = crypto.randomBytes(32).toString("hex");
  sessions[token] = { username: user.username, name: user.name, role: user.role, created: Date.now() };
  return token;
}
function auth(req, res, next) {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token || !sessions[token]) return res.status(401).json({ error: "Unauthorized" });
  req.user = sessions[token]; next();
}

app.use(express.json({ limit: "50mb" }));
app.use(express.static(path.join(__dirname, "..", "client", "build")));
app.use("/uploads", express.static(UPLOAD_DIR));

// Auth
app.post("/api/login", (req, res) => {
  const { username, password } = req.body;
  const user = loadUsers().find(u => u.username === username);
  if (!user || !bcrypt.compareSync(password, user.password)) return res.status(401).json({ error: "Invalid credentials" });
  res.json({ token: createSession(user), user: { username: user.username, name: user.name, role: user.role } });
});
app.post("/api/logout", (req, res) => { const t = req.headers.authorization?.replace("Bearer ", ""); if (t) delete sessions[t]; res.json({ ok: true }); });
app.get("/api/me", auth, (req, res) => res.json({ user: req.user }));

// Data
app.get("/api/data", auth, (req, res) => res.json(loadData()));
app.put("/api/data", auth, (req, res) => { saveData(req.body); res.json({ ok: true }); });

// Upload
const upload = multer({ storage: multer.diskStorage({ destination: UPLOAD_DIR, filename: (r, f, cb) => cb(null, `${Date.now()}-${crypto.randomBytes(4).toString("hex")}${path.extname(f.originalname)}`) }), limits: { fileSize: 10*1024*1024 } });
app.post("/api/upload", auth, upload.single("file"), (req, res) => { if (!req.file) return res.status(400).json({ error: "No file" }); res.json({ path: `/uploads/${req.file.filename}` }); });

// Users
app.get("/api/users", auth, (req, res) => { if (req.user.role !== "admin") return res.status(403).json({ error: "Admin only" }); res.json(loadUsers().map(u => ({ username: u.username, name: u.name, role: u.role }))); });
app.post("/api/users", auth, (req, res) => {
  if (req.user.role !== "admin") return res.status(403).json({ error: "Admin only" });
  const users = loadUsers(); const { username, password, name, role } = req.body;
  if (users.find(u => u.username === username)) return res.status(400).json({ error: "Exists" });
  users.push({ username, password: bcrypt.hashSync(password, 10), name, role: role || "operator" });
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
  res.json({ ok: true });
});

app.get("*", (req, res) => res.sendFile(path.join(__dirname, "..", "client", "build", "index.html")));

app.listen(PORT, () => {
  console.log(`\n  ⚗️  Policontrol USA ERP`);
  console.log(`  🌐 http://localhost:${PORT}`);
  console.log(`  👤 admin / admin123`);
  console.log(`  👤 operator1 / op123\n`);
});
