'use client';

import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { pcsApi } from '@/lib/api';
import { MapPCCard } from './MapPCCard';
import { Button } from '@/components/ui/button';
import { Save, Edit2, X, RefreshCw, Monitor, User, RotateCcw, History, AlertTriangle } from 'lucide-react';
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
import { ScrollArea } from '@/components/ui/scroll-area';
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
        const serverUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
        const socketUrl = `${serverUrl}/pcs`;

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
                queryClient.setQueryData(['pcs', targetZoneId], (oldData: any[] | undefined) => {
                    if (!oldData) return oldData;
                    const newData = oldData.map(pc => pc.id === updatedPc.id ? { ...pc, ...updatedPc } : pc);
                    console.log(`✅ Cache updated for zone ${targetZoneId}. PC ${updatedPc.name} now has ${updatedPc.activeUser ? 'a user' : 'no user'}.`);
                    return newData;
                });
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


// Helper component for the Active Session Card
function ActiveSessionCard({ session, onEnd, onUndo, isPendingUndo }: { session: any, onEnd: () => void, onUndo: () => void, isPendingUndo: boolean }) {
    const [duration, setDuration] = useState<string>('00:00:00');
    const [timeLeft, setTimeLeft] = useState<string>('');
    const [progress, setProgress] = useState(0);

    const isPaused = session.status === 'PAUSED';
    const isExpired = session.status === 'EXPIRED';

    useEffect(() => {
        const updateTimer = () => {
            const now = new Date();
            const start = new Date(session.startedAt);

            const diffMs = now.getTime() - start.getTime();
            const hours = Math.floor(diffMs / 3600000);
            const minutes = Math.floor((diffMs % 3600000) / 60000);
            const seconds = Math.floor((diffMs % 60000) / 1000);
            setDuration(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);

            if (session.expiresAt) {
                const end = new Date(session.expiresAt);
                const remainingMs = end.getTime() - now.getTime();

                if (remainingMs > 0) {
                    const rHours = Math.floor(remainingMs / 3600000);
                    const rMinutes = Math.floor((remainingMs % 3600000) / 60000);
                    const rSeconds = Math.floor((remainingMs % 60000) / 1000);
                    setTimeLeft(`${rHours.toString().padStart(2, '0')}:${rMinutes.toString().padStart(2, '0')}:${rSeconds.toString().padStart(2, '0')}`);

                    const totalDuration = end.getTime() - start.getTime();
                    const elapsed = now.getTime() - start.getTime();
                    setProgress(Math.min((elapsed / totalDuration) * 100, 100));
                } else {
                    setTimeLeft('00:00:00');
                    setProgress(100);
                }
            }
        };

        updateTimer();
        const interval = setInterval(updateTimer, 1000);
        return () => clearInterval(interval);
    }, [session]);

    return (
        <div className={`
            relative overflow-hidden rounded-xl border p-5 shadow-xl transition-all duration-300
            flex flex-col gap-4
            ${isPaused ? 'bg-zinc-900/50 border-amber-900/30' :
                isExpired ? 'bg-red-950/20 border-red-900/30' :
                    'bg-zinc-900 border-zinc-800'}
        `}>
            {/* Status Indicator */}
            <div className="flex items-center justify-between">
                <div className={`
                    flex items-center gap-2 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border
                    ${isPaused ? 'bg-amber-950/30 text-amber-500 border-amber-900/30' :
                        isExpired ? 'bg-red-950/30 text-red-500 border-red-900/30' :
                            'bg-emerald-950/30 text-emerald-500 border-emerald-900/30'}
                `}>
                    <div className={`w-1.5 h-1.5 rounded-full ${isPaused ? 'bg-amber-500' : isExpired ? 'bg-red-500' : 'bg-emerald-500'} ${(!isPaused && !isExpired) && 'animate-pulse'}`} />
                    {isPaused ? 'En Pausa' : isExpired ? 'Finalizado' : 'En Curso'}
                </div>
                {session.expiresAt && (
                    <div className="flex items-center gap-1.5 text-zinc-500 text-xs">
                        <Clock className="w-3.5 h-3.5" />
                        {new Date(session.expiresAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                )}
            </div>

            {/* Timer Display */}
            <div className="flex flex-col items-center justify-center py-2">
                <span className="text-[10px] uppercase tracking-widest text-zinc-500 font-semibold mb-1">
                    {session.expiresAt ? 'Tiempo Restante' : 'Tiempo Transcurrido'}
                </span>
                <div className={`
                    text-5xl font-mono font-bold tracking-tight tabular-nums
                    ${isPaused ? 'text-amber-500' : isExpired ? 'text-red-500' : 'text-zinc-100'}
                `}>
                    {session.expiresAt ? timeLeft : duration}
                </div>
            </div>

            {/* Progress Bar */}
            {session.expiresAt && (
                <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                    <div
                        className={`h-full rounded-full transition-all duration-1000 ease-linear ${isPaused ? 'bg-amber-600' : isExpired ? 'bg-red-600' : 'bg-blue-600'}`}
                        style={{ width: `${progress}%` }}
                    />
                </div>
            )}

            {/* Financial Info */}
            <div className="grid grid-cols-2 gap-2">
                <div className="bg-zinc-950/30 p-3 rounded-lg border border-emerald-800 flex flex-col items-center">
                    <span className="text-[10px] uppercase text-zinc-500 font-semibold tracking-wider mb-0.5">Costo</span>
                    <span className={`text-lg font-bold ${isExpired ? 'text-red-500' : 'text-emerald-500'}`}>S/ {Number(session.totalCost || 0).toFixed(2)}</span>
                </div>
                <div className="bg-zinc-900/50 p-3 rounded-lg border border-sky-800 flex flex-col items-center">
                    <span className="text-[10px] uppercase text-zinc-500 font-semibold tracking-wider mb-0.5">Inicio</span>
                    <span className="text-lg font-bold text-zinc-500">
                        {new Date(session.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                </div>
            </div>

            {/* Actions */}
            <div className="grid grid-cols-1 gap-2 pt-1">
                <Button
                    variant="destructive"
                    className="w-full shadow-lg font-semibold transition-all hover:brightness-110 active:scale-[0.98] cursor-pointer"
                    onClick={onEnd}
                >
                    Finalizar Sesión
                </Button>

                <Button
                    variant="default"
                    size="sm"
                    className="w-full text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50 text-xs h-8 cursor-pointer"
                    onClick={onUndo}
                    disabled={isPendingUndo}
                >
                    <RotateCcw className={`w-3.5 h-3.5 mr-2 ${isPendingUndo ? 'animate-spin' : ''}`} />
                    {isPendingUndo ? 'Revirtiendo...' : 'Deshacer último cambio'}
                </Button>
            </div>

            {/* Subtle Gradient */}
            <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-black/20 to-transparent opacity-50" />
        </div>
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
        enabled: !!pc?.zoneId && isOpen,
    });

    const queryClient = useQueryClient();

    const startSessionMutation = useMutation({
        mutationFn: sessionsApi.start,
        onSuccess: (newSession) => {
            toast.success('Sesión iniciada correctamente');
            queryClient.invalidateQueries({ queryKey: ['pcs'] });
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
        },
        onError: (error: any) => {
            console.error('Error undoing session:', error);
            const msg = error.response?.data?.message || 'Error al deshacer cambio';
            toast.error(msg);
        }
    });

    const updateStatusMutation = useMutation({
        mutationFn: (status: string) => pcsApi.update(pc.id, { status }),
        onSuccess: () => {
            toast.success('Estado actualizado. PC liberada.');
            queryClient.invalidateQueries({ queryKey: ['pcs'] });
            onClose();
        },
        onError: (error: any) => {
            console.error('Error updating status:', error);
            toast.error('Error al actualizar estado');
        }
    });

    const handleStartSession = (type: 'FIXED' | 'BUNDLE', item: any) => {
        if (!pc) return;

        const activeSession = pc.sessions?.find((s: any) => s.status === 'ACTIVE' || s.status === 'PAUSED' || s.status === 'EXPIRED');

        const payload: any = {
            pcId: pc.id,
            pricingType: type,
        };

        if (type === 'FIXED') {
            payload.minutes = item.minutes;
        } else if (type === 'BUNDLE') {
            payload.bundleId = item.id;
        }

        if (activeSession) {
            extendSessionMutation.mutate({ id: activeSession.id, data: payload });
        } else {
            payload.userId = pc.activeUser?.id;
            startSessionMutation.mutate(payload);
        }
    };

    if (!pc) return null;

    const activeSession = pc.sessions?.find((s: any) => s.status === 'ACTIVE' || s.status === 'PAUSED' || s.status === 'EXPIRED');
    const isSessionActive = !!activeSession;

    return (
        <Drawer open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DrawerContent className="h-[60vh] bg-gray-950 border-t border-zinc-800 flex flex-col">
                <DrawerHeader className="sr-only">
                    <DrawerTitle>Detalles de {pc.name}</DrawerTitle>
                    <DrawerDescription>
                        Gestionar sesión y ventas para {pc.name}
                    </DrawerDescription>
                </DrawerHeader>
                <div className="mx-auto w-full max-w-8xl flex flex-col h-full overflow-hidden px-5 py-3">
                    {/* COMPACT HEADER */}
                    <div className="flex items-center justify-between px-5 py-3 border-b border-zinc-900 bg-zinc-950/20 backdrop-blur-sm shrink-0">
                        <div className="flex items-center gap-3">
                            <div className="relative">
                                <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-blue-600/20 to-indigo-600/20 flex items-center justify-center border border-white/5">
                                    <Monitor className="h-5 w-5 text-blue-500" />
                                </div>
                                <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-zinc-950 ${pc.status === 'AVAILABLE' ? 'bg-emerald-500' :
                                    pc.status === 'OCCUPIED' ? 'bg-blue-500' :
                                        'bg-orange-500'
                                    }`} />
                            </div>

                            <div>
                                <div className="flex items-center gap-2">
                                    <h2 className="text-lg font-bold text-white">{pc.name}</h2>
                                    <Badge variant="outline" className="text-[9px] font-mono border-zinc-800 text-zinc-500 px-1.5 h-4">
                                        {pc.ipAddress || 'NO IP'}
                                    </Badge>
                                </div>
                                <div className="flex items-center gap-1.5 text-xs">
                                    {pc.activeUser ? (
                                        <>
                                            <div className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" />
                                            <span className="text-blue-400 font-medium">{pc.activeUser.username || pc.activeUser.email}</span>
                                        </>
                                    ) : pc.status === 'OCCUPIED' ? (
                                        <span className="text-zinc-400 flex items-center gap-1">
                                            <div className="h-1.5 w-1.5 rounded-full bg-orange-500 animate-pulse" /> Invitado
                                        </span>
                                    ) : (
                                        <span className="text-zinc-600 flex items-center gap-1">
                                            <div className="h-1.5 w-1.5 rounded-full bg-zinc-700" /> Sin conexión
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>

                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={onClose}
                            className="h-8 w-8 rounded-full hover:bg-zinc-800 text-zinc-500 hover:text-white"
                        >
                            <X className="h-4 w-4" />
                        </Button>
                    </div>

                    {/* CONTENT - 2 COLUMN LAYOUT */}
                    <div className="flex-1 overflow-hidden bg-zinc-950/20">
                        <div className="grid grid-cols-12 h-full divide-x divide-zinc-900">

                            {/* LEFT COLUMN: RATES & BUNDLES (5/12) */}
                            <div className="col-span-6 h-full flex flex-col">
                                <ScrollArea className="flex-1">
                                    <div className="p-4 space-y-5">
                                        {/* RATES SECTION */}
                                        <div>
                                            <div className="flex items-center gap-2 mb-3 px-1">
                                                <div className="h-3 w-1 bg-blue-500 rounded-full" />
                                                <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-400">Extender Tiempo Libre</h3>
                                                <Badge variant="outline" className="ml-auto text-[9px] h-5">Extensión</Badge>
                                            </div>
                                            <div className="grid grid-cols-10 gap-2">
                                                {isLoadingRates ? (
                                                    [1, 2, 3, 4, 5, 6].map(i => (
                                                        <div key={i} className="h-20 bg-zinc-900/50 rounded-lg animate-pulse" />
                                                    ))
                                                ) : rates?.length > 0 ? (
                                                    rates.map((rate: any) => (
                                                        <button
                                                            key={rate.id}
                                                            onClick={() => handleStartSession('FIXED', rate)}
                                                            className="
                                                                group relative overflow-hidden h-20
                                                                flex flex-col items-center justify-center p-3
                                                                bg-sky-900/40 border border-zinc-800/60
                                                                hover:bg-blue-600 hover:border-blue-500 
                                                                rounded-lg transition-all duration-200
                                                                hover:shadow-[0_0_15px_-5px_rgba(37,99,235,0.4)]
                                                                active:scale-[0.96] cursor-pointer
                                                            "
                                                        >
                                                            <span className="text-2xl font-bold text-zinc-200 group-hover:text-white tabular-nums mb-0.5">
                                                                {rate.minutes}
                                                            </span>
                                                            <span className="text-[9px] uppercase font-bold text-zinc-600 group-hover:text-blue-100 tracking-wider mb-2">
                                                                MIN
                                                            </span>
                                                            <div className="text-xs font-bold text-emerald-500 group-hover:text-white bg-zinc-950/30 group-hover:bg-white/20 px-2 py-0.5 rounded">
                                                                S/ {Number(rate.price).toFixed(2)}
                                                            </div>
                                                        </button>
                                                    ))
                                                ) : (
                                                    <div className="col-span-3 py-8 text-center text-zinc-600 border border-dashed border-zinc-800 rounded-xl bg-zinc-900/20">
                                                        <Clock className="w-5 h-5 mx-auto mb-2 opacity-50" />
                                                        <span className="text-[10px] uppercase tracking-wider">Sin tarifas</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* BUNDLES SECTION */}
                                        <div>
                                            <div className="flex items-center gap-2 mb-3 px-1">
                                                <div className="h-3 w-1 bg-purple-500 rounded-full" />
                                                <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-400">Paquetes y Promociones</h3>
                                            </div>
                                            <div className="space-y-2">
                                                {isLoadingBundles ? (
                                                    [1, 2, 3].map(i => (
                                                        <div key={i} className="h-16 bg-zinc-900/50 rounded-lg animate-pulse" />
                                                    ))
                                                ) : bundles?.length > 0 ? (
                                                    bundles.map((bundle: any) => (
                                                        <button
                                                            key={bundle.id}
                                                            onClick={() => handleStartSession('BUNDLE', bundle)}
                                                            className="
                                                                group relative overflow-hidden text-left w-full
                                                                p-3 rounded-lg
                                                                bg-zinc-900/40 border border-zinc-800/60
                                                                hover:bg-zinc-900 hover:border-purple-500/50
                                                                transition-all duration-200
                                                                flex items-center justify-between
                                                                hover:shadow-[0_0_15px_-10px_rgba(168,85,247,0.3)]
                                                                active:scale-[0.98]
                                                            "
                                                        >
                                                            {/* Decorator */}
                                                            <div className="absolute top-1 right-1 opacity-5 group-hover:opacity-10 transition-opacity">
                                                                <Tag className="w-5 h-5 text-purple-500 -rotate-12" />
                                                            </div>

                                                            <div className="relative z-10 flex-1 min-w-0 pr-3">
                                                                <div className="flex items-center gap-2 mb-1">
                                                                    <h4 className="font-bold text-zinc-200 text-xs leading-tight group-hover:text-purple-400 transition-colors truncate">
                                                                        {bundle.name}
                                                                    </h4>
                                                                    {bundle.isSaveable && (
                                                                        <Badge variant="outline" className="text-[8px] font-bold bg-purple-500/10 text-purple-300 px-1.5 py-0 h-4 border-purple-500/20">
                                                                            SAVE
                                                                        </Badge>
                                                                    )}
                                                                </div>
                                                                <div className="flex items-center gap-1.5 text-zinc-500 text-[10px]">
                                                                    <Clock className="w-3 h-3" />
                                                                    <span>{bundle.minutes} min</span>
                                                                    <span className="text-zinc-700">•</span>
                                                                    <span className="text-zinc-600">Regular</span>
                                                                </div>
                                                            </div>

                                                            <div className="relative z-10 text-right">
                                                                <div className="font-bold text-sm text-emerald-400 group-hover:text-emerald-300">
                                                                    S/ {Number(bundle.price).toFixed(2)}
                                                                </div>
                                                            </div>
                                                        </button>
                                                    ))
                                                ) : (
                                                    <div className="py-8 text-center text-zinc-600 border border-dashed border-zinc-800 rounded-xl bg-zinc-900/20">
                                                        <Tag className="w-5 h-5 mx-auto mb-2 opacity-50" />
                                                        <span className="text-[10px] uppercase tracking-wider">Sin paquetes</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </ScrollArea>
                            </div>

                            {/* RIGHT COLUMN: SESSION & HISTORY (7/12) */}
                            <div className="col-span-6 h-full flex flex-col">
                                <div className="grid grid-cols-2 h-full divide-x divide-zinc-900">

                                    {/* SESSION CARD */}
                                    <div className="flex flex-col p-4">
                                        {isSessionActive ? (
                                            <ActiveSessionCard
                                                session={activeSession}
                                                onEnd={() => {
                                                    const promise = sessionsApi.end(activeSession.id, 'CASH');
                                                    toast.promise(promise, {
                                                        loading: 'Finalizando...',
                                                        success: () => {
                                                            queryClient.invalidateQueries({ queryKey: ['pcs'] });
                                                            onClose();
                                                            return 'Sesión finalizada';
                                                        },
                                                        error: 'Error al finalizar'
                                                    });
                                                }}
                                                onUndo={() => undoSessionMutation.mutate(activeSession.id)}
                                                isPendingUndo={undoSessionMutation.isPending}
                                            />
                                        ) : pc.status === 'OCCUPIED' && !isSessionActive ? (
                                            <div className="flex-1 flex flex-col items-center justify-center text-center relative overflow-hidden bg-orange-950/10 rounded-xl border border-orange-500/20 p-6">
                                                <div className="w-16 h-16 bg-orange-900/20 rounded-full flex items-center justify-center mb-4 border border-orange-500/10">
                                                    <AlertTriangle className="w-8 h-8 text-orange-500" />
                                                </div>
                                                <h3 className="text-base font-bold text-orange-400 mb-2">Estado Inconsistente</h3>
                                                <p className="text-sm text-yellow-100 mb-4">
                                                    La PC reporta estado OCUPADO pero no existe una sesión activa en el sistema.
                                                    <br />
                                                </p>
                                                <Button
                                                    variant="destructive"
                                                    size="sm"
                                                    className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold"
                                                    onClick={() => updateStatusMutation.mutate('AVAILABLE')}
                                                    disabled={updateStatusMutation.isPending}
                                                >
                                                    {updateStatusMutation.isPending ? 'Liberando...' : 'Forzar Liberación'}
                                                </Button>
                                            </div>
                                        ) : (
                                            <div className="flex-1 flex flex-col items-center justify-center text-center relative overflow-hidden">
                                                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-blue-900/5 via-transparent to-transparent opacity-50" />

                                                <div className="relative z-10 w-20 h-20 mb-5">
                                                    <div className="absolute inset-0 bg-blue-500/10 blur-xl rounded-full animate-pulse" />
                                                    <div className="relative bg-zinc-900 rounded-xl w-full h-full flex items-center justify-center border border-zinc-800">
                                                        <Monitor className="w-9 h-9 text-zinc-600" />
                                                    </div>
                                                    <div className="absolute -bottom-1 -right-1 bg-zinc-950 rounded-full p-0.5 border border-zinc-800">
                                                        <div className="w-2.5 h-2.5 bg-red-500 rounded-full" />
                                                    </div>
                                                </div>

                                                <h3 className="text-base font-bold text-white mb-1.5">PC Inactiva</h3>
                                                <p className="text-xs text-zinc-500 max-w-[200px] leading-relaxed">
                                                    Seleccione una opción de la izquierda para iniciar sesión
                                                </p>
                                            </div>
                                        )}
                                    </div>

                                    {/* HISTORY */}
                                    <div className="flex flex-col overflow-hidden">
                                        <div className="p-4 pb-3 border-b border-zinc-900 shrink-0">
                                            <div className="flex items-center gap-2">
                                                <History className="w-4 h-4 text-zinc-600" />
                                                <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Historial</h3>
                                                {isSessionActive && (
                                                    <Badge variant="secondary" className="ml-auto text-[9px] h-4 bg-zinc-900">
                                                        {activeSession.transactions?.length || 0}
                                                    </Badge>
                                                )}
                                            </div>
                                        </div>

                                        <ScrollArea className="flex-1 px-4 h-12  max-h-96">
                                            <div className="space-y-2 py-3">
                                                {isSessionActive && activeSession.transactions?.length > 0 ? (
                                                    activeSession.transactions.map((tx: any, idx: number) => {
                                                        const isRefundOrUndo = tx.description.toLowerCase().includes('deshacer') ||
                                                            tx.description.toLowerCase().includes('refund') ||
                                                            tx.description.toLowerCase().includes('reembolso');
                                                        const isPositive = Number(tx.amount) > 0;

                                                        return (
                                                            <div
                                                                key={idx}
                                                                className="group p-2.5 rounded-lg bg-gray-500/60 border border-zinc-900 hover:border-zinc-800 hover:bg-gray-600/70 transition-all"
                                                            >
                                                                <div className="flex items-start justify-between gap-2 mb-1">
                                                                    <p className={`text-xs font-medium leading-tight flex-1 ${isRefundOrUndo ? 'text-orange-400' : 'text-zinc-300'
                                                                        }`}>
                                                                        {tx.description.replace(/^\(.*\)\s*/, '')}
                                                                    </p>
                                                                    <span className={`text-xs font-bold shrink-0 tabular-nums ${isPositive
                                                                        ? (isRefundOrUndo ? 'text-orange-500' : 'text-emerald-500')
                                                                        : 'text-zinc-600'
                                                                        }`}>
                                                                        {Number(tx.amount) > 0 && '+'}{Number(tx.amount).toFixed(2)}
                                                                    </span>
                                                                </div>
                                                                <div className="flex items-center gap-1 text-[10px] text-gray-900">
                                                                    <Clock className="w-2.5 h-2.5" />
                                                                    {new Date(tx.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                                </div>
                                                            </div>
                                                        );
                                                    })
                                                ) : (
                                                    <div className="py-12 text-center opacity-30">
                                                        <div className="w-12 h-12 bg-zinc-900 rounded-full flex items-center justify-center mx-auto mb-3 border border-zinc-800">
                                                            <History className="w-5 h-5 text-zinc-600" />
                                                        </div>
                                                        <p className="text-xs text-zinc-600">Sin movimientos</p>
                                                    </div>
                                                )}
                                            </div>
                                        </ScrollArea>
                                    </div>
                                </div>
                            </div>

                        </div>
                    </div>
                </div>
            </DrawerContent>
        </Drawer>
    );
}