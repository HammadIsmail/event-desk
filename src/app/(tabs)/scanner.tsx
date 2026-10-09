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

      <View style={styles.content}>
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
                size={22}
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
                    <Ionicons name="enter-outline" size={18} color="#ffffff" />
                    <Text style={styles.checkInBtnText}>Confirm Check-In</Text>
                  </>
                )}
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[styles.scanAnotherBtn, { backgroundColor: colors.surfaceHighlight }]}
              onPress={handleResetScanner}
            >
              <Ionicons name="scan-outline" size={17} color={colors.primary} />
              <Text style={[styles.scanAnotherBtnText, { color: colors.primary }]}>Scan Another</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.scannerWrapper}>
            {/* Live Camera View without overflow:hidden or black clipping */}
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
                <Ionicons name="camera-outline" size={54} color={colors.primary} />
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
                <Ionicons name="alert-circle" size={18} color="#dc2626" />
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
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  scannerWrapper: {
    flex: 1,
    gap: 14,
    maxWidth: 480,
    width: '100%',
    alignSelf: 'center',
  },
  cameraFrame: {
    height: 360,
    width: '100%',
    position: 'relative',
    backgroundColor: '#000000',
    borderWidth: 2,
    borderColor: '#0284c7',
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
    width: 220,
    height: 220,
    borderWidth: 2.5,
    borderColor: '#38bdf8',
    borderRadius: 12,
  },
  scanHintText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 14,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 8,
  },
  cameraPlaceholder: {
    borderRadius: 18,
    padding: 28,
    alignItems: 'center',
    borderWidth: 1,
    gap: 10,
  },
  cameraPlaceholderTitle: {
    fontSize: 17,
    fontWeight: '800',
  },
  cameraPlaceholderSub: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
  permBtn: {
    backgroundColor: '#0284c7',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 6,
  },
  permBtnText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 13,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    padding: 12,
    borderRadius: 10,
  },
  errorText: {
    color: '#dc2626',
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  manualEntryCard: {
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    gap: 8,
  },
  manualEntryTitle: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  manualInputRow: {
    flexDirection: 'row',
    gap: 8,
  },
  manualInput: {
    flex: 1,
    height: 44,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 13,
    fontWeight: '700',
  },
  verifyBtn: {
    backgroundColor: '#0284c7',
    paddingHorizontal: 18,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  verifyBtnText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 13,
  },
  resultContainer: {
    maxWidth: 480,
    width: '100%',
    alignSelf: 'center',
    gap: 14,
  },
  resultBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
    borderRadius: 14,
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
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  bannerSubtitle: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  infoCard: {
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    gap: 12,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  infoRegNo: {
    fontSize: 20,
    fontWeight: '900',
  },
  infoName: {
    fontSize: 15,
    fontWeight: '700',
    marginTop: 2,
  },
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  infoItem: {
    width: '48%',
    padding: 9,
    borderRadius: 8,
  },
  infoLabel: {
    fontSize: 9,
    fontWeight: '700',
  },
  infoValue: {
    fontSize: 13,
    fontWeight: '800',
    marginTop: 2,
  },
  partnerCallout: {
    padding: 9,
    borderRadius: 8,
  },
  partnerCalloutText: {
    fontSize: 12,
  },
  feeInfoRow: {
    borderTopWidth: 1,
    paddingTop: 8,
  },
  feeInfoText: {
    fontSize: 12,
    fontWeight: '600',
  },
  checkInBtn: {
    backgroundColor: '#059669',
    height: 48,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  checkInBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },
  scanAnotherBtn: {
    height: 44,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  scanAnotherBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
});
