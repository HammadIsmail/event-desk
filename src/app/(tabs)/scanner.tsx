// src/app/(tabs)/scanner.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Platform,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions, Camera } from 'expo-camera';
import { HeaderBar } from '@/components/HeaderBar';
import { PaymentBadge } from '@/components/PaymentBadge';
import { useAuth } from '@/context/AuthContext';
import { useAppTheme } from '@/context/ThemeContext';
import { useAlert } from '@/context/AlertContext';
import { dataStore } from '@/services/dataStore';
import { Registration } from '@/types';
import { responsiveFontSize, moderateScale, metrics } from '@/theme/responsive';

export default function ScannerScreen() {
  const { user, can } = useAuth();
  const { colors, isDark } = useAppTheme();
  const { showSuccess, showError } = useAlert();
  const [permission, requestPermission] = useCameraPermissions();

  const [scannedRecord, setScannedRecord] = useState<Registration | null>(null);
  const [alreadyCheckedIn, setAlreadyCheckedIn] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [manualCode, setManualCode] = useState('');
  const [isScanning, setIsScanning] = useState(true);

  useEffect(() => {
    async function checkPerm() {
      if (Platform.OS !== 'web') {
        const status = await Camera.getCameraPermissionsAsync();
        if (!status.granted && status.canAskAgain) {
          await requestPermission();
        }
      }
    }
    checkPerm();
  }, []);

  const processScanResult = async (tokenOrReg: string) => {
    if (!tokenOrReg || loading) return;
    const cleanQuery = tokenOrReg.trim();
    if (!cleanQuery) return;

    try {
      setLoading(true);
      setErrorMsg('');

      let record = await dataStore.getRegistrationByToken(cleanQuery);
      if (!record) {
        record = await dataStore.getRegistrationByRegNo(cleanQuery.toUpperCase());
      }

      if (!record) {
        setErrorMsg('Invalid ticket: QR code not recognized in system.');
        setScannedRecord(null);
        return;
      }

      setScannedRecord(record);
      setAlreadyCheckedIn(record.checked_in);
    } catch (err: any) {
      setErrorMsg(err.message || 'Verification error');
    } finally {
      setLoading(false);
    }
  };

  const handleBarcodeScanned = ({ data }: { data: string }) => {
    if (scannedRecord || loading || !isScanning) return;
    setIsScanning(false);
    processScanResult(data);
  };

  const handleCheckIn = async () => {
    if (!scannedRecord || !user) return;
    try {
      setLoading(true);
      const res = await dataStore.checkInTicket(scannedRecord.qr_token, user);
      setScannedRecord(res.registration);
      setAlreadyCheckedIn(res.alreadyCheckedIn);
      showSuccess(
        'Check-In Recorded',
        `${res.registration.student_name} (${res.registration.reg_no}) verified at venue.`
      );
    } catch (err: any) {
      showError('Check-In Error', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResetScanner = () => {
    setScannedRecord(null);
    setErrorMsg('');
    setManualCode('');
    setIsScanning(true);
  };

  if (!can('can_scan')) {
    return (
      <View style={[styles.screen, { backgroundColor: colors.background }]}>
        <HeaderBar title="Scanner" subtitle="Access Restricted" />
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 30, gap: 12 }}>
          <Ionicons name="lock-closed-outline" size={50} color={colors.warning} />
          <Text style={{ fontSize: 18, fontWeight: '800', color: colors.text }}>Scanner Restricted</Text>
          <Text style={{ fontSize: 13, color: colors.textMuted, textAlign: 'center', lineHeight: 18 }}>
            Your account does not have permission to use the venue ticket scanner. Please contact the Super Administrator.
          </Text>
        </View>
      </View>
    );
  }

  const hasPermission = Platform.OS !== 'web' && permission?.granted;

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <HeaderBar title="Scanner" subtitle="QR Verification & Gate Check-in" />

      <ScrollView
        contentContainerStyle={styles.scrollBody}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {scannedRecord ? (
          <View style={styles.resultContainer}>
            <View
              style={[
                styles.resultBanner,
                alreadyCheckedIn ? styles.bannerAmber : styles.bannerGreen,
              ]}
            >
              <Ionicons
                name={alreadyCheckedIn ? 'alert-circle' : 'checkmark-circle'}
                size={moderateScale(22)}
                color={alreadyCheckedIn ? '#d97706' : '#059669'}
              />
              <View style={{ flex: 1 }}>
                <Text
                  style={[
                    styles.bannerTitle,
                    { color: alreadyCheckedIn ? '#92400e' : '#065f46' },
                  ]}
                >
                  {alreadyCheckedIn ? 'ALREADY CHECKED-IN' : 'VERIFIED PASS'}
                </Text>
                <Text style={styles.bannerSubtitle}>
                  {alreadyCheckedIn
                    ? `Checked in by ${scannedRecord.checked_in_by || 'Officer'}`
                    : 'System verification valid'}
                </Text>
              </View>
            </View>

            <View style={[styles.infoCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.infoRow}>
                <View>
                  <Text style={[styles.infoRegNo, { color: colors.primary }]}>{scannedRecord.reg_no}</Text>
                  <Text style={[styles.infoName, { color: colors.text }]}>{scannedRecord.student_name}</Text>
                </View>
                <PaymentBadge status={scannedRecord.payment_status} size="md" />
              </View>

              <View style={styles.infoGrid}>
                <View style={[styles.infoItem, { backgroundColor: colors.surfaceHighlight }]}>
                  <Text style={[styles.infoLabel, { color: colors.textMuted }]}>SPORT</Text>
                  <Text style={[styles.infoValue, { color: colors.text }]}>{scannedRecord.sport_name}</Text>
                </View>
                <View style={[styles.infoItem, { backgroundColor: colors.surfaceHighlight }]}>
                  <Text style={[styles.infoLabel, { color: colors.textMuted }]}>FORMAT</Text>
                  <Text style={[styles.infoValue, { color: colors.text }]}>{scannedRecord.category_format}</Text>
                </View>
                <View style={[styles.infoItem, { backgroundColor: colors.surfaceHighlight }]}>
                  <Text style={[styles.infoLabel, { color: colors.textMuted }]}>DEPARTMENT</Text>
                  <Text style={[styles.infoValue, { color: colors.text }]}>{scannedRecord.department_code}</Text>
                </View>
                <View style={[styles.infoItem, { backgroundColor: colors.surfaceHighlight }]}>
                  <Text style={[styles.infoLabel, { color: colors.textMuted }]}>SESSION</Text>
                  <Text style={[styles.infoValue, { color: colors.text }]}>{scannedRecord.session_year}</Text>
                </View>
              </View>

              {scannedRecord.partner_name && (
                <View style={[styles.partnerCallout, { backgroundColor: isDark ? 'rgba(56, 189, 248, 0.15)' : '#e0f2fe' }]}>
                  <Text style={[styles.partnerCalloutText, { color: isDark ? '#38bdf8' : '#0369a1' }]}>
                    Partner: <Text style={{ fontWeight: '800' }}>{scannedRecord.partner_name}</Text>
                    {scannedRecord.partner_reg_no ? ` (${scannedRecord.partner_reg_no})` : ''}
                  </Text>
                </View>
              )}

              <View style={[styles.feeInfoRow, { borderTopColor: colors.borderLight }]}>
                <Text style={[styles.feeInfoText, { color: colors.textSecondary }]}>
                  Fee: PKR {scannedRecord.total_fee} | Paid: PKR {scannedRecord.paid_amount}
                </Text>
              </View>
            </View>

            {!scannedRecord.checked_in && (
              <TouchableOpacity
                style={styles.checkInBtn}
                onPress={handleCheckIn}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#ffffff" size="small" />
                ) : (
                  <>
                    <Ionicons name="enter-outline" size={moderateScale(18)} color="#ffffff" />
                    <Text style={styles.checkInBtnText}>Confirm Check-In</Text>
                  </>
                )}
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[styles.scanAnotherBtn, { backgroundColor: colors.surfaceHighlight }]}
              onPress={handleResetScanner}
            >
              <Ionicons name="scan-outline" size={moderateScale(17)} color={colors.primary} />
              <Text style={[styles.scanAnotherBtnText, { color: colors.primary }]}>Scan Another</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.scannerWrapper}>
            {hasPermission ? (
              <View style={styles.cameraFrame}>
                <CameraView
                  style={styles.cameraView}
                  facing="back"
                  barcodeScannerSettings={{
                    barcodeTypes: ['qr'],
                  }}
                  onBarcodeScanned={isScanning ? handleBarcodeScanned : undefined}
                />
                <View style={styles.scannerOverlay} pointerEvents="none">
                  <View style={styles.scanReticle} />
                  <Text style={styles.scanHintText}>Align QR code inside box</Text>
                </View>
              </View>
            ) : (
              <View style={[styles.cameraPlaceholder, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Ionicons name="camera-outline" size={moderateScale(54)} color={colors.primary} />
                <Text style={[styles.cameraPlaceholderTitle, { color: colors.text }]}>
                  Camera Permission Required
                </Text>
                <Text style={[styles.cameraPlaceholderSub, { color: colors.textMuted }]}>
                  Please allow camera access to scan ticket QR codes directly.
                </Text>

                <TouchableOpacity style={styles.permBtn} onPress={requestPermission}>
                  <Text style={styles.permBtnText}>Allow Camera Access</Text>
                </TouchableOpacity>
              </View>
            )}

            {errorMsg ? (
              <View style={styles.errorBanner}>
                <Ionicons name="alert-circle" size={moderateScale(18)} color="#dc2626" />
                <Text style={styles.errorText}>{errorMsg}</Text>
              </View>
            ) : null}

            {/* Manual Entry Fallback */}
            <View style={[styles.manualEntryCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.manualEntryTitle, { color: colors.textSecondary }]}>
                OR VERIFY BY REGISTRATION NUMBER
              </Text>
              <View style={styles.manualInputRow}>
                <TextInput
                  style={[
                    styles.manualInput,
                    {
                      backgroundColor: colors.inputBg,
                      borderColor: colors.inputBorder,
                      color: colors.text,
                    },
                  ]}
                  placeholder="e.g. 2024-BBA-300"
                  placeholderTextColor={colors.textMuted}
                  value={manualCode}
                  onChangeText={(t) => setManualCode(t.toUpperCase())}
                  autoCapitalize="characters"
                />
                <TouchableOpacity
                  style={styles.verifyBtn}
                  onPress={() => processScanResult(manualCode)}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color="#ffffff" size="small" />
                  ) : (
                    <Text style={styles.verifyBtnText}>Verify</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  scrollBody: {
    padding: metrics.spacing.md,
    paddingBottom: moderateScale(40),
  },
  scannerWrapper: {
    gap: moderateScale(14),
    maxWidth: 480,
    width: '100%',
    alignSelf: 'center',
  },
  cameraFrame: {
    height: moderateScale(320),
    maxHeight: 360,
    width: '100%',
    position: 'relative',
    backgroundColor: '#000000',
    borderWidth: 2,
    borderColor: '#0284c7',
    borderRadius: metrics.radius.lg,
    overflow: 'hidden',
  },
  cameraView: {
    ...StyleSheet.absoluteFill,
  },
  scannerOverlay: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  scanReticle: {
    width: moderateScale(210),
    height: moderateScale(210),
    borderWidth: 2.5,
    borderColor: '#38bdf8',
    borderRadius: metrics.radius.md,
  },
  scanHintText: {
    color: '#ffffff',
    fontSize: responsiveFontSize(12),
    fontWeight: '700',
    marginTop: moderateScale(14),
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: metrics.spacing.md,
    paddingVertical: moderateScale(5),
    borderRadius: metrics.radius.sm,
  },
  cameraPlaceholder: {
    borderRadius: metrics.radius.lg,
    padding: metrics.spacing.xl,
    alignItems: 'center',
    borderWidth: 1,
    gap: moderateScale(10),
  },
  cameraPlaceholderTitle: {
    fontSize: responsiveFontSize(16),
    fontWeight: '800',
  },
  cameraPlaceholderSub: {
    fontSize: responsiveFontSize(12),
    textAlign: 'center',
    lineHeight: 18,
  },
  permBtn: {
    backgroundColor: '#0284c7',
    paddingHorizontal: metrics.spacing.lg,
    paddingVertical: moderateScale(10),
    borderRadius: metrics.radius.sm,
    marginTop: moderateScale(6),
    minHeight: metrics.minTouchTarget,
    justifyContent: 'center',
  },
  permBtnText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: responsiveFontSize(13),
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: moderateScale(8),
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    padding: metrics.spacing.md,
    borderRadius: metrics.radius.md,
  },
  errorText: {
    color: '#dc2626',
    fontSize: responsiveFontSize(12),
    fontWeight: '600',
    flex: 1,
  },
  manualEntryCard: {
    borderRadius: metrics.radius.lg,
    padding: metrics.spacing.md,
    borderWidth: 1,
    gap: moderateScale(8),
  },
  manualEntryTitle: {
    fontSize: responsiveFontSize(10),
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  manualInputRow: {
    flexDirection: 'row',
    gap: moderateScale(8),
  },
  manualInput: {
    flex: 1,
    minHeight: metrics.minTouchTarget,
    height: moderateScale(46),
    borderWidth: 1,
    borderRadius: metrics.radius.sm,
    paddingHorizontal: metrics.spacing.md,
    fontSize: responsiveFontSize(13),
    fontWeight: '700',
  },
  verifyBtn: {
    backgroundColor: '#0284c7',
    paddingHorizontal: metrics.spacing.lg,
    borderRadius: metrics.radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: metrics.minTouchTarget,
  },
  verifyBtnText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: responsiveFontSize(13),
  },
  resultContainer: {
    maxWidth: 480,
    width: '100%',
    alignSelf: 'center',
    gap: moderateScale(14),
  },
  resultBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: moderateScale(10),
    padding: metrics.spacing.md,
    borderRadius: metrics.radius.lg,
  },
  bannerGreen: {
    backgroundColor: '#ecfdf5',
    borderWidth: 1,
    borderColor: '#a7f3d0',
  },
  bannerAmber: {
    backgroundColor: '#fffbeb',
    borderWidth: 1,
    borderColor: '#fde68a',
  },
  bannerTitle: {
    fontSize: responsiveFontSize(13),
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  bannerSubtitle: {
    fontSize: responsiveFontSize(11),
    color: '#64748b',
    marginTop: moderateScale(2),
  },
  infoCard: {
    borderRadius: metrics.radius.lg,
    padding: metrics.spacing.md,
    borderWidth: 1,
    gap: moderateScale(12),
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  infoRegNo: {
    fontSize: responsiveFontSize(18),
    fontWeight: '900',
  },
  infoName: {
    fontSize: responsiveFontSize(14),
    fontWeight: '700',
    marginTop: moderateScale(2),
  },
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: moderateScale(8),
  },
  infoItem: {
    width: '48%',
    padding: moderateScale(9),
    borderRadius: metrics.radius.sm,
  },
  infoLabel: {
    fontSize: responsiveFontSize(9),
    fontWeight: '700',
  },
  infoValue: {
    fontSize: responsiveFontSize(12),
    fontWeight: '800',
    marginTop: moderateScale(2),
  },
  partnerCallout: {
    padding: moderateScale(9),
    borderRadius: metrics.radius.sm,
  },
  partnerCalloutText: {
    fontSize: responsiveFontSize(11),
  },
  feeInfoRow: {
    borderTopWidth: 1,
    paddingTop: moderateScale(8),
  },
  feeInfoText: {
    fontSize: responsiveFontSize(11),
    fontWeight: '600',
  },
  checkInBtn: {
    backgroundColor: '#059669',
    minHeight: metrics.minTouchTarget,
    height: moderateScale(48),
    borderRadius: metrics.radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: moderateScale(8),
  },
  checkInBtnText: {
    color: '#ffffff',
    fontSize: responsiveFontSize(14),
    fontWeight: '800',
  },
  scanAnotherBtn: {
    minHeight: metrics.minTouchTarget,
    height: moderateScale(46),
    borderRadius: metrics.radius.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: moderateScale(6),
  },
  scanAnotherBtnText: {
    fontSize: responsiveFontSize(13),
    fontWeight: '700',
  },
});
