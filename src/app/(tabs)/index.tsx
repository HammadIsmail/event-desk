// src/app/(tabs)/index.tsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { HeaderBar } from '@/components/HeaderBar';
import { SelectDropdown, DropdownOption } from '@/components/SelectDropdown';
import { TicketModal } from '@/components/TicketModal';
import { useAuth } from '@/context/AuthContext';
import { useAppTheme } from '@/context/ThemeContext';
import { useAlert } from '@/context/AlertContext';
import { dataStore } from '@/services/dataStore';
import { Department, Sport, PaymentStatus, Registration } from '@/types';

const PAYMENT_OPTIONS: DropdownOption[] = [
  { label: 'Paid in Full', value: 'PAID', subLabel: '100% Cleared' },
  { label: 'Partial Payment', value: 'PARTIAL', subLabel: 'Balance Pending' },
  { label: 'Free Pass / Complimentary', value: 'FREE', subLabel: 'Waived Fee' },
  { label: 'Unpaid / Pending Fee', value: 'UNPAID', subLabel: 'No Payment Yet' },
];

export default function RegistrationScreen() {
  const { user, can } = useAuth();
  const { colors } = useAppTheme();
  const { showWarning, showError, showSuccess } = useAlert();

  // Dynamic config loaded from DB
  const [batches, setBatches] = useState<string[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [sports, setSports] = useState<Sport[]>([]);
  const [loadingConfig, setLoadingConfig] = useState(true);

  // Form Fields
  const [studentName, setStudentName] = useState('');
  const [sessionYear, setSessionYear] = useState('');
  const [selectedDeptCode, setSelectedDeptCode] = useState('');
  const [rollNumber, setRollNumber] = useState('');
  const [selectedSportId, setSelectedSportId] = useState('');
  const [selectedFormat, setSelectedFormat] = useState('Single (1v1)');
  const [partnerName, setPartnerName] = useState('');
  const [partnerRegNo, setPartnerRegNo] = useState('');
  const [phone, setPhone] = useState('');
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('PAID');
  const [totalFee, setTotalFee] = useState('0');
  const [paidAmount, setPaidAmount] = useState('0');
  const [submitting, setSubmitting] = useState(false);

  // Success ticket modal
  const [createdRecord, setCreatedRecord] = useState<Registration | null>(null);
  const [ticketModalVisible, setTicketModalVisible] = useState(false);

  const selectedSport = sports.find((s) => s.id === selectedSportId) || null;

  const loadConfig = useCallback(async () => {
    try {
      const [bts, depts, sps] = await Promise.all([
        dataStore.getBatches(),
        dataStore.getDepartments(),
        dataStore.getSports(),
      ]);
      setBatches(bts);
      setDepartments(depts);
      setSports(sps);

      if (bts.length > 0 && !sessionYear) {
        setSessionYear(bts[0]);
      }
      if (depts.length > 0 && !selectedDeptCode) {
        setSelectedDeptCode(depts[0].code);
      }
      if (sps.length > 0 && !selectedSportId) {
        setSelectedSportId(sps[0].id);
        setSelectedFormat(sps[0].formats[0] || 'Single (1v1)');
        setTotalFee(sps[0].fee.toString());
        setPaidAmount(sps[0].fee.toString());
      }
    } catch (err) {
      console.warn('Failed to load DB config:', err);
    } finally {
      setLoadingConfig(false);
    }
  }, [sessionYear, selectedDeptCode, selectedSportId]);

  useFocusEffect(
    useCallback(() => {
      loadConfig();
    }, [loadConfig])
  );

  const handleSelectSportId = (sportId: string) => {
    setSelectedSportId(sportId);
    const sp = sports.find((s) => s.id === sportId);
    if (sp) {
      const defFormat = sp.formats[0] || 'Single (1v1)';
      setSelectedFormat(defFormat);
      setTotalFee(sp.fee.toString());
      if (paymentStatus === 'PAID') {
        setPaidAmount(sp.fee.toString());
      } else if (paymentStatus === 'FREE' || paymentStatus === 'UNPAID') {
        setPaidAmount('0');
      }
    }
  };

  const handlePaymentStatusChange = (statusVal: string) => {
    const status = statusVal as PaymentStatus;
    setPaymentStatus(status);
    const feeNum = Number(totalFee) || 0;
    if (status === 'PAID') {
      setPaidAmount(feeNum.toString());
    } else if (status === 'FREE' || status === 'UNPAID') {
      setPaidAmount('0');
    } else if (status === 'PARTIAL') {
      setPaidAmount(Math.floor(feeNum / 2).toString());
    }
  };

  const resetForm = () => {
    setStudentName('');
    setRollNumber('');
    setPartnerName('');
    setPartnerRegNo('');
    setPhone('');
    if (selectedSport) {
      setPaymentStatus('PAID');
      setTotalFee(selectedSport.fee.toString());
      setPaidAmount(selectedSport.fee.toString());
    }
  };

  const cleanRoll = rollNumber.trim().toUpperCase();
  const calculatedRegNo = `${sessionYear}-${selectedDeptCode || 'DEPT'}-${cleanRoll || '___'}`.toUpperCase();

  const handleSubmit = async () => {
    if (!studentName.trim()) {
      showWarning('Required Field', 'Please enter student full name.');
      return;
    }
    if (!rollNumber.trim()) {
      showWarning('Required Field', 'Please enter registration suffix / roll number.');
      return;
    }
    if (!selectedSport) {
      showWarning('Required Field', 'Please select a sport.');
      return;
    }

    const finalRegNo = `${sessionYear}-${selectedDeptCode}-${cleanRoll}`.toUpperCase();

    // Check duplicate
    const existing = await dataStore.getRegistrationByRegNo(finalRegNo);
    if (existing) {
      showWarning(
        'Duplicate Registration',
        `Student "${finalRegNo}" is already registered for "${existing.sport_name}".`
      );
      return;
    }

    try {
      setSubmitting(true);
      const newRecord = await dataStore.createRegistration(
        {
          student_name: studentName.trim(),
          reg_no: finalRegNo,
          session_year: sessionYear,
          department_code: selectedDeptCode,
          sport_id: selectedSport.id,
          sport_name: selectedSport.name,
          category_format: selectedFormat,
          partner_name: partnerName.trim() || undefined,
          partner_reg_no: partnerRegNo ? partnerRegNo.trim().toUpperCase() : undefined,
          payment_status: paymentStatus,
          total_fee: Number(totalFee) || 0,
          paid_amount: Number(paidAmount) || 0,
          phone: phone.trim() || undefined,
        },
        user!
      );

      setCreatedRecord(newRecord);
      setTicketModalVisible(true);
      resetForm();
    } catch (err: any) {
      showError('Registration Failed', err.message || 'Could not register student');
    } finally {
      setSubmitting(false);
    }
  };

  const isTeamOrDoubles =
    selectedFormat.toLowerCase().includes('2v2') ||
    selectedFormat.toLowerCase().includes('double') ||
    selectedFormat.toLowerCase().includes('team');

  // Department dropdown options
  const deptOptions: DropdownOption[] = departments.map((d) => ({
    label: `${d.name} (${d.code})`,
    value: d.code,
    subLabel: d.code,
  }));

  // Sports dropdown options
  const sportOptions: DropdownOption[] = sports.map((s) => ({
    label: s.name,
    value: s.id,
    subLabel: `PKR ${s.fee}`,
  }));

  // Format options
  const formatOptions: DropdownOption[] = (selectedSport?.formats || ['Single (1v1)']).map((f) => ({
    label: f,
    value: f,
  }));

  if (!can('can_register')) {
    return (
      <View style={[styles.screen, { backgroundColor: colors.background }]}>
        <HeaderBar title="Register" subtitle="Access Restricted" />
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 30, gap: 12 }}>
          <Ionicons name="lock-closed-outline" size={50} color={colors.warning} />
          <Text style={{ fontSize: 18, fontWeight: '800', color: colors.text }}>Registration Restricted</Text>
          <Text style={{ fontSize: 13, color: colors.textMuted, textAlign: 'center', lineHeight: 18 }}>
            Your account does not have permission to register new participants. Please contact the Super Administrator.
          </Text>
        </View>
      </View>
    );
  }

  if (loadingConfig) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.screen, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <HeaderBar title="Register" subtitle="New Student Registration" />

      <ScrollView contentContainerStyle={styles.scrollBody} keyboardShouldPersistTaps="handled">
        <View style={styles.formContainer}>
  

          {/* Student Information Section */}
          <View style={[styles.cardSection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Student Details</Text>

            {/* Student Full Name - allows uppercase & titlecase typing */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>FULL NAME *</Text>
              <TextInput
                style={[
                  styles.textInput,
                  {
                    backgroundColor: colors.inputBg,
                    borderColor: colors.inputBorder,
                    color: colors.text,
                  },
                ]}
                placeholder="Enter full name"
                placeholderTextColor={colors.textMuted}
                value={studentName}
                onChangeText={setStudentName}
                autoCorrect={false}
              />
            </View>

            {/* Dropdown 1: Session (Dynamic from DB) */}
            <SelectDropdown
              label="SESSION / BATCH"
              value={sessionYear}
              options={batches.map((b) => ({ label: b, value: b }))}
              onSelect={setSessionYear}
            />

            {/* Dropdown 2: Department */}
            <SelectDropdown
              label="DEPARTMENT"
              value={selectedDeptCode}
              options={deptOptions}
              onSelect={setSelectedDeptCode}
              placeholder="Select department"
            />

            {/* Roll Number / Reg Suffix */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>ROLL / REG SUFFIX *</Text>
              <View
                style={[
                  styles.inputWithPrefix,
                  {
                    backgroundColor: colors.inputBg,
                    borderColor: colors.inputBorder,
                  },
                ]}
              >
                <Text style={[styles.prefixText, { color: colors.primary }]}>
                  {sessionYear}-{selectedDeptCode || 'DEPT'}-
                </Text>
                <TextInput
                  style={[styles.rollInput, { color: colors.text }]}
                  placeholder="e.g. 101"
                  placeholderTextColor={colors.textMuted}
                  value={rollNumber}
                  onChangeText={(t) => setRollNumber(t.toUpperCase())}
                  autoCapitalize="characters"
                />
              </View>
            </View>

            {/* Phone */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>CONTACT NUMBER</Text>
              <TextInput
                style={[
                  styles.textInput,
                  {
                    backgroundColor: colors.inputBg,
                    borderColor: colors.inputBorder,
                    color: colors.text,
                  },
                ]}
                placeholder="0300-1234567"
                placeholderTextColor={colors.textMuted}
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
              />
            </View>
          </View>

          {/* Sport & Format Section */}
          <View style={[styles.cardSection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Sport & Event Selection</Text>

            {/* Dropdown 3: Sport */}
            <SelectDropdown
              label="SPORT / EVENT"
              value={selectedSportId}
              options={sportOptions}
              onSelect={handleSelectSportId}
              placeholder="Choose sport"
            />

            {/* Dropdown 4: Category / Format */}
            <SelectDropdown
              label="CATEGORY / FORMAT"
              value={selectedFormat}
              options={formatOptions}
              onSelect={setSelectedFormat}
              placeholder="Select format"
            />

            {/* Optional Partner details if Doubles/Team */}
            {isTeamOrDoubles && (
              <View style={[styles.partnerBox, { backgroundColor: colors.surfaceHighlight, borderColor: colors.borderLight }]}>
                <Text style={[styles.partnerBoxTitle, { color: colors.primary }]}>TEAMMATE / PARTNER</Text>
                <View style={styles.fieldGroup}>
                  <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>PARTNER NAME</Text>
                  <TextInput
                    style={[
                      styles.textInput,
                      {
                        backgroundColor: colors.inputBg,
                        borderColor: colors.inputBorder,
                        color: colors.text,
                      },
                    ]}
                    placeholder="Enter partner full name"
                    placeholderTextColor={colors.textMuted}
                    value={partnerName}
                    onChangeText={setPartnerName}
                  />
                </View>
                <View style={styles.fieldGroup}>
                  <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>PARTNER REG NO</Text>
                  <TextInput
                    style={[
                      styles.textInput,
                      {
                        backgroundColor: colors.inputBg,
                        borderColor: colors.inputBorder,
                        color: colors.text,
                      },
                    ]}
                    placeholder="2023-CS-102"
                    placeholderTextColor={colors.textMuted}
                    value={partnerRegNo}
                    onChangeText={(t) => setPartnerRegNo(t.toUpperCase())}
                    autoCapitalize="characters"
                  />
                </View>
              </View>
            )}
          </View>

          {/* Payment Section */}
          <View style={[styles.cardSection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Payment & Fee Status</Text>

            {/* Dropdown 5: Payment Status */}
            <SelectDropdown
              label="PAYMENT STATUS"
              value={paymentStatus}
              options={PAYMENT_OPTIONS}
              onSelect={handlePaymentStatusChange}
            />

            <View style={styles.multiColRow}>
              <View style={[styles.fieldGroup, { flex: 1 }]}>
                <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>TOTAL FEE (PKR)</Text>
                <TextInput
                  style={[
                    styles.textInput,
                    {
                      backgroundColor: colors.inputBg,
                      borderColor: colors.inputBorder,
                      color: colors.text,
                    },
                  ]}
                  value={totalFee}
                  onChangeText={setTotalFee}
                  keyboardType="numeric"
                />
              </View>
              <View style={[styles.fieldGroup, { flex: 1 }]}>
                <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>AMOUNT PAID (PKR)</Text>
                <TextInput
                  style={[
                    styles.textInput,
                    {
                      backgroundColor: colors.inputBg,
                      borderColor: colors.inputBorder,
                      color: colors.text,
                    },
                  ]}
                  value={paidAmount}
                  onChangeText={setPaidAmount}
                  keyboardType="numeric"
                />
              </View>
            </View>
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
            onPress={handleSubmit}
            disabled={submitting}
            activeOpacity={0.8}
          >
            {submitting ? (
              <ActivityIndicator color="#ffffff" size="small" />
            ) : (
              <>
                <Ionicons name="ticket-outline" size={19} color="#ffffff" />
                <Text style={styles.submitBtnText}>Register & Generate Pass</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Ticket Modal */}
      <TicketModal
        visible={ticketModalVisible}
        registration={createdRecord}
        onClose={() => setTicketModalVisible(false)}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollBody: {
    padding: 16,
    paddingBottom: 40,
  },
  formContainer: {
    maxWidth: 600,
    width: '100%',
    alignSelf: 'center',
    gap: 14,
  },
  regIdBanner: {
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
  },
  regIdLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  regIdValue: {
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 1,
    marginTop: 2,
  },
  cardSection: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    gap: 12,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  fieldGroup: {
    gap: 5,
  },
  fieldLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  textInput: {
    height: 46,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 14,
  },
  multiColRow: {
    flexDirection: 'row',
    gap: 10,
  },
  inputWithPrefix: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    paddingLeft: 12,
    overflow: 'hidden',
  },
  prefixText: {
    fontSize: 14,
    fontWeight: '800',
  },
  rollInput: {
    flex: 1,
    height: 46,
    paddingHorizontal: 6,
    fontSize: 14,
    fontWeight: '700',
  },
  partnerBox: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    gap: 8,
  },
  partnerBoxTitle: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  submitBtn: {
    backgroundColor: '#0284c7',
    height: 50,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 6,
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
  },
});
