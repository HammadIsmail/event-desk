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
import { responsiveFontSize, moderateScale, metrics } from '@/theme/responsive';

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
    paddingHorizontal: metrics.spacing.md,
      paddingTop: moderateScale(10),
    paddingBottom: moderateScale(10),
    borderBottomWidth: 1,
    gap: moderateScale(10),
  },
  searchRow: {
    flexDirection: 'row',
    gap: moderateScale(8),
    alignItems: 'center',
  },
  searchWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: metrics.radius.md,
    borderWidth: 1,
    paddingHorizontal: metrics.spacing.md,
    minHeight: metrics.minTouchTarget,
    height: moderateScale(46),
    gap: moderateScale(6),
  },
  searchInput: {
    flex: 1,
    fontSize: responsiveFontSize(13),
    height: '100%',
  },
  exportBtn: {
    backgroundColor: '#0284c7',
    flexDirection: 'row',
    alignItems: 'center',
    gap: moderateScale(4),
    paddingHorizontal: metrics.spacing.md,
    minHeight: metrics.minTouchTarget,
    height: moderateScale(46),
    borderRadius: metrics.radius.md,
  },
  exportBtnText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: responsiveFontSize(13),
  },
  filterChipContainer: {
    gap: moderateScale(6),
  },
  filterChip: {
    paddingHorizontal: metrics.spacing.md,
    paddingVertical: moderateScale(6),
    borderRadius: metrics.radius.full,
    minHeight: moderateScale(34),
    justifyContent: 'center',
  },
  filterChipText: {
    fontSize: responsiveFontSize(12),
    fontWeight: '700',
  },
  listContainer: {
    padding: metrics.spacing.md,
    gap: moderateScale(12),
    paddingBottom: moderateScale(48),
    maxWidth: 800,
    width: '100%',
    alignSelf: 'center',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: metrics.spacing.xl,
    gap: moderateScale(8),
  },
  emptyTitle: {
    fontSize: responsiveFontSize(16),
    fontWeight: '800',
  },
  emptySubtitle: {
    fontSize: responsiveFontSize(13),
  },
  recordCard: {
    borderRadius: metrics.radius.lg,
    padding: metrics.spacing.md,
    borderWidth: 1,
    gap: moderateScale(8),
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  regNoHeading: {
    fontSize: responsiveFontSize(17),
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  studentNameHeading: {
    fontSize: responsiveFontSize(14),
    fontWeight: '700',
    marginTop: moderateScale(2),
  },
  cardDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: moderateScale(6),
  },
  detailPill: {
    paddingHorizontal: moderateScale(8),
    paddingVertical: moderateScale(4),
    borderRadius: metrics.radius.sm,
  },
  detailPillText: {
    fontSize: responsiveFontSize(11),
    fontWeight: '600',
  },
  partnerLine: {
    fontSize: responsiveFontSize(11),
    padding: moderateScale(6),
    borderRadius: metrics.radius.sm,
  },
  feeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: moderateScale(10),
  },
  feeText: {
    fontSize: responsiveFontSize(12),
  },
  balanceText: {
    fontSize: responsiveFontSize(11),
    fontWeight: '700',
    color: '#dc2626',
    backgroundColor: '#fee2e2',
    paddingHorizontal: moderateScale(6),
    paddingVertical: moderateScale(2),
    borderRadius: metrics.radius.xs,
  },
  checkedInBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: moderateScale(4),
    backgroundColor: '#ecfdf5',
    paddingHorizontal: moderateScale(6),
    paddingVertical: moderateScale(2),
    borderRadius: metrics.radius.xs,
  },
  checkedInText: {
    fontSize: responsiveFontSize(10),
    fontWeight: '700',
    color: '#059669',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    paddingTop: moderateScale(8),
    marginTop: moderateScale(2),
  },
  officerText: {
    fontSize: responsiveFontSize(11),
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: moderateScale(6),
  },
  ticketBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: moderateScale(4),
    paddingHorizontal: moderateScale(10),
    paddingVertical: moderateScale(6),
    borderRadius: metrics.radius.sm,
    minHeight: moderateScale(34),
  },
  ticketBtnText: {
    fontSize: responsiveFontSize(12),
    fontWeight: '700',
  },
  actionIconBtn: {
    width: moderateScale(34),
    height: moderateScale(34),
    borderRadius: metrics.radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: metrics.spacing.lg,
  },
  editModalCard: {
    borderRadius: metrics.radius.lg,
    width: '100%',
    maxWidth: 440,
    padding: metrics.spacing.lg,
    borderWidth: 1,
    gap: moderateScale(14),
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: moderateScale(10),
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: responsiveFontSize(16),
    fontWeight: '800',
  },
  modalBody: {
    gap: moderateScale(12),
  },
  editRegDisplay: {
    fontSize: responsiveFontSize(17),
    fontWeight: '900',
    textAlign: 'center',
    paddingVertical: moderateScale(6),
    borderRadius: metrics.radius.sm,
  },
  editField: {
    gap: moderateScale(5),
  },
  editLabel: {
    fontSize: responsiveFontSize(10),
    fontWeight: '800',
  },
  editInput: {
    minHeight: metrics.minTouchTarget,
    height: moderateScale(44),
    borderWidth: 1,
    borderRadius: metrics.radius.sm,
    paddingHorizontal: metrics.spacing.md,
    fontSize: responsiveFontSize(14),
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: moderateScale(10),
  },
  cancelBtn: {
    paddingHorizontal: metrics.spacing.lg,
    paddingVertical: moderateScale(10),
    borderRadius: metrics.radius.sm,
    minHeight: metrics.minTouchTarget,
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontSize: responsiveFontSize(13),
    fontWeight: '700',
  },
  saveBtn: {
    paddingHorizontal: metrics.spacing.xl,
    paddingVertical: moderateScale(10),
    borderRadius: metrics.radius.sm,
    backgroundColor: '#0284c7',
    minHeight: metrics.minTouchTarget,
    justifyContent: 'center',
  },
  saveBtnText: {
    fontSize: responsiveFontSize(13),
    fontWeight: '700',
    color: '#ffffff',
  },
  exportModalCard: {
    borderRadius: metrics.radius.lg,
    width: '100%',
    maxWidth: 440,
    padding: metrics.spacing.lg,
    borderWidth: 1,
    gap: moderateScale(12),
  },
  exportOptionAll: {
    backgroundColor: '#0284c7',
    borderRadius: metrics.radius.md,
    padding: metrics.spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: moderateScale(10),
    minHeight: metrics.minTouchTarget,
  },
  exportOptionAllTitle: {
    color: '#ffffff',
    fontSize: responsiveFontSize(15),
    fontWeight: '800',
  },
  exportOptionAllSub: {
    color: '#bae6fd',
    fontSize: responsiveFontSize(11),
  },
  exportSportHeader: {
    fontSize: responsiveFontSize(10),
    fontWeight: '800',
    marginTop: moderateScale(6),
    letterSpacing: 0.5,
  },
  exportSportItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: moderateScale(10),
    minHeight: metrics.minTouchTarget,
    borderBottomWidth: 1,
  },
  exportSportName: {
    flex: 1,
    marginLeft: moderateScale(10),
    fontSize: responsiveFontSize(14),
    fontWeight: '600',
  },
});
