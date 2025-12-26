import React, { useRef, useState, useCallback } from 'react';
import {
  SafeAreaView,
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  BackHandler,
  RefreshControl,
  ScrollView,
} from 'react-native';
import Constants from 'expo-constants';
import { StatusBar } from 'expo-status-bar';
import { WebView } from 'react-native-webview';

// Backend URL from app.json config
const BACKEND_URL = (
  Constants.expoConfig?.extra?.backendUrl || 'https://news-ai.mbank.space'
).replace(/\/$/, '');

export default function App() {
  const webviewRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [canGoBack, setCanGoBack] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Handle Android back button
  React.useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (canGoBack && webviewRef.current) {
        webviewRef.current.goBack();
        return true;
      }
      return false;
    });
    return () => backHandler.remove();
  }, [canGoBack]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    webviewRef.current?.reload();
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  const handleReload = useCallback(() => {
    webviewRef.current?.reload();
  }, []);

  const handleNavigationChange = useCallback((navState) => {
    setCanGoBack(navState.canGoBack);
  }, []);

  const handleLoadEnd = useCallback(() => {
    setLoading(false);
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.logo}>⚡ AI News</Text>
        <TouchableOpacity style={styles.reloadBtn} onPress={handleReload}>
          <Text style={styles.reloadBtnText}>↻</Text>
        </TouchableOpacity>
      </View>

      {/* WebView */}
      <View style={styles.webviewContainer}>
        <WebView
          ref={webviewRef}
          source={{ uri: BACKEND_URL }}
          onLoadEnd={handleLoadEnd}
          onNavigationStateChange={handleNavigationChange}
          startInLoadingState
          javaScriptEnabled
          domStorageEnabled
          allowsBackForwardNavigationGestures
          pullToRefreshEnabled
          renderLoading={() => <LoadingSpinner />}
        />

        {loading && <LoadingOverlay />}
      </View>
    </SafeAreaView>
  );
}

// Loading spinner component
const LoadingSpinner = () => (
  <View style={styles.loading}>
    <ActivityIndicator size="large" color="#00d4aa" />
    <Text style={styles.loadingText}>Loading...</Text>
  </View>
);

// Loading overlay component
const LoadingOverlay = () => (
  <View style={styles.loadingOverlay}>
    <ActivityIndicator size="large" color="#00d4aa" />
    <Text style={styles.loadingText}>Loading...</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  header: {
    height: 50,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(10, 10, 10, 0.95)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  logo: {
    color: '#00d4aa',
    fontSize: 18,
    fontWeight: '700',
  },
  reloadBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  reloadBtnText: {
    color: '#e6e6e6',
    fontSize: 18,
    fontWeight: '600',
  },
  webviewContainer: {
    flex: 1,
    position: 'relative',
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0a0a0a',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(10, 10, 10, 0.7)',
  },
  loadingText: {
    marginTop: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
  },
});

