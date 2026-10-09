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
import { Registration } from '@/types';
import { PaymentBadge } from '@/components/PaymentBadge';
import { downloadPassDirectly, shareTicketPDF } from '@/services/ticketService';
import { useAppTheme } from '@/context/ThemeContext';
import { useAlert } from '@/context/AlertContext';

interface Props {
  visible: boolean;
  registration: Registration | null;
  onClose: () => void;
}

export const TicketModal: React.FC<Props> = ({ visible, registration, onClose }) => {
  const { colors, isDark } = useAppTheme();
  const { showError, showSuccess } = useAlert();
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
          <View style={[styles.footer, { borderTopColor: colors.borderLight }]}>
            <TouchableOpacity
              style={styles.pdfBtn}
              onPress={handleDirectDownload}
              disabled={downloading}
            >
              {downloading ? (
                <ActivityIndicator color="#ffffff" size="small" />
              ) : (
                <>
                  <Ionicons name="download-outline" size={18} color="#ffffff" />
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
                  <Ionicons name="share-social-outline" size={17} color={colors.primary} />
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
    padding: 16,
  },
  cardContainer: {
    borderRadius: 20,
    width: '100%',
    maxWidth: 440,
    maxHeight: '90%',
    overflow: 'hidden',
    borderWidth: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  subTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: '#0284c7',
    letterSpacing: 1.5,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollBody: {
    padding: 16,
  },
  ticket: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
  },
  ticketTop: {
    backgroundColor: '#0f172a',
    padding: 18,
    alignItems: 'center',
  },
  regNoText: {
    fontSize: 24,
    fontWeight: '900',
    color: '#38bdf8',
    letterSpacing: 1,
  },
  nameText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#ffffff',
    marginTop: 4,
  },
  badgeWrapper: {
    marginTop: 10,
  },
  ticketDetails: {
    padding: 14,
    gap: 10,
  },
  detailRow: {
    flexDirection: 'row',
    gap: 10,
  },
  detailCol: {
    flex: 1,
    padding: 10,
    borderRadius: 8,
  },
  detailLabel: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  detailValue: {
    fontSize: 13,
    fontWeight: '800',
    marginTop: 2,
  },
  partnerBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: 8,
  },
  partnerText: {
    fontSize: 12,
  },
  qrContainer: {
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    marginTop: 4,
    borderWidth: 1,
  },
  qrInnerWhite: {
    backgroundColor: '#ffffff',
    padding: 8,
    borderRadius: 8,
  },
  qrCodeToken: {
    fontFamily: 'monospace',
    fontSize: 10,
    marginTop: 8,
    textAlign: 'center',
  },
  footer: {
    padding: 14,
    borderTopWidth: 1,
    flexDirection: 'row',
    gap: 10,
  },
  pdfBtn: {
    flex: 1.5,
    backgroundColor: '#0284c7',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 10,
  },
  pdfBtnText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 13,
  },
  shareBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  shareBtnText: {
    fontWeight: '700',
    fontSize: 13,
  },
});
