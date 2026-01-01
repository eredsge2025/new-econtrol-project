'use client';

import { useState, useEffect } from 'react';
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

interface EditZoneModalProps {
    zone: any;
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export function EditZoneModal({ zone, isOpen, onClose, onSuccess }: EditZoneModalProps) {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [baseRate, setBaseRate] = useState('');
    const queryClient = useQueryClient();

    useEffect(() => {
        if (zone) {
            setName(zone.name || '');
            setDescription(zone.description || '');
            setBaseRate(zone.baseRate?.toString() || '');
        }
    }, [zone]);

    const updateMutation = useMutation({
        mutationFn: () =>
            zonesApi.update(zone.id, {
                name,
                description,
                baseRate: parseFloat(baseRate),
            }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['zones', zone.lanId] });
            queryClient.invalidateQueries({ queryKey: ['zone', zone.id] });
            onSuccess();
        },
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!name || !baseRate || parseFloat(baseRate) <= 0) {
            return;
        }
        updateMutation.mutate();
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Editar Zona</DialogTitle>
                    <DialogDescription>
                        Actualiza la información de la zona
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit}>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="edit-zone-name">Nombre de la Zona *</Label>
                            <Input
                                id="edit-zone-name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Ej: Gaming, VIP, Stream"
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="edit-zone-description">Descripción</Label>
                            <Textarea
                                id="edit-zone-description"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Descripción de la zona (opcional)"
                                rows={3}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="edit-zone-baseRate">Tarifa Base (S/ por hora) *</Label>
                            <Input
                                id="edit-zone-baseRate"
                                type="number"
                                step="0.01"
                                min="0.01"
                                value={baseRate}
                                onChange={(e) => setBaseRate(e.target.value)}
                                placeholder="Ej: 3.50"
                                required
                            />
                            <p className="text-xs text-muted-foreground">
                                Esta es la tarifa base por hora de juego
                            </p>
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
                            disabled={updateMutation.isPending || !name || !baseRate || parseFloat(baseRate) <= 0}
                        >
                            {updateMutation.isPending ? 'Guardando...' : 'Guardar Cambios'}
                        </Button>
                    </DialogFooter>
                </form>

                {updateMutation.isError && (
                    <div className="text-sm text-red-600 mt-2">
                        Error al actualizar la zona. Intenta nuevamente.
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
