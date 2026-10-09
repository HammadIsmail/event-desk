// src/services/sqliteStore.ts
import { Platform } from 'react-native';
import * as SQLite from 'expo-sqlite';
import { supabase } from '@/lib/supabase';
import { Department, Sport, Registration, AuditLog, PaymentStatus } from '@/types';

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
        `);
      } catch (err) {
        console.warn('SQLite init warning:', err);
      }
    }

    this.isInitialized = true;
  }

  // -------------------------------------------------------------
  // BATCHES / SESSIONS (Dynamic, Super Admin CRUD)
  // -------------------------------------------------------------
  async getBatches(): Promise<string[]> {
    await this.init();
    if (this.db) {
      try {
        const rows = this.db.getAllSync('SELECT year FROM local_batches WHERE is_active = 1 ORDER BY year DESC');
        if (rows && rows.length > 0) {
          return rows.map((r: any) => r.year);
        }
      } catch {}
    }

    // Try Supabase
    try {
      const { data, error } = await supabase
        .from('batches')
        .select('year')
        .eq('is_active', true)
        .order('year', { ascending: false });
      if (!error && data && data.length > 0) {
        const years = data.map((d: any) => d.year);
        // cache to sqlite
        if (this.db) {
          for (const y of years) {
            this.db.runSync('INSERT OR IGNORE INTO local_batches (year, is_active, synced) VALUES (?, 1, 1)', [y]);
          }
        }
        return years;
      }
    } catch {}

    // Initial defaults if empty
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

    if (this.db) {
      this.db.runSync(
        'INSERT OR REPLACE INTO local_batches (year, is_active, synced) VALUES (?, 1, 0)',
        [cleanYear]
      );
    }

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
  // DEPARTMENTS (Dynamic, Super Admin CRUD)
  // -------------------------------------------------------------
  async getDepartments(): Promise<Department[]> {
    await this.init();
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

    try {
      const { data, error } = await supabase.from('departments').select('*').order('name', { ascending: true });
      if (!error && data && data.length > 0) {
        if (this.db) {
          for (const d of data) {
            this.db.runSync(
              'INSERT OR REPLACE INTO local_departments (code, name, description, is_active, synced) VALUES (?, ?, ?, ?, 1)',
              [d.code, d.name, d.description || '', d.is_active ? 1 : 0]
            );
          }
        }
        return data;
      }
    } catch {}

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
  // SPORTS (Dynamic, Super Admin CRUD)
  // -------------------------------------------------------------
  async getSports(): Promise<Sport[]> {
    await this.init();
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

    try {
      const { data, error } = await supabase.from('sports').select('*').order('name', { ascending: true });
      if (!error && data && data.length > 0) {
        if (this.db) {
          for (const s of data) {
            this.db.runSync(
              'INSERT OR REPLACE INTO local_sports (id, name, code, formats, fee, is_active, synced) VALUES (?, ?, ?, ?, ?, ?, 1)',
              [s.id, s.name, s.code, JSON.stringify(s.formats), s.fee, s.is_active ? 1 : 0]
            );
          }
        }
        return data.map((s: any) => ({
          ...s,
          formats: Array.isArray(s.formats) ? s.formats : JSON.parse(s.formats || '["Single (1v1)"]'),
        }));
      }
    } catch {}

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
  // REGISTRATIONS (Saved in SQLite and Supabase)
  // -------------------------------------------------------------
  async getRegistrations(): Promise<Registration[]> {
    await this.init();
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

    try {
      const { data, error } = await supabase.from('registrations').select('*').order('created_at', { ascending: false });
      if (!error && data && data.length > 0) {
        if (this.db) {
          for (const r of data) {
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
          }
        }
        return data;
      }
    } catch {}

    return [];
  }

  async saveRegistration(reg: Registration): Promise<void> {
    await this.init();
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

    try {
      const { error } = await supabase.from('registrations').insert({
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
        created_by_id: reg.created_by_id,
        created_by_username: reg.created_by_username,
      });

      if (!error && this.db) {
        this.db.runSync('UPDATE local_registrations SET synced = 1 WHERE reg_no = ?', [reg.reg_no]);
      }
    } catch {}
  }

  // -------------------------------------------------------------
  // TWO-WAY SYNC (SQLITE <-> POSTGRESQL / SUPABASE)
  // -------------------------------------------------------------
  async syncWithCloud(): Promise<{ uploaded: number; downloaded: number }> {
    await this.init();
    let uploaded = 0;
    let downloaded = 0;

    // 1. Upload unsynced registrations from SQLite
    if (this.db) {
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
        console.warn('Sync upload error:', err);
      }
    }

    // 2. Download latest cloud data down into SQLite
    try {
      const [remoteBatches, remoteDepts, remoteSports, remoteRegs] = await Promise.all([
        supabase.from('batches').select('*'),
        supabase.from('departments').select('*'),
        supabase.from('sports').select('*'),
        supabase.from('registrations').select('*'),
      ]);

      if (this.db) {
        if (remoteBatches.data) {
          for (const b of remoteBatches.data) {
            this.db.runSync(
              'INSERT OR REPLACE INTO local_batches (year, is_active, synced) VALUES (?, ?, 1)',
              [b.year, b.is_active ? 1 : 0]
            );
          }
        }
        if (remoteDepts.data) {
          for (const d of remoteDepts.data) {
            this.db.runSync(
              'INSERT OR REPLACE INTO local_departments (code, name, description, is_active, synced) VALUES (?, ?, ?, ?, 1)',
              [d.code, d.name, d.description || '', d.is_active ? 1 : 0]
            );
          }
        }
        if (remoteSports.data) {
          for (const s of remoteSports.data) {
            this.db.runSync(
              'INSERT OR REPLACE INTO local_sports (id, name, code, formats, fee, is_active, synced) VALUES (?, ?, ?, ?, ?, ?, 1)',
              [s.id, s.name, s.code, JSON.stringify(s.formats), s.fee, s.is_active ? 1 : 0]
            );
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
      }
    } catch (err) {
      console.warn('Sync download error:', err);
    }

    return { uploaded, downloaded };
  }
}

export const sqliteStore = new SQLiteStore();
