import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, TouchableOpacity, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

export type ToastType = 'success' | 'error' | 'info' | 'warning';

interface ToastProps {
    visible: boolean;
    message: string;
    type?: ToastType;
    duration?: number;
    onHide: () => void;
}

const toastConfig: Record<ToastType, { icon: keyof typeof Ionicons.glyphMap; bg: string; iconColor: string }> = {
    success: { icon: 'checkmark-circle', bg: '#22c55e', iconColor: '#ffffff' },
    error: { icon: 'close-circle', bg: '#ef4444', iconColor: '#ffffff' },
    info: { icon: 'information-circle', bg: '#3b82f6', iconColor: '#ffffff' },
    warning: { icon: 'warning', bg: '#f59e0b', iconColor: '#ffffff' },
};

export const Toast: React.FC<ToastProps> = ({
    visible,
    message,
    type = 'info',
    duration = 3000,
    onHide,
}) => {
    const slideAnim = useRef(new Animated.Value(-100)).current;
    const opacityAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (visible) {
            // Slide in
            Animated.parallel([
                Animated.spring(slideAnim, {
                    toValue: 0,
                    useNativeDriver: true,
                    tension: 50,
                    friction: 8,
                }),
                Animated.timing(opacityAnim, {
                    toValue: 1,
                    duration: 200,
                    useNativeDriver: true,
                }),
            ]).start();

            // Auto hide
            const timer = setTimeout(() => {
                hideToast();
            }, duration);

            return () => clearTimeout(timer);
        }
    }, [visible, duration]);

    const hideToast = () => {
        Animated.parallel([
            Animated.timing(slideAnim, {
                toValue: -100,
                duration: 200,
                useNativeDriver: true,
            }),
            Animated.timing(opacityAnim, {
                toValue: 0,
                duration: 200,
                useNativeDriver: true,
            }),
        ]).start(() => {
            onHide();
        });
    };

    if (!visible) return null;

    const config = toastConfig[type];

    return (
        <Animated.View
            style={{
                position: 'absolute',
                top: 60,
                left: 16,
                right: 16,
                zIndex: 9999,
                transform: [{ translateY: slideAnim }],
                opacity: opacityAnim,
            }}
        >
            <TouchableOpacity
                activeOpacity={0.9}
                onPress={hideToast}
                style={{
                    backgroundColor: config.bg,
                    borderRadius: 12,
                    padding: 16,
                    flexDirection: 'row',
                    alignItems: 'center',
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.3,
                    shadowRadius: 8,
                    elevation: 8,
                }}
            >
                <Ionicons name={config.icon} size={24} color={config.iconColor} />
                <Text
                    style={{
                        flex: 1,
                        color: 'white',
                        fontSize: 15,
                        fontWeight: '500',
                        marginLeft: 12,
                        marginRight: 8,
                    }}
                    numberOfLines={2}
                >
                    {message}
                </Text>
                <Ionicons name="close" size={20} color="rgba(255,255,255,0.7)" />
            </TouchableOpacity>
        </Animated.View>
    );
};

// Toast context and hook for global usage
import { createContext, useContext, useState, useCallback } from 'react';

interface ToastContextType {
    showToast: (message: string, type?: ToastType, duration?: number) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [toast, setToast] = useState<{
        visible: boolean;
        message: string;
        type: ToastType;
        duration: number;
    }>({
        visible: false,
        message: '',
        type: 'info',
        duration: 3000,
    });

    const showToast = useCallback((message: string, type: ToastType = 'info', duration: number = 3000) => {
        setToast({
            visible: true,
            message,
            type,
            duration,
        });
    }, []);

    const hideToast = useCallback(() => {
        setToast(prev => ({ ...prev, visible: false }));
    }, []);

    return (
        <ToastContext.Provider value={{ showToast }}>
            {children}
            <Toast
                visible={toast.visible}
                message={toast.message}
                type={toast.type}
                duration={toast.duration}
                onHide={hideToast}
            />
        </ToastContext.Provider>
    );
};

export const useToast = () => {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within a ToastProvider');
    }
    return context;
};
