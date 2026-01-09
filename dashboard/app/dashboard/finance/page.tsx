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
import { PaymentMethodsConfig } from '@/components/finance/PaymentMethodsConfig';
import { Settings2 } from 'lucide-react';
import * as LucideIcons from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TransactionHistory } from '@/components/finance/TransactionHistory';

// Helper for dynamic icons
const IconRenderer = ({ name, className }: { name: string, className?: string }) => {
    // @ts-ignore
    const Icon = LucideIcons[name] || LucideIcons.Banknote;
    return <Icon className={className} />;
};

export default function FinancePage() {
    const [selectedLanId, setSelectedLanId] = useState<string>('');
    const [isConfigOpen, setIsConfigOpen] = useState(false);

    // Fetch LANs
    const { data: lans, isLoading: isLoadingLans } = useQuery({
        queryKey: ['lans'],
        queryFn: lansApi.getAll,
    });

    // Set default LAN
    if (lans?.length > 0 && !selectedLanId) {
        setSelectedLanId(lans[0].id);
    }

    // Fetch Payment Methods Configuration
    const { data: serverMethods } = useQuery({
        queryKey: ['lanPaymentMethods', selectedLanId],
        queryFn: () => lansApi.getPaymentMethods(selectedLanId),
        enabled: !!selectedLanId,
    });

    const { data: summary, isLoading, refetch } = useQuery({
        queryKey: ['finance', 'summary', selectedLanId],
        queryFn: () => financeApi.getSummary(selectedLanId),
        enabled: !!selectedLanId,
        refetchInterval: 30000,
    });

    // Helper to get method config
    const getMethodConfig = (methodId: string) => {
        const config = serverMethods?.find((m: any) => m.methodId === methodId);
        if (config) return config;

        // Default configs for system types if not found (e.g. BALANCE) or legacy
        if (methodId === 'BALANCE') return { displayName: 'Saldo (Sistema)', icon: 'Wallet', color: 'text-blue-500' };
        if (methodId === 'CASH') return { displayName: 'Efectivo', icon: 'Banknote', color: 'text-emerald-500' };
        if (methodId === 'YAPE' || methodId === 'PLIN') return { displayName: methodId, icon: 'Smartphone', color: 'text-purple-500' };
        if (methodId === 'CARD') return { displayName: 'Tarjeta', icon: 'CreditCard', color: 'text-orange-500' };

        return { displayName: methodId, icon: 'Banknote', color: 'text-gray-500' };
    }

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
                    <h1 className="text-3xl font-bold tracking-tight">Finanzas</h1>
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
                    <Button variant="outline" size="icon" onClick={() => setIsConfigOpen(true)} title="Configurar Métodos">
                        <Settings2 className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            <PaymentMethodsConfig
                lanId={selectedLanId}
                isOpen={isConfigOpen}
                onClose={() => setIsConfigOpen(false)}
            />

            <Tabs defaultValue="summary" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="summary">Caja Actual</TabsTrigger>
                    <TabsTrigger value="history">Historial</TabsTrigger>
                </TabsList>
                <TabsContent value="summary" className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                        Resumen de movimientos del día: {format(new Date(), "EEEE d 'de' MMMM", { locale: es })}
                    </p>
                    <div className="grid gap-4 md:grid-cols-4">
                        <Card className="bg-emerald-950/10 border-emerald-900/20">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium text-emerald-600">
                                    Efectivo (Caja)
                                </CardTitle>
                                <Banknote className="h-4 w-4 text-emerald-600" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-emerald-700">{formatCurrency(summary?.totalCash)}</div>
                                <p className="text-xs text-muted-foreground">
                                    Dinero físico
                                </p>
                            </CardContent>
                        </Card>

                        <Card className="bg-purple-950/10 border-purple-900/20">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium text-purple-600">
                                    Digital
                                </CardTitle>
                                <Smartphone className="h-4 w-4 text-purple-600" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-purple-700">{formatCurrency(summary?.totalDigital)}</div>
                                <p className="text-xs text-muted-foreground">
                                    Yape / Plin / Tarjeta
                                </p>
                            </CardContent>
                        </Card>

                        {/* Grand Total (Cash + Digital) -> Real Money */}
                        <Card className="bg-zinc-950/10 border-zinc-900/20 dark:bg-white/5 dark:border-white/10">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-bold text-foreground">
                                    Total Recaudado
                                </CardTitle>
                                <ArrowUpCircle className="h-4 w-4 text-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-black text-foreground">
                                    {formatCurrency((summary?.totalCash || 0) + (summary?.totalDigital || 0))}
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    Total Auditable (Caja + Bancos)
                                </p>
                            </CardContent>
                        </Card>

                        {/* Informational Balance */}
                        <Card className="bg-zinc-950/50 border-zinc-900/20 dark:bg-white/5 dark:border-white/10">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium text-blue-600">
                                    Consumo Saldo
                                </CardTitle>
                                <Wallet className="h-4 w-4 text-blue-400" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-blue-600">{formatCurrency(summary?.totalInternal)}</div>
                                <p className="text-xs text-blue-400">
                                    Informativo (Ya pagado)
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
                                    {summary?.breakdown && Object.entries(summary.breakdown).map(([methodId, amount]: [string, any]) => {
                                        const config = getMethodConfig(methodId);
                                        return (
                                            <div key={methodId} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                                                <div className="flex items-center gap-3">
                                                    <div className={`p-1.5 rounded-md bg-transparent ${config.color}`}>
                                                        <IconRenderer name={config.icon} className="h-5 w-5" />
                                                    </div>
                                                    <span className="font-medium text-sm">{config.displayName || methodId}</span>
                                                </div>
                                                <span className="font-bold font-mono">{formatCurrency(amount)}</span>
                                            </div>
                                        );
                                    })}
                                    {(!summary?.breakdown || Object.keys(summary.breakdown).length === 0) && (
                                        <div className="text-center py-6 text-muted-foreground text-sm">
                                            No hay movimientos registrados hoy.
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>Operaciones</CardTitle>
                                <CardDescription>
                                    Acciones de caja.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-2">
                                <Button className="w-full" variant="destructive" disabled>
                                    Cerrar Caja (Próximamente)
                                </Button>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>
                <TabsContent value="history">
                    <TransactionHistory lanId={selectedLanId} />
                </TabsContent>
            </Tabs>
        </div>
    );
}
