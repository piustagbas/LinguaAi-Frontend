import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  SafeAreaView,
  Animated,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';

const { width, height } = Dimensions.get('window');

interface OnboardingScreenProps {
  navigation: any;
}

const OnboardingScreen: React.FC<OnboardingScreenProps> = ({ navigation }) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const { pendingEmail } = useAuth();
  const rotationAnim = useRef(new Animated.Value(0)).current;

  // If user has just registered and we have a pending email, jump to SignUp OTP
  useEffect(() => {
    if (pendingEmail) {
      navigation.replace('SignUp', { mode: 'otp' });
    }
  }, [pendingEmail]);

  // Rotation animation for icons around center
  useEffect(() => {
    Animated.loop(
      Animated.timing(rotationAnim, {
        toValue: 1,
        duration: 5000,
        useNativeDriver: true,
      })
    ).start();
  }, []);

  // Rotation value for all icons
  const rotation = rotationAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const nextSlide = () => {
    if (currentSlide < 2) {
      setCurrentSlide(currentSlide + 1);
    } else {
      navigation.navigate('SignUp');
    }
  };

  const skipToSignUp = () => {
    navigation.navigate('SignUp');
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#E8F0FE', '#F0F8FF', '#FFFFFF']}
        style={styles.gradient}
      >
        <View style={styles.content}>
        {/* Main Content */}
        <View style={styles.mainContent}>
            {/* Rotation Container with Center Image and Icons */}
            <View style={styles.rotationWrapper}>
              {/* Center Image */}
              <View style={styles.centerImageContainer}>
                <Image
                  source={require('../assets/callgirl.jpg')}
                  style={styles.centerImage}
                  resizeMode="cover"
                />
              </View>

              {/* Floating Translation Icons - Rotating around center */}
              <Animated.View
                style={[
                  styles.rotationContainer,
                  {
                    transform: [{ rotate: rotation }],
                  },
                ]}
              >
                <View style={styles.floatingIcon1}>
                  <View style={styles.translationIconContainer}>
                    <Ionicons name="language" size={40} color="#3B82F6" />
                  </View>
                </View>

                <View style={styles.floatingIcon2}>
                  <View style={styles.translationIconContainer2}>
                    <Ionicons name="chatbubbles" size={35} color="#3B82F6" />
                  </View>
                </View>

                <View style={styles.floatingIcon3}>
                  <View style={styles.translationIconContainer3}>
                    <Ionicons name="call" size={38} color="#3B82F6" />
                  </View>
                </View>

                <View style={styles.floatingIcon4}>
                  <View style={styles.translationIconContainer4}>
                    <Ionicons name="person" size={36} color="#3B82F6" />
                  </View>
                </View>
              </Animated.View>
            </View>

            {/* Text Content */}
            <View style={styles.textContainer}>
              <Text style={styles.title}>
                Break Language Barriers{'\n'}Connect Globally
              </Text>
              <Text style={styles.subtitle}>
                Real-time translation for seamless{'\n'}communication across languages
              </Text>
            </View>
        </View>

        {/* Bottom Section */}
        <View style={styles.bottomSection}>
            {/* Skip Button */}
            <TouchableOpacity
              style={styles.skipButton}
              onPress={skipToSignUp}
            >
              <Text style={styles.skipText}>Skip</Text>
            </TouchableOpacity>

            {/* Next Button */}
            <TouchableOpacity
              style={styles.nextButton}
              onPress={nextSlide}
            >
              <Ionicons name="arrow-forward" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
        </View>
      </LinearGradient>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingTop: height * 0.03,
  },
  mainContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingHorizontal: width * 0.05,
  },
  rotationWrapper: {
    position: 'relative',
    width: Math.min(width * 0.7, height * 0.35),
    height: Math.min(width * 0.7, height * 0.35),
    alignSelf: 'center',
    marginTop: height * 0.02,
    marginBottom: height * 0.02,
  },
  rotationContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  floatingIcon1: {
    position: 'absolute',
    top: '-8%',
    left: '50%',
    marginLeft: -25,
  },
  floatingIcon2: {
    position: 'absolute',
    top: '50%',
    right: '-8%',
    marginTop: -25,
  },
  floatingIcon3: {
    position: 'absolute',
    bottom: '-8%',
    left: '50%',
    marginLeft: -25,
  },
  floatingIcon4: {
    position: 'absolute',
    top: '50%',
    left: '-8%',
    marginTop: -25,
  },
  translationIconContainer: {
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderRadius: 30,
    padding: 15,
    borderWidth: 2,
    borderColor: '#3B82F6',
  },
  translationIconContainer2: {
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    borderRadius: 25,
    padding: 12,
    borderWidth: 2,
    borderColor: '#3B82F6',
  },
  translationIconContainer3: {
    backgroundColor: 'rgba(59, 130, 246, 0.12)',
    borderRadius: 28,
    padding: 14,
    borderWidth: 2,
    borderColor: '#3B82F6',
  },
  translationIconContainer4: {
    backgroundColor: 'rgba(59, 130, 246, 0.13)',
    borderRadius: 26,
    padding: 13,
    borderWidth: 2,
    borderColor: '#3B82F6',
  },
  centerImageContainer: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: '50%',
    height: '50%',
    marginTop: '-25%',
    marginLeft: '-25%',
    borderRadius: 1000,
    borderWidth: 4,
    borderColor: '#FFD700',
    overflow: 'hidden',
    zIndex: 2,
  },
  centerImage: {
    width: '100%',
    height: '100%',
  },
  textContainer: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'flex-end',
    paddingBottom: height * 0.02,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#000',
    textAlign: 'center',
    lineHeight: 28,
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
  },
  inlineIcon: {
    marginLeft: 8,
  },
  bottomSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: width * 0.08,
    paddingBottom: height * 0.03,
    paddingTop: height * 0.02,
  },
  skipButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  skipText: {
    fontSize: 16,
    color: '#000',
    fontWeight: '500',
  },
  nextButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
});

export default OnboardingScreen;
