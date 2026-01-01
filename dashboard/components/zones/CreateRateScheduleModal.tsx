'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { rateSchedulesApi } from '@/lib/api';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface CreateRateScheduleModalProps {
    zoneId: string;
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export function CreateRateScheduleModal({
    zoneId,
    isOpen,
    onClose,
    onSuccess,
}: CreateRateScheduleModalProps) {
    const [minutes, setMinutes] = useState('');
    const [price, setPrice] = useState('');
    const queryClient = useQueryClient();

    const createMutation = useMutation({
        mutationFn: () =>
            rateSchedulesApi.create(zoneId, {
                minutes: parseInt(minutes),
                price: parseFloat(price),
                isActive: true,
            }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['rate-schedules', zoneId] });
            resetForm();
            onSuccess();
        },
    });

    const resetForm = () => {
        setMinutes('');
        setPrice('');
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!minutes || !price) return;
        createMutation.mutate();
    };

    const handleClose = () => {
        if (!createMutation.isPending) {
            resetForm();
            onClose();
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={handleClose}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Crear Nueva Tarifa</DialogTitle>
                    <DialogDescription>
                        Define una tarifa para un tiempo específico de juego
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit}>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="minutes">Minutos *</Label>
                            <Input
                                id="minutes"
                                type="number"
                                min="1"
                                value={minutes}
                                onChange={(e) => setMinutes(e.target.value)}
                                placeholder="Ej: 60"
                                required
                            />
                            <p className="text-xs text-muted-foreground">
                                Tiempo de juego en minutos (ej: 60 = 1 hora)
                            </p>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="price">Precio (S/) *</Label>
                            <Input
                                id="price"
                                type="number"
                                step="0.01"
                                min="0.01"
                                value={price}
                                onChange={(e) => setPrice(e.target.value)}
                                placeholder="Ej: 5.00"
                                required
                            />
                            {minutes && price && (
                                <p className="text-xs text-muted-foreground">
                                    Precio efectivo: S/{' '}
                                    {(
                                        parseFloat(price) /
                                        (parseInt(minutes) / 60)
                                    ).toFixed(2)}{' '}
                                    por hora
                                </p>
                            )}
                        </div>
                    </div>

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={handleClose}
                            disabled={createMutation.isPending}
                        >
                            Cancelar
                        </Button>
                        <Button
                            type="submit"
                            disabled={createMutation.isPending || !minutes || !price}
                        >
                            {createMutation.isPending ? 'Creando...' : 'Crear Tarifa'}
                        </Button>
                    </DialogFooter>
                </form>

                {createMutation.isError && (
                    <div className="text-sm text-red-600 mt-2">
                        Error al crear la tarifa. Intenta nuevamente.
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
