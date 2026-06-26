import React, { useState, useEffect } from 'react';
import API from '../../services/api';
import { Loader2, AlertCircle, Building2, Users, Calendar, Filter, X } from 'lucide-react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';

// Custom tooltip for premium look
const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-[#050505] border border-neutral-800 p-3 rounded-lg shadow-xl shadow-black/50">
                <p className="text-white font-mono text-sm mb-2">{label}</p>
                {payload.map((entry, index) => (
                    <p key={index} className="text-xs font-mono" style={{ color: entry.color }}>
                        {entry.name}: <span className="font-bold">{entry.value}</span>
                    </p>
                ))}
            </div>
        );
    }
    return null;
};

export default function OrganizationStats() {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Filter states
    const [showFilters, setShowFilters] = useState(false);
    const [filters, setFilters] = useState({
        seriesId: '',
        categoryId: '',
        categoryType: '',
        startDate: '',
        endDate: '',
        includeAll: true // default: show all events, not just past ones
    });

    // Reference data for filters
    const [seriesList, setSeriesList] = useState([]);
    const [categoryList, setCategoryList] = useState([]);

    useEffect(() => {
        // Load filter dropdown data
        const loadRefs = async () => {
            try {
                const [seriesRes, catRes] = await Promise.all([
                    API.get('/event-series'),
                    API.get('/event-categories')
                ]);
                setSeriesList(seriesRes.data);
                setCategoryList(catRes.data);
            } catch (err) {
                console.error('Failed to load filter references:', err);
            }
        };
        loadRefs();
    }, []);

    const fetchStats = async (overrideFilters) => {
        setLoading(true);
        setError('');
        try {
            const activeFilters = overrideFilters || filters;
            // Clean empty filters
            const params = new URLSearchParams();
            Object.entries(activeFilters).forEach(([key, value]) => {
                if (value !== '' && value !== false) params.append(key, value);
            });

            const res = await API.get(`/analytics/organization?${params.toString()}`);
            setStats(res.data);
        } catch (err) {
            console.error('Failed to load organization stats:', err);
            setError('Failed to load organization statistics.');
        } finally {
            setLoading(false);
        }
    };

    // Initial fetch and fetch on filter apply
    useEffect(() => {
        fetchStats();
    }, []);

    const handleApplyFilters = () => {
        fetchStats();
        setShowFilters(false);
    };

    const handleClearFilters = () => {
        const reset = {
            seriesId: '',
            categoryId: '',
            categoryType: '',
            startDate: '',
            endDate: '',
            includeAll: true
        };
        setFilters(reset);
        // fetch immediately with reset values
        setLoading(true);
        setError('');
        const params = new URLSearchParams();
        if (reset.includeAll) params.append('includeAll', 'true');
        API.get(`/analytics/organization?${params.toString()}`)
            .then(res => setStats(res.data))
            .catch(() => setError('Failed to load organization statistics.'))
            .finally(() => setLoading(false));
    };

    if (loading && !stats) {
        return (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
                <Loader2 className="animate-spin text-indigo-400" size={32} />
                <span className="text-xs font-mono tracking-widest uppercase text-neutral-500">Aggregating Data...</span>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-4 rounded-lg bg-red-950/20 border border-red-900/50 text-red-400 text-sm flex gap-2 items-center">
                <AlertCircle size={15} /> {error}
            </div>
        );
    }

    return (
        <div className="space-y-6">
            
            {/* Action Bar */}
            <div className="flex justify-between items-center bg-[#0A0A0A] p-4 rounded-xl border border-neutral-900">
                <h2 className="text-sm font-semibold text-white font-mono uppercase tracking-wider">Organization Overview</h2>
                <button 
                    onClick={() => setShowFilters(!showFilters)}
                    className="flex items-center gap-2 px-3 py-1.5 rounded bg-neutral-900 hover:bg-neutral-800 text-xs text-neutral-400 font-mono transition-colors border border-neutral-800"
                >
                    <Filter size={14} /> Filters
                </button>
            </div>

            {/* Filter Panel (Collapsible) */}
            {showFilters && (
                <div className="bg-[#050505] border border-neutral-800 rounded-xl p-5 space-y-4">
                    <div className="flex justify-between items-center border-b border-neutral-900 pb-3">
                        <h3 className="text-xs font-bold text-white uppercase tracking-widest">Filter Analytics</h3>
                        <button onClick={() => setShowFilters(false)} className="text-neutral-500 hover:text-white"><X size={14} /></button>
                    </div>

                    {/* Include All Events Toggle */}
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-indigo-950/20 border border-indigo-900/30">
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                checked={filters.includeAll}
                                onChange={e => setFilters({...filters, includeAll: e.target.checked})}
                                className="sr-only peer"
                            />
                            <div className="w-9 h-5 bg-neutral-700 rounded-full peer peer-checked:bg-indigo-600 transition-colors after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-4"></div>
                        </label>
                        <div>
                            <p className="text-xs font-mono text-white">Include All Events</p>
                            <p className="text-[10px] text-neutral-500 font-mono">
                                {filters.includeAll ? 'Showing all events (including upcoming & active)' : 'Showing only past events (event_end_date in the past)'}
                            </p>
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-1">
                            <label className="text-[10px] text-neutral-500 font-mono uppercase">Event Series</label>
                            <select 
                                value={filters.seriesId} onChange={e => setFilters({...filters, seriesId: e.target.value})}
                                className="w-full bg-[#0A0A0A] border border-neutral-800 focus:border-indigo-500 text-white rounded p-2 text-xs font-mono"
                            >
                                <option value="">All Series</option>
                                {seriesList.map(s => <option key={s.id} value={s.id}>{s.series_name}</option>)}
                            </select>
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] text-neutral-500 font-mono uppercase">Event Category</label>
                            <select 
                                value={filters.categoryId} onChange={e => setFilters({...filters, categoryId: e.target.value})}
                                className="w-full bg-[#0A0A0A] border border-neutral-800 focus:border-indigo-500 text-white rounded p-2 text-xs font-mono"
                            >
                                <option value="">All Categories</option>
                                {categoryList.map(c => <option key={c.id} value={c.id}>{c.category_name}</option>)}
                            </select>
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] text-neutral-500 font-mono uppercase">Category Type</label>
                            <select 
                                value={filters.categoryType} onChange={e => setFilters({...filters, categoryType: e.target.value})}
                                className="w-full bg-[#0A0A0A] border border-neutral-800 focus:border-indigo-500 text-white rounded p-2 text-xs font-mono"
                            >
                                <option value="">All Types</option>
                                <option value="TECHNICAL">TECHNICAL</option>
                                <option value="NON_TECHNICAL">NON_TECHNICAL</option>
                            </select>
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] text-neutral-500 font-mono uppercase">Start Date (From)</label>
                            <input 
                                type="date" value={filters.startDate} onChange={e => setFilters({...filters, startDate: e.target.value})}
                                className="w-full bg-[#0A0A0A] border border-neutral-800 focus:border-indigo-500 text-white rounded p-2 text-xs font-mono"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] text-neutral-500 font-mono uppercase">End Date (To)</label>
                            <input 
                                type="date" value={filters.endDate} onChange={e => setFilters({...filters, endDate: e.target.value})}
                                className="w-full bg-[#0A0A0A] border border-neutral-800 focus:border-indigo-500 text-white rounded p-2 text-xs font-mono"
                            />
                        </div>
                    </div>
                    
                    <div className="flex justify-end gap-2 pt-2">
                        <button onClick={handleClearFilters} className="px-4 py-2 text-xs text-neutral-400 hover:text-white transition-colors">Clear</button>
                        <button onClick={handleApplyFilters} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded transition-colors">Apply Filters</button>
                    </div>
                </div>
            )}

            {/* Empty State when no data */}
            {stats && stats.metrics.totalEvents === 0 && (
                <div className="flex flex-col items-center justify-center py-16 gap-4 border border-dashed border-neutral-800 rounded-xl bg-[#0A0A0A]">
                    <Calendar size={36} className="text-neutral-700" />
                    <div className="text-center space-y-1">
                        <p className="text-white text-sm font-mono">No event data found</p>
                        <p className="text-neutral-500 text-xs font-mono">
                            {filters.includeAll
                                ? 'No events match the selected filters.'
                                : 'No past events yet. Toggle "Include All Events" in Filters to see upcoming events too.'}
                        </p>
                    </div>
                    <button
                        onClick={() => setShowFilters(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-neutral-900 hover:bg-neutral-800 text-neutral-300 text-xs font-mono rounded-lg border border-neutral-700 transition-colors"
                    >
                        <Filter size={13} /> Open Filters
                    </button>
                </div>
            )}

            {/* Top Metrics Grid */}
            {stats && stats.metrics.totalEvents > 0 && (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-[#0A0A0A] border border-neutral-900 rounded-xl p-5 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-20 h-20 bg-indigo-500/10 rounded-full blur-2xl group-hover:bg-indigo-500/20 transition-all" />
                        <Calendar size={16} className="text-indigo-400 mb-3" />
                        <p className="text-3xl font-black text-white font-mono">{stats.metrics.totalEvents}</p>
                        <p className="text-[10px] text-neutral-500 uppercase tracking-widest font-mono mt-1">Total Past Events</p>
                    </div>
                    <div className="bg-[#0A0A0A] border border-neutral-900 rounded-xl p-5 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-20 h-20 bg-cyan-500/10 rounded-full blur-2xl group-hover:bg-cyan-500/20 transition-all" />
                        <Users size={16} className="text-cyan-400 mb-3" />
                        <p className="text-3xl font-black text-white font-mono">{stats.metrics.totalParticipants}</p>
                        <p className="text-[10px] text-neutral-500 uppercase tracking-widest font-mono mt-1">Total Participants</p>
                    </div>
                    <div className="bg-[#0A0A0A] border border-neutral-900 rounded-xl p-5 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-20 h-20 bg-emerald-500/10 rounded-full blur-2xl group-hover:bg-emerald-500/20 transition-all" />
                        <Users size={16} className="text-emerald-400 mb-3" />
                        <p className="text-3xl font-black text-white font-mono">{stats.metrics.averageParticipants}</p>
                        <p className="text-[10px] text-neutral-500 uppercase tracking-widest font-mono mt-1">Avg per Event</p>
                    </div>
                    <div className="bg-[#0A0A0A] border border-neutral-900 rounded-xl p-5 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-20 h-20 bg-amber-500/10 rounded-full blur-2xl group-hover:bg-amber-500/20 transition-all" />
                        <Building2 size={16} className="text-amber-400 mb-3" />
                        <p className="text-3xl font-black text-white font-mono">{stats.metrics.uniqueSchools}</p>
                        <p className="text-[10px] text-neutral-500 uppercase tracking-widest font-mono mt-1">Unique Schools</p>
                    </div>
                </div>
            )}

            {/* Graphs Grid */}
            {stats && stats.metrics.totalEvents > 0 && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    
                    {/* 1. Monthly Trend of Events */}
                    <div className="bg-[#0A0A0A] border border-neutral-900 rounded-xl p-5">
                        <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-widest mb-6">Monthly Event Trend</h3>
                        <div className="h-64 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={stats.monthlyEventsTrend} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
                                    <XAxis dataKey="month" stroke="#4b5563" tick={{fontSize: 10, fill: '#6b7280'}} tickMargin={10} />
                                    <YAxis stroke="#4b5563" tick={{fontSize: 10, fill: '#6b7280'}} allowDecimals={false} />
                                    <Tooltip content={<CustomTooltip />} />
                                    <Line type="monotone" dataKey="count" name="Events" stroke="#818cf8" strokeWidth={3} dot={{r: 4, fill: '#818cf8', strokeWidth: 0}} activeDot={{r: 6}} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* 2. Monthly Trend of Participation */}
                    <div className="bg-[#0A0A0A] border border-neutral-900 rounded-xl p-5">
                        <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-widest mb-6">Monthly Participation Trend</h3>
                        <div className="h-64 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={stats.monthlyParticipationTrend} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
                                    <XAxis dataKey="month" stroke="#4b5563" tick={{fontSize: 10, fill: '#6b7280'}} tickMargin={10} />
                                    <YAxis stroke="#4b5563" tick={{fontSize: 10, fill: '#6b7280'}} allowDecimals={false} />
                                    <Tooltip content={<CustomTooltip />} />
                                    <Line type="monotone" dataKey="count" name="Participants" stroke="#22d3ee" strokeWidth={3} dot={{r: 4, fill: '#22d3ee', strokeWidth: 0}} activeDot={{r: 6}} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* 3. Events by Owner */}
                    <div className="bg-[#0A0A0A] border border-neutral-900 rounded-xl p-5">
                        <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-widest mb-6">Events by Owner</h3>
                        <div className="h-72 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={stats.eventsByOwner} layout="vertical" margin={{ top: 5, right: 20, left: 40, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" horizontal={false} />
                                    <XAxis type="number" stroke="#4b5563" tick={{fontSize: 10, fill: '#6b7280'}} allowDecimals={false} />
                                    <YAxis dataKey="name" type="category" stroke="#4b5563" tick={{fontSize: 10, fill: '#d1d5db'}} width={100} />
                                    <Tooltip content={<CustomTooltip />} />
                                    <Bar dataKey="count" name="Events" fill="#a78bfa" radius={[0, 4, 4, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* 4. Participation by School */}
                    <div className="bg-[#0A0A0A] border border-neutral-900 rounded-xl p-5">
                        <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-widest mb-6">Participation by School</h3>
                        <div className="h-72 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={stats.participationBySchool} margin={{ top: 5, right: 20, left: 0, bottom: 30 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
                                    <XAxis dataKey="name" stroke="#4b5563" tick={{fontSize: 10, fill: '#d1d5db'}} angle={-45} textAnchor="end" height={60} />
                                    <YAxis stroke="#4b5563" tick={{fontSize: 10, fill: '#6b7280'}} allowDecimals={false} />
                                    <Tooltip content={<CustomTooltip />} />
                                    <Bar dataKey="count" name="Participants" fill="#34d399" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* 5. Podiums by School */}
                    <div className="bg-[#0A0A0A] border border-neutral-900 rounded-xl p-5 lg:col-span-2">
                        <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-widest mb-6">Podium Positions by School</h3>
                        <div className="h-80 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={stats.podiumsBySchool} margin={{ top: 5, right: 20, left: 0, bottom: 30 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
                                    <XAxis dataKey="name" stroke="#4b5563" tick={{fontSize: 10, fill: '#d1d5db'}} angle={-25} textAnchor="end" height={60} />
                                    <YAxis stroke="#4b5563" tick={{fontSize: 10, fill: '#6b7280'}} allowDecimals={false} />
                                    <Tooltip content={<CustomTooltip />} />
                                    <Bar dataKey="count" name="Podiums Won" fill="#fbbf24" radius={[4, 4, 0, 0]} maxBarSize={60} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                </div>
            )}
            
        </div>
    );
}
