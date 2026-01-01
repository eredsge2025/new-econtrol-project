'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { usersApi } from '@/lib/api';
import { Users, Search, Filter, Loader2 } from 'lucide-react';
import { UserCard } from './UserCard';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface UsersListProps {
    lanId?: string;
}

export function UsersList({ lanId }: UsersListProps) {
    const [searchTerm, setSearchTerm] = useState('');
    const [roleFilter, setRoleFilter] = useState<string>('ALL');

    const { data: users, isLoading, error } = useQuery({
        queryKey: ['users', lanId],
        queryFn: () => usersApi.getAll(lanId),
        enabled: !!lanId, // Only fetch if lanId is available (or handle general fetch if no LAN?)
    });

    const filteredUsers = users?.filter((user: any) => {
        const matchesSearch =
            user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.email.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesRole = roleFilter === 'ALL' || user.role === roleFilter;

        return matchesSearch && matchesRole;
    });

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center py-12">
                <Loader2 className="h-8 w-8 text-indigo-600 animate-spin mb-4" />
                <p className="text-muted-foreground">Cargando usuarios...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-destructive/10 border border-destructive/20 text-destructive p-4 rounded-lg">
                Error al cargar los usuarios. Por favor, intenta de nuevo.
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Buscar por usuario o email..."
                        className="pl-10"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4 text-muted-foreground" />
                    <select
                        className="bg-background border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                        value={roleFilter}
                        onChange={(e) => setRoleFilter(e.target.value)}
                    >
                        <option value="ALL">Todos los roles</option>
                        <option value="USER">Jugadores</option>
                        <option value="LAN_ADMIN">Administradores</option>
                        <option value="OWNER">Dueños</option>
                        <option value="SUPER_ADMIN">Soporte</option>
                    </select>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredUsers?.map((user: any) => (
                    <UserCard key={user.id} user={user} />
                ))}
            </div>

            {filteredUsers?.length === 0 && (
                <div className="text-center py-12 bg-muted/50 rounded-lg border-2 border-dashed border-border">
                    <Users className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium text-foreground">No se encontraron usuarios</h3>
                    <p className="text-muted-foreground">Ajusta los filtros de búsqueda e intenta de nuevo.</p>
                </div>
            )}
        </div>
    );
}
