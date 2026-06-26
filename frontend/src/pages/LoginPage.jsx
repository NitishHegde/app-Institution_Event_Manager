import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Trophy, Mail, Lock, Loader2, AlertCircle } from 'lucide-react';

export default function LoginPage() {
    const { login } = useAuth();
    const navigate = useNavigate();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            await login(email, password);
            navigate('/home');
        } catch (err) {
            console.error('Login error:', err);
            setError(err.message || 'Invalid email or password.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex-grow flex items-center justify-center py-16 px-6">
            <div className="w-full max-w-md bg-[#0A0A0A] border border-neutral-900 rounded-xl shadow-2xl p-8 relative overflow-hidden">
                
                {/* Visual Glow Ornament inside card */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />

                <div className="flex flex-col items-center mb-8 relative z-10">
                    <div className="w-10 h-10 rounded bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center font-mono font-black text-black text-base tracking-tighter mb-4 shadow-lg">
                        CU
                    </div>
                    <h2 className="text-3xl font-light text-white tracking-tight text-center">
                        Welcome Back
                    </h2>
                    <p className="text-neutral-500 text-xs mt-2 uppercase tracking-widest font-mono">
                        Ayojana Management Portal
                    </p>
                </div>

                {error && (
                    <div className="mb-6 p-4 rounded-lg bg-red-950/20 border border-red-900/50 flex items-start gap-3 text-red-400 text-sm animate-pulse">
                        <AlertCircle className="shrink-0 mt-0.5" size={16} />
                        <div>{error}</div>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
                    <div className="space-y-2">
                        <label className="block text-xs uppercase tracking-widest text-neutral-400 font-mono font-semibold">
                            Institutional Email
                        </label>
                        <div className="relative">
                            <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-neutral-500">
                                <Mail size={16} />
                            </span>
                            <input
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="name@university.edu"
                                className="w-full bg-[#030303] border border-neutral-800 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 text-white rounded-lg pl-10 pr-4 py-3 text-sm transition-all outline-none placeholder:text-neutral-700"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <div className="flex justify-between items-center">
                            <label className="block text-xs uppercase tracking-widest text-neutral-400 font-mono font-semibold">
                                Password
                            </label>
                        </div>
                        <div className="relative">
                            <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-neutral-500">
                                <Lock size={16} />
                            </span>
                            <input
                                type="password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                className="w-full bg-[#030303] border border-neutral-800 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 text-white rounded-lg pl-10 pr-4 py-3 text-sm transition-all outline-none placeholder:text-neutral-700"
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-white text-black font-semibold hover:bg-neutral-200 active:scale-[0.98] transition-all py-3 rounded-lg text-sm flex items-center justify-center gap-2 cursor-pointer shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? (
                            <>
                                <Loader2 className="animate-spin" size={16} />
                                <span>Signing in...</span>
                            </>
                        ) : (
                            <span>Login</span>
                        )}
                    </button>
                </form>

                <div className="mt-8 text-center text-xs text-neutral-500 font-mono relative z-10">
                    Don't have an account?{' '}
                    <Link to="/register" className="text-cyan-400 hover:text-cyan-300 transition-colors underline underline-offset-4">
                        Register here
                    </Link>
                </div>
            </div>
        </div>
    );
}
