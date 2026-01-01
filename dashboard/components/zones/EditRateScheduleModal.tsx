'use client';

import { useState, useEffect } from 'react';
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

interface EditRateScheduleModalProps {
    schedule: any;
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export function EditRateScheduleModal({
    schedule,
    isOpen,
    onClose,
    onSuccess,
}: EditRateScheduleModalProps) {
    const [minutes, setMinutes] = useState('');
    const [price, setPrice] = useState('');
    const [isActive, setIsActive] = useState(true);
    const queryClient = useQueryClient();

    useEffect(() => {
        if (schedule) {
            setMinutes(schedule.minutes?.toString() || '');
            setPrice(schedule.price?.toString() || '');
            setIsActive(schedule.isActive ?? true);
        }
    }, [schedule]);

    const updateMutation = useMutation({
        mutationFn: () =>
            rateSchedulesApi.update(schedule.id, {
                minutes: parseInt(minutes),
                price: parseFloat(price),
                isActive,
            }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['rate-schedules', schedule.zoneId] });
            onSuccess();
        },
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!minutes || !price) return;
        updateMutation.mutate();
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Editar Tarifa</DialogTitle>
                    <DialogDescription>
                        Modifica los detalles de la tarifa
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit}>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="edit-minutes">Minutos *</Label>
                            <Input
                                id="edit-minutes"
                                type="number"
                                min="1"
                                value={minutes}
                                onChange={(e) => setMinutes(e.target.value)}
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="edit-price">Precio (S/) *</Label>
                            <Input
                                id="edit-price"
                                type="number"
                                step="0.01"
                                min="0.01"
                                value={price}
                                onChange={(e) => setPrice(e.target.value)}
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

                        <div className="flex items-center space-x-2">
                            <input
                                type="checkbox"
                                id="edit-isActive"
                                checked={isActive}
                                onChange={(e) => setIsActive(e.target.checked)}
                                className="rounded"
                            />
                            <Label htmlFor="edit-isActive" className="cursor-pointer">
                                Tarifa activa
                            </Label>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={onClose}
                            disabled={updateMutation.isPending}
                        >
                            Cancelar
                        </Button>
                        <Button
                            type="submit"
                            disabled={updateMutation.isPending || !minutes || !price}
                        >
                            {updateMutation.isPending ? 'Guardando...' : 'Guardar Cambios'}
                        </Button>
                    </DialogFooter>
                </form>

                {updateMutation.isError && (
                    <div className="text-sm text-red-600 mt-2">
                        Error al actualizar la tarifa. Intenta nuevamente.
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
