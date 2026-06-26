import React, { useState, useEffect } from 'react';
import API from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
    User, Mail, Shield, CalendarDays, Loader2, AlertCircle,
    CheckCircle, Pencil, X, Save, KeyRound, Eye, EyeOff,
    BarChart3, BookOpen, Users, Clock
} from 'lucide-react';

// Format date
const fmt = (d) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
};

// Initials avatar
const initials = (name = '') =>
    name.split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase();

// ── Section card wrapper ────────────────────────────────────────────
function SectionCard({ icon: Icon, iconColor = 'text-cyan-400', title, children }) {
    return (
        <div className="bg-[#0A0A0A] border border-neutral-900 rounded-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-neutral-900 flex items-center gap-2.5">
                <Icon size={14} className={iconColor} />
                <h2 className="text-sm font-semibold text-white">{title}</h2>
            </div>
            <div className="p-6">{children}</div>
        </div>
    );
}

// ── Inline feedback banner ──────────────────────────────────────────
function Banner({ type, message, onClose }) {
    if (!message) return null;
    const styles = type === 'success'
        ? 'bg-emerald-950/20 border-emerald-900/50 text-emerald-400'
        : 'bg-red-950/20 border-red-900/50 text-red-400';
    const Icon = type === 'success' ? CheckCircle : AlertCircle;
    return (
        <div className={`flex items-center gap-3 p-3 rounded-lg border text-sm ${styles}`}>
            <Icon size={15} className="shrink-0" />
            <span className="flex-1">{message}</span>
            {onClose && (
                <button onClick={onClose} className="cursor-pointer text-current opacity-60 hover:opacity-100">
                    <X size={13} />
                </button>
            )}
        </div>
    );
}

export default function StaffProfilePage() {
    const { user: authUser } = useAuth();

    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState('');

    // Name edit state
    const [editingName, setEditingName] = useState(false);
    const [nameInput, setNameInput] = useState('');
    const [nameSaving, setNameSaving] = useState(false);
    const [nameFeedback, setNameFeedback] = useState({ type: '', msg: '' });

    // Password state
    const [pwForm, setPwForm] = useState({ oldPassword: '', newPassword: '', confirmPassword: '' });
    const [pwVisible, setPwVisible] = useState({ old: false, new: false, confirm: false });
    const [pwSaving, setPwSaving] = useState(false);
    const [pwFeedback, setPwFeedback] = useState({ type: '', msg: '' });

    // ── Load profile ─────────────────────────────────────────────────
    useEffect(() => {
        const fetch = async () => {
            setLoading(true);
            setLoadError('');
            try {
                const res = await API.get('/auth/staff/profile');
                setProfile(res.data);
                setNameInput(res.data.name || '');
            } catch (err) {
                console.error('Profile load error:', err);
                setLoadError(err.response?.data?.message || 'Failed to load profile.');
            } finally {
                setLoading(false);
            }
        };
        fetch();
    }, []);

    // ── Save name ────────────────────────────────────────────────────
    const handleSaveName = async () => {
        const trimmed = nameInput.trim();
        if (!trimmed) return;
        setNameSaving(true);
        setNameFeedback({ type: '', msg: '' });
        try {
            await API.put('/auth/me/name', { name: trimmed });
            setProfile((prev) => ({ ...prev, name: trimmed }));
            setEditingName(false);
            setNameFeedback({ type: 'success', msg: 'Name updated successfully.' });
        } catch (err) {
            setNameFeedback({ type: 'error', msg: err.response?.data?.message || 'Failed to update name.' });
        } finally {
            setNameSaving(false);
        }
    };

    const handleCancelEdit = () => {
        setEditingName(false);
        setNameInput(profile?.name || '');
        setNameFeedback({ type: '', msg: '' });
    };

    // ── Change password ──────────────────────────────────────────────
    const handleChangePassword = async (e) => {
        e.preventDefault();
        setPwFeedback({ type: '', msg: '' });

        if (pwForm.newPassword !== pwForm.confirmPassword) {
            setPwFeedback({ type: 'error', msg: 'New password and confirmation do not match.' });
            return;
        }
        if (pwForm.newPassword.length < 6) {
            setPwFeedback({ type: 'error', msg: 'New password must be at least 6 characters.' });
            return;
        }

        setPwSaving(true);
        try {
            await API.post('/auth/change-password', {
                oldPassword: pwForm.oldPassword,
                newPassword: pwForm.newPassword
            });
            setPwForm({ oldPassword: '', newPassword: '', confirmPassword: '' });
            setPwFeedback({ type: 'success', msg: 'Password changed successfully.' });
        } catch (err) {
            setPwFeedback({ type: 'error', msg: err.response?.data?.message || 'Failed to change password.' });
        } finally {
            setPwSaving(false);
        }
    };

    // ── Render ────────────────────────────────────────────────────────
    if (loading) {
        return (
            <div className="flex-grow flex flex-col items-center justify-center py-20 gap-3">
                <Loader2 className="animate-spin text-cyan-400" size={32} />
                <span className="text-xs font-mono tracking-widest uppercase text-neutral-500">Loading profile...</span>
            </div>
        );
    }

    if (loadError) {
        return (
            <div className="max-w-2xl mx-auto px-6 py-16">
                <div className="p-4 rounded-lg bg-red-950/20 border border-red-900/50 text-red-400 text-sm flex gap-2 items-center">
                    <AlertCircle size={15} /> {loadError}
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-5xl mx-auto px-6 py-10 w-full space-y-8">

            {/* ── Page Header ─────────────────────────────────────────── */}
            <div className="border-b border-neutral-900 pb-6 space-y-1">
                <h1 className="text-3xl font-light text-white leading-tight">My Profile</h1>
                <p className="text-neutral-500 text-xs font-mono uppercase tracking-widest">
                    Staff account settings &amp; activity
                </p>
            </div>

            {/* ── Hero Card ───────────────────────────────────────────── */}
            <div className="relative bg-[#0A0A0A] border border-neutral-900 rounded-2xl overflow-hidden">
                <div className="h-1 w-full bg-gradient-to-r from-cyan-500 via-indigo-500 to-purple-600" />
                <div className="absolute top-1 right-0 w-72 h-72 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />

                <div className="p-8 flex flex-col sm:flex-row gap-6 items-start sm:items-center">
                    {/* Avatar */}
                    <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center text-black font-black text-2xl font-mono shrink-0 shadow-lg shadow-cyan-900/30">
                        {initials(profile?.name)}
                    </div>

                    {/* Name + role badge */}
                    <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-3 flex-wrap">
                            <h2 className="text-2xl font-semibold text-white">{profile?.name}</h2>
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-cyan-950/40 border border-cyan-900/50 text-[10px] font-mono uppercase tracking-wider text-cyan-400">
                                <Shield size={9} />
                                {profile?.role}
                            </span>
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono uppercase tracking-wider border ${profile?.status === 'ACTIVE' ? 'bg-emerald-950/30 border-emerald-900/50 text-emerald-400' : 'bg-neutral-900 border-neutral-800 text-neutral-500'}`}>
                                {profile?.status}
                            </span>
                        </div>
                        <div className="flex flex-wrap gap-4 text-sm text-neutral-400">
                            <span className="flex items-center gap-2">
                                <Mail size={13} className="text-neutral-600" />
                                {profile?.email}
                            </span>
                            <span className="flex items-center gap-2">
                                <CalendarDays size={13} className="text-neutral-600" />
                                Member since {fmt(profile?.joined_at)}
                            </span>
                        </div>
                    </div>

                    {/* Stats */}
                    <div className="flex gap-3 shrink-0">
                        <div className="text-center px-4 py-3 bg-cyan-950/20 border border-cyan-900/40 rounded-xl">
                            <p className="text-2xl font-bold text-cyan-400 font-mono">{profile?.eventsCreated ?? 0}</p>
                            <p className="text-[10px] text-cyan-600 uppercase tracking-wider font-mono">Created</p>
                        </div>
                        <div className="text-center px-4 py-3 bg-indigo-950/20 border border-indigo-900/40 rounded-xl">
                            <p className="text-2xl font-bold text-indigo-400 font-mono">{profile?.eventsCoordinating ?? 0}</p>
                            <p className="text-[10px] text-indigo-600 uppercase tracking-wider font-mono">Coordinating</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* ── Edit Name ─────────────────────────────────────────── */}
                <SectionCard icon={User} title="Display Name">
                    <div className="space-y-4">
                        <p className="text-xs text-neutral-500 font-mono">
                            Your name appears on events you create and coordinate.
                        </p>

                        <Banner
                            type={nameFeedback.type}
                            message={nameFeedback.msg}
                            onClose={() => setNameFeedback({ type: '', msg: '' })}
                        />

                        {editingName ? (
                            <div className="space-y-3">
                                <input
                                    type="text"
                                    value={nameInput}
                                    onChange={(e) => setNameInput(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleSaveName()}
                                    className="w-full bg-[#050505] border border-neutral-800 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 text-white rounded-lg px-4 py-2.5 text-sm transition-all outline-none font-mono"
                                    placeholder="Enter your name..."
                                    autoFocus
                                />
                                <div className="flex gap-2">
                                    <button
                                        onClick={handleSaveName}
                                        disabled={nameSaving || !nameInput.trim()}
                                        className="flex items-center gap-1.5 px-4 py-2 bg-cyan-500 hover:bg-cyan-600 disabled:opacity-40 text-black font-bold text-xs rounded-lg transition-colors cursor-pointer"
                                    >
                                        {nameSaving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                                        Save
                                    </button>
                                    <button
                                        onClick={handleCancelEdit}
                                        className="flex items-center gap-1.5 px-4 py-2 bg-neutral-900 hover:bg-neutral-800 text-neutral-400 text-xs rounded-lg transition-colors cursor-pointer border border-neutral-800"
                                    >
                                        <X size={12} /> Cancel
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="flex items-center justify-between p-3 rounded-lg bg-[#050505] border border-neutral-900">
                                <span className="text-white font-mono text-sm">{profile?.name}</span>
                                <button
                                    onClick={() => { setEditingName(true); setNameFeedback({ type: '', msg: '' }); }}
                                    className="flex items-center gap-1.5 text-[11px] font-mono text-neutral-500 hover:text-cyan-400 transition-colors cursor-pointer uppercase tracking-wider"
                                >
                                    <Pencil size={11} /> Edit
                                </button>
                            </div>
                        )}
                    </div>
                </SectionCard>

                {/* ── Account Info (read-only) ───────────────────────────── */}
                <SectionCard icon={Shield} iconColor="text-indigo-400" title="Account Details">
                    <div className="space-y-3">
                        {[
                            { label: 'Email', value: profile?.email, icon: Mail },
                            { label: 'Role', value: profile?.role, icon: Shield },
                            { label: 'Status', value: profile?.status, icon: Clock },
                            { label: 'Member Since', value: fmt(profile?.joined_at), icon: CalendarDays },
                        ].map(({ label, value, icon: Icon }) => (
                            <div key={label} className="flex items-center gap-3 p-3 rounded-lg bg-[#050505] border border-neutral-900">
                                <Icon size={13} className="text-neutral-600 shrink-0" />
                                <div className="flex-1 min-w-0">
                                    <p className="text-[10px] font-mono text-neutral-600 uppercase tracking-wider">{label}</p>
                                    <p className="text-sm text-neutral-300 font-mono truncate">{value}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </SectionCard>

                {/* ── Activity Summary ───────────────────────────────────── */}
                <SectionCard icon={BarChart3} iconColor="text-amber-400" title="Activity Summary">
                    <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                            <div className="p-4 rounded-xl bg-cyan-950/10 border border-cyan-900/30 text-center">
                                <BookOpen size={18} className="mx-auto text-cyan-400 mb-1.5" />
                                <p className="text-2xl font-bold text-cyan-400 font-mono">{profile?.eventsCreated ?? 0}</p>
                                <p className="text-[10px] text-cyan-600 uppercase tracking-wider font-mono mt-0.5">Events Created</p>
                            </div>
                            <div className="p-4 rounded-xl bg-indigo-950/10 border border-indigo-900/30 text-center">
                                <Users size={18} className="mx-auto text-indigo-400 mb-1.5" />
                                <p className="text-2xl font-bold text-indigo-400 font-mono">{profile?.eventsCoordinating ?? 0}</p>
                                <p className="text-[10px] text-indigo-600 uppercase tracking-wider font-mono mt-0.5">Coordinating</p>
                            </div>
                        </div>
                        <p className="text-xs text-neutral-600 font-mono text-center">
                            Total involvement: {(profile?.eventsCreated ?? 0) + (profile?.eventsCoordinating ?? 0)} event{((profile?.eventsCreated ?? 0) + (profile?.eventsCoordinating ?? 0)) !== 1 ? 's' : ''}
                        </p>
                    </div>
                </SectionCard>

                {/* ── Change Password ────────────────────────────────────── */}
                <SectionCard icon={KeyRound} iconColor="text-amber-400" title="Change Password">
                    <form onSubmit={handleChangePassword} className="space-y-4">
                        <Banner
                            type={pwFeedback.type}
                            message={pwFeedback.msg}
                            onClose={() => setPwFeedback({ type: '', msg: '' })}
                        />

                        {[
                            { key: 'oldPassword', label: 'Current Password', visKey: 'old' },
                            { key: 'newPassword', label: 'New Password', visKey: 'new' },
                            { key: 'confirmPassword', label: 'Confirm New Password', visKey: 'confirm' },
                        ].map(({ key, label, visKey }) => (
                            <div key={key} className="space-y-1">
                                <label className="text-[11px] text-neutral-500 font-mono uppercase tracking-wider">{label}</label>
                                <div className="relative">
                                    <input
                                        type={pwVisible[visKey] ? 'text' : 'password'}
                                        value={pwForm[key]}
                                        onChange={(e) => setPwForm((prev) => ({ ...prev, [key]: e.target.value }))}
                                        className="w-full bg-[#050505] border border-neutral-800 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 text-white rounded-lg px-4 py-2.5 pr-10 text-sm transition-all outline-none font-mono"
                                        placeholder="••••••••"
                                        required
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setPwVisible((prev) => ({ ...prev, [visKey]: !prev[visKey] }))}
                                        className="absolute right-3 inset-y-0 flex items-center text-neutral-600 hover:text-neutral-400 cursor-pointer transition-colors"
                                    >
                                        {pwVisible[visKey] ? <EyeOff size={14} /> : <Eye size={14} />}
                                    </button>
                                </div>
                            </div>
                        ))}

                        <button
                            type="submit"
                            disabled={pwSaving || !pwForm.oldPassword || !pwForm.newPassword || !pwForm.confirmPassword}
                            className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white font-semibold py-2.5 rounded-lg text-sm transition-colors cursor-pointer mt-2"
                        >
                            {pwSaving ? <Loader2 size={15} className="animate-spin" /> : <KeyRound size={15} />}
                            {pwSaving ? 'Updating...' : 'Update Password'}
                        </button>
                    </form>
                </SectionCard>
            </div>
        </div>
    );
}
