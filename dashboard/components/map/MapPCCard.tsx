import { useState, useRef, useEffect } from 'react';
import { Monitor, User, Clock, AlertTriangle, Power } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

interface MapPCCardProps {
    pc: any;
    isEditing: boolean;
    onPositionChange: (id: string, x: number, y: number) => void;
    onClick?: (pc: any) => void;
    containerRef: React.RefObject<HTMLDivElement | null>;
}

export function MapPCCard({ pc, isEditing, onPositionChange, onClick, containerRef }: MapPCCardProps) {

    // Default positioning logic
    const defaultX = (parseInt(pc.id.slice(-4), 16) % 8) * 140 + 20;
    const defaultY = (parseInt(pc.id.slice(-2), 16) % 5) * 130 + 20;

    const [position, setPosition] = useState({
        x: pc.positionX ?? defaultX,
        y: pc.positionY ?? defaultY
    });

    const positionRef = useRef(position);

    // Sync props to state
    useEffect(() => {
        const newPos = {
            x: pc.positionX ?? defaultX,
            y: pc.positionY ?? defaultY
        };
        setPosition(newPos);
        positionRef.current = newPos;
    }, [pc.positionX, pc.positionY, defaultX, defaultY]);

    const [isDragging, setIsDragging] = useState(false);
    const dragOffset = useRef({ x: 0, y: 0 });

    // Status styling configuration
    const getStatusStyle = (status: string, hasUser: boolean, sessionStatus?: string) => {
        if (sessionStatus === 'PAUSED' || (status === 'OFFLINE' && hasUser)) {
            return {
                container: 'bg-gray-50/90 border-gray-200 dark:bg-gray-950/20 dark:border-gray-800',
                text: 'text-gray-700 dark:text-gray-300',
                indicator: 'bg-gray-500',
                icon: 'text-gray-600 dark:text-gray-400'
            };
        }
        if (hasUser || status === 'OCCUPIED') {
            return {
                container: 'bg-blue-50/90 border-blue-200 dark:bg-blue-950/20 dark:border-blue-800',
                text: 'text-blue-700 dark:text-blue-300',
                indicator: 'bg-blue-500',
                icon: 'text-blue-600 dark:text-blue-400'
            };
        }
        if (hasUser || status === 'PAUSED') {
            return {
                container: 'bg-yellow-50/90 border-yellow-200 dark:bg-yellow-950/20 dark:border-yellow-800',
                text: 'text-yellow-700 dark:text-yellow-300',
                indicator: 'bg-yellow-500',
                icon: 'text-yellow-600 dark:text-yellow-400'
            };
        }
        switch (status) {
            case 'AVAILABLE':
                return {
                    container: 'bg-emerald-50/90 border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-800',
                    text: 'text-emerald-700 dark:text-emerald-300',
                    indicator: 'bg-emerald-500',
                    icon: 'text-emerald-600 dark:text-emerald-400'
                };
            case 'RESERVED':
                return {
                    container: 'bg-purple-50/90 border-purple-200 dark:bg-purple-950/20 dark:border-purple-800',
                    text: 'text-purple-700 dark:text-purple-300',
                    indicator: 'bg-purple-500',
                    icon: 'text-purple-600 dark:text-purple-400'
                };
            case 'MAINTENANCE':
                return {
                    container: 'bg-orange-50/90 border-orange-200 dark:bg-orange-950/20 dark:border-orange-800',
                    text: 'text-orange-700 dark:text-orange-300',
                    indicator: 'bg-orange-500',
                    icon: 'text-orange-600 dark:text-orange-400'
                };
            case 'MALICIOUS':
                return {
                    container: 'bg-red-50/90 border-red-200 dark:bg-red-950/20 dark:border-red-800 animate-pulse',
                    text: 'text-red-700 dark:text-red-300',
                    indicator: 'bg-red-600',
                    icon: 'text-red-600 dark:text-red-400'
                };
            case 'PAUSED':
                return {
                    container: 'bg-yellow-50/90 border-yellow-200 dark:bg-yellow-950/20 dark:border-yellow-800',
                    text: 'text-yellow-700 dark:text-yellow-300',
                    indicator: 'bg-yellow-500',
                    icon: 'text-yellow-600 dark:text-yellow-400'
                };
            default: // OFFLINE
                return {
                    container: 'bg-slate-50/80 border-slate-200 dark:bg-slate-900/50 dark:border-slate-800 grayscale',
                    text: 'text-slate-500 dark:text-slate-400',
                    indicator: 'bg-slate-400',
                    icon: 'text-slate-400 dark:text-slate-500'
                };
        }
    };

    const isOccupied = pc.status === 'OCCUPIED' || !!pc.activeUser;

    // Timer Logic (Moved up for style dep)
    const activeSession = pc.sessions?.find((s: any) => s.status === 'ACTIVE' || s.status === 'PAUSED' || s.status === 'EXPIRED');

    const styles = getStatusStyle(pc.status, !!pc.activeUser, activeSession?.status);
    const [timeLeft, setTimeLeft] = useState<string>('');

    useEffect(() => {
        if (!activeSession) {
            setTimeLeft('');
            return;
        }

        const updateTimer = () => {
            const now = new Date();
            if (activeSession.status === 'PAUSED') {
                const totalSec = activeSession.durationSeconds || 0;
                const h = Math.floor(totalSec / 3600);
                const m = Math.floor((totalSec % 3600) / 60);
                const s = totalSec % 60;
                setTimeLeft(`${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`);
                return;
            }

            if (activeSession.expiresAt) {
                const end = new Date(activeSession.expiresAt);
                const diff = Math.floor((end.getTime() - now.getTime()) / 1000);
                if (diff <= 0) {
                    setTimeLeft('00:00:00');
                    return;
                }
                const h = Math.floor(diff / 3600);
                const m = Math.floor((diff % 3600) / 60);
                const s = diff % 60;
                setTimeLeft(`${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`);
            } else {
                const start = new Date(activeSession.startedAt);
                const diff = Math.floor((now.getTime() - start.getTime()) / 1000);
                const h = Math.floor(diff / 3600);
                const m = Math.floor((diff % 3600) / 60);
                const s = diff % 60;
                setTimeLeft(`${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`);
            }
        };

        updateTimer();
        const interval = setInterval(updateTimer, 1000);
        return () => clearInterval(interval);
    }, [activeSession]);

    // Dragging Logic
    const handleMouseDown = (e: React.MouseEvent) => {
        if (!isEditing || !containerRef.current) return;
        e.stopPropagation();
        e.preventDefault();
        const containerRect = containerRef.current.getBoundingClientRect();
        dragOffset.current = {
            x: e.clientX - containerRect.left - position.x,
            y: e.clientY - containerRect.top - position.y
        };
        setIsDragging(true);
    };

    useEffect(() => {
        if (!isDragging) return;
        const handleMouseMove = (e: MouseEvent) => {
            if (!containerRef.current) return;
            e.preventDefault();
            const container = containerRef.current;
            const containerRect = container.getBoundingClientRect();
            let newX = e.clientX - containerRect.left - dragOffset.current.x;
            let newY = e.clientY - containerRect.top - dragOffset.current.y;
            const maxX = containerRect.width - 130; // Adjusted for new width
            const maxY = containerRect.height - 110; // Adjusted for new height
            newX = Math.max(0, Math.min(newX, maxX));
            newY = Math.max(0, Math.min(newY, maxY));
            const newPos = { x: newX, y: newY };
            positionRef.current = newPos;
            setPosition(newPos);
        };
        const handleMouseUp = () => {
            setIsDragging(false);
            onPositionChange(pc.id, positionRef.current.x, positionRef.current.y);
        };
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging, onPositionChange, pc.id, containerRef]);

    // RENDER HELPERS
    const renderIcon = () => {
        if (pc.status === 'OFFLINE') return <Power className="h-8 w-8 opacity-20" />;
        if (pc.status === 'MALICIOUS') return <AlertTriangle className="h-8 w-8" />;
        if (pc.activeUser) return <User className="h-8 w-8" />;
        return <Monitor className="h-8 w-8" />;
    };

    const username = pc.activeUser
        ? (pc.activeUser.username?.startsWith('guest_') ? 'Invitado' : pc.activeUser.username || pc.activeUser.email)
        : (pc.status === 'OCCUPIED' ? 'Invitado' : null);

    return (
        <div
            className={cn(
                "absolute rounded-xl border-2 shadow-sm transition-all select-none backdrop-blur-sm",
                "flex flex-col overflow-hidden",
                "w-[124px] h-[106px]", // FIXED DIMENSIONS
                styles.container,
                styles.text,
                isEditing
                    ? "cursor-grab active:cursor-grabbing hover:ring-2 hover:ring-indigo-500 hover:z-20"
                    : "cursor-pointer hover:shadow-md hover:-translate-y-0.5 active:scale-95",
                isDragging ? "z-50 shadow-xl opacity-90 scale-105" : "z-10"
            )}
            style={{
                left: `${position.x}px`,
                top: `${position.y}px`,
                touchAction: 'none'
            }}
            onMouseDown={handleMouseDown}
            onClick={() => !isEditing && onClick && onClick(pc)}
        >
            {/* Header: Status & Name */}
            <div className="flex items-center justify-between px-2.5 py-1.5 bg-white/40 dark:bg-black/10 border-b border-black/5">
                <span className="font-bold text-sm tracking-tight truncate">{pc.name}</span>
                <div className={cn("w-2 h-2 rounded-full", styles.indicator)} />
            </div>

            {/* Body: Icon or Timer */}
            <div className="flex-1 flex flex-col items-center justify-center p-1 relative">
                {activeSession ? (
                    <div className="flex flex-col items-center animate-in fade-in zoom-in duration-300">
                        {activeSession.status === 'EXPIRED' ? (
                            <>
                                <span className="text-sm font-bold text-red-500 uppercase tracking-wider mb-0.5">
                                    Finalizado
                                </span>
                                <span className="text-xl font-black text-red-600 dark:text-red-500 tracking-tight">
                                    S/ {Number(activeSession.totalCost || 0).toFixed(2)}
                                </span>
                            </>
                        ) : (
                            <>
                                <span className="text-lg font-mono font-bold tracking-tighter leading-none">
                                    {timeLeft || "00:00"}
                                </span>
                                <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                                    S/{Number(activeSession.totalCost || 0).toFixed(2)}
                                </span>
                            </>
                        )}

                        <div className="flex items-center gap-1 mt-1 opacity-75">
                            <Clock className="w-3 h-3" />
                            <span className={cn(
                                "text-[10px] font-medium uppercase",
                                activeSession.status === 'EXPIRED' ? "text-red-500" : ""
                            )}>
                                {activeSession.status === 'PAUSED' ? 'Pausado' : activeSession.status === 'EXPIRED' ? 'Expirado' : 'Activo'}
                            </span>
                        </div>
                    </div>
                ) : (
                    <div className={cn("transition-all duration-300", isOccupied ? "scale-100" : "scale-90 opacity-80")}>
                        {renderIcon()}
                    </div>
                )}
            </div>

            {/* Footer: User Info or Status Text */}
            <div className="px-2 py-1.5 text-center bg-white/30 dark:bg-black/10 border-t border-black/5 h-[28px] flex items-center justify-center">
                {username ? (
                    <span className="text-xs font-semibold truncate w-full" title={username}>
                        {username}
                    </span>
                ) : (
                    <span className="text-[10px] font-bold uppercase tracking-wider opacity-60">
                        {pc.status === 'OFFLINE' ? 'Apagado' : pc.status}
                    </span>
                )}
            </div>
        </div >
    );
}

