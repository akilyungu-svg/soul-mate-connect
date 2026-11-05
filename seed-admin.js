require("dotenv").config();
const mysql = require("mysql2/promise");
const bcrypt = require("bcryptjs");

async function main() {
  const { DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD, ADMIN_USERNAME, ADMIN_PASSWORD } = process.env;
  if (!ADMIN_USERNAME || !ADMIN_PASSWORD || ADMIN_PASSWORD.length < 12) {
    throw new Error("Set ADMIN_USERNAME and an ADMIN_PASSWORD of at least 12 characters in .env");
  }
  const db = await mysql.createConnection({
    host: DB_HOST, port: Number(DB_PORT || 3306), database: DB_NAME,
    user: DB_USER, password: DB_PASSWORD
  });
  const hash = await bcrypt.hash(ADMIN_PASSWORD, 12);
  await db.execute(
    "INSERT INTO admins (username, password_hash) VALUES (?, ?) ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash)",
    [ADMIN_USERNAME, hash]
  );
  await db.end();
  console.log("Admin account created/updated. Keep your credentials private.");
}
main().catch(err => { console.error(err.message); process.exit(1); });
