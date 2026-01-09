import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { lansApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Loader2, Settings2, Save, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { ScrollArea } from "@/components/ui/scroll-area";
import * as LucideIcons from "lucide-react";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface PaymentMethodsConfigProps {
    lanId: string;
    isOpen: boolean;
    onClose: () => void;
}

const AVAILABLE_ICONS = ["Banknote", "Smartphone", "CreditCard", "Wallet", "QrCode", "Bitcoin", "DollarSign", "Euro"];
const AVAILABLE_COLORS = [
    { label: "Verde", value: "text-emerald-500" },
    { label: "Morado", value: "text-purple-500" },
    { label: "Azul", value: "text-blue-500" },
    { label: "Naranja", value: "text-orange-500" },
    { label: "Rojo", value: "text-red-500" },
    { label: "Gris", value: "text-gray-500" },
];

export function PaymentMethodsConfig({ lanId, isOpen, onClose }: PaymentMethodsConfigProps) {
    const queryClient = useQueryClient();
    const [methods, setMethods] = useState<any[]>([]);
    const [isAddMode, setIsAddMode] = useState(false);
    const [newMethod, setNewMethod] = useState({ methodId: '', displayName: '', icon: 'Banknote', color: 'text-emerald-500' });

    const { data: serverMethods, isLoading } = useQuery({
        queryKey: ['lanPaymentMethods', lanId],
        queryFn: () => lansApi.getPaymentMethods(lanId),
        enabled: !!lanId && isOpen,
    });

    useEffect(() => {
        if (serverMethods) {
            setMethods(JSON.parse(JSON.stringify(serverMethods)));
        }
    }, [serverMethods]);

    const updateMutation = useMutation({
        mutationFn: (data: any[]) => lansApi.updatePaymentMethods(lanId, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['lanPaymentMethods', lanId] });
            toast.success("Configuración guardada correctamente");

        },
        onError: () => {
            toast.error("Error al guardar la configuración");
        }
    });

    const createMutation = useMutation({
        mutationFn: (data: any) => lansApi.createPaymentMethod(lanId, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['lanPaymentMethods', lanId] });
            toast.success("Método creado correctamente");
            setIsAddMode(false);
            setNewMethod({ methodId: '', displayName: '', icon: 'Banknote', color: 'text-emerald-500' });
        },
        onError: () => {
            toast.error("Error al crear el método");
        }
    });

    const deleteMutation = useMutation({
        mutationFn: (methodId: string) => lansApi.deletePaymentMethod(lanId, methodId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['lanPaymentMethods', lanId] });
            toast.success("Método eliminado");
        },
        onError: () => {
            toast.error("Error al eliminar");
        }
    });

    const handleToggle = (index: number) => {
        const newMethods = [...methods];
        newMethods[index].isEnabled = !newMethods[index].isEnabled;
        setMethods(newMethods);
    };

    const handleChange = (index: number, field: string, value: any) => {
        const newMethods = [...methods];
        newMethods[index][field] = value;
        setMethods(newMethods);
    };

    const handleSave = () => {
        updateMutation.mutate(methods);
        onClose();
    };

    const handleAdd = () => {
        if (!newMethod.methodId) {
            toast.error("El ID del método es requerido");
            return;
        }
        createMutation.mutate({ ...newMethod, isEnabled: true });
    };

    const handleDelete = (methodId: string) => {
        if (confirm("¿Seguro que deseas eliminar este método de pago?")) {
            deleteMutation.mutate(methodId);
        }
    }

    const IconRenderer = ({ name, className }: { name: string, className?: string }) => {
        // @ts-ignore
        const Icon = LucideIcons[name] || LucideIcons.Banknote;
        return <Icon className={className} />;
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Settings2 className="h-5 w-5" /> Configurar Métodos de Pago
                    </DialogTitle>
                    <DialogDescription>
                        Gestiona los métodos de pago, sus iconos y colores.
                    </DialogDescription>
                </DialogHeader>

                {isLoading ? (
                    <div className="py-8 flex justify-center">
                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                ) : (
                    <div className="space-y-4">
                        <ScrollArea className="h-96  pr-4">
                            <div className="space-y-4">
                                {methods.map((method, index) => (
                                    <div key={method.methodId} className="flex flex-col gap-3 p-3 rounded-lg border bg-muted/30">
                                        <div className="flex items-start justify-between">
                                            <div className="flex items-center gap-2">
                                                <div className={`p-2 rounded-md bg-background border ${method.color}`}>
                                                    <IconRenderer name={method.icon} className="h-4 w-4" />
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-semibold text-sm">{method.methodId}</span>
                                                        {method.methodId === 'BALANCE' && (
                                                            <span className="text-[10px] bg-blue-100 text-blue-700 px-1 rounded">Sistema</span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Switch
                                                    checked={method.isEnabled}
                                                    onCheckedChange={() => handleToggle(index)}
                                                />
                                                {method.methodId !== 'BALANCE' && ( // Prevent deleting system method
                                                    <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => handleDelete(method.methodId)}>
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                )}

                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-2">
                                            <div>
                                                <Label className="text-xs text-muted-foreground">Nombre visible</Label>
                                                <Input
                                                    value={method.displayName || ''}
                                                    onChange={(e) => handleChange(index, 'displayName', e.target.value)}
                                                    className="h-8 text-xs"
                                                    placeholder="Ej: Yape"
                                                />
                                            </div>

                                            <div className="flex gap-2">
                                                <div className="flex-1">
                                                    <Label className="text-xs text-muted-foreground">Icono</Label>
                                                    <Select
                                                        value={method.icon || 'Banknote'}
                                                        onValueChange={(val) => handleChange(index, 'icon', val)}
                                                    >
                                                        <SelectTrigger className="h-8 text-xs">
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {AVAILABLE_ICONS.map(icon => (
                                                                <SelectItem key={icon} value={icon}>
                                                                    <div className="flex items-center gap-2">
                                                                        <IconRenderer name={icon} className="h-3 w-3" />
                                                                        <span>{icon}</span>
                                                                    </div>
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                                <div className="flex-1">
                                                    <Label className="text-xs text-muted-foreground">Color</Label>
                                                    <Select
                                                        value={method.color || 'text-gray-500'}
                                                        onValueChange={(val) => handleChange(index, 'color', val)}
                                                    >
                                                        <SelectTrigger className="h-8 text-xs">
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {AVAILABLE_COLORS.map(c => (
                                                                <SelectItem key={c.value} value={c.value}>
                                                                    <div className="flex items-center gap-2">
                                                                        <div className={`h-3 w-3 rounded-full ${c.value.replace('text-', 'bg-')}`} />
                                                                        <span>{c.label}</span>
                                                                    </div>
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </ScrollArea>

                        {isAddMode ? (
                            <div className="border rounded-lg p-3 bg-muted/50 space-y-3 animate-in fade-in zoom-in-95 duration-200">
                                <div className="flex justify-between items-center">
                                    <h4 className="text-sm font-medium">Nuevo Método</h4>
                                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setIsAddMode(false)}>
                                        <X className="h-4 w-4" />
                                    </Button>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1">
                                        <Label className="text-xs">ID (Único)</Label>
                                        <Input
                                            placeholder="Ej: PLIN_QR"
                                            className="h-8 text-xs uppercase"
                                            value={newMethod.methodId}
                                            onChange={(e) => setNewMethod({ ...newMethod, methodId: e.target.value.toUpperCase().replace(/\s/g, '_') })}
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-xs">Nombre</Label>
                                        <Input
                                            placeholder="Ej: Plin QR"
                                            className="h-8 text-xs"
                                            value={newMethod.displayName}
                                            onChange={(e) => setNewMethod({ ...newMethod, displayName: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-xs">Icono</Label>
                                        <Select
                                            value={newMethod.icon}
                                            onValueChange={(val) => setNewMethod({ ...newMethod, icon: val })}
                                        >
                                            <SelectTrigger className="h-8 text-xs">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {AVAILABLE_ICONS.map(icon => (
                                                    <SelectItem key={icon} value={icon}>
                                                        <div className="flex items-center gap-2">
                                                            <IconRenderer name={icon} className="h-3 w-3" />
                                                            <span>{icon}</span>
                                                        </div>
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-xs">Color</Label>
                                        <Select
                                            value={newMethod.color}
                                            onValueChange={(val) => setNewMethod({ ...newMethod, color: val })}
                                        >
                                            <SelectTrigger className="h-8 text-xs">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {AVAILABLE_COLORS.map(c => (
                                                    <SelectItem key={c.value} value={c.value}>
                                                        <div className="flex items-center gap-2">
                                                            <div className={`h-3 w-3 rounded-full ${c.value.replace('text-', 'bg-')}`} />
                                                            <span>{c.label}</span>
                                                        </div>
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                                <Button size="sm" className="w-full" onClick={handleAdd} disabled={createMutation.isPending}>
                                    {createMutation.isPending && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}
                                    Crear Método
                                </Button>
                            </div>
                        ) : (
                            <Button variant="outline" size="sm" className="w-full border-dashed" onClick={() => setIsAddMode(true)}>
                                <Plus className="mr-2 h-4 w-4" /> Agregar Método Personalizado
                            </Button>
                        )}

                    </div>
                )}

                <DialogFooter>
                    <Button variant="ghost" onClick={onClose} disabled={updateMutation.isPending}>
                        Cerrar
                    </Button>
                    <Button onClick={handleSave} disabled={updateMutation.isPending}>
                        {updateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        <Save className="mr-2 h-4 w-4" /> Guardar Todo
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
