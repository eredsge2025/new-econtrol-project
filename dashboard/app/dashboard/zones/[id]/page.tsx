'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { zonesApi, bundlesApi, rateSchedulesApi, lansApi } from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Package, Clock, Pencil } from 'lucide-react';
import { BundlesList } from '@/components/zones/BundlesList';
import { RateSchedulesList } from '@/components/zones/RateSchedulesList';
import { EditZoneModal } from '@/components/zones/EditZoneModal';

export default function ZoneDetailPage() {
    const params = useParams();
    const router = useRouter();
    const zoneId = params.id as string;
    const [activeTab, setActiveTab] = useState('bundles');
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);

    const { data: zone, isLoading } = useQuery({
        queryKey: ['zone', zoneId],
        queryFn: async () => {
            // Fetch all zones and find the one we need
            const lans = await lansApi.getAll();
            if (!lans || lans.length === 0) return null;

            const lanId = lans[0].id;
            const zones = await zonesApi.getByLan(lanId);
            return zones.find((z: any) => z.id === zoneId);
        },
        enabled: !!zoneId,
    });

    if (isLoading) {
        return (
            <div className="p-6">
                <p className="text-muted-foreground">Cargando zona...</p>
            </div>
        );
    }

    if (!zone) {
        return (
            <div className="p-6">
                <p className="text-red-600">Zona no encontrada</p>
            </div>
        );
    }

    return (
        <div className="p-6 max-w-7xl mx-auto">
            {/* Header */}
            <div className="mb-6">
                <Button
                    variant="outline"
                    onClick={() => router.push('/dashboard/zones')}
                    className="mb-4 gap-2"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Volver a Zonas
                </Button>

                <div className="flex items-start justify-between">
                    <div>
                        <h1 className="text-3xl font-bold">{zone.name}</h1>
                        <p className="text-muted-foreground mt-1">
                            {zone.description || 'Sin descripción'}
                        </p>
                        <p className="text-lg font-semibold mt-2">
                            Tarifa Base: S/ {parseFloat(zone.baseRate || '0').toFixed(2)}/hora
                        </p>
                    </div>
                    <Button
                        onClick={() => setIsEditModalOpen(true)}
                        className="gap-2"
                    >
                        <Pencil className="h-4 w-4" />
                        Editar Zona
                    </Button>
                </div>
            </div>

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-2 lg:w-[400px]">
                    <TabsTrigger value="bundles" className="gap-2">
                        <Package className="h-4 w-4" />
                        Paquetes
                    </TabsTrigger>
                    <TabsTrigger value="schedules" className="gap-2">
                        <Clock className="h-4 w-4" />
                        Tarifas
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="bundles" className="mt-6">
                    <BundlesList zoneId={zoneId} />
                </TabsContent>

                <TabsContent value="schedules" className="mt-6">
                    <RateSchedulesList zoneId={zoneId} />
                </TabsContent>
            </Tabs>

            {/* Edit Zone Modal */}
            {zone && (
                <EditZoneModal
                    zone={zone}
                    isOpen={isEditModalOpen}
                    onClose={() => setIsEditModalOpen(false)}
                    onSuccess={() => setIsEditModalOpen(false)}
                />
            )}
        </div>
    );
}
