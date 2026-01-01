'use client';

import * as React from 'react';

interface AlertDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    children: React.ReactNode;
}

export function AlertDialog({ open, onOpenChange, children }: AlertDialogProps) {
    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div
                className="fixed inset-0 bg-black/50"
                onClick={() => onOpenChange(false)}
            />
            <div className="relative bg-white rounded-lg shadow-lg max-w-md w-full mx-4">
                {children}
            </div>
        </div>
    );
}

export function AlertDialogTrigger({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) {
    return <div onClick={onClick}>{children}</div>;
}

export function AlertDialogContent({ children }: { children: React.ReactNode }) {
    return <div className="p-6">{children}</div>;
}

export function AlertDialogHeader({ children }: { children: React.ReactNode }) {
    return <div className="mb-4">{children}</div>;
}

export function AlertDialogTitle({ children }: { children: React.ReactNode }) {
    return <h3 className="text-lg font-semibold text-gray-900">{children}</h3>;
}

export function AlertDialogDescription({ children }: { children: React.ReactNode }) {
    return <p className="text-sm text-gray-600 mt-2">{children}</p>;
}

export function AlertDialogFooter({ children }: { children: React.ReactNode }) {
    return <div className="flex gap-3 justify-end mt-6">{children}</div>;
}

export function AlertDialogAction({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) {
    return (
        <button
            onClick={onClick}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
            {children}
        </button>
    );
}

export function AlertDialogCancel({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) {
    return (
        <button
            onClick={onClick}
            className="px-4 py-2 bg-gray-200 text-gray-900 rounded-lg hover:bg-gray-300 transition-colors"
        >
            {children}
        </button>
    );
}
