'use client';

import { useState, useEffect } from 'react';
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';

interface EditPCModalProps {
    pc: any;
    zones?: any[];
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export function EditPCModal({ pc, zones, isOpen, onClose, onSuccess }: EditPCModalProps) {
    const [name, setName] = useState('');
    const [zoneId, setZoneId] = useState('');
    const [cpu, setCpu] = useState('');
    const [gpu, setGpu] = useState('');
    const [ram, setRam] = useState('');
    const queryClient = useQueryClient();

    // Initialize form with PC data
    useEffect(() => {
        if (pc) {
            setName(pc.name || '');
            setZoneId(pc.zoneId || '');
            setCpu(pc.specs?.cpu || '');
            setGpu(pc.specs?.gpu || '');
            setRam(pc.specs?.ram || '');
        }
    }, [pc]);

    const updateMutation = useMutation({
        mutationFn: () =>
            pcsApi.update(pc.id, {
                name,
                zoneId,
                specs: {
                    cpu: cpu || undefined,
                    gpu: gpu || undefined,
                    ram: ram || undefined,
                },
            }),
        onSuccess: () => {
            // Invalidate old zone
            queryClient.invalidateQueries({ queryKey: ['pcs', pc.zoneId] });
            // Invalidate new zone if it changed
            if (zoneId !== pc.zoneId) {
                queryClient.invalidateQueries({ queryKey: ['pcs', zoneId] });
            }
            onSuccess();
        },
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!name) return;
        updateMutation.mutate();
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Editar PC</DialogTitle>
                    <DialogDescription>
                        Actualiza la información de la computadora
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit}>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="edit-name">Nombre de la PC *</Label>
                            <Input
                                id="edit-name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Ej: PC #01, VIP-01"
                                required
                            />
                        </div>

                        {zones && zones.length > 0 && (
                            <div className="space-y-2">
                                <Label htmlFor="edit-zone">Zona</Label>
                                <Select value={zoneId} onValueChange={setZoneId}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Selecciona una zona" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {zones.map((z: any) => (
                                            <SelectItem key={z.id} value={z.id}>
                                                {z.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}

                        <div className="space-y-2">
                            <Label htmlFor="edit-cpu">CPU</Label>
                            <Input
                                id="edit-cpu"
                                value={cpu}
                                onChange={(e) => setCpu(e.target.value)}
                                placeholder="Ej: Intel Core i5-12400F"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="edit-gpu">GPU</Label>
                            <Input
                                id="edit-gpu"
                                value={gpu}
                                onChange={(e) => setGpu(e.target.value)}
                                placeholder="Ej: NVIDIA RTX 3060"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="edit-ram">RAM</Label>
                            <Input
                                id="edit-ram"
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
                            onClick={onClose}
                            disabled={updateMutation.isPending}
                        >
                            Cancelar
                        </Button>
                        <Button
                            type="submit"
                            disabled={updateMutation.isPending || !name}
                        >
                            {updateMutation.isPending ? 'Guardando...' : 'Guardar Cambios'}
                        </Button>
                    </DialogFooter>
                </form>

                {updateMutation.isError && (
                    <div className="text-sm text-red-600 mt-2">
                        Error al actualizar la PC. Intenta nuevamente.
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
