'use client';

import { useQuery } from '@tanstack/react-query';
import { lansApi, sessionsApi } from '@/lib/api';
import { Building2, Activity, Users, DollarSign } from 'lucide-react';

export default function DashboardPage() {
    const { data: lans } = useQuery({
        queryKey: ['lans'],
        queryFn: lansApi.getAll,
    });

    const { data: activeSessions } = useQuery({
        queryKey: ['sessions', 'active'],
        queryFn: () => sessionsApi.getActive(),
    });

    const stats = [
        {
            name: 'LANs Activos',
            value: lans?.length || 0,
            icon: Building2,
            color: 'bg-blue-500',
        },
        {
            name: 'Sesiones Activas',
            value: activeSessions?.length || 0,
            icon: Activity,
            color: 'bg-green-500',
        },
        {
            name: 'Usuarios',
            value: '-',
            icon: Users,
            color: 'bg-purple-500',
        },
        {
            name: 'Ingresos Hoy',
            value: '$0.00',
            icon: DollarSign,
            color: 'bg-yellow-500',
        },
    ];

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
                <p className="text-gray-600 mt-1">Bienvenido al sistema eControl</p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {stats.map((stat) => {
                    const Icon = stat.icon;
                    return (
                        <div
                            key={stat.name}
                            className="bg-white rounded-xl shadow-sm p-6 border border-gray-200"
                        >
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-gray-600">{stat.name}</p>
                                    <p className="text-3xl font-bold text-gray-900 mt-2">
                                        {stat.value}
                                    </p>
                                </div>
                                <div className={`${stat.color} p-3 rounded-lg`}>
                                    <Icon className="h-6 w-6 text-white" />
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Active Sessions */}
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
                <h2 className="text-xl font-semibold mb-4">Sesiones Activas</h2>
                {activeSessions && activeSessions.length > 0 ? (
                    <div className="space-y-3">
                        {activeSessions.map((session: any) => (
                            <div
                                key={session.id}
                                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                            >
                                <div>
                                    <p className="font-medium">{session.user?.username || 'Usuario'}</p>
                                    <p className="text-sm text-gray-600">PC: {session.pc?.name || 'N/A'}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm text-gray-600">
                                        {new Date(session.startedAt).toLocaleTimeString()}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-gray-500 text-center py-8">
                        No hay sesiones activas
                    </p>
                )}
            </div>
        </div>
    );
}
