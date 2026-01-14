import React, { useState, useEffect } from 'react';
import { View, Text, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Input } from '../common/Input';
import { Button } from '../common/Button';
import { useExamStore } from '../../../store';

interface StudentFormProps {
  onSubmit: (data: { studentCode: string; fullName: string; email: string }) => void;
  isLoading: boolean;
  error?: string | null;
}

export const StudentForm: React.FC<StudentFormProps> = ({ onSubmit, isLoading, error }) => {
  const { currentStudent, setCurrentStudent } = useExamStore();

  const [studentCode, setStudentCode] = useState(currentStudent?.studentCode || '');
  const [fullName, setFullName] = useState(currentStudent?.fullName || '');
  const [email, setEmail] = useState(currentStudent?.email || '');
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Save to store for persistence
  useEffect(() => {
    setCurrentStudent({ studentCode, fullName, email });
  }, [studentCode, fullName, email, setCurrentStudent]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!studentCode.trim()) {
      newErrors.studentCode = 'El código de estudiante es requerido';
    }

    if (!fullName.trim()) {
      newErrors.fullName = 'El nombre completo es requerido';
    } else if (fullName.trim().length < 3) {
      newErrors.fullName = 'El nombre debe tener al menos 3 caracteres';
    }

    if (!email.trim()) {
      newErrors.email = 'El correo electrónico es requerido';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = 'Ingrese un correo electrónico válido';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (validate()) {
      onSubmit({ studentCode, fullName, email });
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1"
    >
      <ScrollView
        className="flex-1 px-6"
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text className="text-2xl font-bold text-gray-900 mb-2">Datos del Estudiante</Text>
        <Text className="text-gray-600 mb-6">Ingrese sus datos para continuar con el examen</Text>

        <Input
          label="Código de Estudiante"
          placeholder="Ej: 2024-0101"
          value={studentCode}
          onChangeText={setStudentCode}
          error={errors.studentCode}
          autoCapitalize="characters"
          keyboardType="default"
        />

        <Input
          label="Nombre Completo"
          placeholder="Ej: Juan Pérez García"
          value={fullName}
          onChangeText={setFullName}
          error={errors.fullName}
          autoCapitalize="words"
        />

        <Input
          label="Correo Electrónico"
          placeholder="Ej: estudiante@email.com"
          value={email}
          onChangeText={setEmail}
          error={errors.email}
          keyboardType="email-address"
          autoCapitalize="none"
        />

        {error && (
          <View className="bg-error-50 p-4 rounded-xl mb-4">
            <Text className="text-error-600">{error}</Text>
          </View>
        )}

        <View className="mt-4 mb-8">
          <Button title="Continuar" onPress={handleSubmit} loading={isLoading} fullWidth />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};
