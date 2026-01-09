'use client';

import { useState } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { financeApi, lansApi } from '@/lib/api';
import { Transaction } from '@/types';
import { DateRange } from 'react-day-picker';
import { addDays, startOfDay, endOfDay } from 'date-fns';
import { DatePickerWithRange } from '@/components/ui/date-range-picker';
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
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
    ChevronLeft,
    ChevronRight,
    Search,
    FilterX,
    Banknote,
    Smartphone,
    CreditCard,
    Wallet,
    LucideIcon
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

interface TransactionHistoryProps {
    lanId: string;
}

const iconMap: Record<string, LucideIcon> = {
    Wallet,
    Banknote,
    Smartphone,
    CreditCard
};

// Helper for dynamic icons
const IconRenderer = ({ name, className }: { name: string, className?: string }) => {
    const Icon = iconMap[name] || Banknote;
    return <Icon className={className} />;
};

export function TransactionHistory({ lanId }: TransactionHistoryProps) {
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState('');
    const [type, setType] = useState<string>('ALL');

    // Default to Today (Full Day)
    const [date, setDate] = useState<DateRange | undefined>({
        from: startOfDay(new Date()),
        to: endOfDay(new Date()),
    });

    // Fetch Payment Methods Configuration to render icons
    const { data: serverMethods } = useQuery({
        queryKey: ['lanPaymentMethods', lanId],
        queryFn: () => lansApi.getPaymentMethods(lanId),
        enabled: !!lanId,
    });

    const { data: transactionsData, isLoading } = useQuery({
        queryKey: ['transactions', lanId, page, type, search, date?.from, date?.to],
        queryFn: () => financeApi.getTransactions(lanId, {
            page,
            limit: 10,
            type,
            search,
            startDate: date?.from ? startOfDay(date.from).toISOString() : undefined,
            endDate: date?.to ? endOfDay(date.to).toISOString() : date?.from ? endOfDay(date.from).toISOString() : undefined
        }),
        enabled: !!lanId,
        placeholderData: keepPreviousData
    });

    const getMethodConfig = (methodId: string) => {
        const config = serverMethods?.find((m: any) => m.methodId === methodId);
        if (config) return config;

        // Defaults
        if (methodId === 'BALANCE') return { displayName: 'Saldo', icon: 'Wallet', color: 'text-blue-500' };
        if (methodId === 'CASH') return { displayName: 'Efectivo', icon: 'Banknote', color: 'text-emerald-500' };
        if (methodId === 'YAPE') return { displayName: 'Yape', icon: 'Smartphone', color: 'text-purple-500' };
        if (methodId === 'PLIN') return { displayName: 'Plin', icon: 'Smartphone', color: 'text-blue-400' };
        if (methodId === 'CARD') return { displayName: 'Tarjeta', icon: 'CreditCard', color: 'text-orange-500' };

        return { displayName: methodId, icon: 'Banknote', color: 'text-gray-500' };
    };

    const formatCurrency = (amount: number) => `S/ ${Number(amount).toFixed(2)}`;

    const getTypeLabel = (type: string) => {
        switch (type) {
            case 'RECHARGE': return { label: 'Recarga', color: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' };
            case 'SESSION_PAYMENT': return { label: 'Consumo', color: 'bg-blue-500/10 text-blue-500 border-blue-500/20' };
            case 'STORE_PURCHASE': return { label: 'Venta', color: 'bg-purple-500/10 text-purple-500 border-purple-500/20' };
            case 'REFUND': return { label: 'Reembolso', color: 'bg-red-500/10 text-red-500 border-red-500/20' };
            case 'PENALTY': return { label: 'Penalidad', color: 'bg-orange-500/10 text-orange-500 border-orange-500/20' };
            default: return { label: type, color: 'bg-zinc-500/10 text-zinc-500' };
        }
    };

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        setPage(1);
    };

    return (
        <Card className="col-span-full" >
            <CardHeader>
                <CardTitle>Historial de Transacciones</CardTitle>
                <CardDescription>Movimientos detallados de la caja.</CardDescription>
            </CardHeader>
            <CardContent>
                {/* Filters */}
                <div className="flex flex-col md:flex-row gap-3 mb-6">
                    <DatePickerWithRange date={date} setDate={(d) => { setDate(d); setPage(1); }} className="w-full md:w-auto" />

                    <form onSubmit={handleSearch} className="flex gap-2 flex-1">
                        <Input
                            placeholder="Buscar usuario o PC (ej. pc01)"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="bg-transparent"
                        />
                        <Button type="submit" variant="secondary" size="icon">
                            <Search className="h-4 w-4" />
                        </Button>
                    </form>

                    <Select value={type} onValueChange={(v) => { setType(v); setPage(1); }}>
                        <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Tipo" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="ALL">Todo</SelectItem>
                            <SelectItem value="RECHARGE">Recargas</SelectItem>
                            <SelectItem value="SESSION_PAYMENT">Consumo PC</SelectItem>
                            <SelectItem value="STORE_PURCHASE">Ventas</SelectItem>
                            <SelectItem value="REFUND">Reembolsos</SelectItem>
                        </SelectContent>
                    </Select>

                    {(search || type !== 'ALL') && (
                        <Button variant="ghost" onClick={() => { setSearch(''); setType('ALL'); setPage(1); }}>
                            <FilterX className="h-4 w-4 mr-2" />
                            Limpiar
                        </Button>
                    )}
                </div>

                {/* Table */}
                <div className="rounded-md border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Hora</TableHead>
                                <TableHead>Usuario</TableHead>
                                <TableHead>Cajero</TableHead>
                                <TableHead>Tipo</TableHead>
                                <TableHead>Detalle</TableHead>
                                <TableHead>PC</TableHead>
                                <TableHead>Método</TableHead>
                                <TableHead className="text-right">Monto</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow>
                                    <TableCell colSpan={8} className="h-24 text-center">Cargando...</TableCell>
                                </TableRow>
                            ) : !transactionsData?.data?.length ? (
                                <TableRow>
                                    <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                                        No se encontraron transacciones.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                transactionsData.data.map((tx: Transaction) => {
                                    const methodConfig = getMethodConfig(tx.paymentMethod);
                                    const typeInfo = getTypeLabel(tx.type);

                                    // Extract duration from description if possible, otherwise fallback to session total
                                    // Descriptions usually match: "... - 18 min" or "... (18 min)"
                                    const durationMatch = tx.description?.match(/(\d+)\s*min/);
                                    const displayDuration = durationMatch ? durationMatch[0] : (
                                        tx.session?.durationSeconds
                                            ? Math.ceil(tx.session.durationSeconds / 60) + ' min'
                                            : null
                                    );

                                    return (
                                        <TableRow key={tx.id}>
                                            <TableCell className="font-mono text-xs">
                                                {format(new Date(tx.createdAt), 'HH:mm:ss', { locale: es })}
                                                <div className="text-[10px] text-muted-foreground">
                                                    {format(new Date(tx.createdAt), 'dd MMM')}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="font-medium text-sm">
                                                    {tx.user?.username || 'Sesión Anonima'}
                                                </div>
                                                <div className="text-[10px] text-muted-foreground truncate max-w-[150px]">
                                                    {tx.user?.email}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="font-medium text-xs text-muted-foreground">
                                                    {tx.staff?.email || tx.staff?.username || '-'}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className={`text-[10px] ${typeInfo.color}`}>
                                                    {typeInfo.label}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-sm">
                                                {displayDuration ? (
                                                    <span className="font-mono text-xs">{displayDuration}</span>
                                                ) : (
                                                    <span className="text-muted-foreground text-xs">{tx.description?.slice(0, 20) || '-'}...</span>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-sm">
                                                {tx.session?.pc?.name ? (
                                                    <Badge variant="secondary" className="font-mono text-[10px]">
                                                        {tx.session.pc.name}
                                                    </Badge>
                                                ) : '-'}
                                            </TableCell>
                                            <TableCell>
                                                {tx.paymentMethod && (
                                                    <div className="flex items-center gap-2">
                                                        <div className={`p-1 rounded bg-muted ${methodConfig.color}`}>
                                                            <IconRenderer name={methodConfig.icon} className="h-3 w-3" />
                                                        </div>
                                                        <span className="text-xs">{methodConfig.displayName}</span>
                                                    </div>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-right font-mono font-medium">
                                                {formatCurrency(tx.amount)}
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            )}
                        </TableBody>
                    </Table>
                </div>

                {/* Pagination */}
                <div className="flex items-center justify-between mt-4">
                    <div className="text-xs text-muted-foreground">
                        Página {page} de {transactionsData?.meta?.lastPage || 1}
                    </div>
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            disabled={page === 1 || isLoading}
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPage(p => p + 1)}
                            disabled={!transactionsData || page >= (transactionsData?.meta?.lastPage || 1) || isLoading}
                        >
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </CardContent>
        </Card >
    );
}
