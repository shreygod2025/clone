import React from 'react';
import { StyleSheet, View, Platform, StatusBar, useWindowDimensions } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import MainScreen from './src/screens/MainScreen';
import { COLORS } from './src/theme/colors';

export default function App() {
  const isWeb = Platform.OS === 'web';
  const { height: windowHeight, width: windowWidth } = useWindowDimensions();

  if (isWeb) {
    // Dynamic height calculation on Web to prevent navbar from floating in the middle
    const isMobileViewport = windowWidth <= 480;
    const frameHeight = isMobileViewport ? '100%' : Math.min(windowHeight - 24, 900);

    return (
      <SafeAreaProvider>
        <StatusBar barStyle="light-content" backgroundColor={COLORS.headerBg} />
        <View style={[styles.webContainer, isMobileViewport && styles.webContainerMobile]}>
          <View
            style={[
              styles.mobileFrame,
              isMobileViewport
                ? styles.mobileFrameFullscreen
                : { height: frameHeight },
            ]}
          >
            <MainScreen />
          </View>
        </View>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.headerBg} />
      <View style={styles.nativeContainer}>
        <MainScreen />
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  webContainer: {
    flex: 1,
    backgroundColor: '#0B1320',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: '100%',
    minHeight: '100vh',
    paddingVertical: 12,
  },
  webContainerMobile: {
    paddingVertical: 0,
    backgroundColor: COLORS.bgMain,
  },
  mobileFrame: {
    width: '100%',
    maxWidth: 430,
    backgroundColor: COLORS.bgMain,
    borderRadius: 36,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.4,
    shadowRadius: 28,
    elevation: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    flexDirection: 'column',
  },
  mobileFrameFullscreen: {
    maxWidth: '100%',
    height: '100%',
    borderRadius: 0,
    borderWidth: 0,
  },
  nativeContainer: {
    flex: 1,
    backgroundColor: COLORS.headerBg,
  },
});
