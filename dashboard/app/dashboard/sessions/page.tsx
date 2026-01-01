'use client';

import { useQuery } from '@tanstack/react-query';
import { sessionsApi } from '@/lib/api';
import { Activity, Clock, DollarSign, User } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function SessionsPage() {
    const { data: sessions, isLoading, refetch } = useQuery({
        queryKey: ['sessions', 'active'],
        queryFn: () => sessionsApi.getActive(),
        refetchInterval: 5000, // Actualizar cada 5 segundos
    });

    const formatDuration = (startedAt: string) => {
        const start = new Date(startedAt);
        const now = new Date();
        const diffMs = now.getTime() - start.getTime();
        const minutes = Math.floor(diffMs / 60000);
        return `${minutes} min`;
    };

    const handleEndSession = async (sessionId: string) => {
        try {
            await sessionsApi.end(sessionId, 'BALANCE');
            refetch();
        } catch (error) {
            console.error('Error ending session:', error);
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold">Sesiones Activas</h1>
                <p className="text-gray-600 mt-1">Monitoreo en tiempo real</p>
            </div>

            {sessions && sessions.length > 0 ? (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                    Usuario
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                    PC
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                    Inicio
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                    Duración
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                    Acciones
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {sessions.map((session: any) => (
                                <tr key={session.id}>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center">
                                            <User className="h-5 w-5 text-gray-400 mr-2" />
                                            <span className="text-sm font-medium text-gray-900">
                                                {session.user?.username || 'N/A'}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className="text-sm text-gray-900">
                                            {session.pc?.name || 'N/A'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className="text-sm text-gray-600">
                                            {new Date(session.startedAt).toLocaleTimeString()}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center">
                                            <Clock className="h-4 w-4 text-gray-400 mr-1" />
                                            <span className="text-sm text-gray-900">
                                                {formatDuration(session.startedAt)}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => handleEndSession(session.id)}
                                            className="text-red-600 hover:text-red-700"
                                        >
                                            Finalizar
                                        </Button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div className="bg-white rounded-xl shadow-sm p-12 text-center">
                    <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900">No hay sesiones activas</h3>
                    <p className="text-gray-600 mt-1">Las sesiones activas aparecerán aquí</p>
                </div>
            )}
        </div>
    );
}
