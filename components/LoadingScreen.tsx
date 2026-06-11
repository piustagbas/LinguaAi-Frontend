import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  ActivityIndicator,
  StyleSheet,
  Animated,
  Image,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

const LoadingScreen: React.FC = () => {
  const rotationAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(rotationAnim, {
        toValue: 1,
        duration: 5000,
        useNativeDriver: true,
      })
    ).start();
  }, []);

  const rotation = rotationAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#E8F0FE', '#F0F8FF', '#FFFFFF']}
        style={styles.gradient}
      >
        <View style={styles.rotationWrapper}>
          <View style={styles.centerImageContainer}>
            <Image
              source={require('../assets/callgirl.jpg')}
              style={styles.centerImage}
              resizeMode="cover"
            />
          </View>

          <Animated.View
            style={[
              styles.rotationContainer,
              { transform: [{ rotate: rotation }] },
            ]}
          >
            <View style={styles.floatingIcon1}>
              <View style={styles.iconCircle}>
                <Ionicons name="language" size={28} color="#3B82F6" />
              </View>
            </View>
            <View style={styles.floatingIcon2}>
              <View style={styles.iconCircle}>
                <Ionicons name="chatbubbles" size={24} color="#3B82F6" />
              </View>
            </View>
            <View style={styles.floatingIcon3}>
              <View style={styles.iconCircle}>
                <Ionicons name="call" size={26} color="#3B82F6" />
              </View>
            </View>
            <View style={styles.floatingIcon4}>
              <View style={styles.iconCircle}>
                <Ionicons name="person" size={24} color="#3B82F6" />
              </View>
            </View>
          </Animated.View>
        </View>

        <Text style={styles.appName}>LinguaAICall</Text>
        <ActivityIndicator size="large" color="#3B82F6" style={styles.loader} />
        <Text style={styles.loadingText}>Loading...</Text>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rotationWrapper: {
    position: 'relative',
    width: Math.min(width * 0.5, height * 0.25),
    height: Math.min(width * 0.5, height * 0.25),
    marginBottom: 30,
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
    top: '-6%',
    left: '50%',
    marginLeft: -20,
  },
  floatingIcon2: {
    position: 'absolute',
    top: '50%',
    right: '-6%',
    marginTop: -20,
  },
  floatingIcon3: {
    position: 'absolute',
    bottom: '-6%',
    left: '50%',
    marginLeft: -20,
  },
  floatingIcon4: {
    position: 'absolute',
    top: '50%',
    left: '-6%',
    marginTop: -20,
  },
  iconCircle: {
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderRadius: 22,
    padding: 10,
    borderWidth: 2,
    borderColor: '#3B82F6',
  },
  centerImageContainer: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: '55%',
    height: '55%',
    marginTop: '-27.5%',
    marginLeft: '-27.5%',
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
  appName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#3B82F6',
    marginBottom: 30,
  },
  loader: {
    marginBottom: 16,
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
});

export default LoadingScreen;

