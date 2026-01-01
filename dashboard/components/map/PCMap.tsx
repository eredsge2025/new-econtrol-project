'use client';

import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { pcsApi } from '@/lib/api';
import { MapPCCard } from './MapPCCard';
import { Button } from '@/components/ui/button';
import { Save, Edit2, X, RefreshCw, Monitor, User, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { io } from 'socket.io-client';
import {
    Drawer,
    DrawerContent,
    DrawerHeader,
    DrawerTitle,
    DrawerDescription,
} from '@/components/ui/drawer';
import { bundlesApi, rateSchedulesApi, sessionsApi } from '@/lib/api';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Clock, Tag } from 'lucide-react';

interface PCMapProps {
    zones: any[];
}

export function PCMap({ zones }: PCMapProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [pendingChanges, setPendingChanges] = useState<Record<string, { x: number; y: number }>>({});
    const containerRef = useRef<HTMLDivElement>(null);
    const queryClient = useQueryClient();
    const [selectedPc, setSelectedPc] = useState<any>(null);
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);

    const lanId = zones?.[0]?.lanId;

    useEffect(() => {
        if (!lanId) return;

        const socketUrl = `http://${window.location.hostname}:3001/pcs`;
        const socket = io(socketUrl, {
            transports: ['websocket', 'polling']
        });

        socket.on('connect', () => {
            console.log('✅ Socket connected for LAN:', lanId);
            socket.emit('join_lan', lanId);
        });

        socket.on('pc_status_update', (updatedPc: any) => {
            console.log('📡 Real-time update received for PC:', updatedPc.name, 'Status:', updatedPc.status, 'User:', updatedPc.activeUser);
            const targetZoneId = updatedPc.zoneId;
            if (targetZoneId) {
                // Actualizar caché de la zona específica
                queryClient.setQueryData(['pcs', targetZoneId], (oldData: any[] | undefined) => {
                    if (!oldData) return oldData;
                    const newData = oldData.map(pc => pc.id === updatedPc.id ? { ...pc, ...updatedPc } : pc);
                    console.log(`✅ Cache updated for zone ${targetZoneId}. PC ${updatedPc.name} now has ${updatedPc.activeUser ? 'a user' : 'no user'}.`);
                    return newData;
                });
                // Invalidar para consistencia final
                queryClient.invalidateQueries({ queryKey: ['pcs', targetZoneId] });
            }
        });

        return () => {
            socket.disconnect();
        };
    }, [lanId, queryClient]);

    return (
        <div className="h-full flex flex-col">
            {/* Toolbar */}
            <div className="px-4 py-1  flex justify-between items-center bg-muted">
                <div className="flex space-x-2">
                    <span className="text-sm text-muted-foreground">
                        {isEditing
                            ? "Modo Edición: Arrastra las PCs para posicionarlas."
                            : "Consola de Cajero."}
                    </span>
                </div>
                <div className="flex space-x-2">
                    {isEditing ? (
                        <>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                    setIsEditing(false);
                                    setPendingChanges({});
                                    toast.info("Cambios descartados");
                                }}
                            >
                                <X className="h-4 w-4 mr-2" />
                                Cancelar
                            </Button>
                            <Button
                                size="sm"
                                onClick={() => saveChanges()}
                                disabled={Object.keys(pendingChanges).length === 0}
                            >
                                <Save className="h-4 w-4 mr-2" />
                                Guardar Distribución
                            </Button>
                        </>
                    ) : (
                        <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                            <Edit2 className="h-4 w-4 mr-2" />
                            Editar Mapa
                        </Button>
                    )}
                </div>
            </div>

            {/* Map Canvas */}
            <div
                ref={containerRef}
                className="flex-1 bg-background/80 relative overflow-hidden"
                style={{
                    backgroundImage: 'radial-gradient(var(--border) 1px, transparent 1px)',
                    backgroundSize: '20px 20px'
                }}
            >
                {zones.map(zone => (
                    <ZoneLayer
                        key={zone.id}
                        zoneId={zone.id}
                        lanId={zone.lanId}
                        isEditing={isEditing}
                        onPositionChange={(id, x, y) => {
                            setPendingChanges(prev => ({
                                ...prev,
                                [id]: { x, y }
                            }));
                        }}
                        containerRef={containerRef}
                        onPcClick={(pc) => {
                            setSelectedPc(pc);
                            setIsDrawerOpen(true);
                        }}
                    />
                ))}
            </div>

            {/* PC Details Drawer */}
            <PCDetailsDrawer
                pc={selectedPc}
                isOpen={isDrawerOpen}
                onClose={() => setIsDrawerOpen(false)}
            />
        </div>
    );

    function saveChanges() {
        // Here we would call the API to update positions
        // We'll iterate over pendingChanges and fire updates.
        // In real world, we want a bulk update endpoint.
        // For now, we will use Promise.all with individual updates.

        const updates = Object.entries(pendingChanges).map(([id, pos]) => {
            return pcsApi.update(id, {
                positionX: Math.round(pos.x),
                positionY: Math.round(pos.y)
            });
        });

        toast.promise(Promise.all(updates), {
            loading: 'Guardando distribución...',
            success: () => {
                setIsEditing(false);
                setPendingChanges({});
                queryClient.invalidateQueries({ queryKey: ['pcs'] });
                return 'Mapa actualizado correctamente';
            },
            error: 'Error al guardar los cambios'
        });
    }
}

// Sub-component to fetch PCs for a zone
function ZoneLayer({ zoneId, lanId, isEditing, onPositionChange, onPcClick, containerRef }: {
    zoneId: string,
    lanId: string,
    isEditing: boolean,
    onPositionChange: (id: string, x: number, y: number) => void,
    onPcClick: (pc: any) => void,
    containerRef: React.RefObject<HTMLDivElement | null>
}) {
    const { data: pcs } = useQuery({
        queryKey: ['pcs', zoneId],
        queryFn: () => pcsApi.getByZone(zoneId),
    });

    if (!pcs) return null;

    return (
        <>
            {pcs.map((pc: any) => (
                <MapPCCard
                    key={pc.id}
                    pc={pc}
                    isEditing={isEditing}
                    onPositionChange={onPositionChange}
                    onClick={onPcClick}
                    containerRef={containerRef}
                />
            ))}
        </>
    );
}

function PCDetailsDrawer({
    pc,
    isOpen,
    onClose,
}: {
    pc: any;
    isOpen: boolean;
    onClose: () => void;
}) {
    const { data: rates, isLoading: isLoadingRates } = useQuery({
        queryKey: ['rates', pc?.zoneId],
        queryFn: () => rateSchedulesApi.getByZone(pc?.zoneId),
        enabled: !!pc?.zoneId && isOpen,
    });

    const { data: bundles, isLoading: isLoadingBundles } = useQuery({
        queryKey: ['bundles', pc?.zoneId],
        queryFn: () => bundlesApi.getByZone(pc?.zoneId),
    });

    const queryClient = useQueryClient();

    const startSessionMutation = useMutation({
        mutationFn: sessionsApi.start,
        onSuccess: (newSession) => {
            toast.success('Sesión iniciada correctamente');
            queryClient.invalidateQueries({ queryKey: ['pcs'] });
            onClose();
        },
        onError: (error: any) => {
            console.error('Error starting session:', error);
            const msg = error.response?.data?.message || 'Error al iniciar sesión';
            toast.error(msg);
        }
    });

    const extendSessionMutation = useMutation({
        mutationFn: ({ id, data }: { id: string; data: any }) => sessionsApi.extend(id, data),
        onSuccess: (updatedSession) => {
            toast.success('Tiempo extendido correctamente');
            queryClient.invalidateQueries({ queryKey: ['pcs'] });
            onClose();
        },
        onError: (error: any) => {
            console.error('Error extending session:', error);
            const msg = error.response?.data?.message || 'Error al extender tiempo';
            toast.error(msg);
        }
    });

    const undoSessionMutation = useMutation({
        mutationFn: (id: string) => sessionsApi.undo(id),
        onSuccess: () => {
            toast.success('Cambio deshecho correctamente');
            queryClient.invalidateQueries({ queryKey: ['pcs'] });
            // Close drawer? Or refresh? Refresh happens via invalidation.
        },
        onError: (error: any) => {
            console.error('Error undoing session:', error);
            const msg = error.response?.data?.message || 'Error al deshacer cambio';
            toast.error(msg);
        }
    });

    const handleStartSession = (type: 'FIXED' | 'BUNDLE', item: any) => {
        if (!pc) return;

        const activeSession = pc.sessions?.find((s: any) => s.status === 'ACTIVE' || s.status === 'PAUSED');

        // Common Payload
        const payload: any = {
            pcId: pc.id,
            pricingType: type,
            // userId not needed for extend usually, but if start it is.
        };

        if (type === 'FIXED') {
            payload.minutes = item.minutes;
        } else if (type === 'BUNDLE') {
            payload.bundleId = item.id;
        }

        if (activeSession) {
            // EXTEND
            extendSessionMutation.mutate({ id: activeSession.id, data: payload });
        } else {
            // START
            payload.userId = pc.activeUser?.id; // Optional
            startSessionMutation.mutate(payload);
        }
    };

    if (!pc) return null;

    return (
        <Drawer open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DrawerContent className="max-h-[90dvh]">
                <div className="mx-auto w-full max-w-full overflow-y-auto px-4">
                    {/* HEADER */}
                    <DrawerHeader className="border-b px-4 py-3">
                        <div className="flex items-center justify-between gap-4">
                            <div className="space-y-0.5">
                                <DrawerTitle className="text-lg sm:text-xl flex items-center gap-2">
                                    <Monitor className="h-5 w-5 text-blue-600" />
                                    {pc.name}
                                </DrawerTitle>
                                {/*  <DrawerDescription className="text-xs sm:text-sm">
                                    Configuración de zona · Tarifas · Paquetes
                                </DrawerDescription> */}
                            </div>


                            {pc.activeUser ? (
                                <Badge
                                    className="text-xs px-2 py-0.5 capitalize"
                                >
                                    {pc.activeUser.username || pc.activeUser.email}
                                </Badge>
                            ) : (
                                <Badge
                                    variant={pc.status === 'AVAILABLE' ? 'success' : 'secondary'}
                                    className="text-xs px-2 py-0.5 capitalize"
                                >
                                    {pc.status.toLowerCase()}
                                </Badge>
                            )}


                        </div>
                    </DrawerHeader>

                    {/* CONTENT */}
                    <div className="p-4 space-y-5 px-10">
                        {/* ACCIONES DE SESIÓN ACTIVA */}
                        {(() => {
                            const activeSession = pc.sessions?.find((s: any) => s.status === 'ACTIVE');
                            if (activeSession) {
                                return (
                                    <div className="mb-6 p-4 border rounded-lg bg-red-50 border-red-100 flex items-center justify-between">
                                        <div>
                                            <h4 className="font-semibold text-red-900">Sesión en Curso</h4>
                                            <p className="text-xs text-red-700">Started: {new Date(activeSession.startedAt).toLocaleTimeString()}</p>
                                        </div>
                                        <div className="flex flex-col gap-2">
                                            <Button
                                                variant="destructive"
                                                className="w-full"
                                                size="sm"
                                                onClick={() => {
                                                    const promise = sessionsApi.end(activeSession.id, 'CASH');
                                                    toast.promise(promise, {
                                                        loading: 'Finalizando sesión...',
                                                        success: () => {
                                                            queryClient.invalidateQueries({ queryKey: ['pcs'] });
                                                            return 'Sesión finalizada correctamente';
                                                        },
                                                        error: 'Error al finalizar sesión'
                                                    });
                                                }}
                                            >
                                                Terminar Sesión
                                            </Button>

                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="w-full text-xs text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                                                onClick={() => undoSessionMutation.mutate(activeSession.id)}
                                                disabled={undoSessionMutation.isPending}
                                            >
                                                <RotateCcw className="w-3 h-3 mr-1" />
                                                Deshacer Último Cambio (2min)
                                            </Button>
                                        </div>
                                    </div>
                                );
                            }
                            return null;
                        })()}

                        {/* TARIFAS */}
                        <section className="space-y-2">
                            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-2">
                                <Clock className="h-4 w-4" />
                                Tarifas por tiempo
                            </h3>

                            <div
                                className="
                  grid
                  grid-cols-1
                  sm:grid-cols-5
                  lg:grid-cols-8
                  gap-2
                "
                            >
                                {isLoadingRates ? (
                                    <div className="col-span-full text-center py-4 text-xs text-muted-foreground italic">
                                        Cargando tarifas...
                                    </div>
                                ) : rates?.length > 0 ? (
                                    rates.map((rate: any) => (
                                        <div
                                            key={rate.id}
                                            onClick={() => handleStartSession('FIXED', rate)}
                                            className="
                        flex items-center justify-between
                        rounded-md border border-border
                        bg-muted
                        px-3 py-2
                        text-sm
                        cursor-pointer
                        hover:bg-muted/80 hover:scale-[1.02] active:scale-95
                        transition-all
                      "
                                        >
                                            <span className="font-medium text-foreground">
                                                {rate.minutes} min
                                            </span>
                                            <span className="font-bold text-emerald-600">
                                                S/ {Number(rate.price).toFixed(2)}
                                            </span>
                                        </div>
                                    ))
                                ) : (
                                    <div className="col-span-full text-center py-4 text-xs text-muted-foreground italic">
                                        No hay tarifas configuradas
                                    </div>
                                )}
                            </div>
                        </section>

                        {/* PAQUETES */}
                        <section className="space-y-2">
                            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-2">
                                <Tag className="h-4 w-4" />
                                Paquetes disponibles
                            </h3>

                            <div
                                className="
                  grid
                  grid-cols-1
                  sm:grid-cols-6
                  lg:grid-cols-10
                  gap-2
                "
                            >
                                {isLoadingBundles ? (
                                    <div className="col-span-full text-center py-4 text-xs text-muted-foreground italic">
                                        Cargando paquetes...
                                    </div>
                                ) : bundles?.length > 0 ? (
                                    bundles.map((bundle: any) => (
                                        <div
                                            key={bundle.id}
                                            onClick={() => handleStartSession('BUNDLE', bundle)}
                                            className="
                        rounded-md border border-border
                        p-3
                        bg-card
                        flex flex-col justify-between
                        gap-2
                        hover:border-blue-400
                        cursor-pointer
                        hover:shadow-md hover:scale-[1.02] active:scale-95
                        transition-all
                      "
                                        >
                                            <div className="space-y-0.5">
                                                <p className="text-sm font-semibold truncate text-foreground">
                                                    {bundle.name}
                                                </p>
                                                <p className="text-xs text-muted-foreground">
                                                    {bundle.minutes} minutos
                                                </p>
                                            </div>

                                            <div className="flex items-center justify-between">
                                                <span className="text-sm font-bold text-blue-600">
                                                    S/ {Number(bundle.price).toFixed(2)}
                                                </span>

                                                {bundle.isSaveable && (
                                                    <Badge
                                                        variant="outline"
                                                        className="text-[10px] h-4"
                                                    >
                                                        Guardable
                                                    </Badge>
                                                )}
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="col-span-full text-center py-4 text-xs text-muted-foreground italic">
                                        No hay paquetes en esta zona
                                    </div>
                                )}
                            </div>
                        </section>
                    </div>
                </div>
            </DrawerContent >
        </Drawer >
    );
}

