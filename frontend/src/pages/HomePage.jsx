import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import API from '../services/api';
import { Search, Calendar, MapPin, Loader2, Mail, Shield, AlertCircle, Check, X, Bookmark } from 'lucide-react';

export default function HomePage() {
    const { user } = useAuth();
    const navigate = useNavigate();

    // Data lists
    const [categories, setCategories] = useState([]);
    const [pendingInvites, setPendingInvites] = useState([]);
    const [loading, setLoading] = useState(true);
    const [inviteLoadingMap, setInviteLoadingMap] = useState({}); // { [teamId]: boolean }

    // Search and filter states
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('ALL');
    const [selectedCategoryType, setSelectedCategoryType] = useState('ALL');

    const isStudent = user?.role === 'STUDENT';

    // Fetch categorized events and pending invites
    const fetchDashboardData = async () => {
        setLoading(true);
        try {
            // Load categorized events
            const catResponse = await API.get('/events/home/categorized');
            setCategories(catResponse.data);

            // Load pending invites if student
            if (isStudent) {
                const inviteResponse = await API.get('/teams/invitations/pending');
                setPendingInvites(inviteResponse.data);
            }
        } catch (err) {
            console.error('Error loading dashboard data:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDashboardData();
    }, [user]);

    // Invite actions
    const handleInvitation = async (teamId, responseType) => {
        setInviteLoadingMap((prev) => ({ ...prev, [teamId]: true }));
        try {
            await API.patch(`/teams/${teamId}/members/respond`, { response: responseType });
            // Refresh list
            const inviteResponse = await API.get('/teams/invitations/pending');
            setPendingInvites(inviteResponse.data);
        } catch (err) {
            console.error('Error responding to invitation:', err);
            alert(err.message || 'Error processing response.');
        } finally {
            setInviteLoadingMap((prev) => ({ ...prev, [teamId]: false }));
        }
    };

    // Client-side category types list extraction
    const categoryTypes = ['ALL', ...new Set(categories.map((c) => c.category_type).filter(Boolean))];

    // Search & Filter computation
    const filteredCategories = categories
        .map((cat) => {
            // Filter events inside this category
            const filteredEvents = (cat.events || []).filter((event) => {
                const matchesSearch =
                    searchTerm.trim() === '' ||
                    event.event_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    (event.series_name && event.series_name.toLowerCase().includes(searchTerm.toLowerCase()));

                const matchesCategoryType =
                    selectedCategoryType === 'ALL' || cat.category_type === selectedCategoryType;

                return matchesSearch && matchesCategoryType;
            });

            return {
                ...cat,
                events: filteredEvents,
            };
        })
        // Filter out categories that have no matching events or do not match selected category
        .filter((cat) => {
            const matchesCategorySelect = selectedCategory === 'ALL' || cat.category_id === selectedCategory;
            return matchesCategorySelect && cat.events.length > 0;
        });

    return (
        <div className="max-w-7xl mx-auto px-6 py-10 w-full space-y-12">

            {/* WELCOME BANNER PANEL */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 bg-[#0A0A0A] border border-neutral-900 rounded-xl p-8 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />
                <div className="space-y-2 relative z-10">
                    <h1 className="text-3xl font-light tracking-tight text-white leading-tight">
                        Find your Target and Lock On
                    </h1>
                    <p className="text-neutral-400 text-sm font-light">
                        Logged in as <span className="text-cyan-400 font-mono font-medium">{user?.name}</span> ({user?.role})
                    </p>
                </div>
                <div className="flex items-center gap-3 relative z-10 shrink-0 font-mono text-xs">
                    <span className="px-3 py-1.5 rounded-lg bg-neutral-900 border border-neutral-800 text-neutral-400 flex items-center gap-1.5">
                        <Shield size={13} className="text-indigo-400" /> Role: {user?.role}
                    </span>
                </div>
            </div>

            {/* STUDENT ONLY: PENDING INVITATIONS WIDGET */}
            {isStudent && pendingInvites.length > 0 && (
                <div className="space-y-4">
                    <div className="flex items-center gap-2 border-b border-neutral-900 pb-2">
                        <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                        <h2 className="text-lg font-mono uppercase tracking-widest text-neutral-400 font-bold">
                            Pending Team Invitations
                        </h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {pendingInvites.map((invite) => (
                            <div
                                key={invite.team_id}
                                className="bg-[#0A0A0A] border border-neutral-900 hover:border-cyan-950 transition-all rounded-xl p-5 space-y-4 flex flex-col justify-between"
                            >
                                <div className="space-y-2">
                                    <div className="flex justify-between items-start">
                                        <span className="text-[10px] bg-cyan-950/30 border border-cyan-900/50 text-cyan-400 px-2 py-0.5 rounded font-mono font-bold uppercase tracking-wider">
                                            Team Invitation
                                        </span>
                                    </div>
                                    <h3 className="text-base font-bold text-white tracking-tight">{invite.event_name}</h3>
                                    <div className="text-xs text-neutral-400 space-y-1 font-light">
                                        <p>Team: <span className="text-white font-mono font-semibold">{invite.team_name}</span></p>
                                        <p>Invited by: <span className="text-white font-mono font-semibold">{invite.inviter_name}</span></p>
                                    </div>
                                </div>

                                <div className="flex gap-3 pt-2">
                                    <button
                                        onClick={() => handleInvitation(invite.team_id, 'ACCEPT')}
                                        disabled={inviteLoadingMap[invite.team_id]}
                                        className="flex-1 bg-cyan-500 hover:bg-cyan-600 disabled:opacity-50 text-black font-semibold text-xs py-2 rounded flex items-center justify-center gap-1 cursor-pointer transition-colors"
                                    >
                                        {inviteLoadingMap[invite.team_id] ? (
                                            <Loader2 size={12} className="animate-spin" />
                                        ) : (
                                            <Check size={12} />
                                        )}
                                        <span>Accept</span>
                                    </button>
                                    <button
                                        onClick={() => handleInvitation(invite.team_id, 'REJECT')}
                                        disabled={inviteLoadingMap[invite.team_id]}
                                        className="flex-1 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 disabled:opacity-50 text-red-400 hover:text-red-300 font-semibold text-xs py-2 rounded flex items-center justify-center gap-1 cursor-pointer transition-colors"
                                    >
                                        {inviteLoadingMap[invite.team_id] ? (
                                            <Loader2 size={12} className="animate-spin" />
                                        ) : (
                                            <X size={12} />
                                        )}
                                        <span>Decline</span>
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* TOP STICKY SEARCH & FILTER CONTROL PANEL */}
            <div className="bg-[#0A0A0A] border border-neutral-900 rounded-xl p-6 relative z-30">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">

                    {/* Text Search Input (Name/Series) */}
                    <div className="md:col-span-6 relative">
                        <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-neutral-500">
                            <Search size={16} />
                        </span>
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Search by event title or series name..."
                            className="w-full bg-[#030303] border border-neutral-800 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 text-white rounded-lg pl-10 pr-4 py-2.5 text-sm transition-all outline-none placeholder:text-neutral-700 font-mono"
                        />
                    </div>

                    {/* Category Dropdown Select */}
                    <div className="md:col-span-3">
                        <select
                            value={selectedCategory}
                            onChange={(e) => setSelectedCategory(e.target.value)}
                            className="w-full bg-[#030303] border border-neutral-800 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 text-white rounded-lg px-3 py-2.5 text-sm transition-all outline-none font-mono"
                        >
                            <option value="ALL">All Categories</option>
                            {categories.map((cat) => (
                                <option key={cat.category_id} value={cat.category_id}>
                                    {cat.category_name}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Category Type Dropdown Select */}
                    <div className="md:col-span-3">
                        <select
                            value={selectedCategoryType}
                            onChange={(e) => setSelectedCategoryType(e.target.value)}
                            className="w-full bg-[#030303] border border-neutral-800 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 text-white rounded-lg px-3 py-2.5 text-sm transition-all outline-none font-mono"
                        >
                            <option value="ALL">All Category Types</option>
                            {categoryTypes.filter((t) => t !== 'ALL').map((type) => (
                                <option key={type} value={type}>
                                    {type}
                                </option>
                            ))}
                        </select>
                    </div>

                </div>
            </div>

            {/* EVENT CAROUSEL ROWS */}
            {loading ? (
                <div className="flex flex-col items-center justify-center py-20 text-neutral-600 gap-3">
                    <Loader2 className="animate-spin text-cyan-400" size={32} />
                    <span className="text-xs font-mono tracking-widest uppercase text-neutral-500">Syncing Campus Feed...</span>
                </div>
            ) : filteredCategories.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-neutral-500 text-center space-y-3 bg-[#0A0A0A] border border-neutral-900 rounded-xl">
                    <Calendar size={36} className="text-neutral-800" />
                    <p className="text-sm font-medium text-neutral-300 font-mono">No matching live events discovered</p>
                    <p className="text-xs text-neutral-600 font-light max-w-xs leading-relaxed">Adjust your search strings or dropdown categories to expose scheduled campus fests.</p>
                </div>
            ) : (
                <div className="space-y-12">
                    {filteredCategories.map((cat) => (
                        <div key={cat.category_id} className="space-y-4">

                            {/* Category Header */}
                            <div className="flex items-center justify-between border-b border-neutral-900 pb-2">
                                <div className="flex items-center gap-3">
                                    <h2 className="text-xl font-bold tracking-tight text-white">{cat.category_name}</h2>
                                    <span className="px-2 py-0.5 rounded bg-neutral-900 border border-neutral-800 text-[10px] text-indigo-400 font-mono font-bold uppercase tracking-widest">
                                        {cat.category_type}
                                    </span>
                                </div>
                                <span className="text-xs text-neutral-500 font-mono">{cat.events.length} Upcoming</span>
                            </div>

                            {/* Horizontal Swipe/Scroll List of Event Cards */}
                            <div className="flex overflow-x-auto gap-6 pb-4 scrollbar-thin select-none snap-x">
                                {cat.events.map((event) => (
                                    <div
                                        key={event.id}
                                        onClick={() => navigate(`/events/${event.id}`)}
                                        className="shrink-0 w-80 bg-[#0A0A0A] border border-neutral-900 hover:border-cyan-900/50 hover:shadow-cyan-950/20 hover:scale-[1.02] active:scale-[0.99] transition-all duration-300 rounded-xl overflow-hidden cursor-pointer flex flex-col justify-between snap-start group"
                                    >
                                        {/* Banner Poster frame */}
                                        <div className="h-44 relative bg-neutral-900 overflow-hidden">
                                            <img
                                                src={
                                                    event.poster_file_id
                                                        ? `http://localhost:5000/api/public/events/poster/${event.poster_file_id}`
                                                        : "https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=800&q=80"
                                                }
                                                alt={event.event_name}
                                                className="absolute inset-0 w-full h-full object-cover opacity-90 transition-transform duration-500 group-hover:scale-105"
                                            />
                                            <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0A] to-transparent" />
                                            {event.series_name && (
                                                <span className="absolute top-3 left-3 px-2 py-0.5 rounded bg-[#030303]/90 border border-neutral-800 text-[9px] text-cyan-400 font-mono font-bold uppercase tracking-widest">
                                                    <Bookmark size={8} className="inline mr-1 -mt-0.5" /> {event.series_name}
                                                </span>
                                            )}
                                        </div>

                                        {/* Card content info */}
                                        <div className="p-5 space-y-4 flex-grow flex flex-col justify-between">
                                            <div className="space-y-2">
                                                <span className="px-2 py-0.5 rounded bg-neutral-900 border border-neutral-800 text-cyan-400 text-[9px] font-mono tracking-wider font-bold uppercase">
                                                    {event.participation_type}
                                                </span>
                                                <h3 className="text-base font-bold text-white tracking-tight line-clamp-1 group-hover:text-cyan-400 transition-colors">
                                                    {event.event_name}
                                                </h3>
                                                <p className="text-neutral-500 text-xs leading-relaxed font-light line-clamp-2">
                                                    {event.short_description || "Explore details and rules inside."}
                                                </p>
                                            </div>

                                            {/* Details tags */}
                                            <div className="border-t border-neutral-900/60 pt-3 flex items-center justify-between text-[11px] text-neutral-500 font-mono">
                                                <div className="flex items-center gap-1">
                                                    <Calendar size={11} className="text-cyan-500" />
                                                    <span>
                                                        {new Date(event.event_start_date).toLocaleDateString(undefined, {
                                                            month: 'short',
                                                            day: 'numeric'
                                                        })}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <MapPin size={11} className="text-indigo-400" />
                                                    <span className="line-clamp-1 max-w-[120px]">{event.venue || 'Campus'}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                        </div>
                    ))}
                </div>
            )}

        </div>
    );
}
