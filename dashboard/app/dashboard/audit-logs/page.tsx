'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { adminApi } from '@/lib/api';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { UserRole } from '@/types';
import { FileText, ChevronLeft, ChevronRight, Filter } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export default function AuditLogsPage() {
    const { user } = useAuth();
    const router = useRouter();
    const [actionFilter, setActionFilter] = useState<string>('all');
    const [currentPage, setCurrentPage] = useState(0);
    const pageSize = 20;

    // Verificar rol SUPER_ADMIN
    useEffect(() => {
        if (user && user.role !== UserRole.SUPER_ADMIN) {
            router.push('/dashboard');
        }
    }, [user, router]);

    const { data: logsData, isLoading } = useQuery({
        queryKey: ['approvalLogs', actionFilter, currentPage],
        queryFn: () => adminApi.getApprovalLogs({
            action: actionFilter === 'all' ? undefined : actionFilter as 'APPROVED' | 'REJECTED',
            limit: pageSize,
            offset: currentPage * pageSize,
        }),
        enabled: !!user && user.role === UserRole.SUPER_ADMIN,
    });

    if (!user || user.role !== UserRole.SUPER_ADMIN) {
        return null;
    }

    const logs = logsData?.logs || [];
    const total = logsData?.total || 0;
    const totalPages = Math.ceil(total / pageSize);

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <div className="mb-6">
                <h1 className="text-3xl font-bold flex items-center gap-2">
                    <FileText className="h-8 w-8" />
                    Audit Logs
                </h1>
                <p className="text-muted-foreground mt-2">
                    Historial completo de acciones de aprobación y rechazo
                </p>
            </div>

            {/* Filtros */}
            <Card className="mb-6">
                <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                        <Filter className="h-5 w-5" />
                        Filtros
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex gap-4 items-center">
                        <div className="flex-1">
                            <label className="text-sm font-medium mb-2 block">Acción</label>
                            <Select value={actionFilter} onValueChange={(value) => {
                                setActionFilter(value);
                                setCurrentPage(0);
                            }}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Todas las acciones" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Todas las acciones</SelectItem>
                                    <SelectItem value="APPROVED">Aprobadas</SelectItem>
                                    <SelectItem value="REJECTED">Rechazadas</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="flex-1">
                            <label className="text-sm font-medium mb-2 block">Total de registros</label>
                            <div className="h-10 flex items-center text-muted-foreground">
                                {total} {total === 1 ? 'registro' : 'registros'}
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Tabla de logs */}
            <Card>
                <CardHeader>
                    <CardTitle>Historial de Acciones</CardTitle>
                    <CardDescription>
                        Página {currentPage + 1} de {totalPages || 1}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="text-center py-12">
                            <p className="text-muted-foreground">Cargando logs...</p>
                        </div>
                    ) : logs.length === 0 ? (
                        <div className="text-center py-12">
                            <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                            <p className="text-muted-foreground">No hay logs para mostrar</p>
                        </div>
                    ) : (
                        <>
                            <div className="rounded-md border">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Fecha</TableHead>
                                            <TableHead>Acción</TableHead>
                                            <TableHead>Admin</TableHead>
                                            <TableHead>Usuario Afectado</TableHead>
                                            <TableHead>Razón</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {logs.map((log: any) => (
                                            <TableRow key={log.id}>
                                                <TableCell className="font-medium">
                                                    {format(new Date(log.createdAt), "dd/MM/yyyy HH:mm", { locale: es })}
                                                </TableCell>
                                                <TableCell>
                                                    {log.action === 'APPROVED' ? (
                                                        <Badge className="bg-green-600 hover:bg-green-700">
                                                            Aprobado
                                                        </Badge>
                                                    ) : (
                                                        <Badge variant="destructive">
                                                            Rechazado
                                                        </Badge>
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    <div>
                                                        <div className="font-medium">{log.admin.username}</div>
                                                        <div className="text-sm text-muted-foreground">{log.admin.email}</div>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div>
                                                        <div className="font-medium">{log.targetUser.username}</div>
                                                        <div className="text-sm text-muted-foreground">{log.targetUser.email}</div>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="max-w-md">
                                                    {log.reason ? (
                                                        <span className="text-sm italic text-muted-foreground">
                                                            "{log.reason}"
                                                        </span>
                                                    ) : (
                                                        <span className="text-sm text-muted-foreground">-</span>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>

                            {/* Paginación */}
                            {totalPages > 1 && (
                                <div className="flex items-center justify-between mt-4">
                                    <div className="text-sm text-muted-foreground">
                                        Mostrando {currentPage * pageSize + 1} - {Math.min((currentPage + 1) * pageSize, total)} de {total}
                                    </div>
                                    <div className="flex gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
                                            disabled={currentPage === 0}
                                        >
                                            <ChevronLeft className="h-4 w-4" />
                                            Anterior
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setCurrentPage(p => Math.min(totalPages - 1, p + 1))}
                                            disabled={currentPage >= totalPages - 1}
                                        >
                                            Siguiente
                                            <ChevronRight className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
