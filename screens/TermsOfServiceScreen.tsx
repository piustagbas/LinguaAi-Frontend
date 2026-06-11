import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { scale, verticalScale, moderateScale } from '../utils/responsive';

interface Props {
  navigation: any;
}

const TermsOfServiceScreen: React.FC<Props> = ({ navigation }) => {
  const { colors, isDark } = useTheme();
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Terms of Service</Text>
        <View style={{ width: scale(24) }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.lastUpdated}>Last Updated: June 9, 2026</Text>

        <Section title="1. Acceptance of Terms">
          <Text style={styles.body}>
            By accessing or using LinguaCall ("the App"), you agree to be bound by these Terms of Service. If you do not agree to all the terms, you may not access or use the App.
          </Text>
        </Section>

        <Section title="2. Description of Service">
          <Text style={styles.body}>
            LinguaCall provides real-time translation and communication services, including voice calls with AI-powered translation, text chat translation, and related features. We reserve the right to modify, suspend, or discontinue any aspect of the service at any time.
          </Text>
        </Section>

        <Section title="3. User Accounts">
          <Text style={styles.bullet}>You must be at least 16 years old to create an account</Text>
          <Text style={styles.bullet}>You are responsible for maintaining the confidentiality of your account credentials</Text>
          <Text style={styles.bullet}>You must provide accurate, current, and complete information</Text>
          <Text style={styles.bullet}>You are responsible for all activity under your account</Text>
          <Text style={styles.bullet}>Notify us immediately of any unauthorized use at support@linguacall.com</Text>
        </Section>

        <Section title="4. Acceptable Use">
          <Text style={styles.body}>You agree not to:</Text>
          <Text style={styles.bullet}>Use the service for any illegal or unauthorized purpose</Text>
          <Text style={styles.bullet}>Violate any laws in your jurisdiction</Text>
          <Text style={styles.bullet}>Harass, abuse, or harm other users</Text>
          <Text style={styles.bullet}>Impersonate any person or entity</Text>
          <Text style={styles.bullet}>Interfere with or disrupt the integrity of the service</Text>
          <Text style={styles.bullet}>Attempt to gain unauthorized access to any system or network</Text>
          <Text style={styles.bullet}>Use the service to transmit malware or harmful code</Text>
        </Section>

        <Section title="5. Intellectual Property">
          <Text style={styles.body}>
            The App and its original content, features, and functionality are owned by LinguaCall and are protected by international copyright, trademark, and other intellectual property laws. You may not copy, modify, distribute, or create derivative works without our express consent.
          </Text>
        </Section>

        <Section title="6. Credits and Payments">
          <Text style={styles.bullet}>Credits are non-refundable unless required by applicable law</Text>
          <Text style={styles.bullet}>Credits expire 12 months after purchase</Text>
          <Text style={styles.bullet}>Premium subscriptions auto-renew unless cancelled 24 hours before renewal</Text>
          <Text style={styles.bullet}>Prices are subject to change with 30 days notice</Text>
          <Text style={styles.bullet}>All payments are processed securely by third-party payment processors</Text>
        </Section>

        <Section title="7. Limitation of Liability">
          <Text style={styles.body}>
            LinguaCall shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of the service. Our total liability is limited to the amount you paid us in the 12 months preceding the claim.
          </Text>
        </Section>

        <Section title="8. Disclaimer of Warranties">
          <Text style={styles.body}>
            The service is provided on an "as is" and "as available" basis. LinguaCall makes no warranties, expressed or implied, regarding the accuracy, reliability, or availability of the translation services. Translations may not be perfect and should not be relied upon in emergency or life-critical situations.
          </Text>
        </Section>

        <Section title="9. Termination">
          <Text style={styles.body}>
            We may terminate or suspend your account at any time for violation of these terms, without prior notice. Upon termination, your right to use the service ceases immediately. You may delete your account at any time via the Settings page.
          </Text>
        </Section>

        <Section title="10. Governing Law">
          <Text style={styles.body}>
            These terms shall be governed by the laws of the State of California, without regard to its conflict of law provisions. Any disputes shall be resolved in the courts of San Francisco County, California.
          </Text>
        </Section>

        <Section title="11. Contact">
          <Text style={styles.body}>For questions about these terms, contact us:</Text>
          <Text style={styles.body}>Email: support@linguacall.com</Text>
          <Text style={styles.body}>Address: 123 Innovation Drive, San Francisco, CA 94105</Text>
        </Section>

        <View style={{ height: verticalScale(40) }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <View style={styles.section}>
    <Text style={styles.sectionTitle}>{title}</Text>
    {children}
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: scale(20),
    paddingVertical: verticalScale(16),
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  headerTitle: {
    fontSize: moderateScale(18),
    fontWeight: '700',
    color: '#000',
  },
  content: {
    flex: 1,
    paddingHorizontal: scale(20),
  },
  lastUpdated: {
    fontSize: moderateScale(13),
    color: '#9CA3AF',
    marginTop: verticalScale(20),
    marginBottom: verticalScale(16),
  },
  section: {
    marginBottom: verticalScale(24),
  },
  sectionTitle: {
    fontSize: moderateScale(18),
    fontWeight: '700',
    color: '#111',
    marginBottom: verticalScale(10),
  },
  body: {
    fontSize: moderateScale(15),
    color: '#4B5563',
    lineHeight: verticalScale(24),
    marginBottom: verticalScale(8),
  },
  bullet: {
    fontSize: moderateScale(15),
    color: '#4B5563',
    lineHeight: verticalScale(24),
    marginBottom: verticalScale(4),
    paddingLeft: scale(16),
  },
});

export default TermsOfServiceScreen;
