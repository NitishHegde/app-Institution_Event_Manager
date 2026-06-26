import React, { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import API from '../services/api';
import {
    Loader2, AlertCircle, CheckCircle, Users, ArrowLeft,
    UserCheck, UserX, Search, Save, ChevronDown, ChevronRight
} from 'lucide-react';

export default function EventAttendancePage() {
    const { eventId } = useParams();

    const [event, setEvent] = useState(null);
    const [participationType, setParticipationType] = useState(null);
    const [participants, setParticipants] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [saving, setSaving] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState('');
    const [saveError, setSaveError] = useState('');
    const [searchQuery, setSearchQuery] = useState('');

    // attendance map: { student_profile_id -> 'PRESENT' | 'ABSENT' }
    const [attendanceMap, setAttendanceMap] = useState({});

    // expanded teams for GROUP type
    const [expandedTeams, setExpandedTeams] = useState({});

    const fetchData = async () => {
        setLoading(true);
        setError('');
        try {
            const [eventRes, attendanceRes] = await Promise.all([
                API.get(`/events/${eventId}/details`),
                API.get(`/events/${eventId}/attendance`)
            ]);
            setEvent(eventRes.data);
            const { participationType, participants: p } = attendanceRes.data;
            setParticipationType(participationType);
            setParticipants(p);

            // Build initial attendance map
            const map = {};
            p.forEach((student) => {
                map[student.student_profile_id] = student.attendance_status;
            });
            setAttendanceMap(map);

            // Expand all teams by default for GROUP events
            if (participationType === 'GROUP') {
                const teamIds = {};
                p.forEach((s) => { teamIds[s.team_id] = true; });
                setExpandedTeams(teamIds);
            }
        } catch (err) {
            console.error('Error fetching attendance data:', err);
            setError(err.response?.data?.message || 'Failed to load attendance data.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [eventId]);

    const toggleStatus = (studentProfileId) => {
        setAttendanceMap((prev) => ({
            ...prev,
            [studentProfileId]: prev[studentProfileId] === 'PRESENT' ? 'ABSENT' : 'PRESENT'
        }));
    };

    const markAll = (status) => {
        setAttendanceMap((prev) => {
            const updated = { ...prev };
            Object.keys(updated).forEach((k) => { updated[k] = status; });
            return updated;
        });
    };

    const handleSave = async () => {
        setSaving(true);
        setSaveSuccess('');
        setSaveError('');
        try {
            const attendanceSheet = Object.entries(attendanceMap).map(([studentProfileId, status]) => ({
                studentProfileId,
                status
            }));
            await API.post(`/events/${eventId}/attendance`, { attendanceSheet });
            setSaveSuccess('Attendance saved successfully!');
        } catch (err) {
            console.error('Error saving attendance:', err);
            setSaveError(err.response?.data?.message || 'Failed to save attendance.');
        } finally {
            setSaving(false);
        }
    };

    // Derived stats
    const presentCount = Object.values(attendanceMap).filter((s) => s === 'PRESENT').length;
    const absentCount = Object.values(attendanceMap).filter((s) => s === 'ABSENT').length;
    const total = Object.keys(attendanceMap).length;

    // GROUP: group participants by team
    const teamGroups = useMemo(() => {
        if (participationType !== 'GROUP') return null;
        const groups = {};
        participants.forEach((student) => {
            if (!groups[student.team_id]) {
                groups[student.team_id] = { teamId: student.team_id, teamName: student.team_name, members: [] };
            }
            groups[student.team_id].members.push(student);
        });
        return Object.values(groups);
    }, [participants, participationType]);

    // INDIVIDUAL: filtered flat list
    const filteredParticipants = useMemo(() => {
        if (participationType !== 'INDIVIDUAL') return [];
        const q = searchQuery.trim().toLowerCase();
        if (!q) return participants;
        return participants.filter(
            (p) =>
                p.name.toLowerCase().includes(q) ||
                p.email.toLowerCase().includes(q) ||
                p.registration_id?.toLowerCase().includes(q)
        );
    }, [participants, participationType, searchQuery]);

    // GROUP: filtered team groups
    const filteredTeamGroups = useMemo(() => {
        if (participationType !== 'GROUP') return [];
        const q = searchQuery.trim().toLowerCase();
        if (!q) return teamGroups || [];
        return (teamGroups || []).filter(
            (tg) =>
                tg.teamName.toLowerCase().includes(q) ||
                tg.members.some(
                    (m) =>
                        m.name.toLowerCase().includes(q) ||
                        m.registration_id?.toLowerCase().includes(q)
                )
        );
    }, [teamGroups, participationType, searchQuery]);

    if (loading) {
        return (
            <div className="flex-grow flex flex-col items-center justify-center py-20 gap-3">
                <Loader2 className="animate-spin text-cyan-400" size={32} />
                <span className="text-xs font-mono tracking-widest uppercase text-neutral-500">Loading attendance roster...</span>
            </div>
        );
    }

    if (error) {
        return (
            <div className="max-w-3xl mx-auto px-6 py-12 space-y-4">
                <div className="p-4 rounded-lg bg-red-950/20 border border-red-900/50 text-red-400 text-sm flex gap-2 items-center">
                    <AlertCircle size={16} />
                    <span>{error}</span>
                </div>
                <Link to={`/manage-event/${eventId}`} className="text-sm font-mono text-cyan-400 hover:underline flex items-center gap-1">
                    <ArrowLeft size={12} /> Back to Event Details
                </Link>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto px-6 py-10 w-full space-y-8">

            {/* Header */}
            <div className="border-b border-neutral-900 pb-6 space-y-1">
                <h1 className="text-3xl font-light text-white leading-tight">Attendance Registry</h1>
                <p className="text-neutral-500 text-xs font-mono uppercase tracking-widest">
                    {event?.event_name} &mdash; {participationType} event
                </p>
            </div>

            {/* Notifications */}
            {saveSuccess && (
                <div className="p-4 rounded-lg bg-emerald-950/20 border border-emerald-900/50 text-emerald-400 text-sm flex items-center gap-3">
                    <CheckCircle size={18} />
                    <span>{saveSuccess}</span>
                </div>
            )}
            {saveError && (
                <div className="p-4 rounded-lg bg-red-950/20 border border-red-900/50 text-red-400 text-sm flex items-center gap-3">
                    <AlertCircle size={18} />
                    <span>{saveError}</span>
                </div>
            )}

            {/* Stats + Actions bar */}
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                {/* Stats */}
                <div className="flex gap-4">
                    <div className="px-4 py-2 bg-[#0A0A0A] border border-neutral-900 rounded-lg text-center min-w-[80px]">
                        <p className="text-2xl font-bold text-white font-mono">{total}</p>
                        <p className="text-[10px] text-neutral-500 uppercase tracking-wider font-mono">Total</p>
                    </div>
                    <div className="px-4 py-2 bg-emerald-950/20 border border-emerald-900/40 rounded-lg text-center min-w-[80px]">
                        <p className="text-2xl font-bold text-emerald-400 font-mono">{presentCount}</p>
                        <p className="text-[10px] text-emerald-600 uppercase tracking-wider font-mono">Present</p>
                    </div>
                    <div className="px-4 py-2 bg-red-950/20 border border-red-900/40 rounded-lg text-center min-w-[80px]">
                        <p className="text-2xl font-bold text-red-400 font-mono">{absentCount}</p>
                        <p className="text-[10px] text-red-600 uppercase tracking-wider font-mono">Absent</p>
                    </div>
                </div>

                {/* Quick actions */}
                <div className="flex flex-wrap gap-3">
                    <button
                        onClick={() => markAll('PRESENT')}
                        className="flex items-center gap-2 px-4 py-2 bg-emerald-950/30 border border-emerald-900/50 text-emerald-400 hover:bg-emerald-950/50 text-xs font-mono uppercase tracking-wider rounded-lg transition-colors cursor-pointer"
                    >
                        <UserCheck size={14} />
                        Mark All Present
                    </button>
                    <button
                        onClick={() => markAll('ABSENT')}
                        className="flex items-center gap-2 px-4 py-2 bg-red-950/30 border border-red-900/50 text-red-400 hover:bg-red-950/50 text-xs font-mono uppercase tracking-wider rounded-lg transition-colors cursor-pointer"
                    >
                        <UserX size={14} />
                        Mark All Absent
                    </button>
                </div>
            </div>

            {/* Search bar */}
            <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-neutral-500">
                    <Search size={14} />
                </span>
                <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={participationType === 'GROUP' ? 'Search by team or student name...' : 'Search by name, email or reg. ID...'}
                    className="w-full bg-[#0A0A0A] border border-neutral-800 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 text-white rounded-lg pl-9 pr-4 py-2.5 text-sm transition-all outline-none font-mono"
                />
            </div>

            {/* Participant List */}
            {total === 0 ? (
                <div className="p-10 text-center bg-[#0A0A0A] border border-neutral-900 rounded-xl">
                    <Users size={32} className="mx-auto text-neutral-700 mb-3" />
                    <p className="text-neutral-500 text-sm font-mono">No participants registered for this event yet.</p>
                </div>
            ) : participationType === 'INDIVIDUAL' ? (
                /* ---- INDIVIDUAL FLAT TABLE ---- */
                <div className="bg-[#0A0A0A] border border-neutral-900 rounded-xl overflow-hidden">
                    <div className="grid grid-cols-[1fr_auto] items-center px-5 py-3 border-b border-neutral-900 bg-[#050505]">
                        <span className="text-[10px] font-mono uppercase tracking-widest text-neutral-500">Participant</span>
                        <span className="text-[10px] font-mono uppercase tracking-widest text-neutral-500">Status</span>
                    </div>
                    {filteredParticipants.length === 0 ? (
                        <p className="text-center py-8 text-neutral-600 text-sm font-mono">No matching participants.</p>
                    ) : (
                        filteredParticipants.map((student, idx) => {
                            const status = attendanceMap[student.student_profile_id] || 'PRESENT';
                            const isPresent = status === 'PRESENT';
                            return (
                                <div
                                    key={student.student_profile_id}
                                    className={`grid grid-cols-[1fr_auto] items-center px-5 py-3.5 border-b border-neutral-900/60 last:border-0 transition-colors ${isPresent ? 'hover:bg-emerald-950/10' : 'hover:bg-red-950/10'}`}
                                >
                                    <div>
                                        <p className="text-sm font-semibold text-white">{student.name}</p>
                                        <p className="text-[11px] text-neutral-500 font-mono">{student.registration_id} &middot; {student.email}</p>
                                    </div>
                                    <button
                                        onClick={() => toggleStatus(student.student_profile_id)}
                                        className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-mono font-bold uppercase tracking-wider transition-all cursor-pointer border
                                            ${isPresent
                                                ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-400 hover:bg-emerald-950/70'
                                                : 'bg-red-950/40 border-red-800/60 text-red-400 hover:bg-red-950/70'
                                            }`}
                                    >
                                        {isPresent ? <UserCheck size={12} /> : <UserX size={12} />}
                                        {status}
                                    </button>
                                </div>
                            );
                        })
                    )}
                </div>
            ) : (
                /* ---- GROUP TEAM-GROUPED VIEW ---- */
                <div className="space-y-4">
                    {filteredTeamGroups.length === 0 ? (
                        <p className="text-center py-8 text-neutral-600 text-sm font-mono">No matching teams.</p>
                    ) : (
                        filteredTeamGroups.map((team) => {
                            const isExpanded = expandedTeams[team.teamId];
                            const teamPresent = team.members.filter((m) => (attendanceMap[m.student_profile_id] || 'PRESENT') === 'PRESENT').length;
                            return (
                                <div key={team.teamId} className="bg-[#0A0A0A] border border-neutral-900 rounded-xl overflow-hidden">
                                    {/* Team header */}
                                    <button
                                        onClick={() => setExpandedTeams((prev) => ({ ...prev, [team.teamId]: !prev[team.teamId] }))}
                                        className="w-full flex items-center justify-between px-5 py-4 hover:bg-neutral-900/30 transition-colors cursor-pointer"
                                    >
                                        <div className="flex items-center gap-3">
                                            {isExpanded ? <ChevronDown size={14} className="text-cyan-400" /> : <ChevronRight size={14} className="text-neutral-500" />}
                                            <span className="font-semibold text-white text-sm">{team.teamName}</span>
                                            <span className="text-[10px] font-mono text-neutral-500 uppercase tracking-wider">{team.members.length} members</span>
                                        </div>
                                        <span className={`text-[10px] font-mono uppercase tracking-wider font-bold px-3 py-1 rounded-full border ${teamPresent === team.members.length ? 'text-emerald-400 bg-emerald-950/30 border-emerald-900/50' : teamPresent === 0 ? 'text-red-400 bg-red-950/30 border-red-900/50' : 'text-amber-400 bg-amber-950/30 border-amber-900/50'}`}>
                                            {teamPresent}/{team.members.length} present
                                        </span>
                                    </button>

                                    {/* Members */}
                                    {isExpanded && (
                                        <div className="border-t border-neutral-900">
                                            {team.members.map((student) => {
                                                const status = attendanceMap[student.student_profile_id] || 'PRESENT';
                                                const isPresent = status === 'PRESENT';
                                                return (
                                                    <div
                                                        key={student.student_profile_id}
                                                        className={`flex items-center justify-between px-7 py-3 border-b border-neutral-900/40 last:border-0 transition-colors ${isPresent ? 'hover:bg-emerald-950/10' : 'hover:bg-red-950/10'}`}
                                                    >
                                                        <div>
                                                            <p className="text-sm text-white font-medium">{student.name}</p>
                                                            <p className="text-[11px] text-neutral-500 font-mono">{student.registration_id} &middot; {student.email}</p>
                                                        </div>
                                                        <button
                                                            onClick={() => toggleStatus(student.student_profile_id)}
                                                            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-mono font-bold uppercase tracking-wider transition-all cursor-pointer border
                                                                ${isPresent
                                                                    ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-400 hover:bg-emerald-950/70'
                                                                    : 'bg-red-950/40 border-red-800/60 text-red-400 hover:bg-red-950/70'
                                                                }`}
                                                        >
                                                            {isPresent ? <UserCheck size={12} /> : <UserX size={12} />}
                                                            {status}
                                                        </button>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>
            )}

            {/* Save Button */}
            {total > 0 && (
                <div className="flex justify-end pt-4 border-t border-neutral-900">
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="flex items-center gap-2 bg-cyan-500 hover:bg-cyan-600 disabled:opacity-50 text-black font-semibold py-3 px-8 rounded-lg text-sm transition-colors cursor-pointer shadow-md active:scale-[0.98]"
                    >
                        {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                        <span>{saving ? 'Saving...' : 'Save Attendance'}</span>
                    </button>
                </div>
            )}
        </div>
    );
}
