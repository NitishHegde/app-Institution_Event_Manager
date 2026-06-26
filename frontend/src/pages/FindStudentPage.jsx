import React, { useState, useRef } from 'react';
import API from '../services/api';
import {
    Search, Loader2, AlertCircle, UserCircle, School, Hash,
    Mail, Award, CalendarDays, CheckCircle, XCircle,
    Trophy, Star, ChevronRight, ArrowLeft, BookOpen
} from 'lucide-react';

// Ordinal label helper
const ordinal = (n) => {
    const s = ['th', 'st', 'nd', 'rd'];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
};

// Format a date string
const fmt = (d) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};

// Avatar initials
const initials = (name = '') =>
    name.split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase();

export default function FindStudentPage() {
    const [query, setQuery] = useState('');
    const [searchType, setSearchType] = useState('name'); // 'name' | 'id'
    const [searching, setSearching] = useState(false);
    const [searchError, setSearchError] = useState('');
    const [results, setResults] = useState(null); // null = not searched yet
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [profileLoading, setProfileLoading] = useState(false);
    const [profileError, setProfileError] = useState('');
    const inputRef = useRef(null);

    const handleSearch = async (e) => {
        e?.preventDefault();
        const q = query.trim();
        if (!q) return;

        setSearching(true);
        setSearchError('');
        setResults(null);
        setSelectedStudent(null);

        try {
            const params = searchType === 'name' ? { name: q } : { registrationId: q };
            const res = await API.get('/students/search', { params });
            setResults(res.data);
        } catch (err) {
            console.error('Student search error:', err);
            setSearchError(err.response?.data?.message || 'Search failed. Please try again.');
        } finally {
            setSearching(false);
        }
    };

    const handleViewProfile = async (studentProfileId) => {
        setProfileLoading(true);
        setProfileError('');
        setSelectedStudent(null);

        try {
            const res = await API.get(`/students/${studentProfileId}`);
            setSelectedStudent(res.data);
        } catch (err) {
            console.error('Profile fetch error:', err);
            setProfileError(err.response?.data?.message || 'Failed to load student profile.');
        } finally {
            setProfileLoading(false);
        }
    };

    const handleBack = () => {
        setSelectedStudent(null);
        setProfileError('');
    };

    const clearSearch = () => {
        setQuery('');
        setResults(null);
        setSelectedStudent(null);
        setSearchError('');
        setProfileError('');
        inputRef.current?.focus();
    };

    // ── PROFILE VIEW ──────────────────────────────────────────────────
    if (profileLoading) {
        return (
            <div className="flex-grow flex flex-col items-center justify-center py-20 gap-3">
                <Loader2 className="animate-spin text-cyan-400" size={32} />
                <span className="text-xs font-mono tracking-widest uppercase text-neutral-500">Loading student profile...</span>
            </div>
        );
    }

    if (selectedStudent) {
        const { profile, participationHistory = [], accomplishments = [] } = selectedStudent;
        const presentCount = participationHistory.filter((h) => h.attendance_status === 'PRESENT').length;
        const absentCount = participationHistory.filter((h) => h.attendance_status === 'ABSENT').length;
        const stars = Math.min(5, presentCount);

        return (
            <div className="max-w-5xl mx-auto px-6 py-10 w-full space-y-8">
                {/* Back button */}
                <button
                    onClick={handleBack}
                    className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-neutral-500 hover:text-cyan-400 transition-colors cursor-pointer"
                >
                    <ArrowLeft size={13} />
                    Back to Search Results
                </button>

                {profileError && (
                    <div className="p-4 rounded-lg bg-red-950/20 border border-red-900/50 text-red-400 text-sm flex items-center gap-2">
                        <AlertCircle size={15} />
                        <span>{profileError}</span>
                    </div>
                )}

                {/* Profile header card */}
                <div className="relative bg-[#0A0A0A] border border-neutral-900 rounded-2xl overflow-hidden">
                    {/* Decorative gradient top strip */}
                    <div className="h-1 w-full bg-gradient-to-r from-cyan-500 via-indigo-500 to-purple-600" />
                    <div className="absolute top-1 right-0 w-64 h-64 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />

                    <div className="p-8 flex flex-col sm:flex-row gap-6 items-start">
                        {/* Avatar */}
                        <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center text-black font-black text-2xl font-mono shrink-0 shadow-lg shadow-cyan-900/30">
                            {initials(profile.name)}
                        </div>

                        {/* Info */}
                        <div className="flex-1 space-y-3">
                            <div>
                                <h1 className="text-2xl font-semibold text-white">{profile.name}</h1>
                                <p className="text-xs font-mono text-neutral-500 uppercase tracking-widest mt-0.5">Student Profile</p>
                            </div>
                            <div className="flex flex-wrap gap-4 text-sm">
                                <span className="flex items-center gap-2 text-neutral-400">
                                    <Mail size={13} className="text-neutral-600" />
                                    {profile.email}
                                </span>
                                <span className="flex items-center gap-2 text-neutral-400">
                                    <Hash size={13} className="text-neutral-600" />
                                    {profile.registration_id}
                                </span>
                                <span className="flex items-center gap-2 text-neutral-400">
                                    <School size={13} className="text-neutral-600" />
                                    {profile.school_name}
                                </span>
                            </div>

                            {/* Star rating */}
                            <div className="flex items-center gap-1.5 pt-1">
                                {Array.from({ length: 5 }, (_, i) => (
                                    <Star
                                        key={i}
                                        size={16}
                                        fill={i < stars ? '#f59e0b' : 'transparent'}
                                        className={i < stars ? 'text-amber-400' : 'text-neutral-700'}
                                    />
                                ))}
                                <span className="text-xs text-neutral-500 font-mono ml-1">{presentCount} events attended</span>
                            </div>
                        </div>

                        {/* Stats */}
                        <div className="flex gap-3 shrink-0">
                            <div className="text-center px-4 py-3 bg-emerald-950/20 border border-emerald-900/40 rounded-xl">
                                <p className="text-2xl font-bold text-emerald-400 font-mono">{presentCount}</p>
                                <p className="text-[10px] text-emerald-600 uppercase tracking-wider font-mono">Present</p>
                            </div>
                            <div className="text-center px-4 py-3 bg-red-950/20 border border-red-900/40 rounded-xl">
                                <p className="text-2xl font-bold text-red-400 font-mono">{absentCount}</p>
                                <p className="text-[10px] text-red-600 uppercase tracking-wider font-mono">Absent</p>
                            </div>
                            <div className="text-center px-4 py-3 bg-amber-950/20 border border-amber-900/40 rounded-xl">
                                <p className="text-2xl font-bold text-amber-400 font-mono">{accomplishments.length}</p>
                                <p className="text-[10px] text-amber-600 uppercase tracking-wider font-mono">Awards</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Participation History */}
                    <div className="bg-[#0A0A0A] border border-neutral-900 rounded-2xl overflow-hidden">
                        <div className="px-6 py-4 border-b border-neutral-900 flex items-center gap-2">
                            <BookOpen size={14} className="text-cyan-400" />
                            <h2 className="text-sm font-semibold text-white">Participation History</h2>
                            <span className="ml-auto text-[10px] font-mono text-neutral-600 bg-neutral-900 px-2 py-0.5 rounded-full">{participationHistory.length}</span>
                        </div>
                        {participationHistory.length === 0 ? (
                            <div className="py-10 text-center">
                                <CalendarDays size={24} className="mx-auto text-neutral-700 mb-2" />
                                <p className="text-neutral-600 text-xs font-mono">No attendance records found.</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-neutral-900/60 max-h-80 overflow-y-auto">
                                {participationHistory.map((h, i) => (
                                    <div key={i} className="flex items-center justify-between px-6 py-3 hover:bg-neutral-900/30 transition-colors">
                                        <div className="min-w-0">
                                            <p className="text-sm text-white font-medium truncate">{h.event_name}</p>
                                            <p className="text-[11px] text-neutral-500 font-mono">{fmt(h.marked_at)}</p>
                                        </div>
                                        <span
                                            className={`flex items-center gap-1 text-[10px] font-mono font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border shrink-0 ml-3 ${
                                                h.attendance_status === 'PRESENT'
                                                    ? 'text-emerald-400 bg-emerald-950/30 border-emerald-900/50'
                                                    : 'text-red-400 bg-red-950/30 border-red-900/50'
                                            }`}
                                        >
                                            {h.attendance_status === 'PRESENT'
                                                ? <CheckCircle size={10} />
                                                : <XCircle size={10} />}
                                            {h.attendance_status}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Accomplishments */}
                    <div className="bg-[#0A0A0A] border border-neutral-900 rounded-2xl overflow-hidden">
                        <div className="px-6 py-4 border-b border-neutral-900 flex items-center gap-2">
                            <Trophy size={14} className="text-amber-400" />
                            <h2 className="text-sm font-semibold text-white">Awards & Podium</h2>
                            <span className="ml-auto text-[10px] font-mono text-neutral-600 bg-neutral-900 px-2 py-0.5 rounded-full">{accomplishments.length}</span>
                        </div>
                        {accomplishments.length === 0 ? (
                            <div className="py-10 text-center">
                                <Award size={24} className="mx-auto text-neutral-700 mb-2" />
                                <p className="text-neutral-600 text-xs font-mono">No podium awards yet.</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-neutral-900/60 max-h-80 overflow-y-auto">
                                {accomplishments.map((a, i) => {
                                    const medalColor =
                                        a.position_rank === 1
                                            ? 'text-yellow-400'
                                            : a.position_rank === 2
                                            ? 'text-slate-300'
                                            : a.position_rank === 3
                                            ? 'text-amber-600'
                                            : 'text-neutral-400';
                                    return (
                                        <div key={i} className="flex items-center gap-3 px-6 py-3 hover:bg-neutral-900/30 transition-colors">
                                            <Trophy size={16} className={medalColor + ' shrink-0'} />
                                            <div className="min-w-0">
                                                <p className="text-sm text-white font-medium truncate">{a.event_name}</p>
                                                <p className="text-[11px] font-mono">
                                                    <span className={medalColor}>{ordinal(a.position_rank)} Place</span>
                                                    <span className="text-neutral-500"> — {a.position_name}</span>
                                                </p>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    // ── SEARCH VIEW ───────────────────────────────────────────────────
    return (
        <div className="max-w-4xl mx-auto px-6 py-10 w-full space-y-8">

            {/* Header */}
            <div className="space-y-1 border-b border-neutral-900 pb-6">
                <h1 className="text-3xl font-light text-white leading-tight">Find a Student</h1>
                <p className="text-neutral-500 text-xs font-mono uppercase tracking-widest">
                    Search the student directory by name or registration ID
                </p>
            </div>

            {/* Search form */}
            <div className="bg-[#0A0A0A] border border-neutral-900 rounded-2xl p-6 space-y-4">
                {/* Search type toggle */}
                <div className="flex gap-2">
                    {[
                        { value: 'name', label: 'By Name' },
                        { value: 'id', label: 'By Reg. ID' }
                    ].map((opt) => (
                        <button
                            key={opt.value}
                            onClick={() => { setSearchType(opt.value); setQuery(''); setResults(null); setSearchError(''); }}
                            className={`px-4 py-1.5 rounded-lg text-xs font-mono uppercase tracking-wider transition-all cursor-pointer border ${
                                searchType === opt.value
                                    ? 'bg-cyan-500/10 border-cyan-500/50 text-cyan-400'
                                    : 'bg-transparent border-neutral-800 text-neutral-500 hover:text-neutral-300 hover:border-neutral-700'
                            }`}
                        >
                            {opt.label}
                        </button>
                    ))}
                </div>

                {/* Search input */}
                <form onSubmit={handleSearch} className="flex gap-3">
                    <div className="relative flex-1">
                        <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-neutral-500 pointer-events-none">
                            {searchType === 'name' ? <UserCircle size={15} /> : <Hash size={15} />}
                        </span>
                        <input
                            ref={inputRef}
                            type="text"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder={searchType === 'name' ? 'Enter student name...' : 'Enter registration ID (e.g. CS2024001)...'}
                            className="w-full bg-[#050505] border border-neutral-800 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 text-white rounded-xl pl-11 pr-4 py-3 text-sm transition-all outline-none font-mono placeholder:text-neutral-600"
                            autoFocus
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={searching || !query.trim()}
                        className="flex items-center gap-2 bg-cyan-500 hover:bg-cyan-600 disabled:opacity-40 text-black font-bold px-6 py-3 rounded-xl text-sm transition-colors cursor-pointer shadow-md active:scale-[0.98]"
                    >
                        {searching ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
                        <span>{searching ? 'Searching...' : 'Search'}</span>
                    </button>
                </form>

                {searchError && (
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-red-950/20 border border-red-900/40 text-red-400 text-sm">
                        <AlertCircle size={14} />
                        <span>{searchError}</span>
                    </div>
                )}
            </div>

            {/* Results */}
            {results !== null && (
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <p className="text-xs font-mono text-neutral-500 uppercase tracking-widest">
                            {results.length === 0 ? 'No results found' : `${results.length} student${results.length !== 1 ? 's' : ''} found`}
                        </p>
                        {results.length > 0 && (
                            <button
                                onClick={clearSearch}
                                className="text-[11px] font-mono text-neutral-600 hover:text-neutral-400 transition-colors cursor-pointer uppercase tracking-wider"
                            >
                                Clear
                            </button>
                        )}
                    </div>

                    {results.length === 0 ? (
                        <div className="p-10 text-center bg-[#0A0A0A] border border-neutral-900 rounded-2xl">
                            <UserCircle size={32} className="mx-auto text-neutral-700 mb-3" />
                            <p className="text-neutral-500 text-sm font-mono">No students match your search.</p>
                            <p className="text-neutral-600 text-xs font-mono mt-1">Try a different name or registration ID.</p>
                        </div>
                    ) : (
                        <div className="bg-[#0A0A0A] border border-neutral-900 rounded-2xl overflow-hidden divide-y divide-neutral-900/70">
                            {results.map((student) => (
                                <button
                                    key={student.student_profile_id}
                                    onClick={() => handleViewProfile(student.student_profile_id)}
                                    className="w-full flex items-center gap-4 px-6 py-4 hover:bg-neutral-900/30 transition-colors text-left group cursor-pointer"
                                >
                                    {/* Avatar */}
                                    <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-600 to-indigo-700 flex items-center justify-center text-black font-bold text-sm font-mono shrink-0">
                                        {initials(student.name)}
                                    </div>

                                    {/* Details */}
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-semibold text-white group-hover:text-cyan-400 transition-colors">{student.name}</p>
                                        <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5">
                                            <span className="text-[11px] text-neutral-500 font-mono">{student.registration_id}</span>
                                            <span className="text-[11px] text-neutral-600 font-mono">·</span>
                                            <span className="text-[11px] text-neutral-500 font-mono">{student.school_name}</span>
                                        </div>
                                    </div>

                                    {/* Arrow */}
                                    <ChevronRight size={14} className="text-neutral-700 group-hover:text-cyan-400 transition-colors shrink-0" />
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Empty state (before any search) */}
            {results === null && !searching && (
                <div className="p-12 text-center bg-[#0A0A0A]/50 border border-dashed border-neutral-800 rounded-2xl space-y-3">
                    <div className="w-14 h-14 rounded-xl bg-gradient-to-tr from-cyan-500/10 to-indigo-500/10 border border-cyan-900/30 flex items-center justify-center mx-auto">
                        <Search size={22} className="text-cyan-700" />
                    </div>
                    <p className="text-neutral-400 text-sm">Search for a student by name or registration ID</p>
                    <p className="text-neutral-600 text-xs font-mono">Results will display with attendance history and podium awards</p>
                </div>
            )}
        </div>
    );
}
