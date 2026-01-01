'use client';

import { useState } from 'react';
import { User, Mail, Phone, Wallet, Award, Clock, MoreVertical, CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { RechargeBalanceModal } from './RechargeBalanceModal';
import { UserDetailsModal } from './UserDetailsModal';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface UserCardProps {
    user: any;
}

export function UserCard({ user }: UserCardProps) {
    const [isRechargeOpen, setIsRechargeOpen] = useState(false);
    const [isDetailsOpen, setIsDetailsOpen] = useState(false);

    const getTierColor = (tier: string) => {
        switch (tier) {
            case 'PLATINUM': return 'bg-indigo-100 text-indigo-700 border-indigo-200';
            case 'GOLD': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
            case 'SILVER': return 'bg-gray-100 text-gray-700 border-gray-200';
            default: return 'bg-orange-100 text-orange-700 border-orange-200';
        }
    };

    const getRoleLabel = (role: string) => {
        switch (role) {
            case 'USER': return 'Jugador';
            case 'LAN_ADMIN': return 'Admin';
            case 'OWNER': return 'Dueño';
            case 'SUPER_ADMIN': return 'Soporte';
            default: return role;
        }
    };

    return (
        <>
            <div className="bg-card rounded-xl border border-border p-5 hover:shadow-lg transition-all group">
                <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center space-x-3">
                        <div className="h-12 w-12 rounded-full bg-indigo-50 flex items-center justify-center border border-indigo-100 text-indigo-600 font-bold text-xl">
                            {user.username.charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <h3 className="font-bold text-foreground group-hover:text-indigo-600 transition-colors">
                                {user.username}
                            </h3>
                            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border">
                                {getRoleLabel(user.role)}
                            </span>
                        </div>
                    </div>

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                                <MoreVertical className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem
                                className="cursor-pointer"
                                onClick={() => setIsDetailsOpen(true)}
                            >
                                Ver Perfil
                            </DropdownMenuItem>
                            <DropdownMenuItem className="cursor-pointer">Historial de Sesiones</DropdownMenuItem>
                            <DropdownMenuItem className="cursor-pointer">Editar Usuario</DropdownMenuItem>
                            <DropdownMenuItem className="cursor-pointer text-destructive focus:text-destructive">Desactivar</DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>

                <div className="space-y-3 mb-5 cursor-pointer" onClick={() => setIsDetailsOpen(true)}>
                    <div className="flex items-center text-sm text-muted-foreground">
                        <Mail className="h-4 w-4 mr-2 text-muted-foreground/70" />
                        <span className="truncate">{user.email}</span>
                    </div>
                    {user.phone && (
                        <div className="flex items-center text-sm text-muted-foreground">
                            <Phone className="h-4 w-4 mr-2 text-muted-foreground/70" />
                            <span>{user.phone}</span>
                        </div>
                    )}
                </div>

                <div className="grid grid-cols-2 gap-3 mb-5 cursor-pointer" onClick={() => setIsDetailsOpen(true)}>
                    <div className="bg-muted rounded-lg p-3 border border-border">
                        <div className="flex items-center text-xs text-muted-foreground mb-1">
                            <Wallet className="h-3 w-3 mr-1" />
                            <span>Saldo</span>
                        </div>
                        <span className="font-bold text-foreground">S/ {Number(user.balance).toFixed(2)}</span>
                    </div>
                    <div className="bg-muted rounded-lg p-3 border border-border">
                        <div className="flex items-center text-xs text-muted-foreground mb-1">
                            <Award className="h-3 w-3 mr-1" />
                            <span>Nivel</span>
                        </div>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase border ${getTierColor(user.membershipTier)}`}>
                            {user.membershipTier}
                        </span>
                    </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-border">
                    <div className="flex items-center text-[10px] text-muted-foreground cursor-pointer" onClick={() => setIsDetailsOpen(true)}>
                        <Clock className="h-3 w-3 mr-1" />
                        <span>Visita: {user.lastVisit ? new Date(user.lastVisit).toLocaleDateString() : 'Nunca'}</span>
                    </div>
                    <Button
                        size="sm"
                        variant="default"
                        className="bg-indigo-600 hover:bg-indigo-700 text-white flex items-center"
                        onClick={() => setIsRechargeOpen(true)}
                    >
                        <CreditCard className="h-3.5 w-3.5 mr-1.5" />
                        Recargar
                    </Button>
                </div>
            </div>

            <RechargeBalanceModal
                isOpen={isRechargeOpen}
                onClose={() => setIsRechargeOpen(false)}
                user={user}
            />

            <UserDetailsModal
                isOpen={isDetailsOpen}
                onClose={() => setIsDetailsOpen(false)}
                user={user}
            />
        </>
    );
}
