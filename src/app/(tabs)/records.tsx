// src/app/(tabs)/records.tsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { HeaderBar } from '@/components/HeaderBar';
import { PaymentBadge } from '@/components/PaymentBadge';
import { TicketModal } from '@/components/TicketModal';
import { useAuth } from '@/context/AuthContext';
import { useAppTheme } from '@/context/ThemeContext';
import { useAlert } from '@/context/AlertContext';
import { dataStore } from '@/services/dataStore';
import { shareOrDownloadCSV } from '@/services/ticketService';
import { Registration, PaymentStatus, Sport } from '@/types';

export default function RecordsScreen() {
  const { user, isSuperAdmin, can } = useAuth();
  const { colors } = useAppTheme();
  const { showSuccess, showError, showWarning, showConfirm } = useAlert();

  const [records, setRecords] = useState<Registration[]>([]);
  const [sports, setSports] = useState<Sport[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSportFilter, setSelectedSportFilter] = useState('ALL');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<PaymentStatus | 'ALL'>('ALL');

  // Modals
  const [selectedTicket, setSelectedTicket] = useState<Registration | null>(null);
  const [ticketModalVisible, setTicketModalVisible] = useState(false);

  // Super Admin Edit Modal
  const [editRecord, setEditRecord] = useState<Registration | null>(null);
  const [editStudentName, setEditStudentName] = useState('');
  const [editPaymentStatus, setEditPaymentStatus] = useState<PaymentStatus>('PAID');
  const [editPaidAmount, setEditPaidAmount] = useState('0');
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);

  // Export Modal
  const [exportModalVisible, setExportModalVisible] = useState(false);
  const [exporting, setExporting] = useState(false);

  const fetchRecords = useCallback(async () => {
    try {
      setLoading(true);
      const [list, sps] = await Promise.all([
        dataStore.getRegistrations({
          sport: selectedSportFilter,
          paymentStatus: selectedStatusFilter as any,
          search: searchQuery,
        }),
        dataStore.getSports(),
      ]);
      setRecords(list);
      setSports(sps);
    } catch (err) {
      console.warn('Failed to load records:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedSportFilter, selectedStatusFilter, searchQuery]);

  useFocusEffect(
    useCallback(() => {
      fetchRecords();
    }, [fetchRecords])
  );

  const handleOpenTicket = (record: Registration) => {
    setSelectedTicket(record);
    setTicketModalVisible(true);
  };

  const handleOpenEdit = (record: Registration) => {
    if (!isSuperAdmin) {
      showWarning('Permission Denied', 'Moderators cannot edit records.');
      return;
    }
    setEditRecord(record);
    setEditStudentName(record.student_name);
    setEditPaymentStatus(record.payment_status);
    setEditPaidAmount(record.paid_amount.toString());
    setEditModalVisible(true);
  };

  const handleSaveEdit = async () => {
    if (!editRecord || !user) return;
    try {
      setSavingEdit(true);
      await dataStore.updateRegistration(
        editRecord.reg_no,
        {
          student_name: editStudentName.trim(),
          payment_status: editPaymentStatus,
          paid_amount: Number(editPaidAmount) || 0,
        },
        user
      );
      setEditModalVisible(false);
      fetchRecords();
      showSuccess('Updated', `Record for ${editRecord.reg_no} updated.`);
    } catch (err: any) {
      showError('Edit Failed', err.message);
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDelete = (record: Registration) => {
    if (!isSuperAdmin) {
      showWarning('Permission Denied', 'Moderators cannot delete records.');
      return;
    }

    showConfirm({
      title: 'Delete Registration',
      message: `Permanently delete registration for ${record.student_name} (${record.reg_no})?`,
      confirmText: 'Delete Record',
      cancelText: 'Keep Record',
      isDestructive: true,
      onConfirm: async () => {
        try {
          await dataStore.deleteRegistration(record.reg_no, user!);
          fetchRecords();
          showSuccess('Deleted', `Record for ${record.reg_no} has been deleted.`);
        } catch (err: any) {
          showError('Delete Error', err.message);
        }
      },
    });
  };

  const handleExportCSV = async (sportName?: string) => {
    try {
      setExporting(true);
      const { filename, csv } = await dataStore.generateCSVContent(sportName);
      await shareOrDownloadCSV(filename, csv);
      setExportModalVisible(false);
    } catch (err: any) {
      showError('Export Error', err.message || 'Could not export CSV');
    } finally {
      setExporting(false);
    }
  };

  if (!can('can_view_records')) {
    return (
      <View style={[styles.screen, { backgroundColor: colors.background }]}>
        <HeaderBar title="Directory" subtitle="Access Restricted" />
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 30, gap: 12 }}>
          <Ionicons name="lock-closed-outline" size={50} color={colors.warning} />
          <Text style={{ fontSize: 18, fontWeight: '800', color: colors.text }}>Access Restricted</Text>
          <Text style={{ fontSize: 13, color: colors.textMuted, textAlign: 'center', lineHeight: 18 }}>
            Your account does not have permission to view the participant directory. Please contact the Super Administrator.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <HeaderBar title="Directory" subtitle="Registrations Database" />

      {/* Top Search & Actions */}
      <View style={[styles.topSection, { backgroundColor: colors.surface, borderBottomColor: colors.borderLight }]}>
        <View style={styles.searchRow}>
          <View style={[styles.searchWrapper, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]}>
            <Ionicons name="search-outline" size={17} color={colors.textMuted} />
            <TextInput
              style={[styles.searchInput, { color: colors.text }]}
              placeholder="Search Reg No, Name, Phone..."
              placeholderTextColor={colors.textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCorrect={false}
            />
            {searchQuery ? (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={17} color={colors.textMuted} />
              </TouchableOpacity>
            ) : null}
          </View>

          {can('can_export_csv') && (
            <TouchableOpacity
              style={styles.exportBtn}
              onPress={() => setExportModalVisible(true)}
              activeOpacity={0.8}
            >
              <Ionicons name="download-outline" size={17} color="#ffffff" />
              <Text style={styles.exportBtnText}>CSV</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Sport filters */}
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={[{ id: 'all', name: 'ALL' }, ...sports]}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => {
            const isSelected = selectedSportFilter === item.name;
            return (
              <TouchableOpacity
                style={[
                  styles.filterChip,
                  {
                    backgroundColor: isSelected ? colors.primary : colors.surfaceHighlight,
                  },
                ]}
                onPress={() => setSelectedSportFilter(item.name)}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    { color: isSelected ? '#ffffff' : colors.textSecondary },
                  ]}
                >
                  {item.name}
                </Text>
              </TouchableOpacity>
            );
          }}
          contentContainerStyle={styles.filterChipContainer}
        />
      </View>

      {/* List */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : records.length === 0 ? (
        <View style={styles.centerContainer}>
          <Ionicons name="document-text-outline" size={44} color={colors.textMuted} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>No records found</Text>
          <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>
            {searchQuery ? 'Try adjusting your search' : 'Registered students will show here'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={records}
          keyExtractor={(item) => item.reg_no}
          contentContainerStyle={styles.listContainer}
          renderItem={({ item }) => {
            const balance = Math.max(0, (item.total_fee || 0) - (item.paid_amount || 0));

            return (
              <View style={[styles.recordCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <View style={styles.cardHeader}>
                  <View>
                    <Text style={[styles.regNoHeading, { color: colors.primary }]}>{item.reg_no}</Text>
                    <Text style={[styles.studentNameHeading, { color: colors.text }]}>{item.student_name}</Text>
                  </View>
                  <PaymentBadge status={item.payment_status} size="sm" />
                </View>

                <View style={styles.cardDetails}>
                  <View style={[styles.detailPill, { backgroundColor: colors.surfaceHighlight }]}>
                    <Text style={[styles.detailPillText, { color: colors.text }]}>
                      {item.sport_name} • {item.category_format}
                    </Text>
                  </View>
                  <View style={[styles.detailPill, { backgroundColor: colors.surfaceHighlight }]}>
                    <Text style={[styles.detailPillText, { color: colors.textSecondary }]}>
                      {item.department_code} ({item.session_year})
                    </Text>
                  </View>
                </View>

                {item.partner_name && (
                  <Text style={[styles.partnerLine, { color: colors.primary, backgroundColor: colors.primaryLight }]}>
                    Partner: <Text style={{ fontWeight: '800' }}>{item.partner_name}</Text>
                    {item.partner_reg_no ? ` (${item.partner_reg_no})` : ''}
                  </Text>
                )}

                <View style={styles.feeRow}>
                  <Text style={[styles.feeText, { color: colors.textMuted }]}>
                    Paid: <Text style={{ color: colors.text, fontWeight: '800' }}>PKR {item.paid_amount}</Text> / {item.total_fee}
                  </Text>
                  {balance > 0 && (
                    <Text style={styles.balanceText}>Due: PKR {balance}</Text>
                  )}
                  {item.checked_in && (
                    <View style={styles.checkedInBadge}>
                      <Ionicons name="checkmark-circle" size={12} color="#10b981" />
                      <Text style={styles.checkedInText}>Checked-In</Text>
                    </View>
                  )}
                </View>

                <View style={[styles.cardFooter, { borderTopColor: colors.borderLight }]}>
                  <Text style={[styles.officerText, { color: colors.textMuted }]}>
                    By {item.created_by_username} • {new Date(item.created_at).toLocaleDateString()}
                  </Text>

                  <View style={styles.actionsRow}>
                    <TouchableOpacity
                      style={[styles.ticketBtn, { backgroundColor: colors.primaryLight }]}
                      onPress={() => handleOpenTicket(item)}
                    >
                      <Ionicons name="qr-code-outline" size={15} color={colors.primary} />
                      <Text style={[styles.ticketBtnText, { color: colors.primary }]}>Pass</Text>
                    </TouchableOpacity>

                    {isSuperAdmin && (
                      <>
                        <TouchableOpacity
                          style={[styles.actionIconBtn, { backgroundColor: colors.surfaceHighlight }]}
                          onPress={() => handleOpenEdit(item)}
                        >
                          <Ionicons name="pencil-outline" size={15} color={colors.textSecondary} />
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.actionIconBtn, { backgroundColor: '#fee2e2' }]}
                          onPress={() => handleDelete(item)}
                        >
                          <Ionicons name="trash-outline" size={15} color="#dc2626" />
                        </TouchableOpacity>
                      </>
                    )}
                  </View>
                </View>
              </View>
            );
          }}
        />
      )}

      {/* Ticket Modal */}
      <TicketModal
        visible={ticketModalVisible}
        registration={selectedTicket}
        onClose={() => setTicketModalVisible(false)}
      />

      {/* Edit Modal (Super Admin) */}
      <Modal visible={editModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.editModalCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.borderLight }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Edit Registration</Text>
              <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                <Ionicons name="close" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Text style={[styles.editRegDisplay, { color: colors.primary, backgroundColor: colors.primaryLight }]}>
                {editRecord?.reg_no}
              </Text>

              <View style={styles.editField}>
                <Text style={[styles.editLabel, { color: colors.textSecondary }]}>STUDENT NAME</Text>
                <TextInput
                  style={[styles.editInput, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.text }]}
                  value={editStudentName}
                  onChangeText={setEditStudentName}
                />
              </View>

              <View style={styles.editField}>
                <Text style={[styles.editLabel, { color: colors.textSecondary }]}>AMOUNT PAID (PKR)</Text>
                <TextInput
                  style={[styles.editInput, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.text }]}
                  value={editPaidAmount}
                  onChangeText={setEditPaidAmount}
                  keyboardType="numeric"
                />
              </View>
            </View>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.cancelBtn, { backgroundColor: colors.surfaceHighlight }]}
                onPress={() => setEditModalVisible(false)}
              >
                <Text style={[styles.cancelBtnText, { color: colors.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveBtn}
                onPress={handleSaveEdit}
                disabled={savingEdit}
              >
                {savingEdit ? (
                  <ActivityIndicator color="#ffffff" size="small" />
                ) : (
                  <Text style={styles.saveBtnText}>Save</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Export Selection Modal */}
      <Modal visible={exportModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.exportModalCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.borderLight }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Export Spreadsheet</Text>
              <TouchableOpacity onPress={() => setExportModalVisible(false)}>
                <Ionicons name="close" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.exportOptionAll}
              onPress={() => handleExportCSV('ALL')}
              disabled={exporting}
            >
              <Ionicons name="grid-outline" size={20} color="#ffffff" />
              <View>
                <Text style={styles.exportOptionAllTitle}>Export All Registrations</Text>
                <Text style={styles.exportOptionAllSub}>Master Society Spreadsheet</Text>
              </View>
            </TouchableOpacity>

            <Text style={[styles.exportSportHeader, { color: colors.textSecondary }]}>
              OR EXPORT PER SPORT:
            </Text>

            <FlatList
              data={sports}
              keyExtractor={(s) => s.id}
              style={{ maxHeight: 220 }}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.exportSportItem, { borderBottomColor: colors.borderLight }]}
                  onPress={() => handleExportCSV(item.name)}
                  disabled={exporting}
                >
                  <Ionicons name="document-text-outline" size={16} color={colors.primary} />
                  <Text style={[styles.exportSportName, { color: colors.text }]}>{item.name}</Text>
                  <Ionicons name="download-outline" size={16} color={colors.textMuted} />
                </TouchableOpacity>
              )}
            />
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
  topSection: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
    borderBottomWidth: 1,
    gap: 10,
  },
  searchRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  searchWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 10,
    height: 42,
    gap: 6,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
  },
  exportBtn: {
    backgroundColor: '#0284c7',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 14,
    height: 42,
    borderRadius: 10,
  },
  exportBtnText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 13,
  },
  filterChipContainer: {
    gap: 6,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '700',
  },
  listContainer: {
    padding: 16,
    gap: 12,
    paddingBottom: 40,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  emptySubtitle: {
    fontSize: 13,
  },
  recordCard: {
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    gap: 8,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  regNoHeading: {
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  studentNameHeading: {
    fontSize: 15,
    fontWeight: '700',
    marginTop: 2,
  },
  cardDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  detailPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  detailPillText: {
    fontSize: 12,
    fontWeight: '600',
  },
  partnerLine: {
    fontSize: 12,
    padding: 6,
    borderRadius: 6,
  },
  feeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  feeText: {
    fontSize: 12,
  },
  balanceText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#dc2626',
    backgroundColor: '#fee2e2',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  checkedInBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  checkedInText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#059669',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    paddingTop: 8,
    marginTop: 2,
  },
  officerText: {
    fontSize: 11,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  ticketBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  ticketBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  actionIconBtn: {
    width: 30,
    height: 30,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 18,
  },
  editModalCard: {
    borderRadius: 18,
    width: '100%',
    maxWidth: 420,
    padding: 18,
    borderWidth: 1,
    gap: 14,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 10,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  modalBody: {
    gap: 12,
  },
  editRegDisplay: {
    fontSize: 18,
    fontWeight: '900',
    textAlign: 'center',
    paddingVertical: 6,
    borderRadius: 8,
  },
  editField: {
    gap: 5,
  },
  editLabel: {
    fontSize: 10,
    fontWeight: '800',
  },
  editInput: {
    height: 44,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    fontSize: 14,
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  cancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  saveBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#0284c7',
  },
  saveBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
  },
  exportModalCard: {
    borderRadius: 18,
    width: '100%',
    maxWidth: 420,
    padding: 18,
    borderWidth: 1,
    gap: 12,
  },
  exportOptionAll: {
    backgroundColor: '#0284c7',
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  exportOptionAllTitle: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
  },
  exportOptionAllSub: {
    color: '#bae6fd',
    fontSize: 11,
  },
  exportSportHeader: {
    fontSize: 10,
    fontWeight: '800',
    marginTop: 6,
    letterSpacing: 0.5,
  },
  exportSportItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  exportSportName: {
    flex: 1,
    marginLeft: 10,
    fontSize: 14,
    fontWeight: '600',
  },
});
