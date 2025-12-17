import React from 'react';
import { TouchableOpacity, Text, ActivityIndicator, View } from 'react-native';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  icon,
  fullWidth = false,
}) => {
  const getContainerStyles = () => {
    const baseStyles = 'rounded-xl flex-row items-center justify-center';
    
    const variantStyles = {
      primary: 'bg-primary-600',
      secondary: 'bg-gray-600',
      outline: 'bg-transparent border-2 border-primary-600',
      danger: 'bg-error-500',
    };
    
    const sizeStyles = {
      sm: 'px-4 py-2',
      md: 'px-6 py-3',
      lg: 'px-8 py-4',
    };
    
    const disabledStyles = disabled ? 'opacity-50' : '';
    const widthStyles = fullWidth ? 'w-full' : '';
    
    return `${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${disabledStyles} ${widthStyles}`;
  };
  
  const getTextStyles = () => {
    const baseStyles = 'font-semibold';
    
    const variantStyles = {
      primary: 'text-white',
      secondary: 'text-white',
      outline: 'text-primary-600',
      danger: 'text-white',
    };
    
    const sizeStyles = {
      sm: 'text-sm',
      md: 'text-base',
      lg: 'text-lg',
    };
    
    return `${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]}`;
  };

  return (
    <TouchableOpacity
      className={getContainerStyles()}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.7}
    >
      {loading ? (
        <ActivityIndicator 
          color={variant === 'outline' ? '#2563eb' : '#ffffff'} 
          size="small" 
        />
      ) : (
        <View className="flex-row items-center gap-2">
          {icon}
          <Text className={getTextStyles()}>{title}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
};
