'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { usersApi } from '@/lib/api';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Wallet, CheckCircle2, Loader2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface RechargeBalanceModalProps {
    isOpen: boolean;
    onClose: () => void;
    user: any;
}

export function RechargeBalanceModal({ isOpen, onClose, user }: RechargeBalanceModalProps) {
    const [amount, setAmount] = useState<string>('');
    const [success, setSuccess] = useState(false);
    const queryClient = useQueryClient();

    const rechargeMutation = useMutation({
        mutationFn: (rechargeAmount: number) => usersApi.recharge(user.id, rechargeAmount),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['users'] });
            setSuccess(true);
            toast.success(`Recarga de S/ ${amount} exitosa para ${user.username}`);
            setTimeout(() => {
                handleClose();
            }, 2000);
        },
        onError: (error: any) => {
            toast.error('Error al realizar la recarga: ' + (error.response?.data?.message || error.message));
        }
    });

    const handleRecharge = (e: React.FormEvent) => {
        e.preventDefault();
        const numAmount = parseFloat(amount);
        if (isNaN(numAmount) || numAmount <= 0) {
            toast.error('Por favor, ingresa un monto válido mayor a 0');
            return;
        }
        rechargeMutation.mutate(numAmount);
    };

    const handleClose = () => {
        setAmount('');
        setSuccess(false);
        onClose();
    };

    const quickAmounts = [5, 10, 20, 50, 100];

    return (
        <Dialog open={isOpen} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-[425px]">
                {!success ? (
                    <>
                        <DialogHeader>
                            <DialogTitle className="flex items-center">
                                <Wallet className="mr-2 h-5 w-5 text-indigo-600" />
                                Recargar Saldo
                            </DialogTitle>
                            <DialogDescription>
                                Ingresa el monto para recargar la cuenta de <strong>{user.username}</strong>.
                            </DialogDescription>
                        </DialogHeader>

                        <form onSubmit={handleRecharge} className="space-y-6 py-4">
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="amount text-slate-700">Monto a recargar (S/)</Label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold">S/</span>
                                        <Input
                                            id="amount"
                                            type="number"
                                            step="0.10"
                                            placeholder="0.00"
                                            className="pl-9 text-lg font-bold"
                                            value={amount}
                                            onChange={(e) => setAmount(e.target.value)}
                                            required
                                            autoFocus
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-5 gap-2">
                                    {quickAmounts.map((q) => (
                                        <Button
                                            key={q}
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            className="px-0 h-9 border-slate-200 hover:border-indigo-500 hover:bg-indigo-50 hover:text-indigo-600 transition-all font-medium"
                                            onClick={() => setAmount(q.toString())}
                                        >
                                            +{q}
                                        </Button>
                                    ))}
                                </div>

                                <div className="p-3 bg-indigo-50 rounded-lg flex items-start border border-indigo-100">
                                    <AlertCircle className="h-4 w-4 text-indigo-600 mr-2 mt-0.5" />
                                    <div className="text-xs text-indigo-700">
                                        El nuevo saldo será de: <span className="font-bold underline">S/ {(Number(user.balance) + (parseFloat(amount) || 0)).toFixed(2)}</span>
                                    </div>
                                </div>
                            </div>

                            <DialogFooter className="gap-2 sm:gap-0">
                                <Button type="button" variant="ghost" onClick={handleClose}>
                                    Cancelar
                                </Button>
                                <Button
                                    type="submit"
                                    className="bg-indigo-600 hover:bg-indigo-700 text-white"
                                    disabled={rechargeMutation.isPending}
                                >
                                    {rechargeMutation.isPending ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Procesando...
                                        </>
                                    ) : (
                                        'Confirmar Recarga'
                                    )}
                                </Button>
                            </DialogFooter>
                        </form>
                    </>
                ) : (
                    <div className="py-12 flex flex-col items-center justify-center text-center">
                        <div className="h-20 w-20 bg-green-100 rounded-full flex items-center justify-center mb-6 animate-bounce">
                            <CheckCircle2 className="h-10 w-10 text-green-600" />
                        </div>
                        <h3 className="text-2xl font-bold text-gray-900 mb-2">¡Recarga Exitosa!</h3>
                        <p className="text-gray-500 max-w-[280px]">
                            Se han acreditado S/ {amount} a la cuenta de {user.username}.
                        </p>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
