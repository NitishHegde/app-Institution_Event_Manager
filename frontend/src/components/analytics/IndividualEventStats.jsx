import React, { useState, useEffect } from 'react';
import API from '../../services/api';
import { Search, Calendar, Users, Award, Loader2, AlertCircle } from 'lucide-react';

export default function IndividualEventStats() {
    const [pastEvents, setPastEvents] = useState([]);
    const [loadingEvents, setLoadingEvents] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [includeAll, setIncludeAll] = useState(false); // Default: past events only
    
    const [selectedEventId, setSelectedEventId] = useState('');
    const [stats, setStats] = useState(null);
    const [loadingStats, setLoadingStats] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchPastEvents = async () => {
            setLoadingEvents(true);
            try {
                const params = includeAll ? '?includeAll=true' : '';
                const res = await API.get(`/analytics/events/past${params}`);
                setPastEvents(res.data);
            } catch (err) {
                console.error('Failed to load past events:', err);
                setError('Failed to load past events.');
            } finally {
                setLoadingEvents(false);
            }
        };
        fetchPastEvents();
    }, [includeAll]);

    useEffect(() => {
        if (!selectedEventId) {
            setStats(null);
            return;
        }

        const fetchStats = async () => {
            setLoadingStats(true);
            setError('');
            try {
                const res = await API.get(`/analytics/events/${selectedEventId}/stats`);
                setStats(res.data);
            } catch (err) {
                console.error('Failed to load event stats:', err);
                setError('Failed to load statistics for the selected event.');
                setStats(null);
            } finally {
                setLoadingStats(false);
            }
        };

        fetchStats();
    }, [selectedEventId]);

    const filteredEvents = pastEvents.filter(e => 
        e.event_name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="space-y-6">
            
            {/* Search and Select */}
            <div className="bg-[#0A0A0A] border border-neutral-900 rounded-xl p-6 space-y-4 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />
                <h2 className="text-lg font-light text-white">Individual Event Statistics</h2>
                <p className="text-xs text-neutral-500 font-mono">Select a past event to view its detailed participation and podium metrics.</p>
                
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="relative flex-1">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-600" />
                        <input
                            type="text"
                            placeholder="Search events by name..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-[#050505] border border-neutral-800 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 text-white rounded-lg pl-10 pr-4 py-2.5 text-sm transition-all outline-none font-mono"
                        />
                    </div>
                    <div className="flex-1">
                        {loadingEvents ? (
                            <div className="flex items-center gap-2 text-neutral-500 text-sm py-2">
                                <Loader2 size={16} className="animate-spin" /> Loading events...
                            </div>
                        ) : (
                            <select
                                value={selectedEventId}
                                onChange={(e) => setSelectedEventId(e.target.value)}
                                className="w-full bg-[#050505] border border-neutral-800 focus:border-cyan-500 text-white rounded-lg px-4 py-2.5 text-sm transition-all outline-none font-mono appearance-none"
                            >
                                <option value="">-- Select an Event --</option>
                                {filteredEvents.map(e => (
                                    <option key={e.id} value={e.id}>
                                        {e.event_name} ({new Date(e.event_end_date).toLocaleDateString()})
                                    </option>
                                ))}
                            </select>
                        )}
                    </div>
                    {/* Toggle: include all events */}
                    <label className="flex items-center gap-2 cursor-pointer self-center shrink-0">
                        <span className="text-[10px] text-neutral-500 font-mono uppercase tracking-wider whitespace-nowrap">All Events</span>
                        <div className="relative">
                            <input
                                type="checkbox"
                                checked={includeAll}
                                onChange={e => { setIncludeAll(e.target.checked); setSelectedEventId(''); setStats(null); }}
                                className="sr-only peer"
                            />
                            <div className="w-9 h-5 bg-neutral-700 rounded-full peer peer-checked:bg-cyan-600 transition-colors after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-4"></div>
                        </div>
                    </label>
                </div>
            </div>

            {/* Error Display */}
            {error && (
                <div className="p-4 rounded-lg bg-red-950/20 border border-red-900/50 text-red-400 text-sm flex gap-2 items-center">
                    <AlertCircle size={15} /> {error}
                </div>
            )}

            {/* Loading Stats */}
            {loadingStats && (
                <div className="flex justify-center py-12">
                    <Loader2 size={32} className="text-cyan-500 animate-spin" />
                </div>
            )}

            {/* Stats Display */}
            {stats && !loadingStats && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    
                    {/* Event Summary Card */}
                    <div className="bg-[#0A0A0A] border border-neutral-900 rounded-xl p-6">
                        <h3 className="text-sm font-semibold text-white mb-4 border-b border-neutral-900 pb-2">Event Summary</h3>
                        <div className="space-y-4">
                            <div>
                                <p className="text-[10px] text-neutral-500 font-mono uppercase tracking-widest">Event Name</p>
                                <p className="text-lg text-white font-light">{stats.event.event_name}</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <Calendar size={14} className="text-neutral-500" />
                                <span className="text-sm text-neutral-300 font-mono">{new Date(stats.event.event_end_date).toLocaleDateString()}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Users size={14} className="text-neutral-500" />
                                <span className="text-sm text-neutral-300 font-mono">{stats.event.participation_type}</span>
                            </div>
                            
                            <div className="mt-6 p-4 rounded-xl bg-cyan-950/10 border border-cyan-900/30 text-center">
                                <p className="text-3xl font-bold text-cyan-400 font-mono">{stats.participantCount}</p>
                                <p className="text-[10px] text-cyan-600 uppercase tracking-wider font-mono mt-1">Total Participation</p>
                            </div>
                        </div>
                    </div>

                    {/* Podiums Card */}
                    <div className="bg-[#0A0A0A] border border-neutral-900 rounded-xl p-6">
                        <h3 className="text-sm font-semibold text-white mb-4 border-b border-neutral-900 pb-2 flex items-center gap-2">
                            <Award size={16} className="text-amber-400" /> Podium Results
                        </h3>
                        
                        {stats.podiums && stats.podiums.length > 0 ? (
                            <div className="space-y-3">
                                {stats.podiums.map((podium, idx) => (
                                    <div key={idx} className="flex items-center gap-4 p-3 rounded-lg bg-[#050505] border border-neutral-900">
                                        <div className="w-8 h-8 rounded-full bg-amber-500/10 text-amber-400 flex items-center justify-center font-bold text-sm border border-amber-500/20">
                                            #{podium.position_rank}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm text-white font-semibold truncate">{podium.recipient_name}</p>
                                            <p className="text-xs text-neutral-500 font-mono truncate">{podium.school_name || 'Group/Team'}</p>
                                        </div>
                                        <div className="text-xs font-mono text-neutral-400 uppercase">
                                            {podium.position_name}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-8 text-neutral-500 font-mono text-sm">
                                No podium results published for this event.
                            </div>
                        )}
                    </div>
                </div>
            )}
            
            {!stats && !loadingStats && !error && selectedEventId && (
                 <div className="text-center py-12 text-neutral-500 font-mono text-sm border border-neutral-900 border-dashed rounded-xl">
                    Select an event to view statistics.
                 </div>
            )}
        </div>
    );
}
