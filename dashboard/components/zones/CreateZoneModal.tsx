'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { zonesApi } from '@/lib/api';
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
import { Textarea } from '@/components/ui/textarea';

interface CreateZoneModalProps {
    lanId: string;
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export default function CreateZoneModal({ lanId, isOpen, onClose, onSuccess }: CreateZoneModalProps) {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [baseRate, setBaseRate] = useState('');
    const queryClient = useQueryClient();

    const createMutation = useMutation({
        mutationFn: () => zonesApi.create(lanId, {
            name,
            description: description || undefined,
            baseRate: parseFloat(baseRate),
        }),
        onSuccess: () => {
            onSuccess();
            resetForm();
        },
    });

    const resetForm = () => {
        setName('');
        setDescription('');
        setBaseRate('');
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!name || !baseRate || parseFloat(baseRate) <= 0) {
            return;
        }
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
                    <DialogTitle>Crear Nueva Zona</DialogTitle>
                    <DialogDescription>
                        Agrega una nueva zona para organizar tus PCs por categoría de equipamiento
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit}>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">Nombre de la Zona *</Label>
                            <Input
                                id="name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Ej: Zona VIP, Zona Estándar"
                                required
                                minLength={3}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="description">Descripción (Opcional)</Label>
                            <Textarea
                                id="description"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Ej: Equipos gaming de alta gama con RTX 4070"
                                rows={3}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="baseRate">Tarifa Base (S/ por hora) *</Label>
                            <Input
                                id="baseRate"
                                type="number"
                                step="0.01"
                                min="0.01"
                                value={baseRate}
                                onChange={(e) => setBaseRate(e.target.value)}
                                placeholder="Ej: 5.50"
                                required
                            />
                            <p className="text-xs text-muted-foreground">
                                Esta será la tarifa base por hora para todos los PCs de esta zona
                            </p>
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
                            disabled={createMutation.isPending || !name || !baseRate || parseFloat(baseRate) <= 0}
                        >
                            {createMutation.isPending ? 'Creando...' : 'Crear Zona'}
                        </Button>
                    </DialogFooter>
                </form>

                {createMutation.isError && (
                    <div className="text-sm text-red-600 mt-2">
                        Error al crear la zona. Intenta nuevamente.
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
