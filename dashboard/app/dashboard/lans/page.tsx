'use client';

import { useQuery } from '@tanstack/react-query';
import { lansApi } from '@/lib/api';
import { Building2, MapPin, Plus, Key, Copy, Check } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useState } from 'react';

const CopyButton = ({ text }: { text: string }) => {
    const [copied, setCopied] = useState(false);

    const handleCopy = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <button
            onClick={handleCopy}
            className="p-1.5 hover:bg-gray-200 rounded-md transition-colors text-gray-400 hover:text-gray-600"
            title="Copiar"
        >
            {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
        </button>
    );
};

export default function LANsPage() {
    const { data: lans, isLoading } = useQuery({
        queryKey: ['lans'],
        queryFn: lansApi.getAll,
    });

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">LANs</h1>
                    <p className="text-gray-600 mt-1">Gestiona tus LAN Centers</p>
                </div>
                <Button className="bg-indigo-600 hover:bg-indigo-700">
                    <Plus className="h-4 w-4 mr-2" />
                    Nuevo LAN
                </Button>
            </div>

            {lans && lans.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {lans.map((lan: any) => (
                        <Link
                            key={lan.id}
                            href={`/dashboard/lans/${lan.id}`}
                            className="block bg-white rounded-xl shadow-sm p-6 border border-gray-200 hover:shadow-md transition-shadow"
                        >
                            <div className="flex items-start justify-between">
                                <div className="flex-1">
                                    <h3 className="text-lg font-semibold text-gray-900">
                                        {lan.name}
                                    </h3>
                                    <div className="mt-2 space-y-1">
                                        <p className="text-sm text-gray-600 flex items-center">
                                            <MapPin className="h-4 w-4 mr-1" />
                                            {lan.city}, {lan.country}
                                        </p>
                                        <p className="text-sm text-gray-600">
                                            {lan.address}
                                        </p>
                                    </div>
                                </div>
                                <div className="bg-indigo-100 p-2 rounded-lg">
                                    <Building2 className="h-6 w-6 text-indigo-600" />
                                </div>
                            </div>

                            <div className="mt-6 space-y-3">
                                <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                                    <div className="flex items-center justify-between group">
                                        <div className="flex-1 min-w-0">
                                            <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">LAN ID</p>
                                            <p className="text-xs font-mono text-gray-600 truncate">{lan.id}</p>
                                        </div>
                                        <CopyButton text={lan.id} />
                                    </div>
                                </div>

                                <div className="p-3 bg-indigo-50/50 rounded-lg border border-indigo-100/50">
                                    <div className="flex items-center justify-between group">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-1.5">
                                                <Key className="h-3 w-3 text-indigo-500" />
                                                <p className="text-[10px] uppercase font-bold text-indigo-500 tracking-wider">Agent API Key</p>
                                            </div>
                                            <p className="text-xs font-mono text-indigo-700 truncate">{lan.apiKey || 'No generada'}</p>
                                        </div>
                                        <CopyButton text={lan.apiKey} />
                                    </div>
                                </div>
                            </div>

                            <div className="mt-4 pt-4 border-t border-gray-100">
                                <div className="flex items-center text-sm text-gray-600">
                                    <span>Ver detalles →</span>
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            ) : (
                <div className="bg-white rounded-xl shadow-sm p-12 text-center">
                    <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900">No hay LANs</h3>
                    <p className="text-gray-600 mt-1">Crea tu primer LAN Center</p>
                    <Button className="mt-4 bg-indigo-600 hover:bg-indigo-700">
                        <Plus className="h-4 w-4 mr-2" />
                        Crear LAN
                    </Button>
                </div>
            )}
        </div>
    );
}
