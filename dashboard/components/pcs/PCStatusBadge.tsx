interface PCStatusBadgeProps {
    status: string;
}

const statusConfig = {
    AVAILABLE: {
        label: 'Disponible',
        color: 'bg-green-100 text-green-700 border-green-200',
    },
    OCCUPIED: {
        label: 'Ocupada',
        color: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    },
    RESERVED: {
        label: 'Reservada',
        color: 'bg-blue-100 text-blue-700 border-blue-200',
    },
    MAINTENANCE: {
        label: 'Mantenimiento',
        color: 'bg-red-100 text-red-700 border-red-200',
    },
    OFFLINE: {
        label: 'Desconectada',
        color: 'bg-slate-100 text-slate-700 border-slate-200',
    },
    MALICIOUS: {
        label: 'ALERTA: AGENTE CERRADO',
        color: 'bg-red-600 text-white border-red-700 animate-pulse font-bold',
    },
};

export function PCStatusBadge({ status }: PCStatusBadgeProps) {
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.OFFLINE;

    return (
        <span
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${config.color}`}
        >
            {config.label}
        </span>
    );
}
