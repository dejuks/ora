/**
 * Seeds one demo user for every JMS role (plus sample reviewer profiles and
 * editorial board entries). Safe to run many times.
 *
 *   npm run seed
 *   SEED_PASSWORD='Other!Pass1' npm run seed
 */
import fs from "node:fs";
import pg from "pg";
import argon2 from "argon2";

const envFile = new URL("../.env", import.meta.url);
const envText = fs.existsSync(envFile) ? fs.readFileSync(envFile, "utf8") : "";
const fromFile = (k) => envText.match(new RegExp(`^${k}=("?)(.*)\\1$`, "m"))?.[2];
const DATABASE_URL = process.env.DATABASE_URL || fromFile("DATABASE_URL");
if (!DATABASE_URL) { console.error("DATABASE_URL is not set (services/journal-service/.env)."); process.exit(1); }

const PASSWORD = process.env.SEED_PASSWORD || "Demo@12345";

// username, first, last, JMS roles, reviewer expertise
const USERS = [
  ["jms.moduleadmin", "Mulu",   "Admin",    ["MODULE_ADMIN"]],
  ["jms.manager",     "Meron",  "Manager",  ["JOURNAL_MANAGER"]],
  ["jms.eic",         "Elias",  "Chief",    ["EIC"]],
  ["jms.associate",   "Aster",  "Associate",["ASSOCIATE_EDITOR"]],
  ["jms.editor",      "Eba",    "Editor",   ["EDITOR"]],
  ["jms.reviewer1",   "Rahel",  "Reviewer", ["REVIEWER"], "Oromo history, Gadaa system, political anthropology"],
  ["jms.reviewer2",   "Robsan", "Reviewer", ["REVIEWER"], "Afaan Oromo linguistics, sociolinguistics"],
  ["jms.author",      "Abdi",   "Author",   ["AUTHOR"]],
  ["jms.reader",      "Rediet", "Reader",   ["READER"]],
];

const pool = new pg.Pool({ connectionString: DATABASE_URL });
const q = (t, p) => pool.query(t, p);

try {
  const mod = (await q(`SELECT id FROM iam.modules WHERE code='JMS'`)).rows[0];
  if (!mod) throw new Error("Module JMS not found. Run ./scripts/setup.sh first (it applies the migrations).");
  const hash = await argon2.hash(PASSWORD, { type: argon2.argon2id, memoryCost: 19456, timeCost: 2, parallelism: 1 });

  for (const [username, first, last, roles, expertise] of USERS) {
    const email = `${username.replace(".", "_")}@ora.local`;
    let u = (await q(`SELECT id FROM iam.users WHERE username=$1 OR email=$2`, [username, email])).rows[0];
    if (!u) {
      u = (await q(
        `INSERT INTO iam.users (first_name,last_name,username,email,status,email_verified_at)
         VALUES ($1,$2,$3,$4,'ACTIVE',now()) RETURNING id`, [first, last, username, email])).rows[0];
    } else {
      await q(`UPDATE iam.users SET status='ACTIVE', email_verified_at=COALESCE(email_verified_at, now()), deleted_at=NULL WHERE id=$1`, [u.id]);
    }
    await q(
      `INSERT INTO auth.user_credentials (user_id,password_hash,password_changed_at,must_change_password)
       VALUES ($1,$2,now(),false)
       ON CONFLICT (user_id) DO UPDATE SET password_hash=EXCLUDED.password_hash, must_change_password=false, updated_at=now()`,
      [u.id, hash]);
    let a = (await q(`SELECT id FROM iam.user_module_assignments WHERE user_id=$1 AND module_id=$2`, [u.id, mod.id])).rows[0];
    if (!a) a = (await q(`INSERT INTO iam.user_module_assignments (user_id,module_id,status) VALUES ($1,$2,'ACTIVE') RETURNING id`, [u.id, mod.id])).rows[0];
    for (const code of roles) {
      await q(
        `INSERT INTO iam.user_module_roles (module_assignment_id,module_id,role_id)
         SELECT $1,$2,id FROM iam.roles WHERE module_id=$2 AND code=$3
         ON CONFLICT DO NOTHING`, [a.id, mod.id, code]);
    }
    if (expertise) {
      await q(
        `INSERT INTO jms.reviewer_profiles (user_id,expertise,affiliation,is_available)
         VALUES ($1,$2,'Addis Ababa University',true)
         ON CONFLICT (user_id) DO UPDATE SET expertise=EXCLUDED.expertise`, [u.id, expertise]);
    }
  }

  const journal = (await q(`SELECT id FROM jms.journals ORDER BY created_at LIMIT 1`)).rows[0];
  if (journal && !(await q(`SELECT 1 FROM jms.journal_staff WHERE journal_id=$1 LIMIT 1`, [journal.id])).rowCount) {
    const staff = [
      ["Elias Chief", "Editor-in-Chief", 1], ["Aster Associate", "Associate Editor", 2],
      ["Meron Manager", "Managing Editor", 3], ["Rahel Reviewer", "Editorial Board Member", 4],
    ];
    for (const [name, pos, order] of staff)
      await q(`INSERT INTO jms.journal_staff (journal_id,full_name,position,affiliation,display_order) VALUES ($1,$2,$3,'Oromo Research Association',$4)`, [journal.id, name, pos, order]);
  }

  console.log("\nJMS demo users created/updated. Password for all: " + PASSWORD + "\n");
  console.log("username          role");
  for (const [username, , , roles] of USERS) console.log(username.padEnd(17), roles.join(", "));
  console.log("\nSign in at http://localhost:3000 with the username (or the email <username with _>@ora.local).");
} catch (e) {
  console.error("Seed failed:", e.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
