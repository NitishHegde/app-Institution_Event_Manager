import React, { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import API from '../services/api';
import {
    Loader2, AlertCircle, CheckCircle, ArrowLeft,
    Trophy, Search, X, Plus, Award
} from 'lucide-react';

// Ordinal label generator: 1 -> "1st Place", 2 -> "2nd Place", etc.
const getPositionLabel = (rank) => {
    const s = ['th', 'st', 'nd', 'rd'];
    const v = rank % 100;
    return rank + (s[(v - 20) % 10] || s[v] || s[0]) + ' Place';
};

// Medal colors per rank
const rankStyle = (rank) => {
    if (rank === 1) return { border: 'border-yellow-700/60', bg: 'bg-yellow-950/20', badge: 'text-yellow-400', icon: 'text-yellow-400' };
    if (rank === 2) return { border: 'border-slate-600/60', bg: 'bg-slate-900/30', badge: 'text-slate-300', icon: 'text-slate-400' };
    if (rank === 3) return { border: 'border-amber-800/60', bg: 'bg-amber-950/20', badge: 'text-amber-600', icon: 'text-amber-700' };
    return { border: 'border-neutral-800', bg: 'bg-[#0A0A0A]', badge: 'text-neutral-400', icon: 'text-neutral-500' };
};

export default function EventPodiumPage() {
    const { eventId } = useParams();

    const [event, setEvent] = useState(null);
    const [participationType, setParticipationType] = useState(null);
    const [resultPositions, setResultPositions] = useState(0);
    const [allParticipants, setAllParticipants] = useState([]); // [{id, name, registrationId?}]
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [publishing, setPublishing] = useState(false);
    const [publishSuccess, setPublishSuccess] = useState('');
    const [publishError, setPublishError] = useState('');

    // positions state: [{ positionRank, positionName, winners: [{id, name, registrationId?}] }]
    const [positions, setPositions] = useState([]);

    // per-position search query
    const [searchQueries, setSearchQueries] = useState({});

    const fetchData = async () => {
        setLoading(true);
        setError('');
        try {
            const [eventRes, podiumRes, regRes] = await Promise.all([
                API.get(`/events/${eventId}/details`),
                API.get(`/events/${eventId}/evaluation/podium`),
                API.get(`/events/${eventId}/registrations`, { params: { size: 500 } })
            ]);

            const evt = eventRes.data;
            setEvent(evt);

            const { participationType: pType, resultPositions: rPos, positions: savedPositions } = podiumRes.data;
            setParticipationType(pType);
            setResultPositions(rPos || 3);

            // Build all participants list
            const records = regRes.data.records || [];
            let participantList = [];
            if (pType === 'INDIVIDUAL') {
                participantList = records.map((r) => ({
                    id: r.student_profile_id || r.user_id,
                    name: r.name,
                    registrationId: r.registration_id
                }));
            } else {
                // GROUP: map team records
                participantList = records.map((t) => ({
                    id: t.team_id,
                    name: t.team_name,
                    registrationId: null
                }));
            }
            setAllParticipants(participantList);

            // Build positions slots
            const totalSlots = rPos || 3;
            const initialPositions = Array.from({ length: totalSlots }, (_, i) => ({
                positionRank: i + 1,
                positionName: getPositionLabel(i + 1),
                winners: []
            }));

            // Pre-fill with saved results
            if (savedPositions && savedPositions.length > 0) {
                savedPositions.forEach((saved) => {
                    const slot = initialPositions.find((p) => p.positionRank === saved.positionRank);
                    if (slot) {
                        slot.winners = saved.recipients || [];
                    }
                });
            }
            setPositions(initialPositions);

        } catch (err) {
            console.error('Error fetching podium data:', err);
            setError(err.response?.data?.message || 'Failed to load podium data.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [eventId]);

    // Compute all assigned IDs across all positions (to prevent double-assigning)
    const allAssignedIds = useMemo(() => {
        const ids = new Set();
        positions.forEach((pos) => pos.winners.forEach((w) => ids.add(w.id)));
        return ids;
    }, [positions]);

    // Add a winner to a position
    const addWinner = (positionRank, participant) => {
        setPositions((prev) =>
            prev.map((pos) => {
                if (pos.positionRank !== positionRank) return pos;
                // Prevent duplicates within slot
                if (pos.winners.some((w) => w.id === participant.id)) return pos;
                return { ...pos, winners: [...pos.winners, participant] };
            })
        );
        // Clear the search for this position
        setSearchQueries((prev) => ({ ...prev, [positionRank]: '' }));
    };

    // Remove a winner from a position
    const removeWinner = (positionRank, participantId) => {
        setPositions((prev) =>
            prev.map((pos) => {
                if (pos.positionRank !== positionRank) return pos;
                return { ...pos, winners: pos.winners.filter((w) => w.id !== participantId) };
            })
        );
    };

    // Get filtered available participants for a position's search
    const getFilteredOptions = (positionRank, query) => {
        const posWinnerIds = new Set(
            (positions.find((p) => p.positionRank === positionRank)?.winners || []).map((w) => w.id)
        );
        const q = query.trim().toLowerCase();
        return allParticipants.filter((p) => {
            if (posWinnerIds.has(p.id)) return false; // already in this slot
            if (allAssignedIds.has(p.id)) return false; // assigned to another slot
            if (!q) return true;
            return p.name.toLowerCase().includes(q) || (p.registrationId && p.registrationId.toLowerCase().includes(q));
        });
    };

    const handlePublish = async () => {
        setPublishing(true);
        setPublishSuccess('');
        setPublishError('');
        try {
            const payload = positions
                .filter((pos) => pos.winners.length > 0)
                .map((pos) => ({
                    positionName: pos.positionName,
                    positionRank: pos.positionRank,
                    targetIds: pos.winners.map((w) => w.id)
                }));

            if (payload.length === 0) {
                setPublishError('Please assign at least one winner before publishing.');
                setPublishing(false);
                return;
            }

            await API.post(`/events/${eventId}/evaluation/podium`, { positions: payload });
            setPublishSuccess('Podium results published successfully!');
        } catch (err) {
            console.error('Error publishing podium:', err);
            setPublishError(err.response?.data?.message || 'Failed to publish results.');
        } finally {
            setPublishing(false);
        }
    };

    if (loading) {
        return (
            <div className="flex-grow flex flex-col items-center justify-center py-20 gap-3">
                <Loader2 className="animate-spin text-cyan-400" size={32} />
                <span className="text-xs font-mono tracking-widest uppercase text-neutral-500">Loading podium workspace...</span>
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
                <h1 className="text-3xl font-light text-white leading-tight">Podium Awards</h1>
                <p className="text-neutral-500 text-xs font-mono uppercase tracking-widest">
                    {event?.event_name} &mdash; {resultPositions} positions &middot; {participationType} event
                </p>
            </div>

            {/* Notifications */}
            {publishSuccess && (
                <div className="p-4 rounded-lg bg-emerald-950/20 border border-emerald-900/50 text-emerald-400 text-sm flex items-center gap-3">
                    <CheckCircle size={18} />
                    <span>{publishSuccess}</span>
                </div>
            )}
            {publishError && (
                <div className="p-4 rounded-lg bg-red-950/20 border border-red-900/50 text-red-400 text-sm flex items-center gap-3">
                    <AlertCircle size={18} />
                    <span>{publishError}</span>
                </div>
            )}

            {/* No participants registered yet */}
            {allParticipants.length === 0 ? (
                <div className="p-10 text-center bg-[#0A0A0A] border border-neutral-900 rounded-xl">
                    <Trophy size={32} className="mx-auto text-neutral-700 mb-3" />
                    <p className="text-neutral-500 text-sm font-mono">
                        No {participationType === 'GROUP' ? 'teams' : 'participants'} registered yet.
                    </p>
                </div>
            ) : (
                <>
                    {/* Position cards grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                        {positions.map((pos) => {
                            const style = rankStyle(pos.positionRank);
                            const query = searchQueries[pos.positionRank] || '';
                            const options = getFilteredOptions(pos.positionRank, query);
                            const showDropdown = query.trim().length > 0;

                            return (
                                <div
                                    key={pos.positionRank}
                                    className={`relative rounded-xl border p-6 space-y-4 ${style.border} ${style.bg}`}
                                >
                                    {/* Position label */}
                                    <div className="flex items-center gap-3">
                                        <Trophy size={18} className={style.icon} />
                                        <div>
                                            <h3 className={`text-lg font-bold font-mono ${style.badge}`}>
                                                {pos.positionName}
                                            </h3>
                                            <p className="text-[10px] text-neutral-600 uppercase tracking-widest font-mono">
                                                {pos.winners.length === 0 ? 'No winner assigned' : `${pos.winners.length} winner${pos.winners.length > 1 ? 's' : ''}`}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Winners tags */}
                                    {pos.winners.length > 0 && (
                                        <div className="flex flex-wrap gap-2">
                                            {pos.winners.map((winner) => (
                                                <span
                                                    key={winner.id}
                                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#030303] border border-neutral-800 text-xs font-mono text-white"
                                                >
                                                    <Award size={10} className={style.badge} />
                                                    <span className="max-w-[130px] truncate">{winner.name}</span>
                                                    <button
                                                        onClick={() => removeWinner(pos.positionRank, winner.id)}
                                                        className="text-neutral-500 hover:text-red-400 transition-colors cursor-pointer ml-0.5 rounded-full"
                                                    >
                                                        <X size={10} />
                                                    </button>
                                                </span>
                                            ))}
                                        </div>
                                    )}

                                    {/* Search to add winner */}
                                    <div className="relative">
                                        <div className="relative">
                                            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-neutral-500 pointer-events-none">
                                                <Search size={12} />
                                            </span>
                                            <input
                                                type="text"
                                                value={query}
                                                onChange={(e) =>
                                                    setSearchQueries((prev) => ({ ...prev, [pos.positionRank]: e.target.value }))
                                                }
                                                placeholder={`Search ${participationType === 'GROUP' ? 'team' : 'student'}...`}
                                                className="w-full bg-[#030303] border border-neutral-800 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 text-white rounded-lg pl-8 pr-3 py-2 text-xs transition-all outline-none font-mono"
                                            />
                                        </div>

                                        {/* Dropdown results */}
                                        {showDropdown && (
                                            <div className="absolute left-0 right-0 mt-1 bg-[#0A0A0A] border border-neutral-800 rounded-lg shadow-2xl max-h-44 overflow-y-auto z-50">
                                                {options.length === 0 ? (
                                                    <p className="p-3 text-xs text-neutral-600 font-mono text-center">No matches found.</p>
                                                ) : (
                                                    options.map((participant) => (
                                                        <button
                                                            key={participant.id}
                                                            onClick={() => addWinner(pos.positionRank, participant)}
                                                            className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-neutral-900 border-b border-neutral-900 last:border-0 text-left transition-colors cursor-pointer"
                                                        >
                                                            <div>
                                                                <p className="text-xs text-white font-mono">{participant.name}</p>
                                                                {participant.registrationId && (
                                                                    <p className="text-[10px] text-neutral-500 font-mono">{participant.registrationId}</p>
                                                                )}
                                                            </div>
                                                            <Plus size={12} className="text-cyan-400 shrink-0" />
                                                        </button>
                                                    ))
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Publish button */}
                    <div className="flex justify-end pt-4 border-t border-neutral-900">
                        <button
                            onClick={handlePublish}
                            disabled={publishing}
                            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold py-3 px-8 rounded-lg text-sm transition-colors cursor-pointer shadow-md shadow-indigo-900/40 active:scale-[0.98]"
                        >
                            {publishing ? <Loader2 size={16} className="animate-spin" /> : <Trophy size={16} />}
                            <span>{publishing ? 'Publishing...' : 'Publish Results'}</span>
                        </button>
                    </div>
                </>
            )}
        </div>
    );
}
