require("dotenv").config();
const express = require("express");
const helmet = require("helmet");
const session = require("express-session");
const MySQLStore = require("express-mysql-session")(session);
const mysql = require("mysql2/promise");
const bcrypt = require("bcryptjs");
const rateLimit = require("express-rate-limit");
const path = require("path");

const app = express();
const PORT = Number(process.env.PORT || 3000);
const pool = mysql.createPool({
  host: process.env.DB_HOST, port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER, password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME, waitForConnections: true,
  connectionLimit: 10, queueLimit: 0
});

const sessionStore = new MySQLStore({}, pool);
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
      imgSrc: ["'self'", "https:", "data:"],
      scriptSrc: ["'self'"],
      connectSrc: ["'self'"]
    }
  }
}));
app.use(express.json({ limit: "30kb" }));
app.use(express.urlencoded({ extended: false, limit: "30kb" }));
app.use(session({
  name: "smc.sid",
  secret: process.env.SESSION_SECRET || "development-only-change-this-secret",
  store: sessionStore,
  resave: false, saveUninitialized: false,
  cookie: {
    httpOnly: true, sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 1000 * 60 * 60 * 8
  }
}));
app.use(express.static(path.join(__dirname, "public")));

const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: true, legacyHeaders: false });
const requireAdmin = (req, res, next) => {
  if (!req.session.adminId) return res.status(401).json({ error: "Please log in as administrator." });
  next();
};

app.get("/api/config", (req, res) => {
  res.json({ whatsapp: (process.env.MATCHMAKER_WHATSAPP || "").replace(/\D/g, "") });
});

app.get("/api/profiles", async (req, res) => {
  try {
    const where = ["is_approved = 1", "is_available = 1"];
    const values = [];
    const minAge = Number(req.query.minAge), maxAge = Number(req.query.maxAge);
    if (req.query.minAge && Number.isInteger(minAge) && minAge >= 18 && minAge <= 100) { where.push("age >= ?"); values.push(minAge); }
    if (req.query.maxAge && Number.isInteger(maxAge) && maxAge >= 18 && maxAge <= 100) { where.push("age <= ?"); values.push(maxAge); }
    for (const key of ["county", "occupation", "relationship_preference"]) {
      const val = String(req.query[key] || "").trim();
      if (val && val.length <= 120) { where.push(`${key} = ?`); values.push(val); }
    }
    const [rows] = await pool.execute(
      `SELECT id, display_name, age, county, occupation, relationship_preference, bio, interests, image_url
       FROM profiles WHERE ${where.join(" AND ")} ORDER BY created_at DESC LIMIT 100`, values
    );
    res.json(rows);
  } catch (err) { console.error(err); res.status(500).json({ error: "Could not load profiles." }); }
});

app.get("/api/profiles/:id", async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT id, display_name, age, county, occupation, relationship_preference, bio, interests, image_url
       FROM profiles WHERE id = ? AND is_approved = 1 AND is_available = 1`,
      [Number(req.params.id)]
    );
    if (!rows.length) return res.status(404).json({ error: "Profile not found." });
    res.json(rows[0]);
  } catch (err) { console.error(err); res.status(500).json({ error: "Could not load profile." }); }
});

app.post("/api/admin/login", loginLimiter, async (req, res) => {
  try {
    const username = String(req.body.username || "").trim();
    const password = String(req.body.password || "");
    const [rows] = await pool.execute("SELECT id, password_hash FROM admins WHERE username = ?", [username]);
    if (!rows.length || !(await bcrypt.compare(password, rows[0].password_hash))) {
      return res.status(401).json({ error: "Incorrect username or password." });
    }
    req.session.adminId = rows[0].id;
    res.json({ ok: true });
  } catch (err) { console.error(err); res.status(500).json({ error: "Login failed." }); }
});
app.post("/api/admin/logout", requireAdmin, (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});
app.get("/api/admin/me", requireAdmin, (req, res) => res.json({ ok: true }));

app.get("/api/admin/profiles", requireAdmin, async (req, res) => {
  const [rows] = await pool.execute("SELECT * FROM profiles ORDER BY created_at DESC LIMIT 300");
  res.json(rows);
});

app.post("/api/admin/profiles", requireAdmin, async (req, res) => {
  try {
    const p = req.body;
    const age = Number(p.age);
    if (!p.display_name || !p.county || !p.occupation || !p.relationship_preference || !p.bio ||
        !Number.isInteger(age) || age < 18 || age > 100 || p.consent_confirmed !== true) {
      return res.status(400).json({ error: "Complete all required fields, use an age of 18+, and confirm documented consent." });
    }
    const [result] = await pool.execute(
      `INSERT INTO profiles (display_name, age, county, occupation, relationship_preference, bio, interests, image_url, is_available, is_approved, consent_confirmed)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [p.display_name, age, p.county, p.occupation, p.relationship_preference, p.bio,
       p.interests || "", p.image_url || "", !!p.is_available, !!p.is_approved, true]
    );
    res.status(201).json({ id: result.insertId });
  } catch (err) { console.error(err); res.status(500).json({ error: "Could not save profile." }); }
});

app.patch("/api/admin/profiles/:id", requireAdmin, async (req, res) => {
  try {
    const allowed = ["display_name","age","county","occupation","relationship_preference","bio","interests","image_url","is_available","is_approved"];
    const fields = allowed.filter(k => Object.prototype.hasOwnProperty.call(req.body, k));
    if (!fields.length) return res.status(400).json({ error: "No changes supplied." });
    if (req.body.age !== undefined && (!Number.isInteger(Number(req.body.age)) || Number(req.body.age) < 18)) {
      return res.status(400).json({ error: "Profiles must be age 18 or older." });
    }
    const values = fields.map(k => ["is_available","is_approved"].includes(k) ? !!req.body[k] : req.body[k]);
    values.push(Number(req.params.id));
    await pool.execute(`UPDATE profiles SET ${fields.map(k => `${k} = ?`).join(", ")} WHERE id = ?`, values);
    res.json({ ok: true });
  } catch (err) { console.error(err); res.status(500).json({ error: "Could not update profile." }); }
});
app.delete("/api/admin/profiles/:id", requireAdmin, async (req, res) => {
  await pool.execute("DELETE FROM profiles WHERE id = ?", [Number(req.params.id)]);
  res.json({ ok: true });
});

app.get("*", (req, res) => res.sendFile(path.join(__dirname, "public", "index.html")));
app.listen(PORT, () => console.log(`Soul Mate Connect running on port ${PORT}`));
