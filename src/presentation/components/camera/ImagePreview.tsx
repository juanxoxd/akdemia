import React from 'react';
import { View, Image, Text } from 'react-native';
import { CapturedImage } from '../../../domain/entities';
import { Button } from '../common/Button';

interface ImagePreviewProps {
  image: CapturedImage;
  onConfirm: () => void;
  onRetry: () => void;
  isUploading: boolean;
}

export const ImagePreview: React.FC<ImagePreviewProps> = ({
  image,
  onConfirm,
  onRetry,
  isUploading,
}) => {
  return (
    <View className="flex-1 bg-black">
      {/* Image */}
      <View className="flex-1 items-center justify-center p-4">
        <Image
          source={{ uri: image.uri }}
          className="w-full h-full rounded-2xl"
          resizeMode="contain"
        />
      </View>

      {/* Image info */}
      <View className="px-4 py-2">
        <Text className="text-white/70 text-center text-sm">
          {image.width} x {image.height}px • {image.sizeInMB.toFixed(2)} MB
        </Text>
      </View>

      {/* Actions */}
      <View className="flex-row gap-4 px-6 pb-8 pt-4">
        <View className="flex-1">
          <Button
            title="Reintentar"
            onPress={onRetry}
            variant="outline"
            fullWidth
            disabled={isUploading}
          />
        </View>
        <View className="flex-1">
          <Button
            title="Enviar"
            onPress={onConfirm}
            variant="primary"
            fullWidth
            loading={isUploading}
          />
        </View>
      </View>
    </View>
  );
};
