// src/app/(tabs)/admin.tsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { HeaderBar } from '@/components/HeaderBar';
import { useAuth } from '@/context/AuthContext';
import { useAppTheme } from '@/context/ThemeContext';
import { useAlert } from '@/context/AlertContext';
import { dataStore } from '@/services/dataStore';
import {
  AppUser,
  Department,
  Sport,
  AuditLog,
  ModeratorPermissions,
  DEFAULT_MODERATOR_PERMISSIONS,
} from '@/types';

type AdminTab = 'BATCHES' | 'SPORTS' | 'DEPARTMENTS' | 'MODERATORS' | 'AUDIT_LOGS';

const PERMISSION_ITEMS: {
  key: keyof ModeratorPermissions;
  label: string;
  desc: string;
  icon: keyof typeof Ionicons.glyphMap;
}[] = [
  {
    key: 'can_register',
    label: 'Register Students',
    desc: 'Can register participants & issue QR passes',
    icon: 'person-add-outline',
  },
  {
    key: 'can_view_records',
    label: 'View Directory',
    desc: 'Can view participants, filter records & passes',
    icon: 'list-outline',
  },
  {
    key: 'can_scan',
    label: 'Scan & Check-In',
    desc: 'Can scan tickets and check-in attendees at venue',
    icon: 'scan-outline',
  },
  {
    key: 'can_view_analytics',
    label: 'View Analytics',
    desc: 'Can view financial revenue, balances & charts',
    icon: 'pie-chart-outline',
  },
  {
    key: 'can_export_csv',
    label: 'Export CSV',
    desc: 'Can download registered student spreadsheets',
    icon: 'download-outline',
  },
];

export default function AdminScreen() {
  const { user, isSuperAdmin } = useAuth();
  const { colors } = useAppTheme();
  const { showSuccess, showError, showWarning, showConfirm } = useAlert();
  const [activeTab, setActiveTab] = useState<AdminTab>('BATCHES');

  // Batches state
  const [batches, setBatches] = useState<string[]>([]);
  const [newBatchYear, setNewBatchYear] = useState('');
  const [addingBatch, setAddingBatch] = useState(false);

  // Moderators state
  const [moderators, setModerators] = useState<AppUser[]>([]);
  const [modUsername, setModUsername] = useState('');
  const [modPassword, setModPassword] = useState('');
  const [modFullName, setModFullName] = useState('');
  const [addingMod, setAddingMod] = useState(false);
  const [modPermissions, setModPermissions] = useState<ModeratorPermissions>({ ...DEFAULT_MODERATOR_PERMISSIONS });
  const [editingMod, setEditingMod] = useState<AppUser | null>(null);
  const [editPermissions, setEditPermissions] = useState<ModeratorPermissions>({ ...DEFAULT_MODERATOR_PERMISSIONS });
  const [savingPermissions, setSavingPermissions] = useState(false);

  // Sports state
  const [sports, setSports] = useState<Sport[]>([]);
  const [sportName, setSportName] = useState('');
  const [sportCode, setSportCode] = useState('');
  const [sportFormats, setSportFormats] = useState('Single (1v1), Doubles (2v2)');
  const [sportFee, setSportFee] = useState('500');
  const [addingSport, setAddingSport] = useState(false);

  // Departments state
  const [departments, setDepartments] = useState<Department[]>([]);
  const [deptName, setDeptName] = useState('');
  const [deptCode, setDeptCode] = useState('');
  const [deptDesc, setDeptDesc] = useState('');
  const [addingDept, setAddingDept] = useState(false);

  // Audit Logs state
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);

  const loadAllAdminData = useCallback(async () => {
    if (!isSuperAdmin) return;
    try {
      const [bts, mods, sps, depts, logs] = await Promise.all([
        dataStore.getBatches(),
        dataStore.getModerators(),
        dataStore.getSports(),
        dataStore.getDepartments(),
        dataStore.getAuditLogs(),
      ]);
      setBatches(bts);
      setModerators(mods);
      setSports(sps);
      setDepartments(depts);
      setAuditLogs(logs);
    } catch (err) {
      console.warn('Failed to load admin data:', err);
    }
  }, [isSuperAdmin]);

  useFocusEffect(
    useCallback(() => {
      loadAllAdminData();
    }, [loadAllAdminData])
  );

  // Batches Handlers
  const handleAddBatch = async () => {
    const year = newBatchYear.trim();
    if (!year) {
      showWarning('Required Field', 'Please enter a batch year (e.g. 2026).');
      return;
    }
    try {
      setAddingBatch(true);
      await dataStore.addBatch(year, user!);
      setNewBatchYear('');
      const updated = await dataStore.getBatches();
      setBatches(updated);
      showSuccess('Success', `Batch "${year}" added.`);
    } catch (err: any) {
      showError('Error', err.message);
    } finally {
      setAddingBatch(false);
    }
  };

  const handleDeleteBatch = (year: string) => {
    showConfirm({
      title: 'Delete Batch',
      message: `Delete batch session "${year}"?`,
      confirmText: 'Delete',
      isDestructive: true,
      onConfirm: async () => {
        try {
          await dataStore.deleteBatch(year, user!);
          const updated = await dataStore.getBatches();
          setBatches(updated);
          showSuccess('Deleted', `Batch "${year}" deleted.`);
        } catch (err: any) {
          showError('Error', err.message);
        }
      },
    });
  };

  // Departments Handlers
  const handleAddDepartment = async () => {
    if (!deptName.trim() || !deptCode.trim()) {
      showWarning('Required Fields', 'Please enter department name and code.');
      return;
    }
    try {
      setAddingDept(true);
      await dataStore.addDepartment(deptName, deptCode, deptDesc, user!);
      setDeptName('');
      setDeptCode('');
      setDeptDesc('');
      const updated = await dataStore.getDepartments();
      setDepartments(updated);
      showSuccess('Success', `Department "${deptCode}" added.`);
    } catch (err: any) {
      showError('Error', err.message);
    } finally {
      setAddingDept(false);
    }
  };

  const handleDeleteDepartment = (code: string) => {
    showConfirm({
      title: 'Delete Department',
      message: `Delete department "${code}"?`,
      confirmText: 'Delete',
      isDestructive: true,
      onConfirm: async () => {
        try {
          await dataStore.deleteDepartment(code, user!);
          const updated = await dataStore.getDepartments();
          setDepartments(updated);
          showSuccess('Deleted', `Department "${code}" deleted.`);
        } catch (err: any) {
          showError('Error', err.message);
        }
      },
    });
  };

  // Sports Handlers
  const handleAddSport = async () => {
    if (!sportName.trim() || !sportCode.trim()) {
      showWarning('Required Fields', 'Please enter sport name and code.');
      return;
    }
    const formatsArray = sportFormats
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    try {
      setAddingSport(true);
      await dataStore.addSport(
        sportName,
        sportCode,
        formatsArray.length > 0 ? formatsArray : ['Single (1v1)'],
        Number(sportFee) || 0,
        user!
      );
      setSportName('');
      setSportCode('');
      setSportFee('500');
      const updated = await dataStore.getSports();
      setSports(updated);
      showSuccess('Success', `Sport "${sportName}" added.`);
    } catch (err: any) {
      showError('Error', err.message);
    } finally {
      setAddingSport(false);
    }
  };

  const handleDeleteSport = (id: string, name: string) => {
    showConfirm({
      title: 'Delete Sport',
      message: `Delete sport "${name}"?`,
      confirmText: 'Delete',
      isDestructive: true,
      onConfirm: async () => {
        try {
          await dataStore.deleteSport(id, user!);
          const updated = await dataStore.getSports();
          setSports(updated);
          showSuccess('Deleted', `Sport "${name}" deleted.`);
        } catch (err: any) {
          showError('Error', err.message);
        }
      },
    });
  };

  // Moderator Handlers
  const handleAddModerator = async () => {
    if (!modUsername.trim() || !modPassword.trim() || !modFullName.trim()) {
      showWarning('Required Fields', 'Please fill in moderator details.');
      return;
    }
    try {
      setAddingMod(true);
      await dataStore.addModerator(modUsername, modPassword, modFullName, user!, modPermissions);
      setModUsername('');
      setModPassword('');
      setModFullName('');
      setModPermissions({ ...DEFAULT_MODERATOR_PERMISSIONS });
      const updated = await dataStore.getModerators();
      setModerators(updated);
      showSuccess('Success', `Moderator "${modUsername}" registered with selected permissions.`);
    } catch (err: any) {
      showError('Error', err.message);
    } finally {
      setAddingMod(false);
    }
  };

  const handleOpenEditPermissions = (mod: AppUser) => {
    setEditingMod(mod);
    setEditPermissions({
      ...(mod.permissions || DEFAULT_MODERATOR_PERMISSIONS),
    });
  };

  const handleSavePermissions = async () => {
    if (!editingMod) return;
    try {
      setSavingPermissions(true);
      await dataStore.updateModeratorPermissions(editingMod.id, editPermissions, user!);
      const updated = await dataStore.getModerators();
      setModerators(updated);
      setEditingMod(null);
      showSuccess('Updated', `Permissions saved for @${editingMod.username}.`);
    } catch (err: any) {
      showError('Error', err.message);
    } finally {
      setSavingPermissions(false);
    }
  };

  const handleToggleModerator = async (modId: string) => {
    try {
      await dataStore.toggleModeratorStatus(modId, user!);
      const updated = await dataStore.getModerators();
      setModerators(updated);
    } catch (err: any) {
      showError('Error', err.message);
    }
  };

  if (!isSuperAdmin) {
    return (
      <View style={[styles.screen, { backgroundColor: colors.background }]}>
        <HeaderBar title="Admin" subtitle="Restricted" />
        <View style={styles.restrictedContainer}>
          <Ionicons name="shield-outline" size={54} color={colors.warning} />
          <Text style={[styles.restrictedTitle, { color: colors.text }]}>Super Admin Only</Text>
          <Text style={[styles.restrictedSub, { color: colors.textMuted }]}>
            Your active role is Moderator. Configuration and team management require Super Admin credentials.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <HeaderBar title="Admin Panel" subtitle="Event Configuration & Data Control" onSyncComplete={loadAllAdminData} />

      {/* Improved Horizontal Category Slider */}
      <View style={[styles.tabsBarWrapper, { backgroundColor: colors.surface, borderBottomColor: colors.borderLight }]}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabsScrollContent}
        >
          {(
            [
              { key: 'BATCHES', label: 'Batches', count: batches.length, icon: 'calendar-outline' },
              { key: 'SPORTS', label: 'Sports', count: sports.length, icon: 'trophy-outline' },
              { key: 'DEPARTMENTS', label: 'Departments', count: departments.length, icon: 'business-outline' },
              { key: 'MODERATORS', label: 'Moderators', count: moderators.length, icon: 'people-outline' },
              { key: 'AUDIT_LOGS', label: 'Logs', count: auditLogs.length, icon: 'receipt-outline' },
            ] as const
          ).map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                style={[
                  styles.tabChip,
                  {
                    backgroundColor: isActive ? colors.primary : colors.surfaceHighlight,
                    borderColor: isActive ? colors.primary : colors.border,
                  },
                ]}
                onPress={() => setActiveTab(tab.key)}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={tab.icon as any}
                  size={15}
                  color={isActive ? '#ffffff' : colors.textSecondary}
                />
                <Text
                  style={[
                    styles.tabChipText,
                    { color: isActive ? '#ffffff' : colors.text },
                    isActive && { fontWeight: '800' },
                  ]}
                >
                  {tab.label}
                </Text>
                {tab.count !== undefined && (
                  <View
                    style={[
                      styles.tabCountBadge,
                      {
                        backgroundColor: isActive
                          ? 'rgba(255, 255, 255, 0.25)'
                          : colors.surface,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.tabCountText,
                        { color: isActive ? '#ffffff' : colors.textSecondary },
                      ]}
                    >
                      {tab.count}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView contentContainerStyle={styles.scrollBody} showsVerticalScrollIndicator={false}>
        <View style={styles.containerMax}>
          {/* TAB 1: BATCHES / SESSIONS */}
          {activeTab === 'BATCHES' && (
            <View style={styles.tabContent}>
              <View style={[styles.cardSection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.cardSectionTitle, { color: colors.text }]}>Add Batch / Session Year</Text>

                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>YEAR (e.g. 2026)</Text>
                  <TextInput
                    style={[styles.textInput, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.text }]}
                    placeholder="2026"
                    placeholderTextColor={colors.textMuted}
                    value={newBatchYear}
                    onChangeText={setNewBatchYear}
                    keyboardType="numeric"
                  />
                </View>

                <TouchableOpacity
                  style={styles.actionBtn}
                  onPress={handleAddBatch}
                  disabled={addingBatch}
                >
                  {addingBatch ? (
                    <ActivityIndicator color="#ffffff" size="small" />
                  ) : (
                    <>
                      <Ionicons name="add-circle-outline" size={16} color="#ffffff" />
                      <Text style={styles.actionBtnText}>Add Batch</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>

              <View style={[styles.cardSection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.cardSectionTitle, { color: colors.text }]}>Active Batches ({batches.length})</Text>
                <View style={styles.itemsList}>
                  {batches.map((b) => (
                    <View key={b} style={[styles.itemRow, { backgroundColor: colors.surfaceHighlight }]}>
                      <Text style={[styles.itemTitle, { color: colors.text }]}>Batch {b}</Text>
                      <TouchableOpacity
                        style={[styles.deleteBtn, { backgroundColor: '#fee2e2' }]}
                        onPress={() => handleDeleteBatch(b)}
                      >
                        <Ionicons name="trash-outline" size={15} color="#dc2626" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              </View>
            </View>
          )}

          {/* TAB 2: SPORTS */}
          {activeTab === 'SPORTS' && (
            <View style={styles.tabContent}>
              <View style={[styles.cardSection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.cardSectionTitle, { color: colors.text }]}>Add Sport / Event</Text>

                <View style={styles.multiRow}>
                  <View style={[styles.inputGroup, { flex: 1.5 }]}>
                    <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>SPORT NAME</Text>
                    <TextInput
                      style={[styles.textInput, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.text }]}
                      placeholder="e.g. Badminton"
                      placeholderTextColor={colors.textMuted}
                      value={sportName}
                      onChangeText={setSportName}
                    />
                  </View>
                  <View style={[styles.inputGroup, { flex: 1 }]}>
                    <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>CODE</Text>
                    <TextInput
                      style={[styles.textInput, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.text }]}
                      placeholder="BADM"
                      placeholderTextColor={colors.textMuted}
                      value={sportCode}
                      onChangeText={(t) => setSportCode(t.toUpperCase())}
                      autoCapitalize="characters"
                    />
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>FORMATS (COMMA SEPARATED)</Text>
                  <TextInput
                    style={[styles.textInput, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.text }]}
                    placeholder="Single (1v1), Doubles (2v2)"
                    placeholderTextColor={colors.textMuted}
                    value={sportFormats}
                    onChangeText={setSportFormats}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>FEE (PKR)</Text>
                  <TextInput
                    style={[styles.textInput, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.text }]}
                    placeholder="500"
                    placeholderTextColor={colors.textMuted}
                    value={sportFee}
                    onChangeText={setSportFee}
                    keyboardType="numeric"
                  />
                </View>

                <TouchableOpacity
                  style={styles.actionBtn}
                  onPress={handleAddSport}
                  disabled={addingSport}
                >
                  {addingSport ? (
                    <ActivityIndicator color="#ffffff" size="small" />
                  ) : (
                    <>
                      <Ionicons name="add-circle-outline" size={16} color="#ffffff" />
                      <Text style={styles.actionBtnText}>Save Sport</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>

              <View style={[styles.cardSection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.cardSectionTitle, { color: colors.text }]}>Configured Sports ({sports.length})</Text>
                <View style={styles.itemsList}>
                  {sports.map((s) => (
                    <View key={s.id} style={[styles.itemRow, { backgroundColor: colors.surfaceHighlight }]}>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.itemTitle, { color: colors.text }]}>{s.name} ({s.code})</Text>
                        <Text style={[styles.itemSub, { color: colors.textMuted }]}>
                          {s.formats.join(' | ')} • PKR {s.fee}
                        </Text>
                      </View>
                      <TouchableOpacity
                        style={[styles.deleteBtn, { backgroundColor: '#fee2e2' }]}
                        onPress={() => handleDeleteSport(s.id, s.name)}
                      >
                        <Ionicons name="trash-outline" size={15} color="#dc2626" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              </View>
            </View>
          )}

          {/* TAB 3: DEPARTMENTS */}
          {activeTab === 'DEPARTMENTS' && (
            <View style={styles.tabContent}>
              <View style={[styles.cardSection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.cardSectionTitle, { color: colors.text }]}>Add Department</Text>

                <View style={styles.multiRow}>
                  <View style={[styles.inputGroup, { flex: 2 }]}>
                    <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>NAME</Text>
                    <TextInput
                      style={[styles.textInput, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.text }]}
                      placeholder="e.g. Computer Science"
                      placeholderTextColor={colors.textMuted}
                      value={deptName}
                      onChangeText={setDeptName}
                    />
                  </View>
                  <View style={[styles.inputGroup, { flex: 1 }]}>
                    <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>CODE</Text>
                    <TextInput
                      style={[styles.textInput, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.text }]}
                      placeholder="CS"
                      placeholderTextColor={colors.textMuted}
                      value={deptCode}
                      onChangeText={(t) => setDeptCode(t.toUpperCase())}
                      autoCapitalize="characters"
                    />
                  </View>
                </View>

                <TouchableOpacity
                  style={styles.actionBtn}
                  onPress={handleAddDepartment}
                  disabled={addingDept}
                >
                  {addingDept ? (
                    <ActivityIndicator color="#ffffff" size="small" />
                  ) : (
                    <>
                      <Ionicons name="business-outline" size={16} color="#ffffff" />
                      <Text style={styles.actionBtnText}>Save Department</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>

              <View style={[styles.cardSection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.cardSectionTitle, { color: colors.text }]}>Departments ({departments.length})</Text>
                <View style={styles.itemsList}>
                  {departments.map((d) => (
                    <View key={d.code} style={[styles.itemRow, { backgroundColor: colors.surfaceHighlight }]}>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.itemTitle, { color: colors.text }]}>{d.name}</Text>
                        <Text style={[styles.itemSub, { color: colors.primary }]}>{d.code}</Text>
                      </View>
                      <TouchableOpacity
                        style={[styles.deleteBtn, { backgroundColor: '#fee2e2' }]}
                        onPress={() => handleDeleteDepartment(d.code)}
                      >
                        <Ionicons name="trash-outline" size={15} color="#dc2626" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              </View>
            </View>
          )}

          {/* TAB 4: MODERATORS */}
          {activeTab === 'MODERATORS' && (
            <View style={styles.tabContent}>
              <View style={[styles.cardSection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.cardSectionTitle, { color: colors.text }]}>Add Moderator</Text>

                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>FULL NAME</Text>
                  <TextInput
                    style={[styles.textInput, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.text }]}
                    placeholder="Enter name"
                    placeholderTextColor={colors.textMuted}
                    value={modFullName}
                    onChangeText={setModFullName}
                  />
                </View>

                <View style={styles.multiRow}>
                  <View style={[styles.inputGroup, { flex: 1 }]}>
                    <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>USERNAME</Text>
                    <TextInput
                      style={[styles.textInput, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.text }]}
                      placeholder="username"
                      placeholderTextColor={colors.textMuted}
                      value={modUsername}
                      onChangeText={setModUsername}
                    />
                  </View>
                  <View style={[styles.inputGroup, { flex: 1 }]}>
                    <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>PASSWORD</Text>
                    <TextInput
                      style={[styles.textInput, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.text }]}
                      placeholder="password"
                      placeholderTextColor={colors.textMuted}
                      value={modPassword}
                      onChangeText={setModPassword}
                      secureTextEntry
                    />
                  </View>
                </View>

                {/* Granular Permission Toggles */}
                <View style={styles.permGroup}>
                  <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
                    ASSIGN MODERATOR PERMISSIONS
                  </Text>
                  <View style={styles.permList}>
                    {PERMISSION_ITEMS.map((item) => {
                      const isGranted = !!modPermissions[item.key];
                      return (
                        <TouchableOpacity
                          key={item.key}
                          style={[
                            styles.permRow,
                            {
                              backgroundColor: isGranted ? colors.surfaceHighlight : colors.inputBg,
                              borderColor: isGranted ? colors.primary : colors.border,
                            },
                          ]}
                          onPress={() =>
                            setModPermissions((prev) => ({
                              ...prev,
                              [item.key]: !prev[item.key],
                            }))
                          }
                          activeOpacity={0.7}
                        >
                          <View style={styles.permRowLeft}>
                            <Ionicons
                              name={item.icon}
                              size={18}
                              color={isGranted ? colors.primary : colors.textMuted}
                            />
                            <View style={{ flex: 1 }}>
                              <Text
                                style={[
                                  styles.permRowTitle,
                                  { color: isGranted ? colors.text : colors.textMuted },
                                ]}
                              >
                                {item.label}
                              </Text>
                              <Text style={[styles.permRowDesc, { color: colors.textMuted }]}>
                                {item.desc}
                              </Text>
                            </View>
                          </View>
                          <Ionicons
                            name={isGranted ? 'checkbox' : 'square-outline'}
                            size={22}
                            color={isGranted ? colors.primary : colors.textMuted}
                          />
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                <TouchableOpacity
                  style={styles.actionBtn}
                  onPress={handleAddModerator}
                  disabled={addingMod}
                >
                  {addingMod ? (
                    <ActivityIndicator color="#ffffff" size="small" />
                  ) : (
                    <>
                      <Ionicons name="person-add" size={16} color="#ffffff" />
                      <Text style={styles.actionBtnText}>Create Account</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>

              <View style={[styles.cardSection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.cardSectionTitle, { color: colors.text }]}>Moderators ({moderators.length})</Text>
                <View style={styles.itemsList}>
                  {moderators.map((m) => (
                    <View key={m.id} style={[styles.modCard, { backgroundColor: colors.surfaceHighlight, borderColor: colors.borderLight }]}>
                      <View style={styles.modTopRow}>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.itemTitle, { color: colors.text }]}>{m.full_name}</Text>
                          <Text style={[styles.itemSub, { color: colors.textMuted }]}>@{m.username}</Text>
                        </View>
                        <View style={[styles.statusBadge, { backgroundColor: m.is_active ? '#dcfce7' : '#fee2e2' }]}>
                          <Text style={[styles.statusBadgeText, { color: m.is_active ? '#15803d' : '#b91c1c' }]}>
                            {m.is_active ? 'ACTIVE' : 'INACTIVE'}
                          </Text>
                        </View>
                      </View>

                      {/* Active Permissions Badges */}
                      <View style={styles.permBadgesRow}>
                        {PERMISSION_ITEMS.map((item) => {
                          const hasPerm = !!(m.permissions?.[item.key] ?? DEFAULT_MODERATOR_PERMISSIONS[item.key]);
                          return (
                            <View
                              key={item.key}
                              style={[
                                styles.permBadge,
                                {
                                  backgroundColor: hasPerm ? colors.surface : 'transparent',
                                  borderColor: hasPerm ? colors.border : colors.borderLight,
                                  opacity: hasPerm ? 1 : 0.45,
                                },
                              ]}
                            >
                              <Ionicons
                                name={item.icon}
                                size={11}
                                color={hasPerm ? colors.primary : colors.textMuted}
                              />
                              <Text
                                style={[
                                  styles.permBadgeText,
                                  { color: hasPerm ? colors.text : colors.textMuted },
                                ]}
                              >
                                {item.label.split(' ')[0]}
                              </Text>
                            </View>
                          );
                        })}
                      </View>

                      {/* Moderator Action Buttons */}
                      <View style={styles.modActionRow}>
                        <TouchableOpacity
                          style={[styles.editPermBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
                          onPress={() => handleOpenEditPermissions(m)}
                        >
                          <Ionicons name="key-outline" size={13} color={colors.primary} />
                          <Text style={[styles.editPermBtnText, { color: colors.primary }]}>Edit Access</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={[
                            styles.toggleBtn,
                            { backgroundColor: m.is_active ? colors.dangerBg : colors.successBg },
                          ]}
                          onPress={() => handleToggleModerator(m.id)}
                        >
                          <Text style={[styles.toggleBtnText, { color: m.is_active ? colors.danger : colors.success }]}>
                            {m.is_active ? 'Deactivate' : 'Activate'}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            </View>
          )}

          {/* TAB 5: AUDIT LOGS */}
          {activeTab === 'AUDIT_LOGS' && (
            <View style={styles.tabContent}>
              <View style={[styles.cardSection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.cardSectionTitle, { color: colors.text }]}>Activity Logs</Text>
                <View style={styles.itemsList}>
                  {auditLogs.map((log) => (
                    <View key={log.id} style={[styles.itemRow, { backgroundColor: colors.surfaceHighlight }]}>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.itemTitle, { color: colors.text }]}>{log.action}</Text>
                        <Text style={[styles.itemSub, { color: colors.textMuted }]}>
                          By @{log.performed_by_username} • {new Date(log.created_at).toLocaleTimeString()}
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Edit Moderator Permissions Modal */}
      <Modal
        visible={!!editingMod}
        transparent
        animationType="fade"
        onRequestClose={() => setEditingMod(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.borderLight }]}>
              <View>
                <Text style={styles.modalSubTitle}>CONFIGURE ACCESS</Text>
                <Text style={[styles.modalTitle, { color: colors.text }]}>
                  {editingMod?.full_name} (@{editingMod?.username})
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setEditingMod(null)}
                style={[styles.modalCloseBtn, { backgroundColor: colors.surfaceHighlight }]}
              >
                <Ionicons name="close" size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              <Text style={[styles.modalHint, { color: colors.textMuted }]}>
                Choose features this moderator is authorized to use:
              </Text>

              <View style={styles.permList}>
                {PERMISSION_ITEMS.map((item) => {
                  const isGranted = !!editPermissions[item.key];
                  return (
                    <TouchableOpacity
                      key={item.key}
                      style={[
                        styles.permRow,
                        {
                          backgroundColor: isGranted ? colors.surfaceHighlight : colors.inputBg,
                          borderColor: isGranted ? colors.primary : colors.border,
                        },
                      ]}
                      onPress={() =>
                        setEditPermissions((prev) => ({
                          ...prev,
                          [item.key]: !prev[item.key],
                        }))
                      }
                      activeOpacity={0.7}
                    >
                      <View style={styles.permRowLeft}>
                        <Ionicons
                          name={item.icon}
                          size={18}
                          color={isGranted ? colors.primary : colors.textMuted}
                        />
                        <View style={{ flex: 1 }}>
                          <Text
                            style={[
                              styles.permRowTitle,
                              { color: isGranted ? colors.text : colors.textMuted },
                            ]}
                          >
                            {item.label}
                          </Text>
                          <Text style={[styles.permRowDesc, { color: colors.textMuted }]}>
                            {item.desc}
                          </Text>
                        </View>
                      </View>
                      <Ionicons
                        name={isGranted ? 'checkbox' : 'square-outline'}
                        size={22}
                        color={isGranted ? colors.primary : colors.textMuted}
                      />
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>

            <View style={[styles.modalFooter, { borderTopColor: colors.borderLight }]}>
              <TouchableOpacity
                style={[styles.modalCancelBtn, { borderColor: colors.border }]}
                onPress={() => setEditingMod(null)}
              >
                <Text style={[styles.modalCancelText, { color: colors.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalSaveBtn}
                onPress={handleSavePermissions}
                disabled={savingPermissions}
              >
                {savingPermissions ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text style={styles.modalSaveText}>Save Permissions</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  tabsBarWrapper: {
    borderBottomWidth: 1,
  },
  tabsScrollContent: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  tabChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 22,
    borderWidth: 1,
  },
  tabChipText: {
    fontSize: 13,
    fontWeight: '600',
  },
  tabCountBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 12,
    marginLeft: 2,
  },
  tabCountText: {
    fontSize: 11,
    fontWeight: '800',
  },
  scrollBody: {
    padding: 16,
    paddingBottom: 40,
  },
  containerMax: {
    maxWidth: 600,
    width: '100%',
    alignSelf: 'center',
    gap: 14,
  },
  tabContent: {
    gap: 14,
  },
  cardSection: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    gap: 12,
  },
  cardSectionTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  inputGroup: {
    gap: 5,
  },
  inputLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  textInput: {
    height: 44,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 14,
  },
  multiRow: {
    flexDirection: 'row',
    gap: 10,
  },
  actionBtn: {
    backgroundColor: '#0284c7',
    height: 44,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 4,
  },
  actionBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  itemsList: {
    gap: 10,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 10,
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  itemSub: {
    fontSize: 11,
    marginTop: 2,
  },
  deleteBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modCard: {
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    gap: 10,
  },
  modTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  permGroup: {
    gap: 8,
    marginTop: 4,
  },
  permList: {
    gap: 7,
  },
  permRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  permRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    marginRight: 8,
  },
  permRowTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  permRowDesc: {
    fontSize: 10,
    marginTop: 1,
  },
  permBadgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  permBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  permBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  modActionRow: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'flex-end',
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.05)',
    paddingTop: 8,
  },
  editPermBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 7,
    borderWidth: 1,
  },
  editPermBtnText: {
    fontSize: 11,
    fontWeight: '700',
  },
  toggleBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 7,
  },
  toggleBtnText: {
    fontSize: 11,
    fontWeight: '700',
  },
  restrictedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
    gap: 12,
  },
  restrictedTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  restrictedSub: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalCard: {
    width: '100%',
    maxWidth: 440,
    maxHeight: '85%',
    borderRadius: 18,
    borderWidth: 1,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  modalSubTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: '#0284c7',
    letterSpacing: 1.2,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    marginTop: 2,
  },
  modalCloseBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBody: {
    padding: 16,
  },
  modalHint: {
    fontSize: 12,
    marginBottom: 12,
    lineHeight: 16,
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 10,
    padding: 14,
    borderTopWidth: 1,
    justifyContent: 'flex-end',
  },
  modalCancelBtn: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 8,
    borderWidth: 1,
  },
  modalCancelText: {
    fontSize: 13,
    fontWeight: '600',
  },
  modalSaveBtn: {
    backgroundColor: '#0284c7',
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalSaveText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
});
