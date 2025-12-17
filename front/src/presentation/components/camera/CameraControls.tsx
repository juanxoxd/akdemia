import React from 'react';
import { View, TouchableOpacity, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CameraFacing, CaptureMode } from '../../../store';

interface CameraControlsProps {
  captureMode: CaptureMode;
  flashEnabled: boolean;
  cameraFacing: CameraFacing;
  isCapturing: boolean;
  canAutoCapture: boolean;
  onCapture: () => void;
  onToggleFlash: () => void;
  onToggleFacing: () => void;
  onToggleMode: () => void;
}

export const CameraControls: React.FC<CameraControlsProps> = ({
  captureMode,
  flashEnabled,
  cameraFacing,
  isCapturing,
  canAutoCapture,
  onCapture,
  onToggleFlash,
  onToggleFacing,
  onToggleMode,
}) => {
  return (
    <View className="absolute bottom-0 left-0 right-0 bg-black/50 pt-4 pb-8 px-6">
      {/* Mode indicator */}
      <View className="flex-row justify-center mb-4">
        <View className="bg-white/20 rounded-full px-4 py-1">
          <Text className="text-white text-sm">
            Modo: {captureMode === 'auto' ? 'Automático' : 'Manual'}
            {captureMode === 'auto' && canAutoCapture && ' (Listo)'}
          </Text>
        </View>
      </View>

      {/* Controls row */}
      <View className="flex-row items-center justify-between">
        {/* Flash toggle */}
        <TouchableOpacity
          className="w-14 h-14 rounded-full bg-white/20 items-center justify-center"
          onPress={onToggleFlash}
        >
          <Ionicons
            name={flashEnabled ? 'flash' : 'flash-off'}
            size={24}
            color="white"
          />
        </TouchableOpacity>

        {/* Capture button */}
        <TouchableOpacity
          className={`w-20 h-20 rounded-full items-center justify-center ${
            isCapturing ? 'bg-gray-400' : 'bg-white'
          }`}
          onPress={onCapture}
          disabled={isCapturing}
        >
          <View className="w-16 h-16 rounded-full border-4 border-primary-600">
            {captureMode === 'auto' && canAutoCapture && (
              <View className="flex-1 rounded-full bg-success-500" />
            )}
          </View>
        </TouchableOpacity>

        {/* Camera facing toggle */}
        <TouchableOpacity
          className="w-14 h-14 rounded-full bg-white/20 items-center justify-center"
          onPress={onToggleFacing}
        >
          <Ionicons
            name="camera-reverse"
            size={24}
            color="white"
          />
        </TouchableOpacity>
      </View>

      {/* Mode toggle */}
      <TouchableOpacity
        className="mt-4 items-center"
        onPress={onToggleMode}
      >
        <Text className="text-white/70 text-sm underline">
          Cambiar a modo {captureMode === 'auto' ? 'manual' : 'automático'}
        </Text>
      </TouchableOpacity>
    </View>
  );
};
