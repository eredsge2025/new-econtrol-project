'use client';

import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { User, Mail, Phone, Calendar, Shield, Wallet, Award, History, Clock } from 'lucide-react';

interface UserDetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    user: any;
}

export function UserDetailsModal({ isOpen, onClose, user }: UserDetailsModalProps) {
    if (!user) return null;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center text-2xl font-bold">
                        <div className="h-10 w-10 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center mr-3 text-lg">
                            {user.username.charAt(0).toUpperCase()}
                        </div>
                        {user.username}
                    </DialogTitle>
                </DialogHeader>

                <Tabs defaultValue="overview" className="mt-4">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="overview">Información General</TabsTrigger>
                        <TabsTrigger value="history">Historial de Actividad</TabsTrigger>
                    </TabsList>

                    <TabsContent value="overview" className="space-y-6 pt-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-4">
                                <div className="flex items-start space-x-3">
                                    <Mail className="h-5 w-5 text-muted-foreground mt-0.5" />
                                    <div>
                                        <p className="text-xs text-muted-foreground">Email</p>
                                        <p className="text-sm font-medium">{user.email}</p>
                                    </div>
                                </div>
                                <div className="flex items-start space-x-3">
                                    <Phone className="h-5 w-5 text-muted-foreground mt-0.5" />
                                    <div>
                                        <p className="text-xs text-muted-foreground">Teléfono</p>
                                        <p className="text-sm font-medium">{user.phone || 'No registrado'}</p>
                                    </div>
                                </div>
                                <div className="flex items-start space-x-3">
                                    <Shield className="h-5 w-5 text-muted-foreground mt-0.5" />
                                    <div>
                                        <p className="text-xs text-muted-foreground">Rol</p>
                                        <p className="text-sm font-medium">{user.role}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="flex items-start space-x-3">
                                    <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                                    <div>
                                        <p className="text-xs text-muted-foreground">Miembro desde</p>
                                        <p className="text-sm font-medium">{new Date(user.createdAt).toLocaleDateString()}</p>
                                    </div>
                                </div>
                                <div className="flex items-start space-x-3">
                                    <Clock className="h-5 w-5 text-muted-foreground mt-0.5" />
                                    <div>
                                        <p className="text-xs text-muted-foreground">Última visita</p>
                                        <p className="text-sm font-medium">{user.lastVisit ? new Date(user.lastVisit).toLocaleString() : 'Nunca'}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="bg-muted p-4 rounded-xl border border-border flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                                <div className="p-2 bg-card rounded-lg border border-border shadow-sm">
                                    <Wallet className="h-5 w-5 text-indigo-600" />
                                </div>
                                <div>
                                    <p className="text-xs text-muted-foreground">Saldo Disponible</p>
                                    <p className="text-xl font-bold text-foreground">S/ {Number(user.balance).toFixed(2)}</p>
                                </div>
                            </div>
                            <div className="flex items-center space-x-3">
                                <div className="p-2 bg-card rounded-lg border border-border shadow-sm">
                                    <Award className="h-5 w-5 text-yellow-600" />
                                </div>
                                <div>
                                    <p className="text-xs text-muted-foreground">Nivel de Membresía</p>
                                    <p className="text-xl font-bold text-foreground">{user.membershipTier}</p>
                                </div>
                            </div>
                        </div>
                    </TabsContent>

                    <TabsContent value="history" className="pt-4">
                        <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                            <History className="h-10 w-10 mb-2 opacity-20" />
                            <p className="text-sm italic">Historial detallado próximamente...</p>
                        </div>
                    </TabsContent>
                </Tabs>
            </DialogContent>
        </Dialog>
    );
}
