'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { adminApi } from '@/lib/api';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { UserRole, ApprovalStatus } from '@/types';
import { CheckCircle, XCircle, Clock, User } from 'lucide-react';

export default function ApprovalsPage() {
    const { user } = useAuth();
    const router = useRouter();
    const queryClient = useQueryClient();
    const [selectedUser, setSelectedUser] = useState<any>(null);
    const [action, setAction] = useState<'approve' | 'reject' | null>(null);
    const [rejectionReason, setRejectionReason] = useState<string>('');

    // Verificar rol SUPER_ADMIN
    useEffect(() => {
        if (user && user.role !== UserRole.SUPER_ADMIN) {
            router.push('/dashboard');
        }
    }, [user, router]);

    // Obtener solicitudes pendientes
    const { data: pendingApprovals, isLoading } = useQuery({
        queryKey: ['pending-approvals'],
        queryFn: adminApi.getPendingApprovals,
        refetchInterval: 10000, // Auto-refresh cada 10s
    });

    // Obtener stats
    const { data: stats } = useQuery({
        queryKey: ['approval-stats'],
        queryFn: adminApi.getApprovalStats,
    });

    // Mutation para aprobar
    const approveMutation = useMutation({
        mutationFn: (userId: string) => adminApi.approveUser(userId, false),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['pending-approvals'] });
            queryClient.invalidateQueries({ queryKey: ['approval-stats'] });
            setSelectedUser(null);
            setAction(null);
        },
    });

    // Mutation para rechazar
    const rejectMutation = useMutation({
        mutationFn: ({ userId, reason }: { userId: string; reason?: string }) =>
            adminApi.rejectUser(userId, reason),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['pending-approvals'] });
            queryClient.invalidateQueries({ queryKey: ['approval-stats'] });
            setSelectedUser(null);
            setAction(null);
        },
    });

    const handleApprove = (userId: string) => {
        approveMutation.mutate(userId);
    };

    const handleReject = (userId: string) => {
        const reason = rejectionReason.trim() || 'Solicitud rechazada por el administrador';
        rejectMutation.mutate({ userId, reason });
        setRejectionReason(''); // Limpiar el campo después de rechazar
    };

    if (!user || user.role !== UserRole.SUPER_ADMIN) {
        return null;
    }

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
                    <p className="mt-4 text-muted-foreground">Cargando solicitudes...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold">Aprobaciones</h1>
                <p className="text-muted-foreground mt-2">
                    Gestiona las solicitudes de administradores de LAN Centers
                </p>
            </div>

            {/* Stats */}
            {stats && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Card>
                        <CardHeader className="pb-2">
                            <CardDescription>Pendientes</CardDescription>
                            <CardTitle className="text-3xl flex items-center gap-2">
                                <Clock className="w-6 h-6 text-yellow-600" />
                                {stats.pending}
                            </CardTitle>
                        </CardHeader>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2">
                            <CardDescription>Aprobadas</CardDescription>
                            <CardTitle className="text-3xl flex items-center gap-2">
                                <CheckCircle className="w-6 h-6 text-green-600" />
                                {stats.approved}
                            </CardTitle>
                        </CardHeader>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2">
                            <CardDescription>Rechazadas</CardDescription>
                            <CardTitle className="text-3xl flex items-center gap-2">
                                <XCircle className="w-6 h-6 text-red-600" />
                                {stats.rejected}
                            </CardTitle>
                        </CardHeader>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2">
                            <CardDescription>Total</CardDescription>
                            <CardTitle className="text-3xl flex items-center gap-2">
                                <User className="w-6 h-6 text-indigo-600" />
                                {stats.total}
                            </CardTitle>
                        </CardHeader>
                    </Card>
                </div>
            )}

            {/* Lista de solicitudes pendientes */}
            <Card>
                <CardHeader>
                    <CardTitle>Solicitudes Pendientes</CardTitle>
                    <CardDescription>
                        {pendingApprovals?.length || 0} solicitud(es) esperando revisión
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {!pendingApprovals || pendingApprovals.length === 0 ? (
                        <div className="text-center py-12">
                            <Clock className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                            <p className="text-muted-foreground">No hay solicitudes pendientes</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {pendingApprovals.map((approval: any) => (
                                <div
                                    key={approval.id}
                                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent transition-colors"
                                >
                                    <div className="space-y-1 flex-1">
                                        <div className="flex items-center gap-2">
                                            <h3 className="font-semibold">{approval.username}</h3>
                                            <Badge variant="outline" className="text-yellow-600">
                                                {approval.approvalStatus}
                                            </Badge>
                                            {approval.role === UserRole.LAN_ADMIN && (
                                                <Badge variant="secondary">LAN ADMIN</Badge>
                                            )}
                                        </div>
                                        <p className="text-sm text-muted-foreground">{approval.email}</p>
                                        <p className="text-sm text-muted-foreground">{approval.phone}</p>

                                        {/* Mostrar datos del LAN solicitado si existen */}
                                        {approval.role === UserRole.LAN_ADMIN && approval.requestedLanData && (
                                            <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-md">
                                                <p className="text-xs font-semibold text-blue-900 mb-1">📍 LAN Center Solicitado:</p>
                                                <div className="text-xs text-blue-800 space-y-0.5">
                                                    <p><strong>Nombre:</strong> {approval.requestedLanData.lanName}</p>
                                                    <p><strong>Dirección:</strong> {approval.requestedLanData.lanAddress}</p>
                                                    <p><strong>Ubicación:</strong> {approval.requestedLanData.lanCity}, {approval.requestedLanData.lanCountry}</p>
                                                </div>
                                            </div>
                                        )}

                                        <p className="text-xs text-muted-foreground mt-2">
                                            Solicitado: {new Date(approval.createdAt).toLocaleDateString('es-PE')}
                                        </p>
                                    </div>
                                    <div className="flex gap-2">
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="text-green-600 border-green-600 hover:bg-green-50"
                                            onClick={() => {
                                                setSelectedUser(approval);
                                                setAction('approve');
                                            }}
                                            disabled={approveMutation.isPending}
                                        >
                                            <CheckCircle className="w-4 h-4 mr-1" />
                                            Aprobar
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="text-red-600 border-red-600 hover:bg-red-50"
                                            onClick={() => {
                                                setSelectedUser(approval);
                                                setAction('reject');
                                            }}
                                            disabled={rejectMutation.isPending}
                                        >
                                            <XCircle className="w-4 h-4 mr-1" />
                                            Rechazar
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Dialogs de confirmación */}
            <AlertDialog open={action === 'approve'} onOpenChange={() => setAction(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>¿Aprobar solicitud?</AlertDialogTitle>
                        <AlertDialogDescription asChild>
                            <div>
                                Estás a punto de aprobar la solicitud de <strong>{selectedUser?.username}</strong> ({selectedUser?.email}).
                                {selectedUser?.role === UserRole.LAN_ADMIN && selectedUser?.requestedLanData && (
                                    <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-md">
                                        <div className="text-sm font-semibold text-green-900 mb-2">
                                            ✅ Se creará automáticamente el siguiente LAN Center:
                                        </div>
                                        <div className="text-sm text-green-800 space-y-1">
                                            <div><strong>Nombre:</strong> {selectedUser.requestedLanData.lanName}</div>
                                            <div><strong>Dirección:</strong> {selectedUser.requestedLanData.lanAddress}</div>
                                            <div><strong>Ubicación:</strong> {selectedUser.requestedLanData.lanCity}, {selectedUser.requestedLanData.lanCountry}</div>
                                        </div>
                                    </div>
                                )}
                                <div className="mt-3">El usuario podrá iniciar sesión y comenzar a usar la plataforma.</div>
                            </div>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => selectedUser && handleApprove(selectedUser.id)}
                            className="bg-green-600 hover:bg-green-700"
                        >
                            Aprobar
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <AlertDialog open={action === 'reject'} onOpenChange={() => {
                setAction(null);
                setRejectionReason(''); // Limpiar al cerrar
            }}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>¿Rechazar solicitud?</AlertDialogTitle>
                        <AlertDialogDescription asChild>
                            <div>
                                <p className="mb-4">
                                    Estás a punto de rechazar la solicitud de <strong>{selectedUser?.username}</strong> ({selectedUser?.email}).
                                    El usuario no podrá iniciar sesión.
                                </p>
                                <div className="space-y-2">
                                    <label htmlFor="rejection-reason" className="text-sm font-medium text-foreground">
                                        Razón del rechazo (opcional)
                                    </label>
                                    <Textarea
                                        id="rejection-reason"
                                        value={rejectionReason}
                                        onChange={(e) => setRejectionReason(e.target.value)}
                                        placeholder="Ej: Información incompleta, documentos faltantes, etc."
                                        className="min-h-[100px]"
                                    />
                                </div>
                            </div>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => selectedUser && handleReject(selectedUser.id)}
                            className="bg-red-600 hover:bg-red-700"
                        >
                            Rechazar
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
