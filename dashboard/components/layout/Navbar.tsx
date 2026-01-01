'use client';

import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { LogOut, User } from 'lucide-react';

export function Navbar() {
    const { user, logout } = useAuth();

    return (
        <div className="h-16 bg-background border-b border-border flex items-center justify-between px-8">
            <div>
                <h2 className="text-lg font-semibold text-foreground">
                    Bienvenido, {user?.username || 'Usuario'}
                </h2>
                <p className="text-sm text-muted-foreground">
                    {user?.role || 'CLIENT'}
                </p>
            </div>

            <div className="flex items-center gap-4">
                <div className="text-right">
                    <p className="text-sm font-medium">{user?.email}</p>
                    <p className="text-xs text-muted-foreground">Balance: ${user?.balance || '0.00'}</p>
                </div>

                <Button
                    variant="outline"
                    size="sm"
                    onClick={logout}
                    className="flex items-center gap-2"
                >
                    <LogOut className="h-4 w-4" />
                    Salir
                </Button>
            </div>
        </div>
    );
}
