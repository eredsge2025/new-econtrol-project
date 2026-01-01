'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { zonesApi, lansApi } from '@/lib/api';
import { UserRole } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LayoutGrid, Plus, Pencil, Trash2, Monitor } from 'lucide-react';
import CreateZoneModal from '@/components/zones/CreateZoneModal';

export default function ZonesPage() {
    const { user } = useAuth();
    const router = useRouter();
    const queryClient = useQueryClient();
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [selectedLan, setSelectedLan] = useState<string | null>(null);

    // Verificar permisos
    useEffect(() => {
        if (user && user.role !== UserRole.LAN_ADMIN && user.role !== UserRole.SUPER_ADMIN) {
            router.push('/dashboard');
        }
    }, [user, router]);

    // Obtener LANs del usuario
    const { data: lans } = useQuery({
        queryKey: ['lans'],
        queryFn: () => lansApi.getAll(),
        enabled: !!user,
    });

    // Seleccionar el primer LAN por defecto
    useEffect(() => {
        if (lans && lans.length > 0 && !selectedLan) {
            setSelectedLan(lans[0].id);
        }
    }, [lans, selectedLan]);

    // Obtener zonas del LAN seleccionado
    const { data: zones, isLoading } = useQuery({
        queryKey: ['zones', selectedLan],
        queryFn: () => zonesApi.getByLan(selectedLan!),
        enabled: !!selectedLan,
    });

    // Mutation para eliminar zona
    const deleteMutation = useMutation({
        mutationFn: (zoneId: string) => zonesApi.delete(zoneId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['zones', selectedLan] });
        },
    });

    const handleDelete = (zoneId: string) => {
        if (confirm('¿Estás seguro de eliminar esta zona? Esto también eliminará todos los PCs asociados.')) {
            deleteMutation.mutate(zoneId);
        }
    };

    if (!user || (user.role !== UserRole.LAN_ADMIN && user.role !== UserRole.SUPER_ADMIN)) {
        return null;
    }

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <div className="mb-6 flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold flex items-center gap-2">
                        <LayoutGrid className="h-8 w-8" />
                        Gestión de Zonas
                    </h1>
                    <p className="text-muted-foreground mt-2">
                        Administra las zonas de tu LAN Center
                    </p>
                </div>
                <Button
                    onClick={() => setIsCreateModalOpen(true)}
                    disabled={!selectedLan}
                    className="gap-2"
                >
                    <Plus className="h-4 w-4" />
                    Nueva Zona
                </Button>
            </div>

            {/* Selector de LAN (si es SUPER_ADMIN) */}
            {user.role === UserRole.SUPER_ADMIN && lans && lans.length > 1 && (
                <Card className="mb-6">
                    <CardHeader>
                        <CardTitle className="text-lg">Seleccionar LAN Center</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex gap-2 flex-wrap">
                            {lans.map((lan: any) => (
                                <Button
                                    key={lan.id}
                                    variant={selectedLan === lan.id ? 'default' : 'outline'}
                                    onClick={() => setSelectedLan(lan.id)}
                                >
                                    {lan.name}
                                </Button>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Lista de Zonas */}
            {isLoading ? (
                <div className="text-center py-12">
                    <p className="text-muted-foreground">Cargando zonas...</p>
                </div>
            ) : !zones || zones.length === 0 ? (
                <Card>
                    <CardContent className="text-center py-12">
                        <LayoutGrid className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                        <h3 className="text-lg font-semibold mb-2">No hay zonas creadas</h3>
                        <p className="text-muted-foreground mb-4">
                            Comienza creando tu primera zona para organizar tus PCs
                        </p>
                        <Button onClick={() => setIsCreateModalOpen(true)} className="gap-2">
                            <Plus className="h-4 w-4" />
                            Crear Primera Zona
                        </Button>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {zones.map((zone: any) => (
                        <Card key={zone.id} className="hover:shadow-lg transition-shadow">
                            <CardHeader>
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <CardTitle className="text-xl">{zone.name}</CardTitle>
                                        <CardDescription className="mt-1">
                                            {zone.description || 'Sin descripción'}
                                        </CardDescription>
                                    </div>
                                    <Badge variant="secondary" className="ml-2">
                                        S/ {parseFloat(zone.baseRate).toFixed(2)}/h
                                    </Badge>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-3">
                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                        <Monitor className="h-4 w-4" />
                                        <span>{zone._count?.pcs || 0} PCs registrados</span>
                                    </div>

                                    <div className="flex gap-2 pt-3 border-t">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="flex-1 gap-2"
                                            onClick={() => router.push(`/dashboard/zones/${zone.id}`)}
                                        >
                                            <Pencil className="h-4 w-4" />
                                            Editar
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="gap-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                                            onClick={() => handleDelete(zone.id)}
                                            disabled={deleteMutation.isPending}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                            Eliminar
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {/* Modal de Creación */}
            {selectedLan && (
                <CreateZoneModal
                    lanId={selectedLan}
                    isOpen={isCreateModalOpen}
                    onClose={() => setIsCreateModalOpen(false)}
                    onSuccess={() => {
                        setIsCreateModalOpen(false);
                        queryClient.invalidateQueries({ queryKey: ['zones', selectedLan] });
                    }}
                />
            )}
        </div>
    );
}
