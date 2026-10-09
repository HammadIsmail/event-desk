// src/app/(tabs)/analytics.tsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { HeaderBar } from '@/components/HeaderBar';
import { useAuth } from '@/context/AuthContext';
import { useAppTheme } from '@/context/ThemeContext';
import { useAlert } from '@/context/AlertContext';
import { dataStore } from '@/services/dataStore';
import { shareOrDownloadCSV } from '@/services/ticketService';
import { AnalyticsSummary } from '@/types';
import { responsiveFontSize, moderateScale, metrics } from '@/theme/responsive';

export default function AnalyticsScreen() {
  const { can } = useAuth();
  const { colors, isDark } = useAppTheme();
  const { showError } = useAlert();
  const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [exportingSport, setExportingSport] = useState<string | null>(null);

  const fetchAnalytics = useCallback(async () => {
    try {
      setLoading(true);
      const data = await dataStore.getAnalytics();
      setAnalytics(data);
    } catch (err) {
      console.warn('Analytics fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchAnalytics();
    }, [fetchAnalytics])
  );

  const handleExportSport = async (sportName: string) => {
    try {
      setExportingSport(sportName);
      const { filename, csv } = await dataStore.generateCSVContent(sportName);
      await shareOrDownloadCSV(filename, csv);
    } catch (err: any) {
      showError('Export Error', err.message || 'Could not export CSV');
    } finally {
      setExportingSport(null);
    }
  };

  if (!can('can_view_analytics')) {
    return (
      <View style={[styles.screen, { backgroundColor: colors.background }]}>
        <HeaderBar title="Analytics" subtitle="Access Restricted" />
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 30, gap: 12 }}>
          <Ionicons name="lock-closed-outline" size={50} color={colors.warning} />
          <Text style={{ fontSize: 18, fontWeight: '800', color: colors.text }}>Analytics Restricted</Text>
          <Text style={{ fontSize: 13, color: colors.textMuted, textAlign: 'center', lineHeight: 18 }}>
            Your account does not have permission to view financial and event analytics. Please contact the Super Administrator.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <HeaderBar title="Analytics" subtitle="Registration & Financial Metrics" />

      {loading || !analytics ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollBody} showsVerticalScrollIndicator={false}>
          <View style={styles.containerMax}>
            {/* Top Stat Banner */}
            <View style={[styles.heroStatCard, { backgroundColor: isDark ? '#101726' : '#0f172a' }]}>
              <View>
                <Text style={styles.heroStatLabel}>TOTAL REGISTRATIONS</Text>
                <Text style={styles.heroStatValue}>{analytics.totalRegistrations}</Text>
              </View>
              <View style={styles.heroIconBox}>
                <Ionicons name="people" size={24} color="#ffffff" />
              </View>
            </View>

            {/* Financial Summary */}
            <View style={[styles.cardSection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Revenue (PKR)</Text>
              <View style={styles.statsGrid}>
                <View style={[styles.statBox, { backgroundColor: colors.surfaceHighlight }]}>
                  <Text style={[styles.statBoxLabel, { color: colors.textMuted }]}>COLLECTED</Text>
                  <Text style={[styles.statBoxValue, { color: colors.success }]}>
                    PKR {analytics.totalRevenueCollected.toLocaleString()}
                  </Text>
                </View>
                <View style={[styles.statBox, { backgroundColor: colors.surfaceHighlight }]}>
                  <Text style={[styles.statBoxLabel, { color: colors.textMuted }]}>DUE BALANCE</Text>
                  <Text style={[styles.statBoxValue, { color: colors.danger }]}>
                    PKR {analytics.pendingBalance.toLocaleString()}
                  </Text>
                </View>
                <View style={[styles.statBox, { backgroundColor: colors.surfaceHighlight }]}>
                  <Text style={[styles.statBoxLabel, { color: colors.textMuted }]}>EXPECTED</Text>
                  <Text style={[styles.statBoxValue, { color: colors.text }]}>
                    PKR {analytics.totalRevenueExpected.toLocaleString()}
                  </Text>
                </View>
              </View>
            </View>

            {/* Payment Status Distribution */}
            <View style={[styles.cardSection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Payment Breakdown</Text>
              <View style={styles.paymentDistGrid}>
                {/* PAID */}
                <View style={[styles.distCard, { backgroundColor: colors.successBg, borderColor: isDark ? '#065f46' : '#a7f3d0' }]}>
                  <View style={styles.distHeader}>
                    <Text style={[styles.distTitle, { color: colors.success }]}>PAID</Text>
                    <Ionicons name="checkmark-circle" size={16} color={colors.success} />
                  </View>
                  <Text style={[styles.distNumber, { color: colors.success }]}>{analytics.paidCount}</Text>
                  <Text style={[styles.distPercentage, { color: colors.textMuted }]}>
                    {analytics.totalRegistrations > 0
                      ? Math.round((analytics.paidCount / analytics.totalRegistrations) * 100)
                      : 0}
                    % of total
                  </Text>
                </View>

                {/* PARTIAL */}
                <View style={[styles.distCard, { backgroundColor: colors.warningBg, borderColor: isDark ? '#92400e' : '#fde68a' }]}>
                  <View style={styles.distHeader}>
                    <Text style={[styles.distTitle, { color: colors.warning }]}>PARTIAL</Text>
                    <Ionicons name="time" size={16} color={colors.warning} />
                  </View>
                  <Text style={[styles.distNumber, { color: colors.warning }]}>{analytics.partialCount}</Text>
                  <Text style={[styles.distPercentage, { color: colors.textMuted }]}>
                    {analytics.totalRegistrations > 0
                      ? Math.round((analytics.partialCount / analytics.totalRegistrations) * 100)
                      : 0}
                    % of total
                  </Text>
                </View>

                {/* FREE */}
                <View style={[styles.distCard, { backgroundColor: colors.purpleBg, borderColor: isDark ? '#5b21b6' : '#ddd6fe' }]}>
                  <View style={styles.distHeader}>
                    <Text style={[styles.distTitle, { color: colors.purple }]}>FREE PASS</Text>
                    <Ionicons name="gift" size={16} color={colors.purple} />
                  </View>
                  <Text style={[styles.distNumber, { color: colors.purple }]}>{analytics.freeCount}</Text>
                  <Text style={[styles.distPercentage, { color: colors.textMuted }]}>
                    {analytics.totalRegistrations > 0
                      ? Math.round((analytics.freeCount / analytics.totalRegistrations) * 100)
                      : 0}
                    % of total
                  </Text>
                </View>

                {/* UNPAID */}
                <View style={[styles.distCard, { backgroundColor: colors.dangerBg, borderColor: isDark ? '#991b1b' : '#fecaca' }]}>
                  <View style={styles.distHeader}>
                    <Text style={[styles.distTitle, { color: colors.danger }]}>UNPAID</Text>
                    <Ionicons name="close-circle" size={16} color={colors.danger} />
                  </View>
                  <Text style={[styles.distNumber, { color: colors.danger }]}>{analytics.unpaidCount}</Text>
                  <Text style={[styles.distPercentage, { color: colors.textMuted }]}>
                    {analytics.totalRegistrations > 0
                      ? Math.round((analytics.unpaidCount / analytics.totalRegistrations) * 100)
                      : 0}
                    % of total
                  </Text>
                </View>
              </View>
            </View>

            {/* Sport Wise Registrations with Export */}
            <View style={[styles.cardSection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Sport-Wise Registrations</Text>

              {analytics.bySport.length === 0 ? (
                <Text style={[styles.emptyNote, { color: colors.textMuted }]}>No registrations yet.</Text>
              ) : (
                <View style={styles.sportsList}>
                  {analytics.bySport.map((item) => (
                    <View key={item.sport} style={[styles.sportStatRow, { backgroundColor: colors.surfaceHighlight }]}>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.sportStatTitle, { color: colors.text }]}>{item.sport}</Text>
                        <Text style={[styles.sportStatSub, { color: colors.textMuted }]}>
                          {item.count} registered • PKR {item.revenue.toLocaleString()}
                        </Text>
                      </View>

                      {can('can_export_csv') && (
                        <TouchableOpacity
                          style={[styles.sportExportBtn, { backgroundColor: colors.primaryLight }]}
                          onPress={() => handleExportSport(item.sport)}
                          disabled={exportingSport === item.sport}
                        >
                          {exportingSport === item.sport ? (
                            <ActivityIndicator size="small" color={colors.primary} />
                          ) : (
                            <>
                              <Ionicons name="download-outline" size={14} color={colors.primary} />
                              <Text style={[styles.sportExportBtnText, { color: colors.primary }]}>CSV</Text>
                            </>
                          )}
                        </TouchableOpacity>
                      )}
                    </View>
                  ))}
                </View>
              )}
            </View>

            {/* Department Wise Breakdown */}
            <View style={[styles.cardSection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Department-Wise Participation</Text>
              {analytics.byDepartment.length === 0 ? (
                <Text style={[styles.emptyNote, { color: colors.textMuted }]}>No data yet.</Text>
              ) : (
                <View style={styles.deptGrid}>
                  {analytics.byDepartment.map((item) => (
                    <View key={item.department} style={[styles.deptBadge, { backgroundColor: colors.surfaceHighlight }]}>
                      <Text style={[styles.deptBadgeCode, { color: colors.primary }]}>{item.department}</Text>
                      <Text style={[styles.deptBadgeCount, { color: colors.textSecondary }]}>{item.count} students</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: metrics.spacing.xl,
  },
  scrollBody: {
    padding: metrics.spacing.md,
    paddingBottom: moderateScale(48),
  },
  containerMax: {
    maxWidth: 600,
    width: '100%',
    alignSelf: 'center',
    gap: moderateScale(14),
  },
  heroStatCard: {
    borderRadius: metrics.radius.xl,
    padding: metrics.spacing.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  heroStatLabel: {
    fontSize: responsiveFontSize(10),
    fontWeight: '800',
    color: '#38bdf8',
    letterSpacing: 1.2,
  },
  heroStatValue: {
    fontSize: responsiveFontSize(30),
    fontWeight: '900',
    color: '#ffffff',
    marginTop: moderateScale(2),
  },
  heroIconBox: {
    width: moderateScale(48),
    height: moderateScale(48),
    borderRadius: metrics.radius.md,
    backgroundColor: '#0284c7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardSection: {
    borderRadius: metrics.radius.xl,
    padding: metrics.spacing.md,
    borderWidth: 1,
    gap: moderateScale(12),
  },
  sectionTitle: {
    fontSize: responsiveFontSize(15),
    fontWeight: '800',
  },
  statsGrid: {
    flexDirection: 'row',
    gap: moderateScale(8),
  },
  statBox: {
    flex: 1,
    padding: moderateScale(10),
    borderRadius: metrics.radius.sm,
  },
  statBoxLabel: {
    fontSize: responsiveFontSize(9),
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  statBoxValue: {
    fontSize: responsiveFontSize(12),
    fontWeight: '900',
    marginTop: moderateScale(3),
  },
  paymentDistGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: moderateScale(8),
  },
  distCard: {
    width: '48%',
    padding: metrics.spacing.md,
    borderRadius: metrics.radius.md,
    borderWidth: 1,
  },
  distHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  distTitle: {
    fontSize: responsiveFontSize(11),
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  distNumber: {
    fontSize: responsiveFontSize(19),
    fontWeight: '900',
    marginTop: moderateScale(4),
  },
  distPercentage: {
    fontSize: responsiveFontSize(10),
    marginTop: moderateScale(2),
  },
  sportsList: {
    gap: moderateScale(8),
  },
  sportStatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: metrics.spacing.md,
    borderRadius: metrics.radius.sm,
  },
  sportStatTitle: {
    fontSize: responsiveFontSize(14),
    fontWeight: '800',
  },
  sportStatSub: {
    fontSize: responsiveFontSize(11),
    marginTop: moderateScale(2),
  },
  sportExportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: moderateScale(4),
    paddingHorizontal: metrics.spacing.md,
    paddingVertical: moderateScale(6),
    borderRadius: metrics.radius.xs,
    minHeight: metrics.minTouchTarget,
  },
  sportExportBtnText: {
    fontSize: responsiveFontSize(12),
    fontWeight: '700',
  },
  deptGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: moderateScale(8),
  },
  deptBadge: {
    paddingHorizontal: metrics.spacing.md,
    paddingVertical: moderateScale(8),
    borderRadius: metrics.radius.sm,
    alignItems: 'center',
    minWidth: moderateScale(68),
  },
  deptBadgeCode: {
    fontSize: responsiveFontSize(14),
    fontWeight: '900',
  },
  deptBadgeCount: {
    fontSize: responsiveFontSize(11),
    marginTop: moderateScale(2),
  },
  emptyNote: {
    fontSize: responsiveFontSize(13),
  },
});
