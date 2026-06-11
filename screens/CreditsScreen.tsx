import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { creditsApi } from '../services/api';
import { useTheme } from '../contexts/ThemeContext';
import { scale, verticalScale, moderateScale } from '../utils/responsive';

interface CreditPackage {
  credits?: number;
  price: number;
  label?: string;
}

interface StatusData {
  credits: number;
  isPremium: boolean;
  trialActive: boolean;
  trialRemainingMs?: number;
  premiumUntil?: string;
  premiumRemainingMs?: number;
  numbers?: string[];
}

interface Transaction {
  _id: string;
  type: string;
  amount: number;
  creditsBefore?: number;
  creditsAfter?: number;
  status: string;
  description?: string;
  paymentMethod?: string;
  createdAt: string;
}

interface PackageData {
  packages: CreditPackage[];
  premiumPrice: number;
}

const TX_LABELS: Record<string, string> = {
  credit_purchase: 'Credit Purchase',
  premium_purchase: 'Premium Subscription',
  call_deduction: 'Call Usage',
  message_deduction: 'Message Usage',
  translation_deduction: 'Translation',
  ad_reward: 'Ad Reward',
  stripe: 'Stripe Payment',
  crypto: 'Crypto Payment',
};

const TX_ICONS: Record<string, string> = {
  credit_purchase: 'add-circle',
  premium_purchase: 'diamond',
  call_deduction: 'call',
  message_deduction: 'chatbubble',
  translation_deduction: 'language',
  ad_reward: 'play-circle',
  stripe: 'card',
  crypto: 'logo-bitcoin',
};

interface Props { navigation: any }

const CreditsScreen: React.FC<Props> = ({ navigation }) => {
  const { colors, isDark } = useTheme();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [credits, setCredits] = useState(0);
  const [status, setStatus] = useState<StatusData | null>(null);
  const [packages, setPackages] = useState<CreditPackage[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [showTransactions, setShowTransactions] = useState(false);
  const [selectedPkg, setSelectedPkg] = useState<number | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const [creditRes, statusRes, pkgRes, txRes] = await Promise.all([
        creditsApi.getCredits().catch(() => null),
        creditsApi.getStatus().catch(() => null),
        creditsApi.getPackages().catch(() => null),
        creditsApi.getTransactions().catch(() => null),
      ]);
      if (creditRes?.data) setCredits(creditRes.data.credits ?? 0);
      if (statusRes?.data) setStatus(statusRes.data);
      if (pkgRes?.data) {
        const d = pkgRes.data as PackageData;
        setPackages(d.packages ?? []);
      }
      if (txRes?.data?.transactions) setTransactions(txRes.data.transactions);
    } catch {} finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);
  const onRefresh = () => { setRefreshing(true); fetchData(); };

  const formatDate = (s: string) =>
    new Date(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

  const formatRemaining = (ms?: number) => {
    if (!ms || ms <= 0) return 'Expired';
    const d = Math.floor(ms / 86400000);
    const h = Math.floor((ms % 86400000) / 3600000);
    return d > 0 ? `${d}d ${h}h remaining` : `${h}h remaining`;
  };

  if (loading) {
    return (
      <SafeAreaView style={[s.container, { backgroundColor: colors.background }]}>
        <View style={s.loadingWrap}><ActivityIndicator size="large" color={colors.primary} /></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[s.container, { backgroundColor: colors.background }]}>
      <View style={[s.header, { backgroundColor: colors.headerBg, borderBottomColor: colors.borderLight }]}>
        <TouchableOpacity onPress={() => navigation.openDrawer()}>
          <Ionicons name="menu" size={24} color={colors.text} />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.navigate('Settings')}>
          <Ionicons name="settings-outline" size={24} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={s.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        {/* Balance */}
        <View style={[s.balanceCard, { backgroundColor: colors.card }]}>
          <Text style={[s.balanceLabel, { color: colors.textSecondary }]}>Available Credits</Text>
          <Text style={[s.balanceAmount, { color: colors.text }]}>{Math.floor(credits)}</Text>
          {status?.isPremium && (
            <View style={[s.balancePremium, { backgroundColor: colors.cardAlt }]}>
              <Ionicons name="diamond" size={14} color={colors.warning} />
              <Text style={[s.balancePremiumText, { color: colors.warning }]}>
                Premium {status.premiumUntil ? `until ${formatDate(status.premiumUntil)}` : 'Active'}
              </Text>
            </View>
          )}
          {status?.trialActive && !status?.isPremium && (
            <View style={[s.balanceTrial, { backgroundColor: colors.cardAlt }]}>
              <Ionicons name="time-outline" size={14} color={colors.primary} />
              <Text style={[s.balanceTrialText, { color: colors.primary }]}>
                Trial {status.trialRemainingMs ? `(${formatRemaining(status.trialRemainingMs)})` : ''}
              </Text>
            </View>
          )}
        </View>

        {/* Premium CTA */}
        <TouchableOpacity style={[s.premiumCta, { backgroundColor: colors.card }]} onPress={() => navigation.navigate('Subscription')}>
          <View style={s.premiumCtaLeft}>
            <View style={s.premiumCtaIcon}>
              <Ionicons name="diamond" size={22} color={colors.warning} />
            </View>
            <View>
              <Text style={[s.premiumCtaTitle, { color: colors.text }]}>LinguaCall Premium</Text>
              <Text style={[s.premiumCtaSub, { color: colors.textSecondary }]}>
                {status?.isPremium ? 'Tap to manage' : 'Unlock unlimited calls & more'}
              </Text>
            </View>
          </View>
          <View style={s.premiumCtaRight}>
            {status?.isPremium ? (
              <View style={[s.premiumActiveBadge, { backgroundColor: colors.success + '20' }]}>
                <Text style={[s.premiumActiveBadgeText, { color: colors.success }]}>Active</Text>
              </View>
            ) : null}
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </View>
        </TouchableOpacity>

        {/* Buy Credits */}
        <Text style={[s.sectionTitle, { color: colors.text }]}>Buy Credits</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.packagesScroll}>
          {packages.length === 0 ? (
            <View style={s.emptyPackages}>
              <Text style={[s.emptyText, { color: colors.textMuted }]}>No packages available</Text>
            </View>
          ) : packages.map((pkg, idx) => (
            <TouchableOpacity
              key={idx}
              style={[s.pkgCard, { backgroundColor: colors.card }, selectedPkg === idx && s.pkgSelected]}
              activeOpacity={0.7}
              onPress={() => setSelectedPkg(idx)}
            >
              {idx === 1 && (
                <View style={[s.pkgPopularBadge, { backgroundColor: colors.primary }]}>
                  <Text style={[s.pkgPopularText, { color: '#fff' }]}>POPULAR</Text>
                </View>
              )}
              <Text style={[s.pkgCredits, { color: colors.text }]}>{pkg.credits ?? pkg.label}</Text>
              <Text style={[s.pkgLabel, { color: colors.textSecondary }]}>Credits</Text>
              {pkg.label && <Text style={[s.pkgDesc, { color: colors.textMuted }]}>{pkg.label}</Text>}
              <Text style={[s.pkgPrice, { color: colors.primary }]}>${pkg.price.toFixed(2)}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Proceed Button */}
        {selectedPkg !== null && (
          <TouchableOpacity style={s.proceedBtn} onPress={() => Alert.alert('Coming Soon', 'Payment methods will be available in a future update. Stay tuned!')}>
            <Text style={[s.proceedBtnText, { color: '#fff' }]}>Proceed to Payment</Text>
          </TouchableOpacity>
        )}

        {/* Payment Methods — Coming Soon */}
        <View style={[s.comingSoonCard, { backgroundColor: colors.card }]}>
          <View style={[s.comingSoonIcon, { backgroundColor: colors.cardAlt }]}>
            <Ionicons name="card-outline" size={24} color={colors.textMuted} />
          </View>
          <Text style={[s.comingSoonTitle, { color: colors.text }]}>Payment Methods</Text>
          <Text style={[s.comingSoonText, { color: colors.textMuted }]}>
            Payment methods will be available in a future update. Stay tuned!
          </Text>
        </View>

        {/* Transactions */}
        <View style={[s.txSection, { backgroundColor: colors.card }]}>
          <TouchableOpacity style={[s.txHeader, { borderBottomColor: colors.borderLight }]} onPress={() => setShowTransactions(!showTransactions)}>
            <Text style={[s.sectionTitle, { color: colors.text }]}>Transaction History</Text>
            <View style={s.txHeaderRight}>
              <Text style={[s.txCount, { color: colors.textMuted }]}>{transactions.length}</Text>
              <Ionicons name={showTransactions ? 'chevron-up' : 'chevron-down'} size={18} color={colors.textMuted} />
            </View>
          </TouchableOpacity>
          {showTransactions && (
            transactions.length > 0 ? (
              transactions.map((tx) => (
                <View key={tx._id} style={[s.txRow, { borderBottomColor: colors.borderLight }]}>
                  <View style={s.txIcon}>
                    <Ionicons
                      name={(TX_ICONS[tx.type] || 'ellipse') as any}
                      size={18}
                      color={tx.type.includes('deduction') ? colors.danger : colors.primary}
                    />
                  </View>
                  <View style={s.txInfo}>
                    <Text style={[s.txType, { color: colors.text }]}>{TX_LABELS[tx.type] || tx.type}</Text>
                    <Text style={[s.txDate, { color: colors.textMuted }]}>{formatDate(tx.createdAt)}</Text>
                  </View>
                  <Text style={[s.txAmount, { color: tx.amount < 0 ? colors.danger : colors.success }]}>
                    {tx.amount >= 0 ? '+' : ''}{tx.amount.toFixed(2)}
                  </Text>
                </View>
              ))
            ) : (
              <Text style={[s.emptyTx, { color: colors.textMuted }]}>No transactions yet</Text>
            )
          )}
        </View>

        <View style={{ height: verticalScale(40) }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F4F7' },
  loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: scale(20), paddingVertical: verticalScale(16),
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E5E7EB',
  },
  content: { flex: 1, paddingHorizontal: scale(16) },
  // Balance
  balanceCard: {
    backgroundColor: '#fff', borderRadius: scale(16), padding: scale(24),
    marginTop: verticalScale(20), marginBottom: verticalScale(16),
    alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
  },
  balanceLabel: { fontSize: moderateScale(14), color: '#6B7280', marginBottom: verticalScale(4) },
  balanceAmount: { fontSize: moderateScale(48), fontWeight: '800', color: '#111', letterSpacing: -1 },
  balancePremium: {
    flexDirection: 'row', alignItems: 'center', marginTop: verticalScale(8),
    backgroundColor: '#FFFBEB', paddingHorizontal: scale(12), paddingVertical: verticalScale(4),
    borderRadius: scale(20), gap: scale(4),
  },
  balancePremiumText: { fontSize: moderateScale(13), color: '#D97706', fontWeight: '500' },
  balanceTrial: {
    flexDirection: 'row', alignItems: 'center', marginTop: verticalScale(8),
    backgroundColor: '#EFF6FF', paddingHorizontal: scale(12), paddingVertical: verticalScale(4),
    borderRadius: scale(20), gap: scale(4),
  },
  balanceTrialText: { fontSize: moderateScale(13), color: '#3B82F6', fontWeight: '500' },
  // Premium CTA
  premiumCta: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#fff', borderRadius: scale(14), padding: scale(16),
    marginBottom: verticalScale(24),
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
  },
  premiumCtaLeft: { flexDirection: 'row', alignItems: 'center', gap: scale(12) },
  premiumCtaIcon: {
    width: scale(44), height: scale(44), borderRadius: scale(22),
    backgroundColor: '#FFFBEB', justifyContent: 'center', alignItems: 'center',
  },
  premiumCtaTitle: { fontSize: moderateScale(16), fontWeight: '700', color: '#111' },
  premiumCtaSub: { fontSize: moderateScale(13), color: '#6B7280', marginTop: verticalScale(2) },
  premiumCtaRight: { flexDirection: 'row', alignItems: 'center', gap: scale(6) },
  premiumActiveBadge: {
    backgroundColor: '#F0FDF4', paddingHorizontal: scale(10), paddingVertical: verticalScale(3),
    borderRadius: scale(12), borderWidth: 1, borderColor: '#BBF7D0',
  },
  premiumActiveBadgeText: { fontSize: moderateScale(11), fontWeight: '600', color: '#16A34A' },
  // Section
  sectionTitle: { fontSize: moderateScale(18), fontWeight: '700', color: '#111', marginBottom: verticalScale(12) },
  // Packages
  packagesScroll: { marginBottom: verticalScale(20), marginHorizontal: -scale(16), paddingHorizontal: scale(16) },
  emptyPackages: { width: scale(280), height: verticalScale(140), justifyContent: 'center', alignItems: 'center' },
  emptyText: { fontSize: moderateScale(14), color: '#9CA3AF' },
  pkgCard: {
    width: scale(140), backgroundColor: '#fff', borderRadius: scale(14), padding: scale(16),
    marginRight: scale(12), borderWidth: 2, borderColor: '#E5E7EB', position: 'relative',
  },
  pkgSelected: { borderColor: '#3B82F6', backgroundColor: '#EFF6FF' },
  pkgPopularBadge: {
    position: 'absolute', top: scale(-8), alignSelf: 'center',
    backgroundColor: '#FFD700', paddingHorizontal: scale(10), paddingVertical: verticalScale(3),
    borderRadius: scale(10),
  },
  pkgPopularText: { fontSize: moderateScale(9), fontWeight: '800', color: '#000', letterSpacing: 0.5 },
  pkgCredits: { fontSize: moderateScale(28), fontWeight: '800', color: '#111', marginBottom: verticalScale(2) },
  pkgLabel: { fontSize: moderateScale(12), color: '#6B7280', marginBottom: verticalScale(4) },
  pkgDesc: { fontSize: moderateScale(12), color: '#3B82F6', fontWeight: '500', marginBottom: verticalScale(8) },
  pkgPrice: { fontSize: moderateScale(16), fontWeight: '700', color: '#111' },
  // Proceed
  proceedBtn: {
    backgroundColor: '#3B82F6', borderRadius: scale(12), paddingVertical: verticalScale(14),
    alignItems: 'center', marginBottom: verticalScale(16),
  },
  proceedBtnText: { fontSize: moderateScale(16), fontWeight: '700', color: '#fff' },
  // Coming Soon
  comingSoonCard: {
    backgroundColor: '#fff', borderRadius: scale(14), padding: scale(24),
    alignItems: 'center', marginBottom: verticalScale(28),
    borderWidth: 1.5, borderColor: '#E5E7EB', borderStyle: 'dashed',
  },
  comingSoonIcon: {
    width: scale(48), height: scale(48), borderRadius: scale(24),
    backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center',
    marginBottom: verticalScale(12),
  },
  comingSoonTitle: { fontSize: moderateScale(16), fontWeight: '600', color: '#374151', marginBottom: verticalScale(6) },
  comingSoonText: { fontSize: moderateScale(13), color: '#9CA3AF', textAlign: 'center', lineHeight: verticalScale(20) },
  // Transactions
  txSection: { marginBottom: verticalScale(20) },
  txHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: verticalScale(4) },
  txHeaderRight: { flexDirection: 'row', alignItems: 'center', gap: scale(6) },
  txCount: {
    fontSize: moderateScale(13), color: '#9CA3AF', fontWeight: '600',
    backgroundColor: '#F3F4F6', paddingHorizontal: scale(8), paddingVertical: verticalScale(2),
    borderRadius: scale(10), overflow: 'hidden',
  },
  txRow: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
    paddingVertical: verticalScale(12), paddingHorizontal: scale(14), borderRadius: scale(12),
    marginBottom: verticalScale(6), gap: scale(12),
  },
  txIcon: {
    width: scale(36), height: scale(36), borderRadius: scale(18),
    backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center',
  },
  txInfo: { flex: 1 },
  txType: { fontSize: moderateScale(14), fontWeight: '600', color: '#111' },
  txDate: { fontSize: moderateScale(12), color: '#9CA3AF', marginTop: verticalScale(2) },
  txAmount: { fontSize: moderateScale(15), fontWeight: '700' },
  emptyTx: { textAlign: 'center', color: '#9CA3AF', fontSize: moderateScale(14), paddingVertical: verticalScale(24) },
});

export default CreditsScreen;
