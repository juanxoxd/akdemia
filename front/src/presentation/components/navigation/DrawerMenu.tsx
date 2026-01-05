import React from 'react';
import { View, Text, TouchableOpacity, Modal, Animated, Dimensions, Pressable } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');
const DRAWER_WIDTH = Math.min(280, width * 0.8);

interface MenuItem {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  route: string;
  section?: 'student' | 'admin';
}

const menuItems: MenuItem[] = [
  // Student Section
  { label: 'Exámenes', icon: 'document-text-outline', route: '/', section: 'student' },
  {
    label: 'Mis Resultados',
    icon: 'stats-chart-outline',
    route: '/my-results',
    section: 'student',
  },

  // Admin Section
  {
    label: 'Crear Examen',
    icon: 'add-circle-outline',
    route: '/admin/create-exam',
    section: 'admin',
  },
  {
    label: 'Gestión de Exámenes',
    icon: 'settings-outline',
    route: '/admin/exams',
    section: 'admin',
  },
  { label: 'Estadísticas', icon: 'bar-chart-outline', route: '/admin/stats', section: 'admin' },
];

interface DrawerMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DrawerMenu: React.FC<DrawerMenuProps> = ({ isOpen, onClose }) => {
  const router = useRouter();
  const pathname = usePathname();
  const slideAnim = React.useRef(new Animated.Value(-DRAWER_WIDTH)).current;
  const fadeAnim = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    console.log('[Drawer] isOpen changed to:', isOpen);
    if (isOpen) {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: -DRAWER_WIDTH,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isOpen, slideAnim, fadeAnim]);

  const handleItemPress = (route: string) => {
    onClose();
    setTimeout(() => {
      router.push(route as never);
    }, 100);
  };

  const studentItems = menuItems.filter((item) => item.section === 'student');
  const adminItems = menuItems.filter((item) => item.section === 'admin');

  return (
    <Modal visible={isOpen} transparent animationType="none" onRequestClose={onClose}>
      <View style={{ flex: 1, flexDirection: 'row' }}>
        {/* Backdrop */}
        <Animated.View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            opacity: fadeAnim,
          }}
        >
          <Pressable style={{ flex: 1 }} onPress={onClose} />
        </Animated.View>

        {/* Drawer */}
        <Animated.View
          style={{
            width: DRAWER_WIDTH,
            backgroundColor: 'white',
            height: '100%',
            shadowColor: '#000',
            shadowOffset: { width: 2, height: 0 },
            shadowOpacity: 0.25,
            shadowRadius: 10,
            elevation: 5,
            transform: [{ translateX: slideAnim }],
          }}
        >
          <SafeAreaView style={{ flex: 1 }}>
            {/* Header */}
            <View
              style={{
                padding: 20,
                backgroundColor: '#1e40af',
                flexDirection: 'row',
                alignItems: 'center',
              }}
            >
              <View
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 24,
                  backgroundColor: 'rgba(255,255,255,0.2)',
                  justifyContent: 'center',
                  alignItems: 'center',
                  marginRight: 12,
                }}
              >
                <Ionicons name="scan" size={28} color="white" />
              </View>
              <View>
                <Text style={{ fontSize: 18, fontWeight: 'bold', color: 'white' }}>
                  OMR Scanner
                </Text>
                <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.8)' }}>
                  Sistema de Evaluación
                </Text>
              </View>
            </View>

            {/* Menu Items */}
            <View style={{ flex: 1, paddingTop: 8 }}>
              {/* Student Section */}
              <View style={{ paddingHorizontal: 16, paddingVertical: 8 }}>
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: '600',
                    color: '#6b7280',
                    textTransform: 'uppercase',
                    letterSpacing: 1,
                  }}
                >
                  Estudiante
                </Text>
              </View>
              {studentItems.map((item) => (
                <MenuItemButton
                  key={item.route}
                  item={item}
                  isActive={pathname === item.route}
                  onPress={() => handleItemPress(item.route)}
                />
              ))}

              {/* Divider */}
              <View
                style={{
                  height: 1,
                  backgroundColor: '#e5e7eb',
                  marginVertical: 8,
                  marginHorizontal: 16,
                }}
              />

              {/* Admin Section */}
              <View style={{ paddingHorizontal: 16, paddingVertical: 8 }}>
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: '600',
                    color: '#6b7280',
                    textTransform: 'uppercase',
                    letterSpacing: 1,
                  }}
                >
                  Administrador
                </Text>
              </View>
              {adminItems.map((item) => (
                <MenuItemButton
                  key={item.route}
                  item={item}
                  isActive={pathname === item.route || pathname.startsWith(item.route)}
                  onPress={() => handleItemPress(item.route)}
                />
              ))}
            </View>

            {/* Footer */}
            <View
              style={{
                padding: 16,
                borderTopWidth: 1,
                borderTopColor: '#e5e7eb',
              }}
            >
              <Text style={{ fontSize: 12, color: '#9ca3af', textAlign: 'center' }}>
                Versión 1.0.0 • Mock Mode
              </Text>
            </View>
          </SafeAreaView>
        </Animated.View>
      </View>
    </Modal>
  );
};

interface MenuItemButtonProps {
  item: MenuItem;
  isActive: boolean;
  onPress: () => void;
}

const MenuItemButton: React.FC<MenuItemButtonProps> = ({ item, isActive, onPress }) => {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
        marginHorizontal: 8,
        borderRadius: 8,
        backgroundColor: isActive ? '#eff6ff' : 'transparent',
      }}
    >
      <View
        style={{
          width: 36,
          height: 36,
          borderRadius: 8,
          backgroundColor: isActive ? '#1e40af' : '#f3f4f6',
          justifyContent: 'center',
          alignItems: 'center',
          marginRight: 12,
        }}
      >
        <Ionicons name={item.icon} size={20} color={isActive ? 'white' : '#6b7280'} />
      </View>
      <Text
        style={{
          fontSize: 15,
          fontWeight: isActive ? '600' : '400',
          color: isActive ? '#1e40af' : '#374151',
        }}
      >
        {item.label}
      </Text>
    </TouchableOpacity>
  );
};

// Zustand store for drawer state (global, works consistently on mobile)
import { create } from 'zustand';

interface DrawerState {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
}

export const useDrawer = create<DrawerState>((set) => ({
  isOpen: false,
  open: () => {
    console.log('[Drawer Store] Opening drawer');
    set({ isOpen: true });
  },
  close: () => {
    console.log('[Drawer Store] Closing drawer');
    set({ isOpen: false });
  },
  toggle: () =>
    set((state) => {
      console.log('[Drawer Store] Toggling drawer, was:', state.isOpen);
      return { isOpen: !state.isOpen };
    }),
}));
