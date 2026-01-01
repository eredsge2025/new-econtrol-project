'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { rateSchedulesApi } from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock, Plus, Pencil, Trash2, DollarSign, Sparkles } from 'lucide-react';
import { CreateRateScheduleModal } from './CreateRateScheduleModal';
import { EditRateScheduleModal } from './EditRateScheduleModal';

interface RateSchedulesListProps {
    zoneId: string;
}

export function RateSchedulesList({ zoneId }: RateSchedulesListProps) {
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [editingSchedule, setEditingSchedule] = useState<any>(null);
    const queryClient = useQueryClient();

    const { data: schedules, isLoading } = useQuery({
        queryKey: ['rate-schedules', zoneId],
        queryFn: () => rateSchedulesApi.getByZone(zoneId),
    });

    const deleteMutation = useMutation({
        mutationFn: (id: string) => rateSchedulesApi.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['rate-schedules', zoneId] });
        },
    });

    const generateMutation = useMutation({
        mutationFn: () => rateSchedulesApi.generateFromBaseRate(zoneId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['rate-schedules', zoneId] });
        },
    });

    const handleDelete = (id: string, minutes: number) => {
        if (confirm(`¿Estás seguro de eliminar la tarifa de ${minutes} minutos?`)) {
            deleteMutation.mutate(id);
        }
    };

    const handleGenerate = () => {
        if (
            confirm(
                '¿Generar tarifas automáticamente desde la tarifa base? Esto creará tarifas para 15, 30, 60, 120, 180 y 240 minutos.'
            )
        ) {
            generateMutation.mutate();
        }
    };

    if (isLoading) {
        return (
            <div className="text-center py-8">
                <p className="text-muted-foreground">Cargando tarifas...</p>
            </div>
        );
    }

    const sortedSchedules = schedules
        ? [...schedules].sort((a: any, b: any) => a.minutes - b.minutes)
        : [];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold">Tarifas por Tiempo</h2>
                    <p className="text-muted-foreground mt-1">
                        Define precios según el tiempo de juego
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        onClick={handleGenerate}
                        className="gap-2"
                        disabled={generateMutation.isPending}
                    >
                        <Sparkles className="h-4 w-4" />
                        {generateMutation.isPending ? 'Generando...' : 'Auto-Generar'}
                    </Button>
                    <Button onClick={() => setIsCreateModalOpen(true)} className="gap-2">
                        <Plus className="h-4 w-4" />
                        Nueva Tarifa
                    </Button>
                </div>
            </div>

            {/* Info Card */}
            <Card className="bg-blue-50 border-blue-200">
                <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                        <Clock className="h-5 w-5 text-blue-600" />
                        Sistema de Cobro por Escalones
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-blue-900">
                        El sistema cobra por el <strong>próximo escalón superior</strong> al tiempo
                        jugado. Por ejemplo, si un usuario juega 18 minutos y tienes una tarifa de
                        30 minutos, se cobrará el precio de 30 minutos.
                    </p>
                </CardContent>
            </Card>

            {/* Schedules Grid */}
            {!sortedSchedules || sortedSchedules.length === 0 ? (
                <Card>
                    <CardContent className="text-center py-12">
                        <Clock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                        <h3 className="text-lg font-semibold mb-2">No hay tarifas creadas</h3>
                        <p className="text-muted-foreground mb-4">
                            Genera tarifas automáticamente o crea una manualmente
                        </p>
                        <div className="flex gap-2 justify-center">
                            <Button
                                variant="outline"
                                onClick={handleGenerate}
                                className="gap-2"
                                disabled={generateMutation.isPending}
                            >
                                <Sparkles className="h-4 w-4" />
                                Auto-Generar Tarifas
                            </Button>
                            <Button onClick={() => setIsCreateModalOpen(true)} className="gap-2">
                                <Plus className="h-4 w-4" />
                                Crear Manualmente
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {sortedSchedules.map((schedule: any) => (
                        <Card key={schedule.id} className="hover:shadow-lg transition-shadow">
                            <CardHeader>
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <CardTitle className="flex items-center gap-2">
                                            <Clock className="h-5 w-5" />
                                            {schedule.minutes} minutos
                                        </CardTitle>
                                        <CardDescription className="mt-2">
                                            {schedule.minutes < 60
                                                ? `${schedule.minutes} min`
                                                : `${(schedule.minutes / 60).toFixed(1)} horas`}
                                        </CardDescription>
                                    </div>
                                    <Badge
                                        variant={schedule.isActive ? 'default' : 'secondary'}
                                        className="ml-2"
                                    >
                                        {schedule.isActive ? 'Activa' : 'Inactiva'}
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
                                        <span>S/ {parseFloat(schedule.price).toFixed(2)}</span>
                                    </div>

                                    <div className="text-sm text-muted-foreground">
                                        S/ {(parseFloat(schedule.price) / (schedule.minutes / 60)).toFixed(2)}{' '}
                                        por hora efectiva
                                    </div>

                                    <div className="flex gap-2 pt-3 border-t">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="flex-1 gap-2"
                                            onClick={() => setEditingSchedule(schedule)}
                                        >
                                            <Pencil className="h-4 w-4" />
                                            Editar
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="gap-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                                            onClick={() =>
                                                handleDelete(schedule.id, schedule.minutes)
                                            }
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
            <CreateRateScheduleModal
                zoneId={zoneId}
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                onSuccess={() => setIsCreateModalOpen(false)}
            />

            {editingSchedule && (
                <EditRateScheduleModal
                    schedule={editingSchedule}
                    isOpen={!!editingSchedule}
                    onClose={() => setEditingSchedule(null)}
                    onSuccess={() => setEditingSchedule(null)}
                />
            )}
        </div>
    );
}
