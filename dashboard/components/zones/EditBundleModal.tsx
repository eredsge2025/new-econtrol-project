'use client';

import { useState, useEffect } from 'react';
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

interface EditBundleModalProps {
    bundle: any;
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export function EditBundleModal({ bundle, isOpen, onClose, onSuccess }: EditBundleModalProps) {
    const [name, setName] = useState('');
    const [minutes, setMinutes] = useState('');
    const [price, setPrice] = useState('');
    const [isSaveable, setIsSaveable] = useState(false);
    const [isActive, setIsActive] = useState(true);
    const queryClient = useQueryClient();

    useEffect(() => {
        if (bundle) {
            setName(bundle.name || '');
            setMinutes(bundle.minutes?.toString() || '');
            setPrice(bundle.price?.toString() || '');
            setIsSaveable(bundle.isSaveable ?? false);
            setIsActive(bundle.isActive ?? true);
        }
    }, [bundle]);

    const updateMutation = useMutation({
        mutationFn: () =>
            bundlesApi.update(bundle.id, {
                name,
                minutes: parseInt(minutes),
                price: parseFloat(price),
                isSaveable,
                isActive,
            }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['bundles', bundle.zoneId] });
            onSuccess();
        },
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!name || !minutes || !price) return;
        updateMutation.mutate();
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Editar Paquete</DialogTitle>
                    <DialogDescription>
                        Modifica los detalles del paquete
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit}>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="edit-name">Nombre del Paquete *</Label>
                            <Input
                                id="edit-name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="edit-minutes">Minutos *</Label>
                            <Input
                                id="edit-minutes"
                                type="number"
                                min="60"
                                value={minutes}
                                onChange={(e) => setMinutes(e.target.value)}
                                required
                            />
                            <p className="text-xs text-muted-foreground">
                                Mínimo 60 minutos (1 hora)
                            </p>
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
                        </div>

                        <div className="flex items-center space-x-2">
                            <input
                                type="checkbox"
                                id="edit-isSaveable"
                                checked={isSaveable}
                                onChange={(e) => setIsSaveable(e.target.checked)}
                                className="rounded"
                            />
                            <Label htmlFor="edit-isSaveable" className="cursor-pointer">
                                Tiempo guardable
                            </Label>
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
                                Paquete activo
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
                            disabled={updateMutation.isPending || !name || !minutes || !price}
                        >
                            {updateMutation.isPending ? 'Guardando...' : 'Guardar Cambios'}
                        </Button>
                    </DialogFooter>
                </form>

                {updateMutation.isError && (
                    <div className="text-sm text-red-600 mt-2">
                        Error al actualizar el paquete. Intenta nuevamente.
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
