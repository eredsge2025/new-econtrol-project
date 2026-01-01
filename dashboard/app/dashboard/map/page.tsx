'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { lansApi, zonesApi } from '@/lib/api';
import { PCMap } from '@/components/map/PCMap';
import { MapPin } from 'lucide-react';

export default function MapPage() {
    // Fetch LANs
    const { data: lans, isLoading: lansLoading } = useQuery({
        queryKey: ['lans'],
        queryFn: lansApi.getAll,
    });

    // For now, use first LAN (in real app, user would select their LAN)
    const currentLanId = lans?.[0]?.id;

    // Fetch zones for current LAN (needed to filter or group PCs if desired, though Map usually shows all)
    // We can fetch just PCs by Zone in the PCMap component or passing them down.
    // For the Map, it's better to get ALL PCs of the LAN. 
    // Since our API currently gets PCs by Zone, we might need to iterate zones 
    // or just pass the zones to the map component.

    // Let's pass the zone list to the PCMap component so it can fetch PCs for each zone.
    const { data: zones, isLoading: zonesLoading } = useQuery({
        queryKey: ['zones', currentLanId],
        queryFn: () => currentLanId ? zonesApi.getByLan(currentLanId) : Promise.resolve([]),
        enabled: !!currentLanId,
    });

    if (lansLoading || zonesLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-gray-500">Cargando mapa...</div>
            </div>
        );
    }

    if (!zones || zones.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-64 text-center">
                <MapPin className="h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900">No hay zonas disponibles</h3>
                <p className="text-gray-500 mt-2">Crea zonas y agrega PCs para ver el mapa.</p>
            </div>
        );
    }

    return (
        <div className="h-[calc(100vh-8rem)] flex flex-col">
            {/*   <div className="flex items-center justify-between mb-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Mapa del LAN</h1>
                    <p className="text-gray-600">
                        Gestiona la distribución física de tus equipos
                    </p>
                </div>
            </div> */}

            <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden relative">
                <PCMap zones={zones} />
            </div>
        </div>
    );
}
