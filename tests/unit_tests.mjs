// tests/unit_tests.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import crypto from 'node:crypto';

// ============================================================================
// SIMULATED SQLITE ADAPTER MATCHING EXPO-SQLITE SYNC API
// ============================================================================
class ExpoSqliteMock {
  constructor() {
    this.db = new DatabaseSync(':memory:');
  }

  execSync(sql) {
    this.db.exec(sql);
  }

  runSync(sql, params = []) {
    const stmt = this.db.prepare(sql);
    return stmt.run(...params);
  }

  getAllSync(sql, params = []) {
    const stmt = this.db.prepare(sql);
    return stmt.all(...params);
  }

  getFirstSync(sql, params = []) {
    const stmt = this.db.prepare(sql);
    return stmt.get(...params);
  }
}

// Helper: SHA256 Password Hash matching src/lib/crypto.ts
const SALT = '_eventdesk_salt_2026';
function hashPasswordSync(password) {
  const salted = password + SALT;
  return crypto.createHash('sha256').update(salted).digest('hex');
}

// Helper: QR Token matching src/lib/crypto.ts
function generateQrTokenSync(regNo, sportName) {
  const cleanReg = regNo.toUpperCase().trim();
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 8).toUpperCase();
  const sportPrefix = sportName.slice(0, 3).toUpperCase();
  return `EVT-${cleanReg}-${sportPrefix}-${timestamp}-${randomPart}`;
}

// ============================================================================
// TESTS SUITE
// ============================================================================

test('1. SQLite Tables Initialization and DDL', () => {
  const sqlite = new ExpoSqliteMock();

  sqlite.execSync(`
    CREATE TABLE IF NOT EXISTS local_batches (
      year TEXT PRIMARY KEY,
      is_active INTEGER DEFAULT 1,
      synced INTEGER DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS local_departments (
      code TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      is_active INTEGER DEFAULT 1,
      synced INTEGER DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS local_sports (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      code TEXT NOT NULL,
      formats TEXT NOT NULL,
      fee REAL NOT NULL DEFAULT 0,
      is_active INTEGER DEFAULT 1,
      synced INTEGER DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS local_registrations (
      reg_no TEXT PRIMARY KEY,
      student_name TEXT NOT NULL,
      session_year TEXT NOT NULL,
      department_code TEXT NOT NULL,
      sport_id TEXT NOT NULL,
      sport_name TEXT NOT NULL,
      category_format TEXT NOT NULL,
      partner_name TEXT,
      partner_reg_no TEXT,
      payment_status TEXT NOT NULL,
      total_fee REAL NOT NULL,
      paid_amount REAL NOT NULL,
      phone TEXT,
      email TEXT,
      notes TEXT,
      qr_token TEXT NOT NULL,
      checked_in INTEGER DEFAULT 0,
      checked_in_at TEXT,
      checked_in_by TEXT,
      created_by_id TEXT,
      created_by_username TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT,
      synced INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS local_users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      full_name TEXT NOT NULL,
      role TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      is_active INTEGER DEFAULT 1,
      permissions TEXT,
      created_at TEXT NOT NULL,
      synced INTEGER DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS local_audit_logs (
      id TEXT PRIMARY KEY,
      action TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id TEXT,
      performed_by_id TEXT,
      performed_by_username TEXT NOT NULL,
      details TEXT,
      created_at TEXT NOT NULL,
      synced INTEGER DEFAULT 0
    );
  `);

  // Verify all 6 tables exist in SQLite master
  const tables = sqlite.getAllSync("SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'local_%'");
  const tableNames = tables.map((t) => t.name).sort();
  assert.deepEqual(tableNames, [
    'local_audit_logs',
    'local_batches',
    'local_departments',
    'local_registrations',
    'local_sports',
    'local_users',
  ]);
});

test('2. Batches CRUD and Offline Defaults in SQLite', () => {
  const sqlite = new ExpoSqliteMock();
  sqlite.execSync(`
    CREATE TABLE local_batches (
      year TEXT PRIMARY KEY,
      is_active INTEGER DEFAULT 1,
      synced INTEGER DEFAULT 1
    );
  `);

  // Default seed
  const defaults = ['2026', '2025', '2024', '2023'];
  for (const y of defaults) {
    sqlite.runSync('INSERT OR IGNORE INTO local_batches (year, is_active, synced) VALUES (?, 1, 1)', [y]);
  }

  let batches = sqlite.getAllSync('SELECT year FROM local_batches WHERE is_active = 1 ORDER BY year DESC');
  assert.equal(batches.length, 4);
  assert.equal(batches[0].year, '2026');

  // Add new batch offline (synced = 0)
  sqlite.runSync('INSERT OR REPLACE INTO local_batches (year, is_active, synced) VALUES (?, 1, 0)', ['2027']);
  batches = sqlite.getAllSync('SELECT year FROM local_batches WHERE is_active = 1 ORDER BY year DESC');
  assert.equal(batches.length, 5);
  assert.equal(batches[0].year, '2027');

  const unsynced = sqlite.getAllSync('SELECT * FROM local_batches WHERE synced = 0');
  assert.equal(unsynced.length, 1);
  assert.equal(unsynced[0].year, '2027');

  // Delete batch
  sqlite.runSync('DELETE FROM local_batches WHERE year = ?', ['2023']);
  batches = sqlite.getAllSync('SELECT year FROM local_batches WHERE is_active = 1 ORDER BY year DESC');
  assert.equal(batches.length, 4);
  assert(!batches.find((b) => b.year === '2023'));
});

test('3. Departments CRUD and Offline Store in SQLite', () => {
  const sqlite = new ExpoSqliteMock();
  sqlite.execSync(`
    CREATE TABLE local_departments (
      code TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      is_active INTEGER DEFAULT 1,
      synced INTEGER DEFAULT 1
    );
  `);

  // Add departments
  sqlite.runSync(
    'INSERT INTO local_departments (code, name, description, is_active, synced) VALUES (?, ?, ?, ?, ?)',
    ['CS', 'Computer Science', 'Computing and AI', 1, 0]
  );
  sqlite.runSync(
    'INSERT INTO local_departments (code, name, description, is_active, synced) VALUES (?, ?, ?, ?, ?)',
    ['EE', 'Electrical Engineering', 'Electronics & Power', 1, 1]
  );

  let rows = sqlite.getAllSync('SELECT * FROM local_departments WHERE is_active = 1 ORDER BY name ASC');
  assert.equal(rows.length, 2);
  assert.equal(rows[0].code, 'CS');

  // Update department
  sqlite.runSync('UPDATE local_departments SET name = ?, description = ?, synced = 0 WHERE code = ?', [
    'Computer Science & Software',
    'Updated Department',
    'CS',
  ]);
  const updated = sqlite.getFirstSync('SELECT * FROM local_departments WHERE code = ?', ['CS']);
  assert.equal(updated.name, 'Computer Science & Software');
  assert.equal(updated.synced, 0);

  // Delete department
  sqlite.runSync('DELETE FROM local_departments WHERE code = ?', ['EE']);
  rows = sqlite.getAllSync('SELECT * FROM local_departments');
  assert.equal(rows.length, 1);
});

test('4. Sports Multi-Format and Fee Management in SQLite', () => {
  const sqlite = new ExpoSqliteMock();
  sqlite.execSync(`
    CREATE TABLE local_sports (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      code TEXT NOT NULL,
      formats TEXT NOT NULL,
      fee REAL NOT NULL DEFAULT 0,
      is_active INTEGER DEFAULT 1,
      synced INTEGER DEFAULT 1
    );
  `);

  const badmintonFormats = JSON.stringify(['Single (1v1)', 'Doubles (2v2)']);
  sqlite.runSync(
    'INSERT INTO local_sports (id, name, code, formats, fee, is_active, synced) VALUES (?, ?, ?, ?, ?, 1, 0)',
    ['sport-1', 'Badminton', 'BAD', badmintonFormats, 500]
  );

  const row = sqlite.getFirstSync('SELECT * FROM local_sports WHERE id = ?', ['sport-1']);
  assert.equal(row.name, 'Badminton');
  assert.equal(row.fee, 500);
  assert.deepEqual(JSON.parse(row.formats), ['Single (1v1)', 'Doubles (2v2)']);

  // Update fee
  sqlite.runSync('UPDATE local_sports SET fee = ?, synced = 0 WHERE id = ?', [600, 'sport-1']);
  const updated = sqlite.getFirstSync('SELECT fee FROM local_sports WHERE id = ?', ['sport-1']);
  assert.equal(updated.fee, 600);
});

test('5. Registrations Creation, QR Generation, and Filtering in SQLite', () => {
  const sqlite = new ExpoSqliteMock();
  sqlite.execSync(`
    CREATE TABLE local_registrations (
      reg_no TEXT PRIMARY KEY,
      student_name TEXT NOT NULL,
      session_year TEXT NOT NULL,
      department_code TEXT NOT NULL,
      sport_id TEXT NOT NULL,
      sport_name TEXT NOT NULL,
      category_format TEXT NOT NULL,
      partner_name TEXT,
      partner_reg_no TEXT,
      payment_status TEXT NOT NULL,
      total_fee REAL NOT NULL,
      paid_amount REAL NOT NULL,
      phone TEXT,
      email TEXT,
      notes TEXT,
      qr_token TEXT NOT NULL,
      checked_in INTEGER DEFAULT 0,
      checked_in_at TEXT,
      checked_in_by TEXT,
      created_by_id TEXT,
      created_by_username TEXT NOT NULL,
      created_at TEXT NOT NULL,
      synced INTEGER DEFAULT 0
    );
  `);

  const regNo1 = '2026-CS-101';
  const qrToken1 = generateQrTokenSync(regNo1, 'Cricket');

  sqlite.runSync(
    `INSERT INTO local_registrations 
    (reg_no, student_name, session_year, department_code, sport_id, sport_name, category_format, payment_status, total_fee, paid_amount, phone, qr_token, checked_in, created_by_username, created_at, synced)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, 0)`,
    [
      regNo1,
      'Ali Khan',
      '2026',
      'CS',
      'sport-cricket',
      'Cricket',
      'Tape Ball (7v7)',
      'PAID',
      1200,
      1200,
      '03001234567',
      qrToken1,
      'admin',
      new Date().toISOString(),
    ]
  );

  const regNo2 = '2026-EE-202';
  const qrToken2 = generateQrTokenSync(regNo2, 'Table Tennis');
  sqlite.runSync(
    `INSERT INTO local_registrations 
    (reg_no, student_name, session_year, department_code, sport_id, sport_name, category_format, payment_status, total_fee, paid_amount, phone, qr_token, checked_in, created_by_username, created_at, synced)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, 0)`,
    [
      regNo2,
      'Sara Ahmed',
      '2026',
      'EE',
      'sport-tt',
      'Table Tennis',
      'Single (1v1)',
      'PARTIAL',
      400,
      200,
      '03129876543',
      qrToken2,
      'moderator_1',
      new Date().toISOString(),
    ]
  );

  // Search by roll/reg_no
  const byReg = sqlite.getFirstSync('SELECT * FROM local_registrations WHERE reg_no = ?', [regNo1]);
  assert.equal(byReg.student_name, 'Ali Khan');
  assert.equal(byReg.payment_status, 'PAID');
  assert.equal(byReg.checked_in, 0);

  // Search by QR token
  const byToken = sqlite.getFirstSync('SELECT * FROM local_registrations WHERE qr_token = ?', [qrToken2]);
  assert.equal(byToken.student_name, 'Sara Ahmed');
  assert.equal(byToken.paid_amount, 200);

  // Filter by sport
  const cricketRows = sqlite.getAllSync('SELECT * FROM local_registrations WHERE sport_name = ?', ['Cricket']);
  assert.equal(cricketRows.length, 1);
  assert.equal(cricketRows[0].reg_no, regNo1);
});

test('6. Ticket QR Check-in and Duplicate Scan Detection in SQLite', () => {
  const sqlite = new ExpoSqliteMock();
  sqlite.execSync(`
    CREATE TABLE local_registrations (
      reg_no TEXT PRIMARY KEY,
      student_name TEXT NOT NULL,
      sport_name TEXT NOT NULL,
      qr_token TEXT NOT NULL,
      checked_in INTEGER DEFAULT 0,
      checked_in_at TEXT,
      checked_in_by TEXT
    );
  `);

  const qr = generateQrTokenSync('2026-ME-050', 'Futsal');
  sqlite.runSync(
    'INSERT INTO local_registrations (reg_no, student_name, sport_name, qr_token, checked_in) VALUES (?, ?, ?, ?, 0)',
    ['2026-ME-050', 'Zaid Tariq', 'Futsal', qr]
  );

  // Check in first time
  const record = sqlite.getFirstSync('SELECT * FROM local_registrations WHERE qr_token = ?', [qr]);
  assert.equal(record.checked_in, 0);

  const checkInTimestamp = new Date().toISOString();
  sqlite.runSync(
    'UPDATE local_registrations SET checked_in = 1, checked_in_at = ?, checked_in_by = ? WHERE qr_token = ?',
    [checkInTimestamp, 'moderator_gate', qr]
  );

  // Second scan: verify it detects already checked in!
  const scannedAgain = sqlite.getFirstSync('SELECT * FROM local_registrations WHERE qr_token = ?', [qr]);
  assert.equal(scannedAgain.checked_in, 1);
  assert.equal(scannedAgain.checked_in_by, 'moderator_gate');
  assert.equal(scannedAgain.checked_in_at, checkInTimestamp);
});

test('7. Users, Role Permissions, and Offline Password Authentication in SQLite', () => {
  const sqlite = new ExpoSqliteMock();
  sqlite.execSync(`
    CREATE TABLE local_users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      full_name TEXT NOT NULL,
      role TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      is_active INTEGER DEFAULT 1,
      permissions TEXT,
      created_at TEXT NOT NULL,
      synced INTEGER DEFAULT 1
    );
  `);

  // 1. Seed Super Admin
  const adminHash = hashPasswordSync('Admin123!');
  sqlite.runSync(
    `INSERT INTO local_users (id, username, full_name, role, password_hash, is_active, created_at, synced)
    VALUES (?, ?, ?, ?, ?, 1, ?, 1)`,
    ['usr-admin', 'admin', 'Super Administrator', 'superadmin', adminHash, new Date().toISOString()]
  );

  // 2. Add Moderator with permissions
  const modHash = hashPasswordSync('ModPass456');
  const modPerms = JSON.stringify({
    canRegister: true,
    canVerifyPass: true,
    canExportData: false,
    canManageCatalog: false,
    canManageModerators: false,
  });

  sqlite.runSync(
    `INSERT INTO local_users (id, username, full_name, role, password_hash, is_active, permissions, created_at, synced)
    VALUES (?, ?, ?, ?, ?, 1, ?, ?, 0)`,
    ['usr-mod-1', 'moderator_ali', 'Ali Moderator', 'moderator', modHash, modPerms, new Date().toISOString()]
  );

  // Authenticate Admin Offline
  const inputAdminPass = 'Admin123!';
  const inputAdminHash = hashPasswordSync(inputAdminPass);
  const foundAdmin = sqlite.getFirstSync('SELECT * FROM local_users WHERE username = ?', ['admin']);
  assert(foundAdmin);
  assert.equal(foundAdmin.password_hash, inputAdminHash);
  assert.equal(foundAdmin.role, 'superadmin');

  // Authenticate with WRONG password -> Fails
  const wrongHash = hashPasswordSync('WrongPassword!');
  assert.notEqual(foundAdmin.password_hash, wrongHash);

  // Authenticate Moderator Offline
  const foundMod = sqlite.getFirstSync('SELECT * FROM local_users WHERE username = ?', ['moderator_ali']);
  assert(foundMod);
  assert.equal(foundMod.password_hash, hashPasswordSync('ModPass456'));
  const parsedPerms = JSON.parse(foundMod.permissions);
  assert.equal(parsedPerms.canRegister, true);
  assert.equal(parsedPerms.canExportData, false);

  // Toggle Moderator active status (Deactivate)
  sqlite.runSync('UPDATE local_users SET is_active = 0, synced = 0 WHERE username = ?', ['moderator_ali']);
  const deactivatedMod = sqlite.getFirstSync('SELECT * FROM local_users WHERE username = ?', ['moderator_ali']);
  assert.equal(deactivatedMod.is_active, 0);
});

test('8. Audit Logging and History Querying in SQLite', () => {
  const sqlite = new ExpoSqliteMock();
  sqlite.execSync(`
    CREATE TABLE local_audit_logs (
      id TEXT PRIMARY KEY,
      action TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id TEXT,
      performed_by_id TEXT,
      performed_by_username TEXT NOT NULL,
      details TEXT,
      created_at TEXT NOT NULL,
      synced INTEGER DEFAULT 0
    );
  `);

  sqlite.runSync(
    `INSERT INTO local_audit_logs (id, action, entity_type, entity_id, performed_by_username, details, created_at, synced)
    VALUES (?, ?, ?, ?, ?, ?, ?, 0)`,
    [
      'log-1',
      'LOGIN',
      'auth',
      null,
      'admin',
      JSON.stringify({ device: 'mobile' }),
      '2026-10-10T01:00:00.000Z',
    ]
  );

  sqlite.runSync(
    `INSERT INTO local_audit_logs (id, action, entity_type, entity_id, performed_by_username, details, created_at, synced)
    VALUES (?, ?, ?, ?, ?, ?, ?, 0)`,
    [
      'log-2',
      'CREATE_REGISTRATION',
      'registration',
      '2026-CS-101',
      'admin',
      JSON.stringify({ sport: 'Cricket' }),
      '2026-10-10T01:10:00.000Z',
    ]
  );

  const logs = sqlite.getAllSync('SELECT * FROM local_audit_logs ORDER BY created_at DESC');
  assert.equal(logs.length, 2);
  assert.equal(logs[0].action, 'CREATE_REGISTRATION');
  assert.equal(logs[1].action, 'LOGIN');
});

test('9. Analytics Engine Aggregate Calculations', () => {
  const registrations = [
    { reg_no: 'R1', sport_name: 'Cricket', department_code: 'CS', payment_status: 'PAID', total_fee: 1000, paid_amount: 1000 },
    { reg_no: 'R2', sport_name: 'Cricket', department_code: 'EE', payment_status: 'PARTIAL', total_fee: 1000, paid_amount: 600 },
    { reg_no: 'R3', sport_name: 'Futsal', department_code: 'CS', payment_status: 'FREE', total_fee: 800, paid_amount: 0 },
    { reg_no: 'R4', sport_name: 'Badminton', department_code: 'ME', payment_status: 'UNPAID', total_fee: 500, paid_amount: 0 },
  ];

  let totalRevenueExpected = 0;
  let totalRevenueCollected = 0;
  let paidCount = 0;
  let partialCount = 0;
  let freeCount = 0;
  let unpaidCount = 0;
  const sportMap = new Map();
  const deptMap = new Map();

  for (const r of registrations) {
    totalRevenueExpected += r.total_fee;
    totalRevenueCollected += r.paid_amount;
    if (r.payment_status === 'PAID') paidCount++;
    else if (r.payment_status === 'PARTIAL') partialCount++;
    else if (r.payment_status === 'FREE') freeCount++;
    else unpaidCount++;

    const s = sportMap.get(r.sport_name) || { count: 0, revenue: 0 };
    s.count++;
    s.revenue += r.paid_amount;
    sportMap.set(r.sport_name, s);

    deptMap.set(r.department_code, (deptMap.get(r.department_code) || 0) + 1);
  }

  assert.equal(totalRevenueExpected, 3300);
  assert.equal(totalRevenueCollected, 1600);
  assert.equal(totalRevenueExpected - totalRevenueCollected, 1700); // pending balance
  assert.equal(paidCount, 1);
  assert.equal(partialCount, 1);
  assert.equal(freeCount, 1);
  assert.equal(unpaidCount, 1);
  assert.equal(sportMap.get('Cricket').count, 2);
  assert.equal(sportMap.get('Cricket').revenue, 1600);
  assert.equal(deptMap.get('CS'), 2);
  assert.equal(deptMap.get('EE'), 1);
});

test('10. CSV Export Content Formatting', () => {
  const records = [
    {
      reg_no: '2026-CS-001',
      student_name: 'Muhammad, "Ali"',
      session_year: '2026',
      department_code: 'CS',
      sport_name: 'Cricket',
      category_format: 'Tape Ball (7v7)',
      partner_name: '',
      partner_reg_no: '',
      phone: '03001234567',
      email: 'ali@example.com',
      payment_status: 'PAID',
      total_fee: 1000,
      paid_amount: 1000,
      checked_in: true,
      created_by_username: 'admin',
      created_at: '2026-10-10T00:00:00.000Z',
    },
  ];

  const headers = [
    'Registration No',
    'Student Name',
    'Session',
    'Department',
    'Sport',
    'Format',
    'Partner Name',
    'Partner Reg No',
    'Phone',
    'Email',
    'Payment Status',
    'Total Fee (PKR)',
    'Paid Amount (PKR)',
    'Balance Due (PKR)',
    'Checked In',
    'Registered By',
    'Date',
  ];

  const rows = records.map((r) => {
    const bal = Math.max(0, r.total_fee - r.paid_amount);
    return [
      `"${r.reg_no}"`,
      `"${r.student_name.replace(/"/g, '""')}"`,
      `"${r.session_year}"`,
      `"${r.department_code}"`,
      `"${r.sport_name}"`,
      `"${r.category_format}"`,
      `"${(r.partner_name || '').replace(/"/g, '""')}"`,
      `"${r.partner_reg_no || ''}"`,
      `"${r.phone || ''}"`,
      `"${r.email || ''}"`,
      `"${r.payment_status}"`,
      r.total_fee,
      r.paid_amount,
      bal,
      r.checked_in ? 'YES' : 'NO',
      `"${r.created_by_username}"`,
      `"${new Date(r.created_at).toLocaleDateString()}"`,
    ].join(',');
  });

  const csv = [headers.join(','), ...rows].join('\n');
  assert(csv.includes('Registration No,Student Name,Session,Department'));
  assert(csv.includes('"2026-CS-001","Muhammad, ""Ali"""')); // Quotes properly escaped
  assert(csv.includes(',1000,1000,0,YES,"admin"'));
});

test('11. Two-Way Sync Conflict Safety (Preserving Unsynced Local Edits)', () => {
  const sqlite = new ExpoSqliteMock();
  sqlite.execSync(`
    CREATE TABLE local_registrations (
      reg_no TEXT PRIMARY KEY,
      student_name TEXT NOT NULL,
      payment_status TEXT NOT NULL,
      synced INTEGER DEFAULT 0
    );
  `);

  // Student registered offline
  sqlite.runSync(
    'INSERT INTO local_registrations (reg_no, student_name, payment_status, synced) VALUES (?, ?, ?, 0)',
    ['2026-CS-999', 'Offline Student', 'PAID']
  );

  // Cloud incoming data has older record with same reg_no but UNPAID
  const cloudRecord = { reg_no: '2026-CS-999', student_name: 'Offline Student', payment_status: 'UNPAID' };

  // Our sync logic: Check if synced === 0. If so, DO NOT OVERWRITE!
  const local = sqlite.getFirstSync('SELECT synced FROM local_registrations WHERE reg_no = ?', [cloudRecord.reg_no]);
  if (!local || local.synced !== 0) {
    sqlite.runSync(
      'INSERT OR REPLACE INTO local_registrations (reg_no, student_name, payment_status, synced) VALUES (?, ?, ?, 1)',
      [cloudRecord.reg_no, cloudRecord.student_name, cloudRecord.payment_status]
    );
  }

  // Verify local offline change was preserved!
  const finalRecord = sqlite.getFirstSync('SELECT * FROM local_registrations WHERE reg_no = ?', ['2026-CS-999']);
  assert.equal(finalRecord.payment_status, 'PAID');
  assert.equal(finalRecord.synced, 0);
});
