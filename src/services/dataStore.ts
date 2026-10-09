// src/services/dataStore.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase';
import { hashPassword, generateQrToken } from '@/lib/crypto';
import { sqliteStore } from '@/services/sqliteStore';
import {
  AppUser,
  Department,
  Sport,
  Registration,
  AuditLog,
  AnalyticsSummary,
  PaymentStatus,
  ModeratorPermissions,
  DEFAULT_MODERATOR_PERMISSIONS,
} from '@/types';

const STORAGE_KEYS = {
  USERS: '@eventdesk_users_v1',
  AUDIT_LOGS: '@eventdesk_audit_logs_v1',
};

class DataStoreService {
  private initialized = false;

  async init() {
    if (this.initialized) return;
    await sqliteStore.init();

    // Ensure default admin user exists locally in SQLite & AsyncStorage
    const defaultHash = await hashPassword('Admin123!');
    const defaultAdmin: AppUser & { password_hash: string } = {
      id: 'user-admin-1',
      username: 'admin',
      full_name: 'Super Administrator',
      role: 'superadmin',
      password_hash: defaultHash,
      is_active: true,
      created_at: new Date().toISOString(),
    };

    // Save into SQLite
    await sqliteStore.saveUser(defaultAdmin, 1);

    const rawUsers = await AsyncStorage.getItem(STORAGE_KEYS.USERS);
    if (!rawUsers) {
      await AsyncStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify([defaultAdmin]));
    }

    this.initialized = true;
  }

  // -------------------------------------------------------------
  // AUTHENTICATION
  // -------------------------------------------------------------
  async authenticateUser(username: string, passwordPlain: string): Promise<AppUser | null> {
    await this.init();
    const cleanUsername = username.trim().toLowerCase();
    const pHash = await hashPassword(passwordPlain);

    // 1. Try Supabase first
    try {
      const { data, error } = await supabase
        .from('app_users')
        .select('*')
        .ilike('username', cleanUsername)
        .single();

      if (!error && data && data.is_active && data.password_hash === pHash) {
        let perms = data.permissions;
        if (typeof perms === 'string') {
          try {
            perms = JSON.parse(perms);
          } catch {}
        }
        // Check local override
        const localPerms = await AsyncStorage.getItem(`@eventdesk_perms_${cleanUsername}`);
        if (localPerms) {
          try {
            perms = JSON.parse(localPerms);
          } catch {}
        }
        if (!perms && data.role === 'moderator') {
          perms = DEFAULT_MODERATOR_PERMISSIONS;
        }

        const user: AppUser = {
          id: data.id,
          username: data.username,
          full_name: data.full_name,
          role: data.role,
          is_active: data.is_active,
          permissions: perms,
          created_at: data.created_at,
        };

        // Cache in SQLite for full offline capabilities!
        await sqliteStore.saveUser({
          ...user,
          password_hash: data.password_hash,
        }, 1);

        await this.logAudit({
          action: 'LOGIN',
          entity_type: 'auth',
          performed_by_id: user.id,
          performed_by_username: user.username,
        });
        return user;
      }
    } catch {
      // Offline / network failure: fallback to SQLite
    }

    // 2. Query from SQLite (works 100% offline!)
    try {
      const sqliteUser = await sqliteStore.getUserByUsername(cleanUsername);
      if (sqliteUser && sqliteUser.password_hash === pHash && sqliteUser.is_active) {
        let perms = sqliteUser.permissions;
        if (typeof perms === 'string') {
          try {
            perms = JSON.parse(perms);
          } catch {}
        }
        const localPerms = await AsyncStorage.getItem(`@eventdesk_perms_${cleanUsername}`);
        if (localPerms) {
          try {
            perms = JSON.parse(localPerms);
          } catch {}
        }
        if (!perms && sqliteUser.role === 'moderator') {
          perms = DEFAULT_MODERATOR_PERMISSIONS;
        }

        const user: AppUser = {
          id: sqliteUser.id,
          username: sqliteUser.username,
          full_name: sqliteUser.full_name,
          role: sqliteUser.role,
          is_active: sqliteUser.is_active,
          permissions: perms,
          created_at: sqliteUser.created_at,
        };
        await this.logAudit({
          action: 'LOGIN',
          entity_type: 'auth',
          performed_by_id: user.id,
          performed_by_username: user.username,
        });
        return user;
      }
    } catch {}

    // 3. Fall back to AsyncStorage
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.USERS);
    const users: (AppUser & { password_hash: string })[] = raw ? JSON.parse(raw) : [];
    const found = users.find(
      (u) => u.username.toLowerCase() === cleanUsername && u.password_hash === pHash && u.is_active
    );

    if (found) {
      let perms = found.permissions;
      if (typeof perms === 'string') {
        try {
          perms = JSON.parse(perms);
        } catch {}
      }
      const localPerms = await AsyncStorage.getItem(`@eventdesk_perms_${cleanUsername}`);
      if (localPerms) {
        try {
          perms = JSON.parse(localPerms);
        } catch {}
      }
      if (!perms && found.role === 'moderator') {
        perms = DEFAULT_MODERATOR_PERMISSIONS;
      }

      const user: AppUser = {
        id: found.id,
        username: found.username,
        full_name: found.full_name,
        role: found.role,
        is_active: found.is_active,
        permissions: perms,
        created_at: found.created_at,
      };

      // Keep SQLite populated
      await sqliteStore.saveUser({ ...user, password_hash: found.password_hash }, 1);

      await this.logAudit({
        action: 'LOGIN',
        entity_type: 'auth',
        performed_by_id: user.id,
        performed_by_username: user.username,
      });
      return user;
    }

    return null;
  }

  async getModerators(): Promise<AppUser[]> {
    await this.init();

    // 1. Try Supabase and cache into SQLite
    try {
      const { data, error } = await supabase
        .from('app_users')
        .select('id, username, full_name, role, is_active, permissions, created_at, password_hash')
        .eq('role', 'moderator')
        .order('created_at', { ascending: false });
      if (!error && data) {
        const result: AppUser[] = [];
        for (const d of data) {
          let perms = d.permissions;
          if (typeof perms === 'string') {
            try {
              perms = JSON.parse(perms);
            } catch {}
          }
          const localPerms = await AsyncStorage.getItem(`@eventdesk_perms_${d.username.toLowerCase()}`);
          if (localPerms) {
            try {
              perms = JSON.parse(localPerms);
            } catch {}
          }
          const userObj: AppUser = {
            id: d.id,
            username: d.username,
            full_name: d.full_name,
            role: d.role,
            is_active: d.is_active,
            permissions: perms || DEFAULT_MODERATOR_PERMISSIONS,
            created_at: d.created_at,
          };
          result.push(userObj);
          // Cache in SQLite
          await sqliteStore.saveUser({ ...userObj, password_hash: d.password_hash || '' }, 1);
        }
        return result;
      }
    } catch {}

    // 2. Query from SQLite (works 100% offline!)
    try {
      const sqliteUsers = await sqliteStore.getUsers();
      const sqliteMods = sqliteUsers.filter((u) => u.role === 'moderator');
      if (sqliteMods.length > 0) {
        const list: AppUser[] = [];
        for (const u of sqliteMods) {
          let perms = u.permissions;
          if (typeof perms === 'string') {
            try {
              perms = JSON.parse(perms);
            } catch {}
          }
          const localPerms = await AsyncStorage.getItem(`@eventdesk_perms_${u.username.toLowerCase()}`);
          if (localPerms) {
            try {
              perms = JSON.parse(localPerms);
            } catch {}
          }
          list.push({
            ...u,
            permissions: perms || DEFAULT_MODERATOR_PERMISSIONS,
          });
        }
        return list;
      }
    } catch {}

    // 3. Fallback to AsyncStorage
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.USERS);
    const users: (AppUser & { password_hash: string })[] = raw ? JSON.parse(raw) : [];
    const list: AppUser[] = [];
    for (const u of users.filter((u) => u.role === 'moderator')) {
      let perms = u.permissions;
      if (typeof perms === 'string') {
        try {
          perms = JSON.parse(perms);
        } catch {}
      }
      const localPerms = await AsyncStorage.getItem(`@eventdesk_perms_${u.username.toLowerCase()}`);
      if (localPerms) {
        try {
          perms = JSON.parse(localPerms);
        } catch {}
      }
      list.push({
        ...u,
        permissions: perms || DEFAULT_MODERATOR_PERMISSIONS,
      });
    }
    return list;
  }

  async addModerator(
    username: string,
    passwordPlain: string,
    fullName: string,
    actor: AppUser,
    permissions: ModeratorPermissions = DEFAULT_MODERATOR_PERMISSIONS
  ): Promise<AppUser> {
    if (actor.role !== 'superadmin') throw new Error('Only Super Admin can add moderators.');
    const cleanUsername = username.trim().toLowerCase();
    const pHash = await hashPassword(passwordPlain);

    const newUser: AppUser & { password_hash: string } = {
      id: 'mod-' + Date.now(),
      username: cleanUsername,
      full_name: fullName.trim(),
      role: 'moderator',
      password_hash: pHash,
      is_active: true,
      permissions,
      created_at: new Date().toISOString(),
    };

    let isCloudSynced = 0;

    // Try inserting into Supabase
    try {
      // First try with permissions column
      const { data, error } = await supabase
        .from('app_users')
        .insert({
          username: cleanUsername,
          password_hash: pHash,
          full_name: fullName.trim(),
          role: 'moderator',
          is_active: true,
          permissions,
        })
        .select()
        .single();
      if (!error && data) {
        newUser.id = data.id;
        isCloudSynced = 1;
      } else if (error) {
        // Fallback without permissions column if DB doesn't have it yet
        const { data: fallbackData } = await supabase
          .from('app_users')
          .insert({
            username: cleanUsername,
            password_hash: pHash,
            full_name: fullName.trim(),
            role: 'moderator',
            is_active: true,
          })
          .select()
          .single();
        if (fallbackData) {
          newUser.id = fallbackData.id;
          isCloudSynced = 1;
        }
      }
    } catch {}

    // Save directly to SQLite (ensures offline availability!)
    await sqliteStore.saveUser(newUser, isCloudSynced);

    const raw = await AsyncStorage.getItem(STORAGE_KEYS.USERS);
    const users: (AppUser & { password_hash: string })[] = raw ? JSON.parse(raw) : [];
    if (users.some((u) => u.username.toLowerCase() === cleanUsername)) {
      throw new Error(`Username "${cleanUsername}" is already taken.`);
    }
    users.push(newUser);
    await AsyncStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
    await AsyncStorage.setItem(`@eventdesk_perms_${cleanUsername}`, JSON.stringify(permissions));

    await this.logAudit({
      action: 'ADD_MODERATOR',
      entity_type: 'moderator',
      entity_id: newUser.id,
      performed_by_id: actor.id,
      performed_by_username: actor.username,
      details: { permissions },
    });

    return {
      id: newUser.id,
      username: newUser.username,
      full_name: newUser.full_name,
      role: newUser.role,
      is_active: newUser.is_active,
      permissions: newUser.permissions,
      created_at: newUser.created_at,
    };
  }

  async updateModeratorPermissions(
    modId: string,
    permissions: ModeratorPermissions,
    actor: AppUser
  ): Promise<AppUser> {
    if (actor.role !== 'superadmin') throw new Error('Only Super Admin can edit moderator permissions.');

    const raw = await AsyncStorage.getItem(STORAGE_KEYS.USERS);
    let users: (AppUser & { password_hash: string })[] = raw ? JSON.parse(raw) : [];
    let index = users.findIndex((u) => u.id === modId || u.username.toLowerCase() === modId.toLowerCase());
    let targetUsername = '';

    if (index !== -1) {
      users[index].permissions = permissions;
      targetUsername = users[index].username;
    } else {
      // Find from SQLite or Supabase
      try {
        const sUser = await sqliteStore.getUserByUsername(modId);
        if (sUser) {
          targetUsername = sUser.username;
          sUser.permissions = permissions;
          users.push(sUser);
          index = users.length - 1;
        }
      } catch {}

      if (index === -1) {
        try {
          const { data } = await supabase
            .from('app_users')
            .select('*')
            .or(`id.eq.${modId},username.ilike.${modId}`)
            .single();
          if (data) {
            targetUsername = data.username;
            const uObj: AppUser & { password_hash: string } = {
              id: data.id,
              username: data.username,
              full_name: data.full_name,
              role: data.role,
              is_active: data.is_active,
              permissions,
              created_at: data.created_at,
              password_hash: data.password_hash || '',
            };
            users.push(uObj);
            index = users.length - 1;
          }
        } catch {}
      }
    }

    if (!targetUsername && index === -1) {
      throw new Error('Moderator not found.');
    }

    if (targetUsername) {
      await AsyncStorage.setItem(`@eventdesk_perms_${targetUsername.toLowerCase()}`, JSON.stringify(permissions));
    }
    await AsyncStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));

    // Save to SQLite
    if (index !== -1 && users[index]) {
      await sqliteStore.saveUser(users[index], 0);
    }

    // Update active session if currently logged-in user is this moderator
    try {
      const activeRaw = await AsyncStorage.getItem('@eventdesk_active_user_session');
      if (activeRaw) {
        const activeUser = JSON.parse(activeRaw);
        if (
          activeUser.id === modId ||
          (targetUsername && activeUser.username.toLowerCase() === targetUsername.toLowerCase())
        ) {
          activeUser.permissions = permissions;
          await AsyncStorage.setItem('@eventdesk_active_user_session', JSON.stringify(activeUser));
        }
      }
    } catch {}

    // Update Supabase
    try {
      await supabase.from('app_users').update({ permissions }).eq('id', modId);
    } catch {}
    if (targetUsername) {
      try {
        await supabase.from('app_users').update({ permissions }).ilike('username', targetUsername);
      } catch {}
    }

    await this.logAudit({
      action: 'UPDATE_MODERATOR_PERMISSIONS',
      entity_type: 'moderator',
      entity_id: modId,
      performed_by_id: actor.id,
      performed_by_username: actor.username,
      details: { permissions },
    });

    return users[index] || {
      id: modId,
      username: targetUsername,
      full_name: targetUsername,
      role: 'moderator',
      is_active: true,
      permissions,
      created_at: new Date().toISOString(),
    };
  }

  async toggleModeratorStatus(modId: string, actor: AppUser): Promise<boolean> {
    if (actor.role !== 'superadmin') throw new Error('Only Super Admin can update moderator status.');

    let newStatus = false;
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.USERS);
    const users: (AppUser & { password_hash: string })[] = raw ? JSON.parse(raw) : [];
    const index = users.findIndex((u) => u.id === modId);

    if (index !== -1) {
      users[index].is_active = !users[index].is_active;
      newStatus = users[index].is_active;
      await AsyncStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
      await sqliteStore.saveUser(users[index], 0);
    } else {
      // Check SQLite
      const sqliteUsers = await sqliteStore.getUsers();
      const sUser = sqliteUsers.find((u) => u.id === modId);
      if (sUser) {
        sUser.is_active = !sUser.is_active;
        newStatus = sUser.is_active;
        await sqliteStore.saveUser(sUser, 0);
      } else {
        throw new Error('Moderator not found.');
      }
    }

    try {
      await supabase.from('app_users').update({ is_active: newStatus }).eq('id', modId);
    } catch {}

    return newStatus;
  }

  // -------------------------------------------------------------
  // BATCHES (Dynamic SQLite + Cloud)
  // -------------------------------------------------------------
  async getBatches(): Promise<string[]> {
    return sqliteStore.getBatches();
  }

  async addBatch(year: string, actor: AppUser): Promise<void> {
    if (actor.role !== 'superadmin') throw new Error('Only Super Admin can add batches.');
    await sqliteStore.addBatch(year);
  }

  async deleteBatch(year: string, actor: AppUser): Promise<void> {
    if (actor.role !== 'superadmin') throw new Error('Only Super Admin can delete batches.');
    await sqliteStore.deleteBatch(year);
  }

  // -------------------------------------------------------------
  // DEPARTMENTS (Dynamic SQLite + Cloud)
  // -------------------------------------------------------------
  async getDepartments(): Promise<Department[]> {
    return sqliteStore.getDepartments();
  }

  async addDepartment(name: string, code: string, description: string, actor: AppUser): Promise<Department> {
    if (actor.role !== 'superadmin') throw new Error('Only Super Admin can add departments.');
    return sqliteStore.addDepartment(name, code, description);
  }

  async updateDepartment(code: string, name: string, description: string, actor: AppUser): Promise<void> {
    if (actor.role !== 'superadmin') throw new Error('Only Super Admin can update departments.');
    await sqliteStore.updateDepartment(code, name, description);
  }

  async deleteDepartment(code: string, actor: AppUser): Promise<void> {
    if (actor.role !== 'superadmin') throw new Error('Only Super Admin can delete departments.');
    await sqliteStore.deleteDepartment(code);
  }

  // -------------------------------------------------------------
  // SPORTS (Dynamic SQLite + Cloud)
  // -------------------------------------------------------------
  async getSports(): Promise<Sport[]> {
    return sqliteStore.getSports();
  }

  async addSport(name: string, code: string, formats: string[], fee: number, actor: AppUser): Promise<Sport> {
    if (actor.role !== 'superadmin') throw new Error('Only Super Admin can add sports.');
    return sqliteStore.addSport(name, code, formats, fee);
  }

  async updateSport(id: string, name: string, formats: string[], fee: number, actor: AppUser): Promise<void> {
    if (actor.role !== 'superadmin') throw new Error('Only Super Admin can update sports.');
    await sqliteStore.updateSport(id, name, formats, fee);
  }

  async deleteSport(id: string, actor: AppUser): Promise<void> {
    if (actor.role !== 'superadmin') throw new Error('Only Super Admin can delete sports.');
    await sqliteStore.deleteSport(id);
  }

  // -------------------------------------------------------------
  // REGISTRATIONS (Saved locally in SQLite and synced to Supabase)
  // -------------------------------------------------------------
  async getRegistrations(filters?: {
    sport?: string;
    paymentStatus?: PaymentStatus;
    search?: string;
  }): Promise<Registration[]> {
    let list = await sqliteStore.getRegistrations();

    if (filters?.sport && filters.sport !== 'ALL') {
      list = list.filter((r) => r.sport_name === filters.sport);
    }
    if (filters?.paymentStatus && filters.paymentStatus !== ('ALL' as any)) {
      list = list.filter((r) => r.payment_status === filters.paymentStatus);
    }
    if (filters?.search && filters.search.trim()) {
      const q = filters.search.trim().toUpperCase();
      list = list.filter(
        (r) =>
          r.reg_no.includes(q) ||
          r.student_name.toUpperCase().includes(q) ||
          (r.phone && r.phone.includes(q))
      );
    }

    return list;
  }

  async getRegistrationByRegNo(regNo: string): Promise<Registration | null> {
    const cleanReg = regNo.trim().toUpperCase();
    const list = await sqliteStore.getRegistrations();
    return list.find((r) => r.reg_no === cleanReg) || null;
  }

  async getRegistrationByToken(token: string): Promise<Registration | null> {
    const cleanToken = token.trim();
    const list = await sqliteStore.getRegistrations();
    return list.find((r) => r.qr_token === cleanToken) || null;
  }

  async createRegistration(
    params: {
      student_name: string;
      reg_no: string;
      session_year: string;
      department_code: string;
      sport_id: string;
      sport_name: string;
      category_format: string;
      partner_name?: string;
      partner_reg_no?: string;
      payment_status: PaymentStatus;
      total_fee: number;
      paid_amount: number;
      phone?: string;
      email?: string;
      notes?: string;
    },
    actor: AppUser
  ): Promise<Registration> {
    const cleanRegNo = params.reg_no.trim().toUpperCase();
    const existing = await this.getRegistrationByRegNo(cleanRegNo);
    if (existing) {
      throw new Error(`Student "${cleanRegNo}" is already registered for "${existing.sport_name}".`);
    }

    const qrToken = generateQrToken(cleanRegNo, params.sport_name);

    const record: Registration = {
      reg_no: cleanRegNo,
      student_name: params.student_name.trim(),
      session_year: params.session_year.trim(),
      department_code: params.department_code.trim().toUpperCase(),
      sport_id: params.sport_id,
      sport_name: params.sport_name,
      category_format: params.category_format,
      partner_name: params.partner_name?.trim() || undefined,
      partner_reg_no: params.partner_reg_no ? params.partner_reg_no.trim().toUpperCase() : undefined,
      payment_status: params.payment_status,
      total_fee: Number(params.total_fee) || 0,
      paid_amount: Number(params.paid_amount) || 0,
      phone: params.phone?.trim() || undefined,
      email: params.email?.trim() || undefined,
      notes: params.notes?.trim() || undefined,
      qr_token: qrToken,
      checked_in: false,
      created_by_id: actor.id,
      created_by_username: actor.username,
      created_at: new Date().toISOString(),
    };

    // Save to SQLite and Supabase
    await sqliteStore.saveRegistration(record);

    await this.logAudit({
      action: 'CREATE_REGISTRATION',
      entity_type: 'registration',
      entity_id: cleanRegNo,
      performed_by_id: actor.id,
      performed_by_username: actor.username,
    });

    return record;
  }

  async updateRegistration(regNo: string, updates: Partial<Registration>, actor: AppUser): Promise<Registration> {
    if (actor.role !== 'superadmin') throw new Error('Moderators cannot edit registrations.');
    const cleanRegNo = regNo.trim().toUpperCase();
    const existing = await this.getRegistrationByRegNo(cleanRegNo);
    if (!existing) throw new Error('Registration not found.');

    const updated: Registration = { ...existing, ...updates, reg_no: cleanRegNo, updated_at: new Date().toISOString() };
    await sqliteStore.saveRegistration(updated);

    try {
      await supabase.from('registrations').update(updates).eq('reg_no', cleanRegNo);
    } catch {}

    return updated;
  }

  async deleteRegistration(regNo: string, actor: AppUser): Promise<void> {
    if (actor.role !== 'superadmin') throw new Error('Moderators cannot delete registrations.');
    const cleanRegNo = regNo.trim().toUpperCase();

    try {
      await supabase.from('registrations').delete().eq('reg_no', cleanRegNo);
    } catch {}

    await sqliteStore.deleteRegistration(cleanRegNo);
  }

  async checkInTicket(qrToken: string, actor: AppUser): Promise<{ registration: Registration; alreadyCheckedIn: boolean }> {
    const record = await this.getRegistrationByToken(qrToken);
    if (!record) throw new Error('Invalid QR ticket.');

    const alreadyCheckedIn = record.checked_in;
    if (!alreadyCheckedIn) {
      record.checked_in = true;
      record.checked_in_at = new Date().toISOString();
      record.checked_in_by = actor.username;
      await sqliteStore.saveRegistration(record);
      try {
        await supabase
          .from('registrations')
          .update({ checked_in: true, checked_in_at: record.checked_in_at, checked_in_by: record.checked_in_by })
          .eq('reg_no', record.reg_no);
      } catch {}
    }

    return { registration: record, alreadyCheckedIn };
  }

  // -------------------------------------------------------------
  // AUDIT LOGS (Saved in SQLite and Cloud)
  // -------------------------------------------------------------
  async logAudit(entry: {
    action: string;
    entity_type: string;
    entity_id?: string;
    performed_by_id?: string;
    performed_by_username: string;
    details?: Record<string, any>;
  }) {
    const item: AuditLog = {
      id: 'log-' + Date.now(),
      action: entry.action,
      entity_type: entry.entity_type,
      entity_id: entry.entity_id,
      performed_by_id: entry.performed_by_id,
      performed_by_username: entry.performed_by_username,
      details: entry.details,
      created_at: new Date().toISOString(),
    };

    let isCloudSynced = 0;
    try {
      const { error } = await supabase.from('audit_logs').insert(item);
      if (!error) isCloudSynced = 1;
    } catch {}

    // Save directly into SQLite (ensures 100% offline persistence)
    await sqliteStore.saveAuditLog(item, isCloudSynced);

    // Also maintain in AsyncStorage
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.AUDIT_LOGS);
    const logs: AuditLog[] = raw ? JSON.parse(raw) : [];
    logs.unshift(item);
    await AsyncStorage.setItem(STORAGE_KEYS.AUDIT_LOGS, JSON.stringify(logs.slice(0, 100)));
  }

  async getAuditLogs(): Promise<AuditLog[]> {
    // 1. Try Supabase and cache into SQLite
    try {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);
      if (!error && data && data.length > 0) {
        for (const log of data) {
          await sqliteStore.saveAuditLog(log, 1);
        }
        return data;
      }
    } catch {}

    // 2. Query from SQLite (works 100% offline!)
    try {
      const sqliteLogs = await sqliteStore.getAuditLogs();
      if (sqliteLogs && sqliteLogs.length > 0) {
        return sqliteLogs;
      }
    } catch {}

    // 3. Fallback to AsyncStorage
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.AUDIT_LOGS);
    return raw ? JSON.parse(raw) : [];
  }

  // -------------------------------------------------------------
  // ANALYTICS & CSV
  // -------------------------------------------------------------
  async getAnalytics(): Promise<AnalyticsSummary> {
    const all = await this.getRegistrations();
    let totalRevenueExpected = 0;
    let totalRevenueCollected = 0;
    let paidCount = 0;
    let partialCount = 0;
    let freeCount = 0;
    let unpaidCount = 0;

    const sportMap = new Map<string, { count: number; revenue: number }>();
    const deptMap = new Map<string, number>();

    for (const r of all) {
      totalRevenueExpected += Number(r.total_fee) || 0;
      totalRevenueCollected += Number(r.paid_amount) || 0;

      if (r.payment_status === 'PAID') paidCount++;
      else if (r.payment_status === 'PARTIAL') partialCount++;
      else if (r.payment_status === 'FREE') freeCount++;
      else unpaidCount++;

      const s = sportMap.get(r.sport_name) || { count: 0, revenue: 0 };
      s.count += 1;
      s.revenue += Number(r.paid_amount) || 0;
      sportMap.set(r.sport_name, s);

      const dCount = deptMap.get(r.department_code) || 0;
      deptMap.set(r.department_code, dCount + 1);
    }

    return {
      totalRegistrations: all.length,
      paidCount,
      partialCount,
      freeCount,
      unpaidCount,
      totalRevenueExpected,
      totalRevenueCollected,
      pendingBalance: Math.max(0, totalRevenueExpected - totalRevenueCollected),
      bySport: Array.from(sportMap.entries()).map(([sport, val]) => ({ sport, count: val.count, revenue: val.revenue })),
      byDepartment: Array.from(deptMap.entries()).map(([department, count]) => ({ department, count })),
    };
  }

  async generateCSVContent(sportName?: string): Promise<{ filename: string; csv: string }> {
    const all = await this.getRegistrations();
    const filtered = sportName && sportName !== 'ALL'
      ? all.filter((r) => r.sport_name === sportName)
      : all;

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
      'Date'
    ];

    const rows = filtered.map((r) => {
      const bal = Math.max(0, (r.total_fee || 0) - (r.paid_amount || 0));
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

    const csvContent = [headers.join(','), ...rows].join('\n');
    const sanitized = (sportName && sportName !== 'ALL') ? sportName.replace(/\s+/g, '_') : 'All_Registrations';
    const filename = `EventDesk_${sanitized}_${Date.now()}.csv`;

    return { filename, csv: csvContent };
  }
}

export const dataStore = new DataStoreService();
