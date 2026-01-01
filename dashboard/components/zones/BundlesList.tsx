'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { bundlesApi } from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Package, Plus, Pencil, Trash2, Clock, DollarSign, Save } from 'lucide-react';
import { CreateBundleModal } from './CreateBundleModal';
import { EditBundleModal } from './EditBundleModal';

interface BundlesListProps {
    zoneId: string;
}

export function BundlesList({ zoneId }: BundlesListProps) {
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [editingBundle, setEditingBundle] = useState<any>(null);
    const queryClient = useQueryClient();

    const { data: bundles, isLoading } = useQuery({
        queryKey: ['bundles', zoneId],
        queryFn: () => bundlesApi.getByZone(zoneId),
    });

    const deleteMutation = useMutation({
        mutationFn: (id: string) => bundlesApi.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['bundles', zoneId] });
        },
    });

    const handleDelete = (id: string, name: string) => {
        if (confirm(`¿Estás seguro de eliminar el paquete "${name}"?`)) {
            deleteMutation.mutate(id);
        }
    };

    if (isLoading) {
        return (
            <div className="text-center py-8">
                <p className="text-muted-foreground">Cargando paquetes...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold">Paquetes de Tiempo</h2>
                    <p className="text-muted-foreground mt-1">
                        Crea paquetes especiales con tarifas preferentes
                    </p>
                </div>
                <Button onClick={() => setIsCreateModalOpen(true)} className="gap-2">
                    <Plus className="h-4 w-4" />
                    Nuevo Paquete
                </Button>
            </div>

            {/* Bundles Grid */}
            {!bundles || bundles.length === 0 ? (
                <Card>
                    <CardContent className="text-center py-12">
                        <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                        <h3 className="text-lg font-semibold mb-2">No hay paquetes creados</h3>
                        <p className="text-muted-foreground mb-4">
                            Crea paquetes de tiempo para ofrecer mejores precios
                        </p>
                        <Button onClick={() => setIsCreateModalOpen(true)} className="gap-2">
                            <Plus className="h-4 w-4" />
                            Crear Primer Paquete
                        </Button>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {bundles.map((bundle: any) => (
                        <Card key={bundle.id} className="hover:shadow-lg transition-shadow">
                            <CardHeader>
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <CardTitle className="flex items-center gap-2">
                                            {bundle.name}
                                            {bundle.isSaveable && (
                                                <Badge variant="secondary" className="gap-1">
                                                    <Save className="h-3 w-3" />
                                                    Guardable
                                                </Badge>
                                            )}
                                        </CardTitle>
                                        <CardDescription className="flex items-center gap-2 mt-2">
                                            <Clock className="h-4 w-4" />
                                            {bundle.minutes} minutos
                                        </CardDescription>
                                    </div>
                                    <Badge
                                        variant={bundle.isActive ? 'default' : 'secondary'}
                                        className="ml-2"
                                    >
                                        {bundle.isActive ? 'Activo' : 'Inactivo'}
                                    </Badge>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between text-lg font-bold">
                                        <span className="flex items-center gap-1">
                                            <DollarSign className="h-5 w-5" />
                                            Precio:
                                        </span>
                                        <span>S/ {parseFloat(bundle.price).toFixed(2)}</span>
                                    </div>

                                    <div className="flex gap-2 pt-3 border-t">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="flex-1 gap-2"
                                            onClick={() => setEditingBundle(bundle)}
                                        >
                                            <Pencil className="h-4 w-4" />
                                            Editar
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="gap-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                                            onClick={() => handleDelete(bundle.id, bundle.name)}
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

            {/* Modals */}
            <CreateBundleModal
                zoneId={zoneId}
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                onSuccess={() => setIsCreateModalOpen(false)}
            />

            {editingBundle && (
                <EditBundleModal
                    bundle={editingBundle}
                    isOpen={!!editingBundle}
                    onClose={() => setEditingBundle(null)}
                    onSuccess={() => setEditingBundle(null)}
                />
            )}
        </div>
    );
}
