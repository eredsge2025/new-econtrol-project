import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import * as LucideIcons from "lucide-react"
import { cn } from "@/lib/utils"
import { useQuery } from "@tanstack/react-query";
import { lansApi } from "@/lib/api";

export type PaymentMethod = 'CASH' | 'YAPE' | 'PLIN' | 'CARD' | 'BALANCE';

interface PaymentSelectorProps {
    value: string;
    onChange: (value: PaymentMethod) => void;
    showBalanceOption?: boolean;
    className?: string;
    gridClassName?: string; // Overrides grid layout
    lanId?: string;
}

const STATIC_METHOD_CONFIG: Record<string, { label: string, icon: any, color: string }> = {
    'CASH': { label: 'Efectivo', icon: LucideIcons.Banknote, color: 'text-emerald-500' },
    'YAPE': { label: 'Yape', icon: LucideIcons.Smartphone, color: 'text-purple-500' },
    'PLIN': { label: 'Plin', icon: LucideIcons.Smartphone, color: 'text-blue-400' },
    'CARD': { label: 'Tarjeta', icon: LucideIcons.CreditCard, color: 'text-orange-500' },
    'BALANCE': { label: 'Saldo', icon: LucideIcons.Banknote, color: 'text-blue-500' },
};

// Helper to get icon by name
const getIcon = (name: string) => {
    // @ts-ignore
    return LucideIcons[name] || LucideIcons.Banknote;
}

export function PaymentSelector({ value, onChange, showBalanceOption = false, className, gridClassName, lanId }: PaymentSelectorProps) {

    // Fetch dynamic config if lanId is present
    const { data: dynamicMethods, isLoading } = useQuery({
        queryKey: ['lanPaymentMethods', lanId],
        queryFn: () => lansApi.getPaymentMethods(lanId!),
        enabled: !!lanId,
        staleTime: 1000 * 60 * 5, // 5 mins
    });

    let displayMethods: { id: PaymentMethod, label: string, icon: any, color: string }[] = [];

    if (dynamicMethods && dynamicMethods.length > 0) {
        // Map dynamic methods to UI config
        // Filter out disabled ones
        displayMethods = dynamicMethods
            .filter((m: any) => m.isEnabled && m.methodId !== 'BALANCE') // Balance is handled separately or via showBalanceOption
            .map((m: any) => {
                const config = STATIC_METHOD_CONFIG[m.methodId] || {};

                // Use backend icon/color if available, otherwise fallback to static config, then defaults
                const iconName = m.icon || 'Banknote';
                const color = m.color || config.color || 'text-gray-500';

                return {
                    id: m.methodId as PaymentMethod,
                    label: m.displayName || config.label || m.methodId,
                    icon: getIcon(iconName),
                    color: color,
                };
            });
    } else {
        // Fallback
        displayMethods = [
            { id: 'CASH', ...STATIC_METHOD_CONFIG['CASH'] },
            { id: 'YAPE', ...STATIC_METHOD_CONFIG['YAPE'] },
            { id: 'PLIN', ...STATIC_METHOD_CONFIG['PLIN'] },
            { id: 'CARD', ...STATIC_METHOD_CONFIG['CARD'] },
        ] as any;
    }

    // Always append Balance if requested
    if (showBalanceOption) {
        displayMethods.unshift({ id: 'BALANCE', ...STATIC_METHOD_CONFIG['BALANCE'] } as any);
    }

    // Default grid if no gridClassName provided (Optimized for Dialog/Small areas - max 6 cols)
    const defaultGridClass = "grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2";

    return (
        <div className={cn("space-y-3", className)}>
            <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Método de Pago</Label>
            <div className={gridClassName || defaultGridClass}>
                {displayMethods.map((method) => {
                    const Icon = method.icon;
                    const isSelected = value === method.id;

                    return (
                        <Button
                            key={method.id}
                            type="button"
                            variant="outline"
                            className={cn(
                                "flex flex-col items-center justify-center h-14 w-full gap-2 border-2 transition-all",
                                isSelected
                                    ? "border-primary bg-primary/10 text-primary"
                                    : "border-muted bg-transparent text-muted-foreground hover:border-primary/50 hover:bg-muted/50"
                            )}
                            onClick={() => onChange(method.id)}
                        >
                            <Icon className={cn("h-5 w-5", isSelected ? "text-primary" : method.color || "text-muted-foreground")} />
                            <span className="text-[10px] font-medium leading-none">{method.label}</span>
                        </Button>
                    );
                })}
            </div>
        </div>
    );
}
