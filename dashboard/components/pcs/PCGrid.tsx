'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { pcsApi } from '@/lib/api';
import { PCCard } from './PCCard';
import { Monitor } from 'lucide-react';
import { useEffect } from 'react';
import { io } from 'socket.io-client';

interface PCGridProps {
    zoneId: string;
    lanId: string;
    zones?: any[];
}

export function PCGrid({ zoneId, lanId, zones }: PCGridProps) {

    const queryClient = useQueryClient();
    const { data: pcs, isLoading, error } = useQuery({
        queryKey: ['pcs', zoneId],
        queryFn: () => pcsApi.getByZone(zoneId),
        refetchInterval: 10000, // Relajamos el polling a 10s porque ahora tenemos WebSockets
    });

    useEffect(() => {
        // Usar el host actual para conectar el socket (útil si se accede por IP en red local)
        const socketUrl = `http://${window.location.hostname}:3001/pcs`;
        const socket = io(socketUrl);

        socket.on('connect', () => {
            console.log(`Connected to PCs WebSocket at ${socketUrl}. Joining room for LAN: ${lanId}`);
            socket.emit('join_lan', lanId);
        });

        socket.on('connect_error', (err) => {
            console.error('WebSocket Connection Error:', err.message);
        });

        socket.on('pc_status_update', (data) => {
            console.log('Real-time PC status update:', data);
            // Invalidar la query para refrescar los datos inmediatamente
            queryClient.invalidateQueries({ queryKey: ['pcs', zoneId] });
        });

        return () => {
            socket.disconnect();
        };
    }, [zoneId, lanId, queryClient]);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="text-gray-500">Cargando PCs...</div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="text-center py-12">
                <p className="text-red-600">Error al cargar las PCs</p>
            </div>
        );
    }

    if (!pcs || pcs.length === 0) {
        return (
            <div className="text-center py-12">
                <Monitor className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">
                    No hay PCs en esta zona. Haz clic en &quot;Agregar PC&quot; para crear una.
                </p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {pcs.map((pc: any) => (
                <PCCard key={pc.id} pc={pc} zones={zones} />
            ))}
        </div>
    );
}
