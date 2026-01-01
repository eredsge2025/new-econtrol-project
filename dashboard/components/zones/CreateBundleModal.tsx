'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { bundlesApi } from '@/lib/api';
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

interface CreateBundleModalProps {
    zoneId: string;
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export function CreateBundleModal({ zoneId, isOpen, onClose, onSuccess }: CreateBundleModalProps) {
    const [name, setName] = useState('');
    const [minutes, setMinutes] = useState('');
    const [price, setPrice] = useState('');
    const [isSaveable, setIsSaveable] = useState(false);
    const queryClient = useQueryClient();

    const createMutation = useMutation({
        mutationFn: () =>
            bundlesApi.create(zoneId, {
                name,
                minutes: parseInt(minutes),
                price: parseFloat(price),
                isSaveable,
                isActive: true,
            }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['bundles', zoneId] });
            resetForm();
            onSuccess();
        },
    });

    const resetForm = () => {
        setName('');
        setMinutes('');
        setPrice('');
        setIsSaveable(false);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!name || !minutes || !price) return;
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
                    <DialogTitle>Crear Nuevo Paquete</DialogTitle>
                    <DialogDescription>
                        Define un paquete de tiempo con una tarifa especial
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit}>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">Nombre del Paquete *</Label>
                            <Input
                                id="name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Ej: Paquete 2 Horas"
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="minutes">Minutos *</Label>
                            <Input
                                id="minutes"
                                type="number"
                                min="60"
                                value={minutes}
                                onChange={(e) => setMinutes(e.target.value)}
                                placeholder="Ej: 120"
                                required
                            />
                            <p className="text-xs text-muted-foreground">
                                Mínimo 60 minutos (1 hora)
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
                                placeholder="Ej: 10.00"
                                required
                            />
                        </div>

                        <div className="flex items-center space-x-2">
                            <input
                                type="checkbox"
                                id="isSaveable"
                                checked={isSaveable}
                                onChange={(e) => setIsSaveable(e.target.checked)}
                                className="rounded"
                            />
                            <Label htmlFor="isSaveable" className="cursor-pointer">
                                Tiempo guardable (el tiempo no usado se guarda para después)
                            </Label>
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
                            disabled={createMutation.isPending || !name || !minutes || !price}
                        >
                            {createMutation.isPending ? 'Creando...' : 'Crear Paquete'}
                        </Button>
                    </DialogFooter>
                </form>

                {createMutation.isError && (
                    <div className="text-sm text-red-600 mt-2">
                        Error al crear el paquete. {createMutation.error instanceof Error ? createMutation.error.message : 'Verifica que los minutos sean mínimo 60 y el precio mayor a 0.'}
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
