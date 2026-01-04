'use client';

import { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { usersApi } from '@/lib/api';
import { Input } from '@/components/ui/input';
import { Search, UserCircle, Loader2 } from 'lucide-react';
import { RechargeBalanceModal } from './RechargeBalanceModal';
import { User } from '@/types';

export function UserRechargeSearch() {
    const [query, setQuery] = useState('');
    const [isOpen, setIsOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // Simple debounce effect
    const [debouncedQuery, setDebouncedQuery] = useState(query);
    useEffect(() => {
        const handler = setTimeout(() => setDebouncedQuery(query), 300);
        return () => clearTimeout(handler);
    }, [query]);

    const { data: users, isLoading } = useQuery({
        queryKey: ['users', 'search', debouncedQuery],
        queryFn: () => usersApi.getAll(undefined, debouncedQuery),
        enabled: debouncedQuery.length > 1,
    });

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSelect = (user: User) => {
        setSelectedUser(user);
        setIsOpen(false);
        setQuery('');
    };

    return (
        <div className="relative w-full max-w-md" ref={containerRef}>
            <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder="Recarga rápida (Buscar usuario...)"
                    className="pl-9 bg-muted/50 border-muted-foreground/20 focus:bg-background transition-colors"
                    value={query}
                    onChange={(e) => {
                        setQuery(e.target.value);
                        if (e.target.value.length > 1) setIsOpen(true);
                    }}
                    onFocus={() => {
                        if (query.length > 1) setIsOpen(true);
                    }}
                />
                {isLoading && (
                    <Loader2 className="absolute right-3 top-3 h-4 w-4 animate-spin text-muted-foreground" />
                )}
            </div>

            {isOpen && users && users.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-popover border border-border rounded-lg shadow-lg z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                    <ul className="max-h-[300px] overflow-auto py-1">
                        {users.map((user: User) => (
                            <li
                                key={user.id}
                                className="px-3 py-2 hover:bg-accent hover:text-accent-foreground cursor-pointer flex items-center justify-between group"
                                onClick={() => handleSelect(user)}
                            >
                                <div className="flex items-center gap-3">
                                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                                        <UserCircle className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <p className="font-medium text-sm">{user.username}</p>
                                        <p className="text-xs text-muted-foreground group-hover:text-accent-foreground/70">
                                            {user.email}
                                        </p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                                        S/ {Number(user.balance).toFixed(2)}
                                    </span>
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {isOpen && query.length > 1 && !isLoading && (!users || users.length === 0) && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-popover border border-border rounded-lg shadow-md z-50 p-4 text-center text-sm text-muted-foreground">
                    No se encontraron usuarios.
                </div>
            )}

            {selectedUser && (
                <RechargeBalanceModal
                    isOpen={!!selectedUser}
                    onClose={() => setSelectedUser(null)}
                    user={selectedUser}
                />
            )}
        </div>
    );
}
