'use client';

import { Users, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { UsersList } from '@/components/users/UsersList';
import { useState } from 'react';
import { CreateUserDialog } from '@/components/users/CreateUserDialog';
import { useQuery } from '@tanstack/react-query';
import { lansApi } from '@/lib/api';

export default function UsersPage() {
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

    const { data: lans } = useQuery({
        queryKey: ['lans'],
        queryFn: lansApi.getAll,
    });

    const defaultLanId = lans?.[0]?.id;

    return (
        <div className="p-6 lg:p-10 space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center space-x-4">
                    <div className="p-3 bg-indigo-600 rounded-2xl shadow-lg shadow-indigo-200">
                        <Users className="h-8 w-8 text-white" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Gestión de Usuarios</h1>
                        <p className="text-gray-500 mt-1">Administra jugadores, saldos y privilegios de acceso.</p>
                    </div>
                </div>
                <Button
                    className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-md hover:shadow-lg transition-all 
                             h-12 px-6 rounded-xl font-bold flex items-center"
                    onClick={() => setIsCreateDialogOpen(true)}
                >
                    <UserPlus className="h-5 w-5 mr-2" />
                    Nuevo Jugador
                </Button>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                    <p className="text-sm font-medium text-gray-500">Total Usuarios</p>
                    <div className="mt-2 flex items-baseline">
                        <span className="text-3xl font-bold text-gray-900">--</span>
                        <span className="ml-2 text-xs font-medium text-green-600">+--%</span>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                    <p className="text-sm font-medium text-gray-500">Usuarios Activos (24h)</p>
                    <div className="mt-2 flex items-baseline">
                        <span className="text-3xl font-bold text-gray-900">--</span>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                    <p className="text-sm font-medium text-gray-500">Saldo Total Clientes</p>
                    <div className="mt-2 flex items-baseline">
                        <span className="text-3xl font-bold text-gray-900">S/ --</span>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                    <p className="text-sm font-medium text-gray-500">Ticket Promedio</p>
                    <div className="mt-2 flex items-baseline">
                        <span className="text-3xl font-bold text-gray-900">S/ --</span>
                    </div>
                </div>
            </div>

            {/* Users Content */}
            <div className="bg-white rounded-3xl border border-gray-100 shadow-xl shadow-gray-100/50 p-6 lg:p-8">
                <UsersList lanId={defaultLanId} />
            </div>

            <CreateUserDialog
                open={isCreateDialogOpen}
                onOpenChange={setIsCreateDialogOpen}
                lanId={defaultLanId}
            />
        </div>
    );
}
