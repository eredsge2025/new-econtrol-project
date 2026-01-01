'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { authApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function RegisterLanAdminPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    const [formData, setFormData] = useState({
        // Datos personales
        email: '',
        username: '',
        password: '',
        phone: '',
        // Datos del LAN
        lanName: '',
        lanAddress: '',
        lanCity: '',
        lanCountry: '',
        timezone: 'America/Lima',
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const response = await authApi.registerLanAdmin(formData);
            setSuccess(true);
            // No redirigir inmediatamente, mostrar mensaje de éxito
        } catch (err: any) {
            setError(err.response?.data?.message || 'Error al enviar solicitud');
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 p-4">
                <Card className="w-full max-w-md">
                    <CardHeader className="text-center">
                        <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                        <CardTitle className="text-2xl">¡Solicitud Enviada!</CardTitle>
                        <CardDescription className="mt-2">
                            Tu solicitud como administrador de LAN Center ha sido enviada exitosamente
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            <p className="text-sm text-muted-foreground text-center">
                                Recibirás un correo electrónico una vez que tu cuenta sea revisada y aprobada por el administrador de la plataforma.
                            </p>
                            <Button
                                onClick={() => router.push('/login')}
                                className="w-full"
                            >
                                Ir al Login
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 p-4">
            <Card className="w-full max-w-2xl">
                <CardHeader>
                    <CardTitle className="text-2xl">Registro de Administrador de LAN</CardTitle>
                    <CardDescription>
                        Crea una cuenta y registra tu LAN Center para empezar a usar eControl
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Datos Personales */}
                        <div className="space-y-4">
                            <h3 className="text-lg font-medium">Datos Personales</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="email">Email *</Label>
                                    <Input
                                        id="email"
                                        name="email"
                                        type="email"
                                        value={formData.email}
                                        onChange={handleChange}
                                        required
                                        placeholder="admin@milanCenter.com"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="username">Usuario *</Label>
                                    <Input
                                        id="username"
                                        name="username"
                                        value={formData.username}
                                        onChange={handleChange}
                                        required
                                        placeholder="adminuser"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="password">Contraseña *</Label>
                                    <Input
                                        id="password"
                                        name="password"
                                        type="password"
                                        value={formData.password}
                                        onChange={handleChange}
                                        required
                                        placeholder="Mínimo 6 caracteres"
                                        minLength={6}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="phone">Teléfono *</Label>
                                    <Input
                                        id="phone"
                                        name="phone"
                                        type="tel"
                                        value={formData.phone}
                                        onChange={handleChange}
                                        required
                                        placeholder="+51 999 888 777"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Datos del LAN Center */}
                        <div className="space-y-4">
                            <h3 className="text-lg font-medium">Datos del LAN Center</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2 col-span-2">
                                    <Label htmlFor="lanName">Nombre del LAN *</Label>
                                    <Input
                                        id="lanName"
                                        name="lanName"
                                        value={formData.lanName}
                                        onChange={handleChange}
                                        required
                                        placeholder="GameZone Center"
                                    />
                                </div>
                                <div className="space-y-2 col-span-2">
                                    <Label htmlFor="lanAddress">Dirección *</Label>
                                    <Input
                                        id="lanAddress"
                                        name="lanAddress"
                                        value={formData.lanAddress}
                                        onChange={handleChange}
                                        required
                                        placeholder="Av. Principal 123"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="lanCity">Ciudad *</Label>
                                    <Input
                                        id="lanCity"
                                        name="lanCity"
                                        value={formData.lanCity}
                                        onChange={handleChange}
                                        required
                                        placeholder="Lima"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="lanCountry">País *</Label>
                                    <Input
                                        id="lanCountry"
                                        name="lanCountry"
                                        value={formData.lanCountry}
                                        onChange={handleChange}
                                        required
                                        placeholder="Perú"
                                    />
                                </div>
                            </div>
                        </div>

                        {error && (
                            <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded">
                                {error}
                            </div>
                        )}

                        <Button type="submit" className="w-full" disabled={loading}>
                            {loading ? 'Enviando...' : 'Enviar Solicitud'}
                        </Button>

                        <p className="text-sm text-center text-muted-foreground">
                            ¿Ya tienes una cuenta?{' '}
                            <button
                                type="button"
                                onClick={() => router.push('/login')}
                                className="text-indigo-600 hover:underline"
                            >
                                Iniciar Sesión
                            </button>
                        </p>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
