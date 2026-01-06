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
import { FileText, ChevronLeft, ChevronRight, Filter, ShieldCheck } from 'lucide-react';
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
            <Card className="border-none shadow-sm bg-card/50 backdrop-blur-sm">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                    <div>
                        <CardTitle className="text-lg font-semibold tracking-tight">Historial de Acciones</CardTitle>
                        <p className="text-[13px] text-muted-foreground">
                            Registro de auditoría del sistema
                        </p>
                    </div>
                    <div className="text-xs font-medium bg-muted px-2.5 py-1 rounded-full text-muted-foreground uppercase tracking-wider">
                        Pág. {currentPage + 1} de {totalPages || 1}
                    </div>
                </CardHeader>

                <CardContent>
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-20 space-y-3">
                            <div className="h-6 w-6 border-2 border-primary/30 border-t-primary animate-spin rounded-full" />
                            <p className="text-xs font-medium text-muted-foreground">Sincronizando registros...</p>
                        </div>
                    ) : logs.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed rounded-xl bg-muted/30">
                            <FileText className="h-8 w-8 text-muted-foreground/40 mb-3" />
                            <p className="text-sm font-medium text-muted-foreground">Sin registros disponibles</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="rounded-lg border border-border/60 overflow-hidden">
                                <Table>
                                    <TableHeader className="bg-muted/50">
                                        <TableRow className="hover:bg-transparent border-b">
                                            <TableHead className="h-10 text-[11px] uppercase tracking-wider font-bold">Fecha</TableHead>
                                            <TableHead className="h-10 text-[11px] uppercase tracking-wider font-bold">Estado</TableHead>
                                            <TableHead className="h-10 text-[11px] uppercase tracking-wider font-bold">Administrador</TableHead>
                                            <TableHead className="h-10 text-[11px] uppercase tracking-wider font-bold">Usuario Destino</TableHead>
                                            <TableHead className="h-10 text-[11px] uppercase tracking-wider font-bold">Motivo</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {logs.map((log: any) => (
                                            <TableRow key={log.id} className="group transition-colors hover:bg-muted/30 border-b border-border/40">
                                                {/* Fecha con fuente tabular */}
                                                <TableCell className="py-3 text-[13px] font-medium tabular-nums text-foreground/80">
                                                    {format(new Date(log.createdAt), "dd MMM, HH:mm", { locale: es })}
                                                </TableCell>

                                                {/* Badge Estilo Premium */}
                                                <TableCell className="py-3">
                                                    {log.action === 'APPROVED' ? (
                                                        <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                                            <span className="h-1 w-1 rounded-full bg-emerald-500" />
                                                            APROBADO
                                                        </div>
                                                    ) : (
                                                        <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                                                            <span className="h-1 w-1 rounded-full bg-rose-500" />
                                                            RECHAZADO
                                                        </div>
                                                    )}
                                                </TableCell>

                                                {/* Admin Info */}
                                                <TableCell className="py-3">
                                                    <div className="flex flex-col">
                                                        <span className="text-[13px] font-semibold flex items-center gap-1">
                                                            <ShieldCheck className="h-3 w-3 text-blue-500" />
                                                            {log.admin.username}
                                                        </span>
                                                        <span className="text-[11px] text-muted-foreground leading-tight">{log.admin.email}</span>
                                                    </div>
                                                </TableCell>

                                                {/* Target User Info */}
                                                <TableCell className="py-3">
                                                    <div className="flex flex-col">
                                                        <span className="text-[13px] font-medium text-foreground/90">{log.targetUser.username}</span>
                                                        <span className="text-[11px] text-muted-foreground leading-tight">{log.targetUser.email}</span>
                                                    </div>
                                                </TableCell>

                                                {/* Reason con estilo discreto */}
                                                <TableCell className="py-3 max-w-[200px]">
                                                    <p className="text-[12px] text-muted-foreground truncate group-hover:text-foreground transition-colors">
                                                        {log.reason || <span className="opacity-30">—</span>}
                                                    </p>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>

                            {/* Footer de Paginación Compacto */}
                            <div className="flex items-center justify-between pt-2">
                                <p className="text-[12px] font-medium text-muted-foreground">
                                    Mostrando <span className="text-foreground">{currentPage * pageSize + 1}-{Math.min((currentPage + 1) * pageSize, total)}</span> de <span className="text-foreground">{total}</span>
                                </p>
                                <div className="flex gap-1.5">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="h-8 px-3 text-[12px] font-semibold gap-1 hover:bg-muted"
                                        onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
                                        disabled={currentPage === 0}
                                    >
                                        <ChevronLeft className="h-3.5 w-3.5" />
                                        Anterior
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="h-8 px-3 text-[12px] font-semibold gap-1 hover:bg-muted"
                                        onClick={() => setCurrentPage(p => Math.min(totalPages - 1, p + 1))}
                                        disabled={currentPage >= totalPages - 1}
                                    >
                                        Siguiente
                                        <ChevronRight className="h-3.5 w-3.5" />
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
