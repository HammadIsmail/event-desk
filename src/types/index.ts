// src/types/index.ts

export type UserRole = 'superadmin' | 'moderator';

export type PaymentStatus = 'PAID' | 'PARTIAL' | 'FREE' | 'UNPAID';

export interface ModeratorPermissions {
  can_register: boolean;       // Can register new students
  can_view_records: boolean;   // Can view student directory and passes
  can_scan: boolean;           // Can scan & check-in QR tickets at venue
  can_view_analytics: boolean; // Can view financial revenue and event analytics
  can_export_csv: boolean;     // Can download and export CSV reports
}

export const DEFAULT_MODERATOR_PERMISSIONS: ModeratorPermissions = {
  can_register: true,
  can_view_records: false,
  can_scan: false,
  can_view_analytics: false,
  can_export_csv: false,
};

export interface AppUser {
  id: string;
  username: string;
  full_name: string;
  role: UserRole;
  is_active: boolean;
  permissions?: ModeratorPermissions;
  created_at: string;
}

export interface Department {
  id: string;
  name: string;
  code: string; // e.g. CS, EE, ME, CE, CH
  description?: string;
  is_active: boolean;
  created_at?: string;
}

export interface Sport {
  id: string;
  name: string;
  code: string; // e.g. BADM, LUDO, TT, CHESS
  formats: string[]; // e.g. ["Single (1v1)", "Doubles (2v2)"]
  fee: number;
  is_active: boolean;
  created_at?: string;
}

export interface Registration {
  reg_no: string; // Primary Key: strictly UPPERCASE (e.g. 2023-CS-101)
  student_name: string;
  phone?: string;
  email?: string;
  session_year: string; // e.g. 2023
  department_code: string; // e.g. CS
  sport_id: string;
  sport_name: string;
  category_format: string; // e.g. Single (1v1) or Doubles (2v2)
  partner_name?: string;
  partner_reg_no?: string;
  payment_status: PaymentStatus;
  total_fee: number;
  paid_amount: number;
  qr_token: string;
  checked_in: boolean;
  checked_in_at?: string;
  checked_in_by?: string;
  notes?: string;
  created_by_id?: string;
  created_by_username: string;
  created_at: string;
  updated_at?: string;
}

export interface AuditLog {
  id: string;
  action: string; // 'LOGIN', 'CREATE_REGISTRATION', 'UPDATE_REGISTRATION', 'DELETE_REGISTRATION', 'ADD_MODERATOR', 'VERIFY_TICKET'
  entity_type: string; // 'registration', 'moderator', 'sport', 'department', 'auth'
  entity_id?: string;
  performed_by_id?: string;
  performed_by_username: string;
  details?: Record<string, any>;
  created_at: string;
}

export interface AnalyticsSummary {
  totalRegistrations: number;
  paidCount: number;
  partialCount: number;
  freeCount: number;
  unpaidCount: number;
  totalRevenueExpected: number;
  totalRevenueCollected: number;
  pendingBalance: number;
  bySport: { sport: string; count: number; revenue: number }[];
  byDepartment: { department: string; count: number }[];
}
