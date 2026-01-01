'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { lansApi, zonesApi } from '@/lib/api';
import { Monitor, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PCGrid } from '@/components/pcs/PCGrid';
import { CreatePCModal } from '@/components/pcs/CreatePCModal';

export default function PCsPage() {
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);

    // Fetch LANs
    const { data: lans, isLoading: lansLoading } = useQuery({
        queryKey: ['lans'],
        queryFn: lansApi.getAll,
    });

    // For now, use first LAN (in real app, user would select their LAN)
    const currentLanId = lans?.[0]?.id;

    // Fetch zones for current LAN
    const { data: zones, isLoading: zonesLoading } = useQuery({
        queryKey: ['zones', currentLanId],
        queryFn: () => currentLanId ? zonesApi.getByLan(currentLanId) : Promise.resolve([]),
        enabled: !!currentLanId,
    });

    const handleCreatePC = (zoneId: string) => {
        setSelectedZoneId(zoneId);
        setIsCreateModalOpen(true);
    };

    if (lansLoading || zonesLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-gray-500">Cargando...</div>
            </div>
        );
    }

    if (!zones || zones.length === 0) {
        return (
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Computadoras</h1>
                        <p className="text-gray-600 mt-1">Gestiona todas las PCs de tu LAN Center</p>
                    </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm p-12 border border-gray-200 text-center">
                    <Monitor className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                        No hay zonas creadas
                    </h3>
                    <p className="text-gray-600 mb-6">
                        Primero crea una zona para poder agregar computadoras
                    </p>
                    <Button onClick={() => window.location.href = '/dashboard/zones'}>
                        Ir a Zonas
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Computadoras</h1>
                    <p className="text-gray-600 mt-1">
                        Gestiona todas las PCs de tu LAN Center
                    </p>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600">Total PCs</p>
                            <p className="text-2xl font-bold text-gray-900 mt-1">
                                {zones?.reduce((acc: any, zone: any) => acc + (zone._count?.pcs || 0), 0) || 0}
                            </p>
                        </div>
                        <Monitor className="h-8 w-8 text-blue-500" />
                    </div>
                </div>

                <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600">Disponibles</p>
                            <p className="text-2xl font-bold text-green-600 mt-1">-</p>
                        </div>
                        <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center">
                            <div className="h-3 w-3 rounded-full bg-green-500"></div>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600">Ocupadas</p>
                            <p className="text-2xl font-bold text-yellow-600 mt-1">-</p>
                        </div>
                        <div className="h-8 w-8 rounded-full bg-yellow-100 flex items-center justify-center">
                            <div className="h-3 w-3 rounded-full bg-yellow-500"></div>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600">Mantenimiento</p>
                            <p className="text-2xl font-bold text-red-600 mt-1">-</p>
                        </div>
                        <div className="h-8 w-8 rounded-full bg-red-100 flex items-center justify-center">
                            <div className="h-3 w-3 rounded-full bg-red-500"></div>
                        </div>
                    </div>
                </div>
            </div>

            {/* PCs by Zone */}
            <div className="space-y-6">
                {zones?.map((zone: any) => (
                    <div key={zone.id} className="bg-white rounded-xl shadow-sm border border-gray-200">
                        <div className="p-6 border-b border-gray-200">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h2 className="text-xl font-semibold text-gray-900">
                                        {zone.name}
                                    </h2>
                                    {zone.description && (
                                        <p className="text-sm text-gray-600 mt-1">
                                            {zone.description}
                                        </p>
                                    )}
                                </div>
                                <Button
                                    onClick={() => handleCreatePC(zone.id)}
                                    size="sm"
                                >
                                    <Plus className="h-4 w-4 mr-2" />
                                    Agregar PC
                                </Button>
                            </div>
                        </div>
                        <div className="p-6">
                            <PCGrid zoneId={zone.id} lanId={currentLanId} zones={zones} />
                        </div>
                    </div>
                ))}
            </div>

            {/* Create PC Modal */}
            {selectedZoneId && (
                <CreatePCModal
                    isOpen={isCreateModalOpen}
                    onClose={() => {
                        setIsCreateModalOpen(false);
                        setSelectedZoneId(null);
                    }}
                    zoneId={selectedZoneId}
                    onSuccess={() => {
                        setIsCreateModalOpen(false);
                        setSelectedZoneId(null);
                    }}
                />
            )}
        </div>
    );
}
