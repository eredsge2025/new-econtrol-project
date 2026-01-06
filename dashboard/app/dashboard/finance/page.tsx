'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { financeApi, lansApi } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
    Banknote,
    Smartphone,
    CreditCard,
    RefreshCw,
    Wallet,
    ArrowUpCircle,
    ArrowDownCircle,
    Calendar
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export default function FinancePage() {
    const [selectedLanId, setSelectedLanId] = useState<string>('');

    // Fetch LANs to select context
    const { data: lans, isLoading: isLoadingLans } = useQuery({
        queryKey: ['lans'],
        queryFn: lansApi.getAll,
    });

    // Set default LAN
    if (lans?.length > 0 && !selectedLanId) {
        setSelectedLanId(lans[0].id);
    }

    const { data: summary, isLoading, refetch } = useQuery({
        queryKey: ['finance', 'summary', selectedLanId],
        queryFn: () => financeApi.getSummary(selectedLanId),
        enabled: !!selectedLanId,
        refetchInterval: 30000, // Auto refresh every 30s
    });

    const formatCurrency = (amount: number) => {
        return `S/ ${Number(amount || 0).toFixed(2)}`;
    };

    if (isLoadingLans) {
        return (
            <div className="flex h-screen items-center justify-center">
                <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Caja Actual</h1>
                    <p className="text-muted-foreground">
                        Resumen de movimientos del día: {format(new Date(), "EEEE d 'de' MMMM", { locale: es })}
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    {lans?.length > 1 && (
                        <Select value={selectedLanId} onValueChange={setSelectedLanId}>
                            <SelectTrigger className="w-[200px]">
                                <SelectValue placeholder="Seleccionar Sede" />
                            </SelectTrigger>
                            <SelectContent>
                                {lans.map((lan: any) => (
                                    <SelectItem key={lan.id} value={lan.id}>
                                        {lan.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    )}

                    <Button variant="outline" size="icon" onClick={() => refetch()} disabled={isLoading}>
                        <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                    </Button>
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
                <Card className="bg-emerald-950/10 border-emerald-900/20">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-emerald-600">
                            Efectivo en Caja
                        </CardTitle>
                        <Banknote className="h-4 w-4 text-emerald-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-emerald-700">{formatCurrency(summary?.totalCash)}</div>
                        <p className="text-xs text-muted-foreground">
                            Dinero físico recaudado hoy
                        </p>
                    </CardContent>
                </Card>

                <Card className="bg-purple-950/10 border-purple-900/20">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-purple-600">
                            Digital (Yape/Plin/Card)
                        </CardTitle>
                        <Smartphone className="h-4 w-4 text-purple-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-purple-700">{formatCurrency(summary?.totalDigital)}</div>
                        <p className="text-xs text-muted-foreground">
                            Billeteras digitales y tarjetas
                        </p>
                    </CardContent>
                </Card>

                <Card className="bg-blue-950/10 border-blue-900/20">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-blue-600">
                            Consumo de Saldo
                        </CardTitle>
                        <Wallet className="h-4 w-4 text-blue-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-blue-700">{formatCurrency(summary?.totalInternal)}</div>
                        <p className="text-xs text-muted-foreground">
                            Pagado con saldo prepagado
                        </p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle>Desglose por Método</CardTitle>
                        <CardDescription>
                            Total recaudado por cada medio de pago.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {summary?.breakdown && Object.entries(summary.breakdown).map(([method, amount]: [string, any]) => (
                                <div key={method} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                                    <div className="flex items-center gap-3">
                                        {method === 'CASH' && <Banknote className="h-5 w-5 text-emerald-500" />}
                                        {(method === 'YAPE' || method === 'PLIN') && <Smartphone className="h-5 w-5 text-purple-500" />}
                                        {method === 'CARD' && <CreditCard className="h-5 w-5 text-orange-500" />}
                                        {method === 'BALANCE' && <Wallet className="h-5 w-5 text-blue-500" />}
                                        <span className="font-medium text-sm">{method}</span>
                                    </div>
                                    <span className="font-bold font-mono">{formatCurrency(amount)}</span>
                                </div>
                            ))}
                            {(!summary?.breakdown || Object.keys(summary.breakdown).length === 0) && (
                                <div className="text-center py-6 text-muted-foreground text-sm">
                                    No hay movimientos registrados hoy.
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Future: Quick Actions like "Close Register" (Cierre de Caja) */}
                <Card>
                    <CardHeader>
                        <CardTitle>Operaciones</CardTitle>
                        <CardDescription>
                            Acciones de caja.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        <Button className="w-full" variant="outline">
                            <Calendar className="mr-2 h-4 w-4" /> Ver Historial (Próximamente)
                        </Button>
                        <Button className="w-full" variant="destructive" disabled>
                            Cerrar Caja (Próximamente)
                        </Button>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
