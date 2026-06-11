import { Dimensions, PixelRatio, Platform } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Reference dimensions (iPhone 11)
const REF_WIDTH = 375;
const REF_HEIGHT = 812;

const widthScale = SCREEN_WIDTH / REF_WIDTH;
const heightScale = SCREEN_HEIGHT / REF_HEIGHT;

export const scale = (size: number) => PixelRatio.roundToNearestPixel(size * Math.min(widthScale, 1.5));
export const verticalScale = (size: number) => PixelRatio.roundToNearestPixel(size * Math.min(heightScale, 1.5));
export const moderateScale = (size: number, factor = 0.5) =>
  PixelRatio.roundToNearestPixel(size + (scale(size) - size) * factor);

export const isSmallDevice = SCREEN_WIDTH < 375;
export const isTablet = SCREEN_WIDTH >= 768;
