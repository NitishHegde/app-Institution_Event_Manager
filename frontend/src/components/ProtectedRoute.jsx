import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Loader2 } from 'lucide-react';

export default function ProtectedRoute() {
    const { user, loading } = useAuth();

    if (loading) {
        return (
            <div className="min-h-screen bg-[#030303] flex flex-col items-center justify-center text-neutral-600 gap-3">
                <Loader2 className="animate-spin text-cyan-400" size={32} />
                <span className="text-xs font-mono tracking-widest uppercase text-neutral-500">
                    Verifying Credentials...
                </span>
            </div>
        );
    }

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    return <Outlet />;
}
