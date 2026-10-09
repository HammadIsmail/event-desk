// src/services/sqliteStore.ts
import { Platform } from 'react-native';
import * as SQLite from 'expo-sqlite';
import { supabase } from '@/lib/supabase';
import { Department, Sport, Registration, AuditLog, AppUser } from '@/types';

class SQLiteStore {
  private db: any = null;
  private isInitialized = false;

  async init() {
    if (this.isInitialized) return;

    if (Platform.OS !== 'web') {
      try {
        this.db = SQLite.openDatabaseSync('eventdesk.db');
        this.db.execSync(`
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
      } catch (err) {
        console.warn('SQLite init warning:', err);
      }
    }

    this.isInitialized = true;
  }

  // -------------------------------------------------------------
  // BATCHES / SESSIONS (Dynamic SQLite + Cloud)
  // -------------------------------------------------------------
  async getBatches(): Promise<string[]> {
    await this.init();

    // 1. Try to fetch latest from cloud and cache locally
    try {
      const { data, error } = await supabase
        .from('batches')
        .select('year')
        .eq('is_active', true)
        .order('year', { ascending: false });

      if (!error && data && data.length > 0 && this.db) {
        for (const d of data) {
          this.db.runSync(
            'INSERT OR IGNORE INTO local_batches (year, is_active, synced) VALUES (?, 1, 1)',
            [d.year]
          );
        }
      }
    } catch {
      // Offline: continue to read from local SQLite
    }

    // 2. Query from SQLite
    if (this.db) {
      try {
        const rows = this.db.getAllSync('SELECT year FROM local_batches WHERE is_active = 1 ORDER BY year DESC');
        if (rows && rows.length > 0) {
          return rows.map((r: any) => r.year);
        }
      } catch {}
    }

    // 3. Fallback defaults if first-time launch offline
    const defaults = ['2026', '2025', '2024', '2023'];
    if (this.db) {
      for (const y of defaults) {
        this.db.runSync('INSERT OR IGNORE INTO local_batches (year, is_active, synced) VALUES (?, 1, 1)', [y]);
      }
    }
    return defaults;
  }

  async addBatch(year: string): Promise<void> {
    await this.init();
    const cleanYear = year.trim();
    if (!cleanYear) throw new Error('Batch year cannot be empty.');

    // Save locally immediately
    if (this.db) {
      this.db.runSync(
        'INSERT OR REPLACE INTO local_batches (year, is_active, synced) VALUES (?, 1, 0)',
        [cleanYear]
      );
    }

    // Try cloud sync
    try {
      await supabase.from('batches').upsert({ year: cleanYear, is_active: true });
      if (this.db) {
        this.db.runSync('UPDATE local_batches SET synced = 1 WHERE year = ?', [cleanYear]);
      }
    } catch {}
  }

  async deleteBatch(year: string): Promise<void> {
    await this.init();
    const cleanYear = year.trim();

    if (this.db) {
      this.db.runSync('DELETE FROM local_batches WHERE year = ?', [cleanYear]);
    }

    try {
      await supabase.from('batches').delete().eq('year', cleanYear);
    } catch {}
  }

  // -------------------------------------------------------------
  // DEPARTMENTS (Dynamic SQLite + Cloud)
  // -------------------------------------------------------------
  async getDepartments(): Promise<Department[]> {
    await this.init();

    // 1. Try to fetch from cloud and cache in SQLite
    try {
      const { data, error } = await supabase.from('departments').select('*').order('name', { ascending: true });
      if (!error && data && data.length > 0 && this.db) {
        for (const d of data) {
          this.db.runSync(
            'INSERT OR REPLACE INTO local_departments (code, name, description, is_active, synced) VALUES (?, ?, ?, ?, 1)',
            [d.code, d.name, d.description || '', d.is_active ? 1 : 0]
          );
        }
      }
    } catch {
      // Offline: continue to read from local SQLite
    }

    // 2. Query from SQLite
    if (this.db) {
      try {
        const rows = this.db.getAllSync('SELECT * FROM local_departments WHERE is_active = 1 ORDER BY name ASC');
        if (rows && rows.length > 0) {
          return rows.map((r: any) => ({
            id: r.code,
            code: r.code,
            name: r.name,
            description: r.description,
            is_active: r.is_active === 1,
          }));
        }
      } catch {}
    }

    // 3. Defaults if initial launch offline
    const defaults: Department[] = [
      { id: 'CS', code: 'CS', name: 'Computer Science', is_active: true },
      { id: 'EE', code: 'EE', name: 'Electrical Engineering', is_active: true },
      { id: 'ME', code: 'ME', name: 'Mechanical Engineering', is_active: true },
      { id: 'CE', code: 'CE', name: 'Civil Engineering', is_active: true },
      { id: 'CH', code: 'CH', name: 'Chemical Engineering', is_active: true },
      { id: 'BBA', code: 'BBA', name: 'Business Administration', is_active: true },
    ];
    if (this.db) {
      for (const d of defaults) {
        this.db.runSync(
          'INSERT OR IGNORE INTO local_departments (code, name, description, is_active, synced) VALUES (?, ?, ?, 1, 1)',
          [d.code, d.name, d.description || '']
        );
      }
    }
    return defaults;
  }

  async addDepartment(name: string, code: string, description?: string): Promise<Department> {
    await this.init();
    const cleanCode = code.trim().toUpperCase();
    const cleanName = name.trim();

    if (this.db) {
      this.db.runSync(
        'INSERT OR REPLACE INTO local_departments (code, name, description, is_active, synced) VALUES (?, ?, ?, 1, 0)',
        [cleanCode, cleanName, description || '']
      );
    }

    try {
      await supabase.from('departments').upsert({
        code: cleanCode,
        name: cleanName,
        description: description || '',
        is_active: true,
      });
      if (this.db) {
        this.db.runSync('UPDATE local_departments SET synced = 1 WHERE code = ?', [cleanCode]);
      }
    } catch {}

    return { id: cleanCode, code: cleanCode, name: cleanName, description, is_active: true };
  }

  async updateDepartment(code: string, name: string, description?: string): Promise<void> {
    await this.init();
    const cleanCode = code.trim().toUpperCase();
    const cleanName = name.trim();

    if (this.db) {
      this.db.runSync(
        'UPDATE local_departments SET name = ?, description = ?, synced = 0 WHERE code = ?',
        [cleanName, description || '', cleanCode]
      );
    }

    try {
      await supabase.from('departments').update({ name: cleanName, description: description || '' }).eq('code', cleanCode);
      if (this.db) {
        this.db.runSync('UPDATE local_departments SET synced = 1 WHERE code = ?', [cleanCode]);
      }
    } catch {}
  }

  async deleteDepartment(code: string): Promise<void> {
    await this.init();
    const cleanCode = code.trim().toUpperCase();

    if (this.db) {
      this.db.runSync('DELETE FROM local_departments WHERE code = ?', [cleanCode]);
    }

    try {
      await supabase.from('departments').delete().eq('code', cleanCode);
    } catch {}
  }

  // -------------------------------------------------------------
  // SPORTS (Dynamic SQLite + Cloud)
  // -------------------------------------------------------------
  async getSports(): Promise<Sport[]> {
    await this.init();

    // 1. Try to fetch from cloud and cache in SQLite
    try {
      const { data, error } = await supabase.from('sports').select('*').order('name', { ascending: true });
      if (!error && data && data.length > 0 && this.db) {
        for (const s of data) {
          this.db.runSync(
            'INSERT OR REPLACE INTO local_sports (id, name, code, formats, fee, is_active, synced) VALUES (?, ?, ?, ?, ?, ?, 1)',
            [s.id, s.name, s.code, JSON.stringify(s.formats), s.fee, s.is_active ? 1 : 0]
          );
        }
      }
    } catch {
      // Offline: continue to read from local SQLite
    }

    // 2. Query from SQLite
    if (this.db) {
      try {
        const rows = this.db.getAllSync('SELECT * FROM local_sports WHERE is_active = 1 ORDER BY name ASC');
        if (rows && rows.length > 0) {
          return rows.map((r: any) => ({
            id: r.id,
            name: r.name,
            code: r.code,
            formats: JSON.parse(r.formats || '["Single (1v1)"]'),
            fee: Number(r.fee) || 0,
            is_active: r.is_active === 1,
          }));
        }
      } catch {}
    }

    // 3. Fallback defaults if initial launch offline
    const defaults: Sport[] = [
      { id: 'BADM', code: 'BADM', name: 'Badminton', formats: ['Single (1v1)', 'Doubles (2v2)'], fee: 500, is_active: true },
      { id: 'CRIC', code: 'CRIC', name: 'Cricket', formats: ['Tape Ball (8v8)'], fee: 3000, is_active: true },
      { id: 'FUTS', code: 'FUTS', name: 'Futsal', formats: ['Team (7v7)'], fee: 2500, is_active: true },
      { id: 'TT', code: 'TT', name: 'Table Tennis', formats: ['Single (1v1)', 'Doubles (2v2)'], fee: 300, is_active: true },
      { id: 'CHESS', code: 'CHESS', name: 'Chess', formats: ['Single (1v1)'], fee: 250, is_active: true },
      { id: 'LUDO', code: 'LUDO', name: 'Ludo', formats: ['Single (1v1)', 'Doubles (2v2)'], fee: 200, is_active: true },
    ];
    if (this.db) {
      for (const s of defaults) {
        this.db.runSync(
          'INSERT OR IGNORE INTO local_sports (id, name, code, formats, fee, is_active, synced) VALUES (?, ?, ?, ?, ?, 1, 1)',
          [s.id, s.name, s.code, JSON.stringify(s.formats), s.fee]
        );
      }
    }
    return defaults;
  }

  async addSport(name: string, code: string, formats: string[], fee: number): Promise<Sport> {
    await this.init();
    const cleanCode = code.trim().toUpperCase();
    const cleanName = name.trim();
    const id = cleanCode;

    if (this.db) {
      this.db.runSync(
        'INSERT OR REPLACE INTO local_sports (id, name, code, formats, fee, is_active, synced) VALUES (?, ?, ?, ?, ?, 1, 0)',
        [id, cleanName, cleanCode, JSON.stringify(formats), fee]
      );
    }

    try {
      await supabase.from('sports').upsert({
        id,
        name: cleanName,
        code: cleanCode,
        formats: formats,
        fee: fee,
        is_active: true,
      });
      if (this.db) {
        this.db.runSync('UPDATE local_sports SET synced = 1 WHERE id = ?', [id]);
      }
    } catch {}

    return { id, name: cleanName, code: cleanCode, formats, fee, is_active: true };
  }

  async updateSport(id: string, name: string, formats: string[], fee: number): Promise<void> {
    await this.init();
    if (this.db) {
      this.db.runSync(
        'UPDATE local_sports SET name = ?, formats = ?, fee = ?, synced = 0 WHERE id = ?',
        [name.trim(), JSON.stringify(formats), fee, id]
      );
    }

    try {
      await supabase.from('sports').update({ name: name.trim(), formats, fee }).eq('id', id);
      if (this.db) {
        this.db.runSync('UPDATE local_sports SET synced = 1 WHERE id = ?', [id]);
      }
    } catch {}
  }

  async deleteSport(id: string): Promise<void> {
    await this.init();
    if (this.db) {
      this.db.runSync('DELETE FROM local_sports WHERE id = ?', [id]);
    }
    try {
      await supabase.from('sports').delete().eq('id', id);
    } catch {}
  }

  // -------------------------------------------------------------
  // USERS & MODERATORS (SQLite + Cloud)
  // -------------------------------------------------------------
  async getUsers(): Promise<(AppUser & { password_hash: string })[]> {
    await this.init();
    if (this.db) {
      try {
        const rows = this.db.getAllSync('SELECT * FROM local_users ORDER BY created_at DESC');
        if (rows && rows.length > 0) {
          return rows.map((r: any) => ({
            id: r.id,
            username: r.username,
            full_name: r.full_name,
            role: r.role,
            password_hash: r.password_hash,
            is_active: r.is_active === 1,
            permissions: r.permissions ? JSON.parse(r.permissions) : undefined,
            created_at: r.created_at,
          }));
        }
      } catch {}
    }
    return [];
  }

  async getUserByUsername(username: string): Promise<(AppUser & { password_hash: string }) | null> {
    await this.init();
    const clean = username.trim().toLowerCase();
    if (this.db) {
      try {
        const row = this.db.getFirstSync(
          'SELECT * FROM local_users WHERE LOWER(username) = LOWER(?)',
          [clean]
        );
        if (row) {
          return {
            id: row.id,
            username: row.username,
            full_name: row.full_name,
            role: row.role,
            password_hash: row.password_hash,
            is_active: row.is_active === 1,
            permissions: row.permissions ? JSON.parse(row.permissions) : undefined,
            created_at: row.created_at,
          };
        }
      } catch {}
    }
    return null;
  }

  async saveUser(user: AppUser & { password_hash: string }, synced = 1): Promise<void> {
    await this.init();
    if (this.db) {
      try {
        this.db.runSync(
          `INSERT OR REPLACE INTO local_users 
          (id, username, full_name, role, password_hash, is_active, permissions, created_at, synced)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            user.id,
            user.username.toLowerCase(),
            user.full_name,
            user.role,
            user.password_hash,
            user.is_active ? 1 : 0,
            user.permissions ? JSON.stringify(user.permissions) : null,
            user.created_at || new Date().toISOString(),
            synced,
          ]
        );
      } catch (err) {
        console.warn('saveUser SQLite error:', err);
      }
    }
  }

  // -------------------------------------------------------------
  // AUDIT LOGS (SQLite + Cloud)
  // -------------------------------------------------------------
  async getAuditLogs(): Promise<AuditLog[]> {
    await this.init();
    if (this.db) {
      try {
        const rows = this.db.getAllSync('SELECT * FROM local_audit_logs ORDER BY created_at DESC LIMIT 100');
        if (rows && rows.length > 0) {
          return rows.map((r: any) => ({
            id: r.id,
            action: r.action,
            entity_type: r.entity_type,
            entity_id: r.entity_id || undefined,
            performed_by_id: r.performed_by_id || undefined,
            performed_by_username: r.performed_by_username,
            details: r.details ? JSON.parse(r.details) : undefined,
            created_at: r.created_at,
          }));
        }
      } catch {}
    }
    return [];
  }

  async saveAuditLog(log: AuditLog, synced = 0): Promise<void> {
    await this.init();
    if (this.db) {
      try {
        this.db.runSync(
          `INSERT OR REPLACE INTO local_audit_logs 
          (id, action, entity_type, entity_id, performed_by_id, performed_by_username, details, created_at, synced)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            log.id,
            log.action,
            log.entity_type,
            log.entity_id || null,
            log.performed_by_id || null,
            log.performed_by_username,
            log.details ? JSON.stringify(log.details) : null,
            log.created_at,
            synced,
          ]
        );
      } catch (err) {
        console.warn('saveAuditLog SQLite error:', err);
      }
    }
  }

  // -------------------------------------------------------------
  // REGISTRATIONS (Saved in SQLite and Supabase)
  // -------------------------------------------------------------
  async getRegistrations(): Promise<Registration[]> {
    await this.init();

    // 1. Try to fetch new cloud records and cache in SQLite
    try {
      const { data, error } = await supabase
        .from('registrations')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data && data.length > 0 && this.db) {
        for (const r of data) {
          // Never overwrite unsynced local edits
          const local = this.db.getFirstSync(
            'SELECT synced FROM local_registrations WHERE reg_no = ?',
            [r.reg_no]
          );
          if (!local || local.synced !== 0) {
            this.db.runSync(
              `INSERT OR REPLACE INTO local_registrations 
              (reg_no, student_name, session_year, department_code, sport_id, sport_name, category_format, partner_name, partner_reg_no, payment_status, total_fee, paid_amount, phone, email, notes, qr_token, checked_in, checked_in_at, checked_in_by, created_by_id, created_by_username, created_at, synced)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
              [
                r.reg_no,
                r.student_name,
                r.session_year,
                r.department_code,
                r.sport_id,
                r.sport_name,
                r.category_format,
                r.partner_name || '',
                r.partner_reg_no || '',
                r.payment_status,
                r.total_fee,
                r.paid_amount,
                r.phone || '',
                r.email || '',
                r.notes || '',
                r.qr_token,
                r.checked_in ? 1 : 0,
                r.checked_in_at || '',
                r.checked_in_by || '',
                r.created_by_id || '',
                r.created_by_username,
                r.created_at,
              ]
            );
          }
        }
      }
    } catch {
      // Offline / network failure: gracefully load directly from SQLite
    }

    // 2. Query from SQLite (works 100% offline!)
    if (this.db) {
      try {
        const rows = this.db.getAllSync('SELECT * FROM local_registrations ORDER BY created_at DESC');
        if (rows && rows.length > 0) {
          return rows.map((r: any) => ({
            ...r,
            checked_in: r.checked_in === 1,
            total_fee: Number(r.total_fee) || 0,
            paid_amount: Number(r.paid_amount) || 0,
          }));
        }
      } catch {}
    }

    return [];
  }

  async saveRegistration(reg: Registration): Promise<void> {
    await this.init();
    // 1. Save to SQLite immediately
    if (this.db) {
      this.db.runSync(
        `INSERT OR REPLACE INTO local_registrations 
        (reg_no, student_name, session_year, department_code, sport_id, sport_name, category_format, partner_name, partner_reg_no, payment_status, total_fee, paid_amount, phone, email, notes, qr_token, checked_in, checked_in_at, checked_in_by, created_by_id, created_by_username, created_at, synced)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`,
        [
          reg.reg_no, reg.student_name, reg.session_year, reg.department_code, reg.sport_id, reg.sport_name,
          reg.category_format, reg.partner_name || '', reg.partner_reg_no || '', reg.payment_status,
          reg.total_fee, reg.paid_amount, reg.phone || '', reg.email || '', reg.notes || '', reg.qr_token,
          reg.checked_in ? 1 : 0, reg.checked_in_at || '', reg.checked_in_by || '', reg.created_by_id || '',
          reg.created_by_username, reg.created_at
        ]
      );
    }

    // 2. Try pushing to Supabase
    try {
      const { error } = await supabase.from('registrations').upsert({
        reg_no: reg.reg_no,
        student_name: reg.student_name,
        session_year: reg.session_year,
        department_code: reg.department_code,
        sport_id: reg.sport_id,
        sport_name: reg.sport_name,
        category_format: reg.category_format,
        partner_name: reg.partner_name,
        partner_reg_no: reg.partner_reg_no,
        payment_status: reg.payment_status,
        total_fee: reg.total_fee,
        paid_amount: reg.paid_amount,
        phone: reg.phone,
        email: reg.email,
        notes: reg.notes,
        qr_token: reg.qr_token,
        checked_in: reg.checked_in,
        checked_in_at: reg.checked_in_at,
        checked_in_by: reg.checked_in_by,
        created_by_id: reg.created_by_id,
        created_by_username: reg.created_by_username,
      });

      if (!error && this.db) {
        this.db.runSync('UPDATE local_registrations SET synced = 1 WHERE reg_no = ?', [reg.reg_no]);
      }
    } catch {
      // Offline: left with synced = 0 for later synchronization
    }
  }

  async deleteRegistration(regNo: string): Promise<void> {
    await this.init();
    if (this.db) {
      try {
        this.db.runSync('DELETE FROM local_registrations WHERE reg_no = ?', [regNo.trim().toUpperCase()]);
      } catch (err) {
        console.warn('deleteRegistration SQLite error:', err);
      }
    }
  }

  // -------------------------------------------------------------
  // TWO-WAY SYNC (SQLITE <-> POSTGRESQL / SUPABASE)
  // -------------------------------------------------------------
  async syncWithCloud(): Promise<{ uploaded: number; downloaded: number }> {
    await this.init();
    let uploaded = 0;
    let downloaded = 0;

    if (!this.db) return { uploaded, downloaded };

    // 1. Upload unsynced registrations from SQLite
    try {
      const unsyncedRegs = this.db.getAllSync('SELECT * FROM local_registrations WHERE synced = 0');
      for (const r of unsyncedRegs) {
        const { error } = await supabase.from('registrations').upsert({
          reg_no: r.reg_no,
          student_name: r.student_name,
          session_year: r.session_year,
          department_code: r.department_code,
          sport_id: r.sport_id,
          sport_name: r.sport_name,
          category_format: r.category_format,
          partner_name: r.partner_name || null,
          partner_reg_no: r.partner_reg_no || null,
          payment_status: r.payment_status,
          total_fee: r.total_fee,
          paid_amount: r.paid_amount,
          phone: r.phone || null,
          email: r.email || null,
          notes: r.notes || null,
          qr_token: r.qr_token,
          checked_in: r.checked_in === 1,
          checked_in_at: r.checked_in_at || null,
          checked_in_by: r.checked_in_by || null,
          created_by_username: r.created_by_username,
        });

        if (!error) {
          this.db.runSync('UPDATE local_registrations SET synced = 1 WHERE reg_no = ?', [r.reg_no]);
          uploaded++;
        }
      }
    } catch (err) {
      console.warn('Sync upload registrations error:', err);
    }

    // 2. Upload unsynced batches
    try {
      const unsyncedBatches = this.db.getAllSync('SELECT * FROM local_batches WHERE synced = 0');
      for (const b of unsyncedBatches) {
        const { error } = await supabase.from('batches').upsert({ year: b.year, is_active: b.is_active === 1 });
        if (!error) {
          this.db.runSync('UPDATE local_batches SET synced = 1 WHERE year = ?', [b.year]);
          uploaded++;
        }
      }
    } catch {}

    // 3. Upload unsynced departments
    try {
      const unsyncedDepts = this.db.getAllSync('SELECT * FROM local_departments WHERE synced = 0');
      for (const d of unsyncedDepts) {
        const { error } = await supabase.from('departments').upsert({
          code: d.code,
          name: d.name,
          description: d.description,
          is_active: d.is_active === 1,
        });
        if (!error) {
          this.db.runSync('UPDATE local_departments SET synced = 1 WHERE code = ?', [d.code]);
          uploaded++;
        }
      }
    } catch {}

    // 4. Upload unsynced sports
    try {
      const unsyncedSports = this.db.getAllSync('SELECT * FROM local_sports WHERE synced = 0');
      for (const s of unsyncedSports) {
        const { error } = await supabase.from('sports').upsert({
          id: s.id,
          name: s.name,
          code: s.code,
          formats: JSON.parse(s.formats || '["Single (1v1)"]'),
          fee: s.fee,
          is_active: s.is_active === 1,
        });
        if (!error) {
          this.db.runSync('UPDATE local_sports SET synced = 1 WHERE id = ?', [s.id]);
          uploaded++;
        }
      }
    } catch {}

    // 5. Upload unsynced users/moderators
    try {
      const unsyncedUsers = this.db.getAllSync('SELECT * FROM local_users WHERE synced = 0');
      for (const u of unsyncedUsers) {
        const { error } = await supabase.from('app_users').upsert({
          id: u.id,
          username: u.username,
          full_name: u.full_name,
          role: u.role,
          password_hash: u.password_hash,
          is_active: u.is_active === 1,
          permissions: u.permissions ? JSON.parse(u.permissions) : null,
        });
        if (!error) {
          this.db.runSync('UPDATE local_users SET synced = 1 WHERE id = ?', [u.id]);
          uploaded++;
        }
      }
    } catch {}

    // 6. Upload unsynced audit logs
    try {
      const unsyncedLogs = this.db.getAllSync('SELECT * FROM local_audit_logs WHERE synced = 0');
      for (const l of unsyncedLogs) {
        const { error } = await supabase.from('audit_logs').upsert({
          id: l.id,
          action: l.action,
          entity_type: l.entity_type,
          entity_id: l.entity_id,
          performed_by_id: l.performed_by_id,
          performed_by_username: l.performed_by_username,
          details: l.details ? JSON.parse(l.details) : null,
          created_at: l.created_at,
        });
        if (!error) {
          this.db.runSync('UPDATE local_audit_logs SET synced = 1 WHERE id = ?', [l.id]);
          uploaded++;
        }
      }
    } catch {}

    // 7. Download latest cloud data down into SQLite
    try {
      const [remoteBatches, remoteDepts, remoteSports, remoteRegs, remoteUsers, remoteLogs] = await Promise.all([
        supabase.from('batches').select('*'),
        supabase.from('departments').select('*'),
        supabase.from('sports').select('*'),
        supabase.from('registrations').select('*'),
        supabase.from('app_users').select('*'),
        supabase.from('audit_logs').select('*').limit(100),
      ]);

      if (remoteBatches.data) {
        for (const b of remoteBatches.data) {
          this.db.runSync(
            'INSERT OR REPLACE INTO local_batches (year, is_active, synced) VALUES (?, ?, 1)',
            [b.year, b.is_active ? 1 : 0]
          );
          downloaded++;
        }
      }
      if (remoteDepts.data) {
        for (const d of remoteDepts.data) {
          this.db.runSync(
            'INSERT OR REPLACE INTO local_departments (code, name, description, is_active, synced) VALUES (?, ?, ?, ?, 1)',
            [d.code, d.name, d.description || '', d.is_active ? 1 : 0]
          );
          downloaded++;
        }
      }
      if (remoteSports.data) {
        for (const s of remoteSports.data) {
          this.db.runSync(
            'INSERT OR REPLACE INTO local_sports (id, name, code, formats, fee, is_active, synced) VALUES (?, ?, ?, ?, ?, ?, 1)',
            [s.id, s.name, s.code, JSON.stringify(s.formats), s.fee, s.is_active ? 1 : 0]
          );
          downloaded++;
        }
      }
      if (remoteRegs.data) {
        for (const r of remoteRegs.data) {
          this.db.runSync(
            `INSERT OR REPLACE INTO local_registrations 
            (reg_no, student_name, session_year, department_code, sport_id, sport_name, category_format, partner_name, partner_reg_no, payment_status, total_fee, paid_amount, phone, email, notes, qr_token, checked_in, checked_in_at, checked_in_by, created_by_id, created_by_username, created_at, synced)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
            [
              r.reg_no, r.student_name, r.session_year, r.department_code, r.sport_id, r.sport_name,
              r.category_format, r.partner_name || '', r.partner_reg_no || '', r.payment_status,
              r.total_fee, r.paid_amount, r.phone || '', r.email || '', r.notes || '', r.qr_token,
              r.checked_in ? 1 : 0, r.checked_in_at || '', r.checked_in_by || '', r.created_by_id || '',
              r.created_by_username, r.created_at
            ]
          );
          downloaded++;
        }
      }
      if (remoteUsers.data) {
        for (const u of remoteUsers.data) {
          this.db.runSync(
            `INSERT OR REPLACE INTO local_users
            (id, username, full_name, role, password_hash, is_active, permissions, created_at, synced)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)`,
            [
              u.id,
              u.username.toLowerCase(),
              u.full_name,
              u.role,
              u.password_hash,
              u.is_active ? 1 : 0,
              u.permissions ? JSON.stringify(u.permissions) : null,
              u.created_at || new Date().toISOString(),
            ]
          );
          downloaded++;
        }
      }
      if (remoteLogs.data) {
        for (const l of remoteLogs.data) {
          this.db.runSync(
            `INSERT OR REPLACE INTO local_audit_logs
            (id, action, entity_type, entity_id, performed_by_id, performed_by_username, details, created_at, synced)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)`,
            [
              l.id,
              l.action,
              l.entity_type,
              l.entity_id || null,
              l.performed_by_id || null,
              l.performed_by_username,
              l.details ? JSON.stringify(l.details) : null,
              l.created_at,
            ]
          );
          downloaded++;
        }
      }
    } catch (err) {
      console.warn('Sync download error:', err);
    }

    return { uploaded, downloaded };
  }
}

export const sqliteStore = new SQLiteStore();
