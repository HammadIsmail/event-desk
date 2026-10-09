import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Registration } from '@/types';
import { PaymentBadge } from '@/components/PaymentBadge';
import { downloadPassDirectly, shareTicketPDF } from '@/services/ticketService';
import { useAppTheme } from '@/context/ThemeContext';
import { useAlert } from '@/context/AlertContext';
import { responsiveFontSize, moderateScale, metrics } from '@/theme/responsive';

interface Props {
  visible: boolean;
  registration: Registration | null;
  onClose: () => void;
}

export const TicketModal: React.FC<Props> = ({ visible, registration, onClose }) => {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useAppTheme();
  const { showError } = useAlert();
  const [downloading, setDownloading] = useState(false);
  const [sharing, setSharing] = useState(false);

  if (!registration) return null;

  const balance = Math.max(0, (registration.total_fee || 0) - (registration.paid_amount || 0));

  const handleDirectDownload = async () => {
    try {
      setDownloading(true);
      await downloadPassDirectly(registration);
    } catch (err: any) {
      showError('Download Error', err.message || 'Failed to save pass');
    } finally {
      setDownloading(false);
    }
  };

  const handleShare = async () => {
    try {
      setSharing(true);
      await shareTicketPDF(registration);
    } catch (err: any) {
      showError('Share Error', err.message || 'Failed to share pass');
    } finally {
      setSharing(false);
    }
  };

  const footerBottomPadding = Math.max(insets.bottom, metrics.spacing.md);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.cardContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: colors.borderLight }]}>
            <View>
              <Text style={styles.subTitle}>OFFICIAL ENTRY PASS</Text>
              <Text style={[styles.title, { color: colors.text }]}>Event-Desk Ticket</Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={[styles.closeBtn, { backgroundColor: colors.surfaceHighlight }]}
            >
              <Ionicons name="close" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.scrollBody} showsVerticalScrollIndicator={false}>
            {/* Ticket Card */}
            <View style={[styles.ticket, { borderColor: colors.border, backgroundColor: colors.surface }]}>
              <View style={styles.ticketTop}>
                <Text style={styles.regNoText}>{registration.reg_no}</Text>
                <Text style={styles.nameText}>{registration.student_name}</Text>
                <View style={styles.badgeWrapper}>
                  <PaymentBadge status={registration.payment_status} size="lg" />
                </View>
              </View>

              <View style={styles.ticketDetails}>
                <View style={styles.detailRow}>
                  <View style={[styles.detailCol, { backgroundColor: colors.surfaceHighlight }]}>
                    <Text style={[styles.detailLabel, { color: colors.textMuted }]}>SPORT / EVENT</Text>
                    <Text style={[styles.detailValue, { color: colors.text }]}>{registration.sport_name}</Text>
                  </View>
                  <View style={[styles.detailCol, { backgroundColor: colors.surfaceHighlight }]}>
                    <Text style={[styles.detailLabel, { color: colors.textMuted }]}>FORMAT</Text>
                    <Text style={[styles.detailValue, { color: colors.text }]}>{registration.category_format}</Text>
                  </View>
                </View>

                <View style={styles.detailRow}>
                  <View style={[styles.detailCol, { backgroundColor: colors.surfaceHighlight }]}>
                    <Text style={[styles.detailLabel, { color: colors.textMuted }]}>DEPARTMENT</Text>
                    <Text style={[styles.detailValue, { color: colors.text }]}>{registration.department_code}</Text>
                  </View>
                  <View style={[styles.detailCol, { backgroundColor: colors.surfaceHighlight }]}>
                    <Text style={[styles.detailLabel, { color: colors.textMuted }]}>SESSION</Text>
                    <Text style={[styles.detailValue, { color: colors.text }]}>{registration.session_year}</Text>
                  </View>
                </View>

                {registration.partner_name && (
                  <View style={[styles.partnerBanner, { backgroundColor: isDark ? 'rgba(56, 189, 248, 0.15)' : '#e0f2fe' }]}>
                    <Ionicons name="people-outline" size={16} color="#0284c7" />
                    <Text style={[styles.partnerText, { color: isDark ? '#38bdf8' : '#0369a1' }]}>
                      Teammate: <Text style={{ fontWeight: '800' }}>{registration.partner_name}</Text>
                      {registration.partner_reg_no ? ` (${registration.partner_reg_no})` : ''}
                    </Text>
                  </View>
                )}

                <View style={styles.detailRow}>
                  <View style={[styles.detailCol, { backgroundColor: colors.surfaceHighlight }]}>
                    <Text style={[styles.detailLabel, { color: colors.textMuted }]}>AMOUNT PAID</Text>
                    <Text style={[styles.detailValue, { color: colors.text }]}>PKR {registration.paid_amount}</Text>
                  </View>
                  <View style={[styles.detailCol, { backgroundColor: colors.surfaceHighlight }]}>
                    <Text style={[styles.detailLabel, { color: colors.textMuted }]}>BALANCE</Text>
                    <Text
                      style={[
                        styles.detailValue,
                        { color: balance > 0 ? '#dc2626' : '#16a34a' },
                      ]}
                    >
                      PKR {balance}
                    </Text>
                  </View>
                </View>

                {/* QR Code */}
                <View style={[styles.qrContainer, { backgroundColor: isDark ? '#0f1726' : '#f8fafc', borderColor: colors.border }]}>
                  <View style={styles.qrInnerWhite}>
                    <QRCode
                      value={registration.qr_token}
                      size={140}
                      color="#0f172a"
                      backgroundColor="#ffffff"
                    />
                  </View>
                  <Text style={[styles.qrCodeToken, { color: colors.textMuted }]}>{registration.qr_token}</Text>
                </View>
              </View>
            </View>
          </ScrollView>

          {/* Action buttons */}
          <View
            style={[
              styles.footer,
              {
                borderTopColor: colors.borderLight,
                paddingBottom: footerBottomPadding,
              },
            ]}
          >
            <TouchableOpacity
              style={styles.pdfBtn}
              onPress={handleDirectDownload}
              disabled={downloading}
            >
              {downloading ? (
                <ActivityIndicator color="#ffffff" size="small" />
              ) : (
                <>
                  <Ionicons name="download-outline" size={moderateScale(18)} color="#ffffff" />
                  <Text style={styles.pdfBtnText}>Save Pass to Phone</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.shareBtn, { backgroundColor: colors.surfaceHighlight, borderColor: colors.border }]}
              onPress={handleShare}
              disabled={sharing}
            >
              {sharing ? (
                <ActivityIndicator color={colors.primary} size="small" />
              ) : (
                <>
                  <Ionicons name="share-social-outline" size={moderateScale(17)} color={colors.primary} />
                  <Text style={[styles.shareBtnText, { color: colors.primary }]}>Share</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: metrics.spacing.md,
  },
  cardContainer: {
    borderRadius: metrics.radius.xl,
    width: '100%',
    maxWidth: 440,
    maxHeight: '92%',
    overflow: 'hidden',
    borderWidth: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: metrics.spacing.lg,
    paddingTop: moderateScale(16),
    paddingBottom: moderateScale(12),
    borderBottomWidth: 1,
  },
  subTitle: {
    fontSize: responsiveFontSize(10),
    fontWeight: '800',
    color: '#0284c7',
    letterSpacing: 1.5,
  },
  title: {
    fontSize: responsiveFontSize(18),
    fontWeight: '800',
  },
  closeBtn: {
    width: moderateScale(34),
    height: moderateScale(34),
    borderRadius: moderateScale(17),
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollBody: {
    padding: metrics.spacing.md,
  },
  ticket: {
    borderRadius: metrics.radius.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  ticketTop: {
    backgroundColor: '#0f172a',
    padding: metrics.spacing.lg,
    alignItems: 'center',
  },
  regNoText: {
    fontSize: responsiveFontSize(22),
    fontWeight: '900',
    color: '#38bdf8',
    letterSpacing: 1,
  },
  nameText: {
    fontSize: responsiveFontSize(16),
    fontWeight: '700',
    color: '#ffffff',
    marginTop: moderateScale(4),
  },
  badgeWrapper: {
    marginTop: moderateScale(10),
  },
  ticketDetails: {
    padding: metrics.spacing.md,
    gap: moderateScale(10),
  },
  detailRow: {
    flexDirection: 'row',
    gap: moderateScale(10),
  },
  detailCol: {
    flex: 1,
    padding: moderateScale(10),
    borderRadius: metrics.radius.sm,
  },
  detailLabel: {
    fontSize: responsiveFontSize(9),
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  detailValue: {
    fontSize: responsiveFontSize(12),
    fontWeight: '800',
    marginTop: moderateScale(2),
  },
  partnerBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: moderateScale(8),
    padding: moderateScale(10),
    borderRadius: metrics.radius.sm,
  },
  partnerText: {
    fontSize: responsiveFontSize(11),
  },
  qrContainer: {
    borderRadius: metrics.radius.md,
    padding: metrics.spacing.md,
    alignItems: 'center',
    marginTop: moderateScale(4),
    borderWidth: 1,
  },
  qrInnerWhite: {
    backgroundColor: '#ffffff',
    padding: moderateScale(8),
    borderRadius: metrics.radius.sm,
  },
  qrCodeToken: {
    fontFamily: 'monospace',
    fontSize: responsiveFontSize(10),
    marginTop: moderateScale(8),
    textAlign: 'center',
  },
  footer: {
    paddingHorizontal: metrics.spacing.md,
    paddingTop: metrics.spacing.md,
    borderTopWidth: 1,
    flexDirection: 'row',
    gap: moderateScale(10),
  },
  pdfBtn: {
    flex: 1.5,
    backgroundColor: '#0284c7',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: moderateScale(6),
    minHeight: metrics.minTouchTarget,
    paddingVertical: moderateScale(12),
    borderRadius: metrics.radius.md,
  },
  pdfBtnText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: responsiveFontSize(13),
  },
  shareBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: moderateScale(6),
    minHeight: metrics.minTouchTarget,
    paddingVertical: moderateScale(12),
    borderRadius: metrics.radius.md,
    borderWidth: 1,
  },
  shareBtnText: {
    fontWeight: '700',
    fontSize: responsiveFontSize(13),
  },
});
