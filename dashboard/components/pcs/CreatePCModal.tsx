'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { pcsApi } from '@/lib/api';
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

interface CreatePCModalProps {
    zoneId: string;
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export function CreatePCModal({ zoneId, isOpen, onClose, onSuccess }: CreatePCModalProps) {
    const [name, setName] = useState('');
    const [cpu, setCpu] = useState('');
    const [gpu, setGpu] = useState('');
    const [ram, setRam] = useState('');
    const queryClient = useQueryClient();

    const createMutation = useMutation({
        mutationFn: () =>
            pcsApi.create(zoneId, {
                name,
                specs: {
                    cpu: cpu || undefined,
                    gpu: gpu || undefined,
                    ram: ram || undefined,
                },
            }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['pcs', zoneId] });
            queryClient.invalidateQueries({ queryKey: ['zones'] });
            resetForm();
            onSuccess();
        },
    });

    const resetForm = () => {
        setName('');
        setCpu('');
        setGpu('');
        setRam('');
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!name) return;
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
                    <DialogTitle>Agregar Nueva PC</DialogTitle>
                    <DialogDescription>
                        Crea una nueva computadora en esta zona
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit}>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">Nombre de la PC *</Label>
                            <Input
                                id="name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Ej: PC #01, VIP-01"
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="cpu">CPU (Opcional)</Label>
                            <Input
                                id="cpu"
                                value={cpu}
                                onChange={(e) => setCpu(e.target.value)}
                                placeholder="Ej: Intel Core i5-12400F"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="gpu">GPU (Opcional)</Label>
                            <Input
                                id="gpu"
                                value={gpu}
                                onChange={(e) => setGpu(e.target.value)}
                                placeholder="Ej: NVIDIA RTX 3060"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="ram">RAM (Opcional)</Label>
                            <Input
                                id="ram"
                                value={ram}
                                onChange={(e) => setRam(e.target.value)}
                                placeholder="Ej: 16 GB DDR4"
                            />
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
                            disabled={createMutation.isPending || !name}
                        >
                            {createMutation.isPending ? 'Creando...' : 'Crear PC'}
                        </Button>
                    </DialogFooter>
                </form>

                {createMutation.isError && (
                    <div className="text-sm text-red-600 mt-2">
                        Error al crear la PC. Intenta nuevamente.
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
