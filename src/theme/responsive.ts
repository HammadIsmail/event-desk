// src/theme/responsive.ts
import { Dimensions, PixelRatio } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Standard mobile guideline dimensions (iPhone 11 / modern Android standard)
const BASE_WIDTH = 375;
const BASE_HEIGHT = 812;

/**
 * Scales a size horizontally based on device screen width
 */
export const scale = (size: number): number => {
  return (SCREEN_WIDTH / BASE_WIDTH) * size;
};

/**
 * Scales a size vertically based on device screen height
 */
export const verticalScale = (size: number): number => {
  return (SCREEN_HEIGHT / BASE_HEIGHT) * size;
};

/**
 * Moderately scales a size with a damping factor (default 0.5)
 * Prevents elements from becoming absurdly large on tablets or too tiny on small phones
 */
export const moderateScale = (size: number, factor = 0.5): number => {
  return size + (scale(size) - size) * factor;
};

/**
 * Responsive font size that respects system font scaling while clamping limits
 */
export const responsiveFontSize = (size: number): number => {
  const scaled = moderateScale(size, 0.4);
  const fontScale = PixelRatio.getFontScale();
  // Clamp font scaling factor between 0.85 and 1.25 to prevent UI breaking
  const safeFontScale = Math.min(Math.max(fontScale, 0.85), 1.25);
  return Math.round(scaled * (safeFontScale / fontScale));
};

export const isSmallDevice = SCREEN_WIDTH < 370;
export const isTablet = SCREEN_WIDTH >= 768;

export const metrics = {
  screenWidth: SCREEN_WIDTH,
  screenHeight: SCREEN_HEIGHT,
  isSmallDevice,
  isTablet,
  // Safe container max width for tablet / large devices
  maxContainerWidth: 480,
  // Standard spacing tokens
  spacing: {
    xs: moderateScale(4),
    sm: moderateScale(8),
    md: moderateScale(14),
    lg: moderateScale(20),
    xl: moderateScale(28),
  },
  // Standard border radius
  radius: {
    xs: moderateScale(4),
    sm: moderateScale(8),
    md: moderateScale(14),
    lg: moderateScale(20),
    xl: moderateScale(26),
    full: 9999,
  },
  // Touch target minimum for accessibility
  touchTarget: 48,
  minTouchTarget: 48,
};
