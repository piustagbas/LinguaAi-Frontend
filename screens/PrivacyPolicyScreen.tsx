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

const PrivacyPolicyScreen: React.FC<Props> = ({ navigation }) => {
  const { colors, isDark } = useTheme();
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Privacy Policy</Text>
        <View style={{ width: scale(24) }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.lastUpdated}>Last Updated: June 9, 2026</Text>

        <Section title="1. Introduction">
          <Text style={styles.body}>
            LinguaCall ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our mobile application and services.
          </Text>
          <Text style={styles.body}>
            By using LinguaCall, you agree to the collection and use of information in accordance with this policy. If you do not agree, please do not use our services.
          </Text>
        </Section>

        <Section title="2. Information We Collect">
          <Text style={styles.bodyBold}>Personal Information:</Text>
          <Text style={styles.body}>
            When you create an account, we collect your name, email address, phone number, and profile picture. This information is necessary to provide our translation and calling services.
          </Text>
          <Text style={styles.bodyBold}>Usage Data:</Text>
          <Text style={styles.body}>
            We automatically collect information about how you interact with our app, including call duration, translation history, features used, and interaction patterns. This helps us improve our services.
          </Text>
          <Text style={styles.bodyBold}>Device Information:</Text>
          <Text style={styles.body}>
            We collect device model, operating system version, unique device identifiers, and network information to optimize performance and troubleshoot issues.
          </Text>
          <Text style={styles.bodyBold}>Voice Recordings:</Text>
          <Text style={styles.body}>
            Voice recordings are stored locally on your device and are not uploaded to our servers unless required for the translation process. Recordings are processed in real-time and are not retained after the call ends unless you explicitly save them.
          </Text>
        </Section>

        <Section title="3. How We Use Your Information">
          <Text style={styles.body}>
            We use your information to:
          </Text>
          <Text style={styles.bullet}>Provide, maintain, and improve our real-time translation and calling services</Text>
          <Text style={styles.bullet}>Process transactions and send transaction notifications</Text>
          <Text style={styles.bullet}>Send technical notices, updates, security alerts, and support messages</Text>
          <Text style={styles.bullet}>Respond to your comments, questions, and requests</Text>
          <Text style={styles.bullet}>Monitor and analyze usage trends to enhance user experience</Text>
          <Text style={styles.bullet}>Detect, prevent, and address technical issues and fraud</Text>
          <Text style={styles.bullet}>Comply with legal obligations</Text>
        </Section>

        <Section title="4. Data Sharing and Disclosure">
          <Text style={styles.body}>
            We do not sell your personal information. We may share your data only in the following circumstances:
          </Text>
          <Text style={styles.bullet}>With your explicit consent</Text>
          <Text style={styles.bullet}>With service providers who perform services on our behalf (e.g., cloud infrastructure, payment processing)</Text>
          <Text style={styles.bullet}>To comply with legal obligations or protect our rights</Text>
          <Text style={styles.bullet}>In connection with a business transfer (merger, acquisition, or sale of assets)</Text>
        </Section>

        <Section title="5. Data Security">
          <Text style={styles.body}>
            We implement industry-standard security measures including encryption in transit (TLS) and at rest, secure authentication protocols, and regular security audits. However, no method of transmission over the Internet is 100% secure, and we cannot guarantee absolute security.
          </Text>
        </Section>

        <Section title="6. Data Retention">
          <Text style={styles.body}>
            We retain your personal information for as long as your account is active or as needed to provide you services. You can request deletion of your account and associated data at any time through the Settings page. Voice recordings stored locally on your device can be deleted at any time.
          </Text>
        </Section>

        <Section title="7. Your Rights">
          <Text style={styles.body}>
            Depending on your jurisdiction, you may have the right to:
          </Text>
          <Text style={styles.bullet}>Access the personal data we hold about you</Text>
          <Text style={styles.bullet}>Request correction of inaccurate data</Text>
          <Text style={styles.bullet}>Request deletion of your data</Text>
          <Text style={styles.bullet}>Object to or restrict processing of your data</Text>
          <Text style={styles.bullet}>Data portability</Text>
          <Text style={styles.bullet}>Withdraw consent at any time</Text>
          <Text style={styles.body}>
            To exercise these rights, contact us at privacy@linguacall.com.
          </Text>
        </Section>

        <Section title="8. Children's Privacy">
          <Text style={styles.body}>
            Our services are not intended for individuals under the age of 16. We do not knowingly collect personal information from children. If we become aware that a child has provided us with personal data, we take steps to delete it.
          </Text>
        </Section>

        <Section title="9. Changes to This Policy">
          <Text style={styles.body}>
            We may update this Privacy Policy from time to time. We will notify you of changes by posting the new policy on this page and updating the "Last Updated" date. Continued use of the service after changes constitutes acceptance of the updated policy.
          </Text>
        </Section>

        <Section title="10. Contact Us">
          <Text style={styles.body}>
            If you have questions about this Privacy Policy, please contact us:
          </Text>
          <Text style={styles.body}>Email: privacy@linguacall.com</Text>
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
  bodyBold: {
    fontSize: moderateScale(15),
    fontWeight: '600',
    color: '#374151',
    lineHeight: verticalScale(24),
    marginBottom: verticalScale(4),
    marginTop: verticalScale(4),
  },
  bullet: {
    fontSize: moderateScale(15),
    color: '#4B5563',
    lineHeight: verticalScale(24),
    marginBottom: verticalScale(4),
    paddingLeft: scale(16),
  },
});

export default PrivacyPolicyScreen;
