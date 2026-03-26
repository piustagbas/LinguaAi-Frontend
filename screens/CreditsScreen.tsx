import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface CreditPackage {
  id: string;
  credits: number;
  price: number;
  bonus?: number;
  popular?: boolean;
}

interface CreditsScreenProps {
  navigation: any;
}

const CreditsScreen: React.FC<CreditsScreenProps> = ({ navigation }) => {
  const [selectedPackage, setSelectedPackage] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'crypto'>('card');

  // Mock user data
  const userCredits = {
    minutes: 50,
    texts: 100,
    remainingCredits: 28.55,
  };

  const creditPackages: CreditPackage[] = [
    { id: '1', credits: 100, price: 9.99, bonus: 10 },
    { id: '2', credits: 500, price: 39.99, bonus: 100, popular: true },
    { id: '3', credits: 2000, price: 149.99, bonus: 500 },
  ];

  const handlePackageSelect = (packageId: string) => {
    setSelectedPackage(packageId);
  };

  const handlePurchase = () => {
    if (!selectedPackage) {
      Alert.alert('Error', 'Please select a credit package');
      return;
    }

    const selectedPkg = creditPackages.find(pkg => pkg.id === selectedPackage);
    Alert.alert(
      'Purchase Confirmation',
      `Purchase ${selectedPkg?.credits} credits for $${selectedPkg?.price}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Confirm', onPress: () => confirmPurchase() },
      ]
    );
  };

  const confirmPurchase = () => {
    Alert.alert('Success', 'Credits purchased successfully!');
    // In real app, this would process payment and update credits
  };

  const renderCreditPackage = (pkg: CreditPackage) => (
    <TouchableOpacity
      key={pkg.id}
      style={[
        styles.packageCard,
        selectedPackage === pkg.id && styles.selectedPackage,
        pkg.popular && styles.popularPackage,
      ]}
      onPress={() => handlePackageSelect(pkg.id)}
    >
      {pkg.popular && (
        <View style={styles.popularBadge}>
          <Text style={styles.popularText}>POPULAR</Text>
        </View>
      )}
      
      <View style={styles.packageHeader}>
        <Text style={styles.packageCredits}>{pkg.credits}</Text>
        <Text style={styles.packageLabel}>Credits</Text>
      </View>

      {pkg.bonus && (
        <Text style={styles.bonusText}>+{pkg.bonus} Bonus</Text>
      )}

      <Text style={styles.packagePrice}>${pkg.price}</Text>

      {selectedPackage === pkg.id && (
        <View style={styles.selectedIndicator}>
          <Ionicons name="checkmark-circle" size={24} color="#3B82F6" />
        </View>
      )}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.openDrawer()}>
          <Ionicons name="menu" size={24} color="#000" />
        </TouchableOpacity>
        <TouchableOpacity>
          <Ionicons name="person-circle" size={24} color="#3B82F6" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        <Text style={styles.title}>Credits</Text>

        {/* Current Credits */}
        <View style={styles.creditsCard}>
          <View style={styles.creditsHeader}>
            <Text style={styles.creditsTitle}>Your Credits</Text>
            <Text style={styles.creditsAmount}>${userCredits.remainingCredits}</Text>
          </View>
          
          <View style={styles.creditsBreakdown}>
            <View style={styles.creditItem}>
              <Ionicons name="call" size={20} color="#3B82F6" />
              <Text style={styles.creditText}>{userCredits.minutes} free minutes</Text>
            </View>
            <View style={styles.creditItem}>
              <Ionicons name="chatbubble" size={20} color="#3B82F6" />
              <Text style={styles.creditText}>{userCredits.texts} free texts</Text>
            </View>
          </View>
        </View>

        {/* Buy Credits Section */}
        <View style={styles.buySection}>
          <Text style={styles.sectionTitle}>Buy Credits</Text>
          
          <View style={styles.packagesContainer}>
            {creditPackages.map(renderCreditPackage)}
          </View>

          {/* Payment Method Selection */}
          <View style={styles.paymentSection}>
            <Text style={styles.paymentTitle}>Payment Method</Text>
            
            <TouchableOpacity
              style={[styles.paymentOption, paymentMethod === 'card' && styles.selectedPayment]}
              onPress={() => setPaymentMethod('card')}
            >
              <View style={styles.paymentLeft}>
                <Ionicons name="card" size={24} color="#3B82F6" />
                <Text style={styles.paymentText}>Credit/Debit Card</Text>
              </View>
              {paymentMethod === 'card' && (
                <Ionicons name="checkmark-circle" size={24} color="#3B82F6" />
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.paymentOption, paymentMethod === 'crypto' && styles.selectedPayment]}
              onPress={() => setPaymentMethod('crypto')}
            >
              <View style={styles.paymentLeft}>
                <Ionicons name="logo-bitcoin" size={24} color="#3B82F6" />
                <Text style={styles.paymentText}>Cryptocurrency</Text>
              </View>
              {paymentMethod === 'crypto' && (
                <Ionicons name="checkmark-circle" size={24} color="#3B82F6" />
              )}
            </TouchableOpacity>
          </View>

          {/* Purchase Button */}
          <TouchableOpacity
            style={[styles.purchaseButton, !selectedPackage && styles.purchaseButtonDisabled]}
            onPress={handlePurchase}
            disabled={!selectedPackage}
          >
            <Text style={styles.purchaseButtonText}>
              {selectedPackage ? 'Purchase Credits' : 'Select a Package'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Premium Plan Section */}
        <View style={styles.premiumSection}>
          <Text style={styles.sectionTitle}>Premium Plan</Text>
          
          <View style={styles.premiumCard}>
            <View style={styles.premiumHeader}>
              <Ionicons name="diamond" size={24} color="#FFD700" />
              <Text style={styles.premiumTitle}>LinguaCall Premium</Text>
            </View>
            
            <Text style={styles.premiumDescription}>
              Unlimited calls, advanced translation features, and priority support
            </Text>

            <View style={styles.premiumFeatures}>
              <View style={styles.featureItem}>
                <Ionicons name="checkmark" size={16} color="#3B82F6" />
                <Text style={styles.featureText}>Unlimited voice calls</Text>
              </View>
              <View style={styles.featureItem}>
                <Ionicons name="checkmark" size={16} color="#3B82F6" />
                <Text style={styles.featureText}>Advanced AI translation</Text>
              </View>
              <View style={styles.featureItem}>
                <Ionicons name="checkmark" size={16} color="#3B82F6" />
                <Text style={styles.featureText}>Priority customer support</Text>
              </View>
              <View style={styles.featureItem}>
                <Ionicons name="checkmark" size={16} color="#3B82F6" />
                <Text style={styles.featureText}>Ad-free experience</Text>
              </View>
            </View>

            <TouchableOpacity style={styles.premiumButton}>
              <Text style={styles.premiumButtonText}>Upgrade to Premium - $9.99/month</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Information Section */}
        <View style={styles.infoSection}>
          <TouchableOpacity style={styles.infoItem}>
            <Ionicons name="information-circle" size={20} color="#666" />
            <Text style={styles.infoText}>How credits work</Text>
            <Ionicons name="chevron-forward" size={16} color="#666" />
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.infoItem}>
            <Ionicons name="help-circle" size={20} color="#666" />
            <Text style={styles.infoText}>Payment & billing</Text>
            <Ionicons name="chevron-forward" size={16} color="#666" />
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.infoItem}>
            <Ionicons name="shield-checkmark" size={20} color="#666" />
            <Text style={styles.infoText}>Security & privacy</Text>
            <Ionicons name="chevron-forward" size={16} color="#666" />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#000',
    marginTop: 20,
    marginBottom: 24,
  },
  creditsCard: {
    backgroundColor: '#f8f8f8',
    borderRadius: 16,
    padding: 20,
    marginBottom: 32,
  },
  creditsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  creditsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
  },
  creditsAmount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#3B82F6',
  },
  creditsBreakdown: {
    gap: 8,
  },
  creditItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  creditText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
  },
  buySection: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 16,
  },
  packagesContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  packageCard: {
    flex: 1,
    backgroundColor: '#f8f8f8',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 4,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
    position: 'relative',
  },
  selectedPackage: {
    borderColor: '#3B82F6',
    backgroundColor: '#f0f8ff',
  },
  popularPackage: {
    borderColor: '#FFD700',
  },
  popularBadge: {
    position: 'absolute',
    top: -8,
    backgroundColor: '#FFD700',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  popularText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#000',
  },
  packageHeader: {
    alignItems: 'center',
    marginBottom: 8,
  },
  packageCredits: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
  },
  packageLabel: {
    fontSize: 12,
    color: '#666',
  },
  bonusText: {
    fontSize: 12,
    color: '#3B82F6',
    fontWeight: '600',
    marginBottom: 8,
  },
  packagePrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
  },
  selectedIndicator: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
  paymentSection: {
    marginBottom: 24,
  },
  paymentTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 12,
  },
  paymentOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f8f8f8',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedPayment: {
    borderColor: '#3B82F6',
    backgroundColor: '#f0f8ff',
  },
  paymentLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  paymentText: {
    fontSize: 16,
    color: '#000',
    marginLeft: 12,
  },
  purchaseButton: {
    backgroundColor: '#3B82F6',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  purchaseButtonDisabled: {
    backgroundColor: '#ccc',
  },
  purchaseButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  premiumSection: {
    marginBottom: 32,
  },
  premiumCard: {
    backgroundColor: '#f8f8f8',
    borderRadius: 16,
    padding: 20,
  },
  premiumHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  premiumTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    marginLeft: 8,
  },
  premiumDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 16,
  },
  premiumFeatures: {
    marginBottom: 20,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  featureText: {
    fontSize: 14,
    color: '#000',
    marginLeft: 8,
  },
  premiumButton: {
    backgroundColor: '#FFD700',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  premiumButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '600',
  },
  infoSection: {
    marginBottom: 32,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  infoText: {
    flex: 1,
    fontSize: 16,
    color: '#000',
    marginLeft: 12,
  },
});

export default CreditsScreen;






