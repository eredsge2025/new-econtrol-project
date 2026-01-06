import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Banknote, CreditCard, Smartphone } from "lucide-react"
import { cn } from "@/lib/utils"

export type PaymentMethod = 'CASH' | 'YAPE' | 'PLIN' | 'CARD' | 'BALANCE';

interface PaymentSelectorProps {
    value: string;
    onChange: (value: PaymentMethod) => void;
    showBalanceOption?: boolean;
    className?: string;
}

export function PaymentSelector({ value, onChange, showBalanceOption = false, className }: PaymentSelectorProps) {
    const methods: { id: PaymentMethod, label: string, icon: any, color: string }[] = [
        { id: 'CASH', label: 'Efectivo', icon: Banknote, color: 'text-emerald-500' },
        { id: 'YAPE', label: 'Yape', icon: Smartphone, color: 'text-purple-500' },
        { id: 'PLIN', label: 'Plin', icon: Smartphone, color: 'text-blue-400' },
        { id: 'CARD', label: 'Tarjeta', icon: CreditCard, color: 'text-orange-500' },
    ];

    if (showBalanceOption) {
        methods.unshift({ id: 'BALANCE', label: 'Saldo', icon: Banknote, color: 'text-blue-500' });
    }

    return (
        <div className={cn("space-y-3", className)}>
            <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Método de Pago</Label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {methods.map((method) => {
                    const Icon = method.icon;
                    const isSelected = value === method.id;

                    return (
                        <Button
                            key={method.id}
                            type="button"
                            variant="outline"
                            className={cn(
                                "flex flex-col items-center justify-center h-20 gap-2 border-2 transition-all",
                                isSelected
                                    ? "border-primary bg-primary/10 text-primary"
                                    : "border-muted bg-transparent text-muted-foreground hover:border-primary/50 hover:bg-muted/50"
                            )}
                            onClick={() => onChange(method.id)}
                        >
                            <Icon className={cn("h-6 w-6", isSelected ? "text-primary" : method.color)} />
                            <span className="text-xs font-bold">{method.label}</span>
                        </Button>
                    );
                })}
            </div>
        </div>
    );
}
