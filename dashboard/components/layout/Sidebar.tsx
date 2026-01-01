'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import {
    LayoutDashboard,
    Building2,
    MapPin,
    Monitor,
    Activity,
    Settings,
    CheckCircle,
    FileText,
    Users as UsersIcon,
} from 'lucide-react';
import { UserRole } from '@/types';

const baseNavigation = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'LANs', href: '/dashboard/lans', icon: Building2 },
    { name: 'Zones', href: '/dashboard/zones', icon: MapPin },
    { name: 'PCs', href: '/dashboard/pcs', icon: Monitor },
    { name: 'Mapa', href: '/dashboard/map', icon: MapPin },
    { name: 'Users', href: '/dashboard/users', icon: UsersIcon },
    { name: 'Sessions', href: '/dashboard/sessions', icon: Activity },
];

const superAdminNavigation = [
    { name: 'Approvals', href: '/dashboard/approvals', icon: CheckCircle },
    { name: 'Audit Logs', href: '/dashboard/audit-logs', icon: FileText },
];

const settingsNavigation = [
    { name: 'Settings', href: '/dashboard/settings', icon: Settings },
];

export function Sidebar() {
    const pathname = usePathname();
    const { user } = useAuth();

    // Construir navegación según rol
    const navigation = [
        ...baseNavigation,
        ...(user?.role === UserRole.SUPER_ADMIN ? superAdminNavigation : []),
        ...settingsNavigation,
    ];

    return (

        <div className="fixed inset-y-0 left-0 w-64 bg-sidebar border-r border-sidebar-border">
            <div className="flex flex-col h-full">
                {/* Logo */}
                <div className="p-6">
                    <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                        eControl
                    </h1>
                </div>

                {/* Navigation */}
                <nav className="flex-1 px-4 space-y-1">
                    {navigation.map((item) => {
                        const Icon = item.icon;
                        const isActive = pathname === item.href;

                        return (
                            <Link
                                key={item.name}
                                href={item.href}
                                className={`
                  flex items-center px-4 py-3 text-sm font-medium rounded-lg
                  transition-colors duration-150
                  ${isActive
                                        ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                                        : 'text-sidebar-foreground hover:bg-sidebar-accent/50'
                                    }
                `}
                            >
                                <Icon className="h-5 w-5 mr-3" />
                                {item.name}
                            </Link>
                        );
                    })}
                </nav>

                {/* Footer */}
                <div className="p-4 border-t border-sidebar-border">
                    <p className="text-xs text-muted-foreground text-center">
                        eControl v1.0.0
                    </p>
                </div>
            </div>
        </div>
    );
}
