'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { pcsApi } from '@/lib/api';
import { Monitor, Cpu, HardDrive, Clock } from 'lucide-react';
import { PCStatusBadge } from './PCStatusBadge';
import { EditPCModal } from './EditPCModal';
import { Button } from '@/components/ui/button';

interface PCCardProps {
    pc: any;
    zones?: any[];
}

export function PCCard({ pc, zones }: PCCardProps) {

    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const queryClient = useQueryClient();

    const updateStatusMutation = useMutation({
        mutationFn: (newStatus: string) => pcsApi.updateStatus(pc.id, newStatus),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['pcs', pc.zoneId] });
        },
    });

    const specs = pc.specs || {};
    const lastHeartbeat = pc.lastHeartbeat
        ? new Date(pc.lastHeartbeat).toLocaleString()
        : 'Nunca';

    return (
        <>
            <div className="bg-card rounded-lg border border-gray-200 dark:border-border p-4 hover:shadow-md transition-shadow">
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center space-x-2">
                        <Monitor className="h-5 w-5 text-muted-foreground" />
                        <h3 className="font-semibold text-foreground">{pc.name}</h3>
                    </div>
                    <PCStatusBadge status={pc.status} />
                </div>

                {pc.status === 'MALICIOUS' && (
                    <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded text-red-600 text-xs font-bold animate-pulse flex items-center">
                        <span className="mr-1">🚨</span> RIESGO: PC encendida con agente cerrado
                    </div>
                )}

                {/* Specs */}
                {Object.keys(specs).length > 0 && (
                    <div className="space-y-2 mb-4">
                        {specs.cpu && (
                            <div className="flex items-center text-sm text-muted-foreground">
                                <Cpu className="h-4 w-4 mr-2" />
                                <span>{specs.cpu}</span>
                            </div>
                        )}
                        {specs.gpu && (
                            <div className="flex items-center text-sm text-muted-foreground">
                                <Monitor className="h-4 w-4 mr-2" />
                                <span>{specs.gpu}</span>
                            </div>
                        )}
                        {specs.ram && (
                            <div className="flex items-center text-sm text-muted-foreground">
                                <HardDrive className="h-4 w-4 mr-2" />
                                <span>{specs.ram}</span>
                            </div>
                        )}
                    </div>
                )}

                {/* Last Heartbeat */}
                <div className="flex items-center text-xs text-muted-foreground mb-4">
                    <Clock className="h-3 w-3 mr-1" />
                    <span>Última conexión: {lastHeartbeat}</span>
                </div>

                {/* Actions */}
                <div className="flex items-center space-x-2">
                    <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => setIsEditModalOpen(true)}
                    >
                        Editar
                    </Button>

                    {pc.status === 'MAINTENANCE' && (
                        <Button
                            variant="outline"
                            size="sm"
                            className="flex-1"
                            onClick={() => updateStatusMutation.mutate('AVAILABLE')}
                            disabled={updateStatusMutation.isPending}
                        >
                            Habilitar
                        </Button>
                    )}

                    {pc.status === 'AVAILABLE' && (
                        <Button
                            variant="outline"
                            size="sm"
                            className="flex-1"
                            onClick={() => updateStatusMutation.mutate('MAINTENANCE')}
                            disabled={updateStatusMutation.isPending}
                        >
                            Mantenimiento
                        </Button>
                    )}
                </div>
            </div>

            {/* Edit Modal */}
            <EditPCModal
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                pc={pc}
                zones={zones}
                onSuccess={() => setIsEditModalOpen(false)}
            />

        </>
    );
}
