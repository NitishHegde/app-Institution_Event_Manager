import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../services/api';
import {
    Loader2, AlertCircle, Calendar, MapPin, Trophy, CheckCircle,
    ClipboardList, Users, Award, Clock, ChevronRight, UserPlus,
    Check, X, Star, BookOpen, Inbox
} from 'lucide-react';

// Format date concisely
const fmt = (d) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};

// Status badge colors
const statusStyle = (status) => {
    const map = {
        CONFIRMED: 'bg-emerald-950/30 border-emerald-900/50 text-emerald-400',
        PENDING_APPROVAL: 'bg-amber-950/30 border-amber-900/50 text-amber-400',
        PRESENT: 'bg-emerald-950/30 border-emerald-900/50 text-emerald-400',
        ABSENT: 'bg-red-950/30 border-red-900/50 text-red-400',
        INDIVIDUAL: 'bg-cyan-950/30 border-cyan-900/50 text-cyan-400',
        GROUP: 'bg-indigo-950/30 border-indigo-900/50 text-indigo-400',
    };
    return map[status] || 'bg-neutral-900 border-neutral-800 text-neutral-500';
};

// ── Section wrapper ──────────────────────────────────────────────
function Section({ icon: Icon, iconColor = 'text-cyan-400', title, count, children, defaultOpen = true }) {
    const [open, setOpen] = useState(defaultOpen);
    return (
        <div className="bg-[#0A0A0A] border border-neutral-900 rounded-2xl overflow-hidden">
            <button
                onClick={() => setOpen(!open)}
                className="w-full px-6 py-4 border-b border-neutral-900 flex items-center gap-2.5 cursor-pointer hover:bg-neutral-900/30 transition-colors"
            >
                <Icon size={14} className={iconColor} />
                <h2 className="text-sm font-semibold text-white flex-1 text-left">{title}</h2>
                {count !== undefined && (
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-neutral-900 border border-neutral-800 text-neutral-400">
                        {count}
                    </span>
                )}
                <ChevronRight
                    size={14}
                    className={`text-neutral-600 transition-transform duration-200 ${open ? 'rotate-90' : ''}`}
                />
            </button>
            {open && <div className="p-6">{children}</div>}
        </div>
    );
}

// ── Empty state component ────────────────────────────────────────
function EmptyState({ icon: Icon, message }) {
    return (
        <div className="flex flex-col items-center justify-center py-10 gap-3">
            <Icon size={28} className="text-neutral-700" />
            <p className="text-xs font-mono text-neutral-600 text-center">{message}</p>
        </div>
    );
}

export default function StudentParticipationPage() {
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Data
    const [participations, setParticipations] = useState(null);
    const [invitations, setInvitations] = useState([]);
    const [accomplishments, setAccomplishments] = useState([]);

    // Invitation action state
    const [respondingId, setRespondingId] = useState(null);

    // ── Fetch all data ──────────────────────────────────────────
    const fetchData = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const [partRes, invRes, accRes] = await Promise.all([
                API.get('/students/me/participations'),
                API.get('/teams/invitations/pending'),
                API.get('/students/me/accomplishments')
            ]);
            setParticipations(partRes.data);
            setInvitations(invRes.data);
            setAccomplishments(accRes.data.accomplishments || []);
        } catch (err) {
            console.error('Participation data error:', err);
            setError(err.response?.data?.message || 'Failed to load participation data.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    // ── Handle invitation response ──────────────────────────────
    const handleInvitationResponse = async (teamId, response) => {
        setRespondingId(teamId);
        try {
            await API.patch(`/teams/${teamId}/members/respond`, { response });
            // Refresh data after responding
            await fetchData();
        } catch (err) {
            console.error('Invitation response error:', err);
            setError(err.response?.data?.message || `Failed to ${response.toLowerCase()} invitation.`);
        } finally {
            setRespondingId(null);
        }
    };

    // ── Loading state ───────────────────────────────────────────
    if (loading) {
        return (
            <div className="flex-grow flex flex-col items-center justify-center py-20 gap-3">
                <Loader2 className="animate-spin text-cyan-400" size={32} />
                <span className="text-xs font-mono tracking-widest uppercase text-neutral-500">Loading participation registry...</span>
            </div>
        );
    }

    // ── Error state ─────────────────────────────────────────────
    if (error && !participations) {
        return (
            <div className="max-w-4xl mx-auto px-6 py-16">
                <div className="p-4 rounded-lg bg-red-950/20 border border-red-900/50 text-red-400 text-sm flex gap-2 items-center">
                    <AlertCircle size={15} /> {error}
                </div>
            </div>
        );
    }

    const registeredEvents = participations?.registeredEvents || [];
    const completedEvents = participations?.completedEvents || [];
    const wonEvents = participations?.wonEvents || [];

    return (
        <div className="max-w-5xl mx-auto px-6 py-10 w-full space-y-8">

            {/* ── Page Header ─────────────────────────────────────────── */}
            <div className="border-b border-neutral-900 pb-6 space-y-1">
                <h1 className="text-3xl font-light text-white leading-tight">Participation Registry</h1>
                <p className="text-neutral-500 text-xs font-mono uppercase tracking-widest">
                    Your event journey — registrations, attendance, awards &amp; invitations
                </p>
            </div>

            {/* ── Inline Error ────────────────────────────────────────── */}
            {error && participations && (
                <div className="p-3 rounded-lg bg-red-950/20 border border-red-900/50 text-red-400 text-sm flex items-center gap-2">
                    <AlertCircle size={14} />
                    <span className="flex-1">{error}</span>
                    <button onClick={() => setError('')} className="text-red-400 hover:text-red-300 cursor-pointer"><X size={13} /></button>
                </div>
            )}

            {/* ── Quick Stats ─────────────────────────────────────────── */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                    { label: 'Active Registrations', value: registeredEvents.length, icon: BookOpen, color: 'cyan' },
                    { label: 'Events Completed', value: completedEvents.length, icon: CheckCircle, color: 'emerald' },
                    { label: 'Podium Finishes', value: wonEvents.length, icon: Trophy, color: 'amber' },
                    { label: 'Pending Invites', value: invitations.length, icon: UserPlus, color: 'indigo' },
                ].map(({ label, value, icon: Icon, color }) => (
                    <div key={label} className={`bg-[#0A0A0A] border border-neutral-900 rounded-xl p-4 relative overflow-hidden group`}>
                        <div className={`absolute top-0 right-0 w-16 h-16 bg-${color}-500/10 rounded-full blur-2xl group-hover:bg-${color}-500/20 transition-all`} />
                        <Icon size={15} className={`text-${color}-400 mb-2`} />
                        <p className={`text-2xl font-black text-white font-mono`}>{value}</p>
                        <p className="text-[9px] text-neutral-500 uppercase tracking-widest font-mono mt-0.5">{label}</p>
                    </div>
                ))}
            </div>

            {/* ── Pending Invitations ─────────────────────────────────── */}
            {invitations.length > 0 && (
                <Section
                    icon={UserPlus}
                    iconColor="text-indigo-400"
                    title="Pending Team Invitations"
                    count={invitations.length}
                    defaultOpen={true}
                >
                    <div className="space-y-3">
                        {invitations.map((inv) => (
                            <div
                                key={inv.team_id}
                                className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 rounded-xl bg-[#050505] border border-indigo-900/30 hover:border-indigo-900/50 transition-colors"
                            >
                                <div className="flex-1 space-y-1.5 min-w-0">
                                    <p className="text-sm text-white font-semibold truncate">{inv.event_name}</p>
                                    <div className="flex flex-wrap gap-3 text-[11px] text-neutral-500 font-mono">
                                        <span className="flex items-center gap-1"><Users size={10} /> Team: {inv.team_name}</span>
                                        <span className="flex items-center gap-1"><Calendar size={10} /> {fmt(inv.event_start_date)}</span>
                                        <span className="flex items-center gap-1"><MapPin size={10} /> {inv.venue}</span>
                                    </div>
                                    <p className="text-[10px] text-indigo-400 font-mono">Invited by {inv.inviter_name}</p>
                                </div>
                                <div className="flex gap-2 shrink-0">
                                    <button
                                        onClick={() => handleInvitationResponse(inv.team_id, 'ACCEPT')}
                                        disabled={respondingId === inv.team_id}
                                        className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer"
                                    >
                                        {respondingId === inv.team_id ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                                        Accept
                                    </button>
                                    <button
                                        onClick={() => handleInvitationResponse(inv.team_id, 'REJECT')}
                                        disabled={respondingId === inv.team_id}
                                        className="flex items-center gap-1.5 px-4 py-2 bg-neutral-900 hover:bg-neutral-800 disabled:opacity-40 text-neutral-400 text-xs font-bold rounded-lg transition-colors cursor-pointer border border-neutral-800"
                                    >
                                        <X size={12} />
                                        Decline
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </Section>
            )}

            {/* ── Active Registrations ────────────────────────────────── */}
            <Section
                icon={ClipboardList}
                iconColor="text-cyan-400"
                title="Active Registrations"
                count={registeredEvents.length}
                defaultOpen={true}
            >
                {registeredEvents.length === 0 ? (
                    <EmptyState icon={Inbox} message="No active event registrations. Browse the home page to discover and join events." />
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {registeredEvents.map((event) => (
                            <div
                                key={event.id}
                                onClick={() => navigate(`/events/${event.id}`)}
                                className="p-4 rounded-xl bg-[#050505] border border-neutral-900 hover:border-cyan-900/40 hover:scale-[1.01] active:scale-[0.99] transition-all duration-200 cursor-pointer group"
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0 flex-1">
                                        <p className="text-sm text-white font-semibold truncate group-hover:text-cyan-400 transition-colors">
                                            {event.event_name}
                                        </p>
                                        <div className="flex flex-wrap gap-3 mt-2 text-[11px] text-neutral-500 font-mono">
                                            <span className="flex items-center gap-1">
                                                <Calendar size={10} className="text-cyan-500" />
                                                {fmt(event.event_start_date)}
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <MapPin size={10} className="text-indigo-400" />
                                                {event.venue}
                                            </span>
                                        </div>
                                    </div>
                                    <span className={`shrink-0 px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase tracking-wider border ${statusStyle(event.participation_type)}`}>
                                        {event.participation_type}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </Section>

            {/* ── Completed Events (Attendance Marked Present) ─────────── */}
            <Section
                icon={CheckCircle}
                iconColor="text-emerald-400"
                title="Completed Events"
                count={completedEvents.length}
                defaultOpen={completedEvents.length > 0}
            >
                {completedEvents.length === 0 ? (
                    <EmptyState icon={Clock} message="No completed events yet. Attend events and get your attendance marked to see them here." />
                ) : (
                    <div className="space-y-2">
                        {completedEvents.map((event, idx) => (
                            <div
                                key={`${event.id}-${idx}`}
                                onClick={() => navigate(`/events/${event.id}`)}
                                className="flex items-center gap-4 p-3 rounded-lg bg-[#050505] border border-neutral-900 hover:border-emerald-900/40 transition-colors cursor-pointer group"
                            >
                                <div className="w-8 h-8 rounded-lg bg-emerald-950/30 border border-emerald-900/40 flex items-center justify-center shrink-0">
                                    <CheckCircle size={14} className="text-emerald-400" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm text-white font-mono truncate group-hover:text-emerald-400 transition-colors">
                                        {event.event_name}
                                    </p>
                                    <div className="flex gap-3 text-[10px] text-neutral-600 font-mono mt-0.5">
                                        <span className="flex items-center gap-1"><Calendar size={9} /> {fmt(event.event_start_date)}</span>
                                        <span className="flex items-center gap-1"><MapPin size={9} /> {event.venue}</span>
                                    </div>
                                </div>
                                <div className="text-right shrink-0">
                                    <span className="text-[10px] font-mono text-emerald-500 uppercase tracking-wider">Present</span>
                                    <p className="text-[9px] text-neutral-600 font-mono">{fmt(event.marked_at)}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </Section>

            {/* ── Podium Awards & Accomplishments ─────────────────────── */}
            <Section
                icon={Trophy}
                iconColor="text-amber-400"
                title="Podium Awards"
                count={wonEvents.length}
                defaultOpen={wonEvents.length > 0}
            >
                {wonEvents.length === 0 ? (
                    <EmptyState icon={Award} message="No podium finishes yet. Compete in events and secure a position to see your awards here." />
                ) : (
                    <div className="space-y-3">
                        {wonEvents.map((item, idx) => (
                            <div
                                key={`${item.id}-${idx}`}
                                onClick={() => navigate(`/events/${item.id}`)}
                                className="flex items-center gap-4 p-4 rounded-xl bg-[#050505] border border-neutral-900 hover:border-amber-900/40 transition-colors cursor-pointer group"
                            >
                                {/* Position badge */}
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm font-mono shrink-0 border ${
                                    item.position_rank === 1
                                        ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                                        : item.position_rank === 2
                                            ? 'bg-neutral-400/10 border-neutral-400/30 text-neutral-300'
                                            : item.position_rank === 3
                                                ? 'bg-amber-700/10 border-amber-700/30 text-amber-600'
                                                : 'bg-neutral-900 border-neutral-800 text-neutral-500'
                                }`}>
                                    #{item.position_rank}
                                </div>

                                <div className="flex-1 min-w-0">
                                    <p className="text-sm text-white font-semibold truncate group-hover:text-amber-400 transition-colors">
                                        {item.event_name}
                                    </p>
                                    <p className="text-[10px] text-neutral-500 font-mono uppercase tracking-wider mt-0.5">
                                        {item.position_name}
                                    </p>
                                </div>

                                {/* Medal icon for top 3 */}
                                {item.position_rank <= 3 && (
                                    <div className="shrink-0">
                                        <Star
                                            size={16}
                                            className={`${
                                                item.position_rank === 1
                                                    ? 'text-amber-400 fill-amber-400'
                                                    : item.position_rank === 2
                                                        ? 'text-neutral-400 fill-neutral-400'
                                                        : 'text-amber-700 fill-amber-700'
                                            }`}
                                        />
                                    </div>
                                )}

                                {item.published_at && (
                                    <span className="text-[9px] text-neutral-600 font-mono shrink-0">
                                        {fmt(item.published_at)}
                                    </span>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </Section>

            {/* ── Detailed Accomplishments (if more info from separate endpoint) ── */}
            {accomplishments.length > 0 && accomplishments.length !== wonEvents.length && (
                <Section
                    icon={Award}
                    iconColor="text-purple-400"
                    title="All Accomplishments"
                    count={accomplishments.length}
                    defaultOpen={false}
                >
                    <div className="space-y-2">
                        {accomplishments.map((acc, idx) => (
                            <div key={idx} className="flex items-center gap-3 p-3 rounded-lg bg-[#050505] border border-neutral-900">
                                <div className="w-7 h-7 rounded-full bg-purple-500/10 text-purple-400 flex items-center justify-center font-bold text-[10px] border border-purple-500/20 shrink-0">
                                    #{acc.position_rank}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm text-white font-mono truncate">{acc.event_name}</p>
                                    <p className="text-[10px] text-neutral-500 font-mono">{acc.position_name} · {fmt(acc.event_start_date)}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </Section>
            )}

        </div>
    );
}
