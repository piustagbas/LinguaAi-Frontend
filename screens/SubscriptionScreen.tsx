import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { creditsApi } from '../services/api';
import { scale, verticalScale, moderateScale } from '../utils/responsive';

interface StatusData {
  credits: number;
  isPremium: boolean;
  trialActive: boolean;
  trialRemainingMs?: number;
  premiumUntil?: string;
  premiumRemainingMs?: number;
  numbers?: string[];
}

interface Props {
  navigation: any;
}

const SubscriptionScreen: React.FC<Props> = ({ navigation }) => {
  const { colors, isDark } = useTheme();
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<StatusData | null>(null);
  const [premiumPrice, setPremiumPrice] = useState(3);
  const [processing, setProcessing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [statusRes, pkgRes] = await Promise.all([
        creditsApi.getStatus().catch(() => null),
        creditsApi.getPackages().catch(() => null),
      ]);
      if (statusRes?.data) setStatus(statusRes.data);
      if (pkgRes?.data?.premiumPrice) setPremiumPrice(pkgRes.data.premiumPrice);
    } catch {} finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSubscribe = async () => {
    setProcessing(true);
    try {
      const res = await creditsApi.createStripePayment('premium');
      if (res?.data?.paymentIntentId) {
        const confirmRes = await creditsApi.confirmStripePayment(res.data.paymentIntentId);
        if (confirmRes?.status === 'success') {
          Alert.alert('Welcome to Premium!', 'Your premium subscription is now active.');
          await fetchData();
        } else {
          Alert.alert('Error', 'Payment confirmation failed.');
        }
      }
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.message || e.message || 'Subscription failed');
    } finally {
      setProcessing(false);
    }
  };

  const handleQuickSubscribe = async () => {
    setProcessing(true);
    try {
      const res = await creditsApi.subscribe();
      Alert.alert('Success', res?.message || 'Premium activated!');
      await fetchData();
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.message || e.message || 'Subscription failed');
    } finally {
      setProcessing(false);
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingWrap}><ActivityIndicator size="large" color="#3B82F6" /></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBack}>
          <Ionicons name="chevron-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Premium Subscription</Text>
        <View style={{ width: scale(40) }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <View style={styles.hero}>
          <View style={styles.heroIcon}>
            <Ionicons name="diamond" size={40} color="#FFD700" />
          </View>
          <Text style={styles.heroTitle}>Go Premium</Text>
          <Text style={styles.heroSubtitle}>Unlock the full LinguaCall experience</Text>
        </View>

        {/* Current Status */}
        {status?.isPremium && (
          <View style={styles.statusCard}>
            <View style={styles.statusRow}>
              <Ionicons name="checkmark-circle" size={20} color="#10B981" />
              <View style={{ flex: 1 }}>
                <Text style={styles.statusTitle}>Premium Active</Text>
                <Text style={styles.statusSub}>
                  {status.premiumUntil ? `Valid until ${formatDate(status.premiumUntil)}` : 'Unlimited'}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Pricing Card */}
        <View style={styles.pricingCard}>
          <Text style={styles.priceAmount}>${premiumPrice.toFixed(2)}</Text>
          <Text style={styles.pricePeriod}>per month</Text>

          <View style={styles.featuresList}>
            {[
              { icon: 'call-outline', text: 'Unlimited voice calls' },
              { icon: 'language-outline', text: 'Advanced AI translation' },
              { icon: 'chatbubbles-outline', text: 'Unlimited text translation' },
              { icon: 'headset-outline', text: 'Priority customer support' },
              { icon: 'flash-outline', text: 'Ad-free experience' },
              { icon: 'cloud-download-outline', text: 'Save & export translations' },
            ].map((f, i) => (
              <View key={i} style={styles.featureRow}>
                <View style={styles.featureIcon}>
                  <Ionicons name={f.icon as any} size={16} color="#3B82F6" />
                </View>
                <Text style={styles.featureText}>{f.text}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Subscribe Buttons */}
        <TouchableOpacity
          style={[styles.subscribeBtn, processing && styles.btnDisabled]}
          onPress={handleSubscribe}
          disabled={processing}
        >
          {processing ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.subscribeBtnText}>
              {status?.isPremium ? 'Resubscribe' : 'Subscribe'} — ${premiumPrice.toFixed(2)}/month
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.devBtn, processing && styles.btnDisabled]}
          onPress={handleQuickSubscribe}
          disabled={processing}
        >
          <Ionicons name="flash-outline" size={16} color="#3B82F6" />
          <Text style={styles.devBtnText}>Quick Activate (Dev)</Text>
        </TouchableOpacity>

        <Text style={styles.disclaimer}>
          Cancel anytime. Premium auto-renews monthly unless cancelled at least 24 hours before renewal.
        </Text>

        {/* Trial Info */}
        {status?.trialActive && !status?.isPremium && (
          <View style={styles.trialCard}>
            <Ionicons name="time-outline" size={20} color="#3B82F6" />
            <View style={{ flex: 1 }}>
              <Text style={styles.trialTitle}>Trial Active</Text>
              <Text style={styles.trialSub}>
                {status.trialRemainingMs && status.trialRemainingMs > 0
                  ? `You have ${Math.ceil(status.trialRemainingMs / 3600000)} hours remaining`
                  : 'Your trial is ending soon'}
              </Text>
            </View>
          </View>
        )}

        <View style={{ height: verticalScale(40) }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F4F7' },
  loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: scale(20),
    paddingVertical: verticalScale(16),
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerBack: { padding: scale(4) },
  headerTitle: { fontSize: moderateScale(18), fontWeight: '700', color: '#000' },
  content: { flex: 1, paddingHorizontal: scale(16) },
  // Hero
  hero: { alignItems: 'center', paddingVertical: verticalScale(32) },
  heroIcon: {
    width: scale(80),
    height: scale(80),
    borderRadius: scale(40),
    backgroundColor: '#FFFBEB',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: verticalScale(16),
  },
  heroTitle: { fontSize: moderateScale(28), fontWeight: '800', color: '#111', marginBottom: verticalScale(4) },
  heroSubtitle: { fontSize: moderateScale(15), color: '#6B7280' },
  // Status
  statusCard: {
    backgroundColor: '#F0FDF4',
    borderRadius: scale(14),
    padding: scale(16),
    marginBottom: verticalScale(20),
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: scale(10) },
  statusTitle: { fontSize: moderateScale(15), fontWeight: '600', color: '#166534' },
  statusSub: { fontSize: moderateScale(13), color: '#4ADE80', marginTop: verticalScale(2) },
  // Pricing
  pricingCard: {
    backgroundColor: '#fff',
    borderRadius: scale(20),
    padding: scale(24),
    marginBottom: verticalScale(24),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    alignItems: 'center',
  },
  priceAmount: { fontSize: moderateScale(48), fontWeight: '800', color: '#111', letterSpacing: -1 },
  pricePeriod: { fontSize: moderateScale(15), color: '#6B7280', marginBottom: verticalScale(24) },
  featuresList: { width: '100%' },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: verticalScale(8),
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    gap: scale(10),
  },
  featureIcon: {
    width: scale(32),
    height: scale(32),
    borderRadius: scale(16),
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  featureText: { fontSize: moderateScale(15), color: '#374151', flex: 1 },
  // Subscribe
  subscribeBtn: {
    backgroundColor: '#111',
    paddingVertical: verticalScale(16),
    borderRadius: scale(14),
    alignItems: 'center',
    marginBottom: verticalScale(12),
  },
  subscribeBtnText: { fontSize: moderateScale(17), fontWeight: '700', color: '#fff' },
  devBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: scale(6),
    paddingVertical: verticalScale(12),
    borderRadius: scale(12),
    borderWidth: 1.5,
    borderColor: '#93C5FD',
    marginBottom: verticalScale(16),
  },
  devBtnText: { fontSize: moderateScale(14), fontWeight: '600', color: '#3B82F6' },
  btnDisabled: { opacity: 0.5 },
  disclaimer: { fontSize: moderateScale(12), color: '#9CA3AF', textAlign: 'center', marginBottom: verticalScale(24) },
  // Trial
  trialCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    borderRadius: scale(14),
    padding: scale(16),
    gap: scale(10),
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  trialTitle: { fontSize: moderateScale(15), fontWeight: '600', color: '#1D4ED8' },
  trialSub: { fontSize: moderateScale(13), color: '#60A5FA', marginTop: verticalScale(2) },
});

export default SubscriptionScreen;
