import '../global.css';
import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import { TouchableOpacity, View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { DrawerMenu, useDrawer } from '../src/presentation/components/navigation';
import { ToastProvider } from '../src/presentation/components/common';
import { ENV } from '../src/config/env';

// Keep splash screen visible while loading
SplashScreen.preventAutoHideAsync();

// Create query client for React Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 1000 * 60 * 5, // 5 minutes
    },
  },
});

// Header with hamburger menu
const HeaderLeft = ({ onMenuPress }: { onMenuPress: () => void }) => (
  <TouchableOpacity
    onPress={() => {
      console.log('[Drawer] Menu button pressed');
      onMenuPress();
    }}
    style={{
      marginLeft: 8,
      padding: 8,
      borderRadius: 8,
    }}
    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
  >
    <Ionicons name="menu" size={24} color="#ffffff" />
  </TouchableOpacity>
);

// Mock indicator badge
const MockBadge = () =>
  ENV.MOCK_API ? (
    <View
      style={{
        backgroundColor: '#fbbf24',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 4,
        marginRight: 8,
      }}
    >
      <Text style={{ fontSize: 10, fontWeight: 'bold', color: '#000' }}>MOCK</Text>
    </View>
  ) : null;

export default function RootLayout() {
  const drawer = useDrawer();

  useEffect(() => {
    // Hide splash screen after app is ready
    const hideSplash = async () => {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      await SplashScreen.hideAsync();
    };
    hideSplash();
  }, []);

  const handleOpenDrawer = React.useCallback(() => {
    console.log('[Layout] Opening drawer');
    drawer.open();
  }, [drawer]);

  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <ToastProvider>
          <StatusBar style="light" />
          <DrawerMenu isOpen={drawer.isOpen} onClose={drawer.close} />
          <Stack
            screenOptions={{
              headerStyle: {
                backgroundColor: '#1e40af',
              },
              headerTintColor: '#ffffff',
              headerTitleStyle: {
                fontWeight: 'bold',
              },
              animation: 'slide_from_right',
              headerLeft: () => (
                <TouchableOpacity
                  onPress={handleOpenDrawer}
                  style={{
                    marginLeft: 8,
                    padding: 8,
                    borderRadius: 8,
                  }}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons name="menu" size={24} color="#ffffff" />
                </TouchableOpacity>
              ),
              headerRight: () => <MockBadge />,
            }}
          >
            <Stack.Screen
              name="index"
              options={{
                title: 'OMR Scanner',
                headerShown: true,
              }}
            />
            <Stack.Screen
              name="exam/[examId]"
              options={{
                title: 'Datos del Estudiante',
                headerBackTitle: 'Exámenes',
              }}
            />
            <Stack.Screen
              name="capture"
              options={{
                title: 'Escanear Hoja',
                headerShown: false,
                presentation: 'fullScreenModal',
              }}
            />
            <Stack.Screen
              name="preview"
              options={{
                title: 'Vista Previa',
                headerShown: false,
                presentation: 'fullScreenModal',
              }}
            />
            <Stack.Screen
              name="results"
              options={{
                title: 'Resultados',
                headerBackVisible: false,
                gestureEnabled: false,
              }}
            />
            <Stack.Screen
              name="admin/create-exam"
              options={{
                title: 'Crear Examen',
              }}
            />
            <Stack.Screen
              name="admin/exams"
              options={{
                title: 'Gestión de Exámenes',
              }}
            />
            <Stack.Screen
              name="admin/stats"
              options={{
                title: 'Estadísticas',
              }}
            />
            <Stack.Screen
              name="my-results"
              options={{
                title: 'Mis Resultados',
              }}
            />
            <Stack.Screen
              name="admin/exam/[examId]/students"
              options={{
                title: 'Estudiantes',
              }}
            />
            <Stack.Screen
              name="admin/exam/[examId]/answer-key"
              options={{
                title: 'Clave de Respuestas',
              }}
            />
          </Stack>
        </ToastProvider>
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}
