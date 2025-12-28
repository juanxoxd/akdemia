import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

export default function StatsScreen() {
    // Mock statistics data
    const stats = {
        totalExams: 4,
        activeExams: 3,
        totalStudents: 105,
        processedSheets: 40,
        averageScore: 75.5,
        passRate: 78.5,
    };

    const StatCard = ({
        icon,
        label,
        value,
        color,
        bgColor,
    }: {
        icon: keyof typeof Ionicons.glyphMap;
        label: string;
        value: string | number;
        color: string;
        bgColor: string;
    }) => (
        <View
            style={{
                backgroundColor: 'white',
                borderRadius: 16,
                padding: 16,
                flex: 1,
                marginHorizontal: 6,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.05,
                shadowRadius: 4,
                elevation: 2,
            }}
        >
            <View
                style={{
                    width: 44,
                    height: 44,
                    borderRadius: 12,
                    backgroundColor: bgColor,
                    justifyContent: 'center',
                    alignItems: 'center',
                    marginBottom: 12,
                }}
            >
                <Ionicons name={icon} size={24} color={color} />
            </View>
            <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#111827' }}>{value}</Text>
            <Text style={{ fontSize: 13, color: '#6b7280', marginTop: 2 }}>{label}</Text>
        </View>
    );

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: '#f9fafb' }} edges={['bottom']}>
            <ScrollView contentContainerStyle={{ padding: 16 }}>
                {/* Header */}
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
                    <Ionicons name="bar-chart" size={28} color="#1e40af" />
                    <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#111827', marginLeft: 8 }}>
                        Panel de Estadísticas
                    </Text>
                </View>

                {/* Stats Grid */}
                <View style={{ marginHorizontal: -6 }}>
                    <View style={{ flexDirection: 'row', marginBottom: 12 }}>
                        <StatCard
                            icon="document-text"
                            label="Total Exámenes"
                            value={stats.totalExams}
                            color="#1e40af"
                            bgColor="#eff6ff"
                        />
                        <StatCard
                            icon="checkmark-circle"
                            label="Exámenes Activos"
                            value={stats.activeExams}
                            color="#15803d"
                            bgColor="#dcfce7"
                        />
                    </View>
                    <View style={{ flexDirection: 'row', marginBottom: 12 }}>
                        <StatCard
                            icon="people"
                            label="Total Estudiantes"
                            value={stats.totalStudents}
                            color="#7c3aed"
                            bgColor="#ede9fe"
                        />
                        <StatCard
                            icon="scan"
                            label="Hojas Procesadas"
                            value={stats.processedSheets}
                            color="#0891b2"
                            bgColor="#cffafe"
                        />
                    </View>
                    <View style={{ flexDirection: 'row' }}>
                        <StatCard
                            icon="trending-up"
                            label="Promedio General"
                            value={`${stats.averageScore}%`}
                            color="#ea580c"
                            bgColor="#ffedd5"
                        />
                        <StatCard
                            icon="trophy"
                            label="Tasa de Aprobación"
                            value={`${stats.passRate}%`}
                            color="#16a34a"
                            bgColor="#dcfce7"
                        />
                    </View>
                </View>

                {/* Info Banner */}
                <View
                    style={{
                        backgroundColor: '#fef3c7',
                        borderRadius: 12,
                        padding: 16,
                        marginTop: 20,
                        flexDirection: 'row',
                    }}
                >
                    <Ionicons name="information-circle" size={24} color="#d97706" />
                    <View style={{ flex: 1, marginLeft: 12 }}>
                        <Text style={{ fontSize: 14, fontWeight: '600', color: '#92400e', marginBottom: 4 }}>
                            Modo Demo
                        </Text>
                        <Text style={{ fontSize: 13, color: '#a16207', lineHeight: 18 }}>
                            Las estadísticas mostradas son datos de ejemplo. En producción, estos valores
                            se calcularán en tiempo real desde el backend.
                        </Text>
                    </View>
                </View>

                {/* Recent Activity */}
                <View
                    style={{
                        backgroundColor: 'white',
                        borderRadius: 16,
                        padding: 16,
                        marginTop: 20,
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.05,
                        shadowRadius: 4,
                        elevation: 2,
                    }}
                >
                    <Text style={{ fontSize: 16, fontWeight: '600', color: '#111827', marginBottom: 12 }}>
                        Actividad Reciente
                    </Text>
                    {[
                        { action: 'Nueva hoja procesada', exam: 'Matemáticas I', time: 'Hace 5 min' },
                        { action: 'Estudiante registrado', exam: 'Física General', time: 'Hace 15 min' },
                        { action: 'Examen creado', exam: 'Historia del Perú', time: 'Hace 1 hora' },
                    ].map((activity, index) => (
                        <View
                            key={index}
                            style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                paddingVertical: 10,
                                borderBottomWidth: index < 2 ? 1 : 0,
                                borderBottomColor: '#f3f4f6',
                            }}
                        >
                            <View
                                style={{
                                    width: 8,
                                    height: 8,
                                    borderRadius: 4,
                                    backgroundColor: '#1e40af',
                                    marginRight: 12,
                                }}
                            />
                            <View style={{ flex: 1 }}>
                                <Text style={{ fontSize: 14, color: '#374151' }}>{activity.action}</Text>
                                <Text style={{ fontSize: 12, color: '#9ca3af' }}>{activity.exam}</Text>
                            </View>
                            <Text style={{ fontSize: 12, color: '#9ca3af' }}>{activity.time}</Text>
                        </View>
                    ))}
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}
