import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import API from '../services/api';
import { Calendar, MapPin, Loader2, ArrowLeft, AlertCircle, CheckCircle, Shield, Award, Users, User, Info, Plus, Trash2, Search } from 'lucide-react';

export default function EventDetailsPage() {
    const { eventId } = useParams();
    const { user } = useAuth();

    // Data states
    const [event, setEvent] = useState(null);
    const [coordinators, setCoordinators] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Registration states
    const [registering, setRegistering] = useState(false);
    const [regSuccess, setRegSuccess] = useState('');
    const [regError, setRegError] = useState('');

    // Countdown state
    const [timeLeft, setTimeLeft] = useState('');

    // Modal control
    const [showModal, setShowModal] = useState(false);

    // Group Registration modal inputs
    const [teamName, setTeamName] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [searchingStudents, setSearchingStudents] = useState(false);
    const [invitedTeammates, setInvitedTeammates] = useState([]); // list of student objects: { user_id, name, registration_id }

    const isStudent = user?.role === 'STUDENT';
    const isRegistrationClosed = event && new Date() > new Date(event.registration_end_date);

    // Fetch details on mount
    const fetchEventData = async () => {
        setLoading(true);
        setError('');
        try {
            const [detailsRes, coordRes] = await Promise.all([
                API.get(`/events/${eventId}/details`),
                API.get(`/events/${eventId}/coordinators`)
            ]);
            setEvent(detailsRes.data);
            setCoordinators(coordRes.data);
        } catch (err) {
            console.error('Error fetching event details:', err);
            setError(err.response?.data?.message || 'Error loading event workspace.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchEventData();
    }, [eventId]);

    // Ticking countdown clock logic
    useEffect(() => {
        if (!event) return;

        const targetDate = new Date(event.registration_end_date);
        const timer = setInterval(() => {
            const now = new Date();
            const difference = targetDate - now;

            if (difference <= 0) {
                setTimeLeft('Registration Closed');
                clearInterval(timer);
            } else {
                const days = Math.floor(difference / (1000 * 60 * 60 * 24));
                const hours = Math.floor((difference / (1000 * 60 * 60)) % 24);
                const minutes = Math.floor((difference / 1000 / 60) % 60);
                const seconds = Math.floor((difference / 1000) % 60);
                setTimeLeft(`${days}d ${hours}h ${minutes}m ${seconds}s`);
            }
        }, 1000);

        return () => clearInterval(timer);
    }, [event]);

    // Student directory search for teammate invites
    useEffect(() => {
        if (searchQuery.trim().length < 2) {
            setSearchResults([]);
            return;
        }

        const delayDebounce = setTimeout(async () => {
            setSearchingStudents(true);
            try {
                const res = await API.get(`/students/search`, {
                    params: { name: searchQuery }
                });
                // Exclude current user and already invited teammates
                const filtered = res.data.filter(
                    (student) =>
                        student.user_id !== user.id &&
                        !invitedTeammates.some((t) => t.user_id === student.user_id)
                );
                setSearchResults(filtered);
            } catch (err) {
                console.error('Error searching students:', err);
            } finally {
                setSearchingStudents(false);
            }
        }, 300);

        return () => clearTimeout(delayDebounce);
    }, [searchQuery, invitedTeammates]);

    // Registration submission
    const handleRegister = async (e) => {
        if (e) e.preventDefault();
        setRegError('');
        setRegSuccess('');
        setRegistering(true);

        try {
            let payload = {};
            if (event.participation_type === 'GROUP') {
                const invitedUserIds = invitedTeammates.map((member) => member.user_id);
                payload = {
                    teamName,
                    invitedUserIds
                };
            }

            const response = await API.post(`/events/${eventId}/register`, payload);
            setRegSuccess(response.data.message || 'Successfully registered for this event!');
            setShowModal(false);
            // Reset modal states
            setTeamName('');
            setInvitedTeammates([]);
            setSearchQuery('');
        } catch (err) {
            console.error('Registration error:', err);
            setRegError(err.response?.data?.message || 'Error executing event registration.');
        } finally {
            setRegistering(false);
        }
    };

    const addTeammate = (student) => {
        if (invitedTeammates.length + 1 >= event.max_team_size) {
            alert(`You can only invite a maximum of ${event.max_team_size - 1} teammates.`);
            return;
        }
        setInvitedTeammates((prev) => [...prev, student]);
        setSearchQuery('');
        setSearchResults([]);
    };

    const removeTeammate = (userId) => {
        setInvitedTeammates((prev) => prev.filter((student) => student.user_id !== userId));
    };

    if (loading) {
        return (
            <div className="flex-grow flex flex-col items-center justify-center py-20 text-neutral-600 gap-3">
                <Loader2 className="animate-spin text-cyan-400" size={32} />
                <span className="text-xs font-mono tracking-widest uppercase text-neutral-500">Retrieving details...</span>
            </div>
        );
    }

    if (error || !event) {
        return (
            <div className="max-w-3xl mx-auto px-6 py-12 space-y-6">
                <div className="p-4 rounded-lg bg-red-950/20 border border-red-900/50 text-red-400 text-sm flex gap-2 items-center">
                    <AlertCircle size={16} />
                    <span>{error || 'Event details not found.'}</span>
                </div>
                <Link to="/home" className="text-sm font-mono text-cyan-400 hover:underline flex items-center gap-1">
                    <ArrowLeft size={12} /> Return to dashboard
                </Link>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto px-6 py-10 w-full space-y-8">
            
            {/* Back button header */}
            <div className="flex items-center justify-between border-b border-neutral-900 pb-4">
                <Link to="/home" className="text-sm font-mono text-cyan-400 hover:text-cyan-300 transition-colors flex items-center gap-1.5">
                    <ArrowLeft size={14} /> Back to dashboard
                </Link>
            </div>

            {/* Notification bars */}
            {regSuccess && (
                <div className="p-4 rounded-lg bg-emerald-950/20 border border-emerald-900/50 text-emerald-400 text-sm flex items-center gap-3">
                    <CheckCircle size={18} />
                    <span>{regSuccess}</span>
                </div>
            )}
            {regError && (
                <div className="p-4 rounded-lg bg-red-950/20 border border-red-900/50 text-red-400 text-sm flex items-center gap-3">
                    <AlertCircle size={18} />
                    <span>{regError}</span>
                </div>
            )}

            {/* SPLIT COLUMN DETAILS PANELS */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
                
                {/* LEFT COLUMN: Poster & Registration Panel */}
                <div className="lg:col-span-5 space-y-6">
                    <div className="bg-[#0A0A0A] border border-neutral-900 rounded-xl overflow-hidden shadow-2xl relative">
                        <img
                            src={
                                event.poster_file_id
                                    ? `http://localhost:5000/api/public/events/poster/${event.poster_file_id}`
                                    : "https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=800&q=80"
                            }
                            alt={event.event_name}
                            className="w-full h-80 object-cover"
                        />
                        <div className="p-6 space-y-6 border-t border-neutral-900">
                            
                            {/* Metadata list */}
                            <div className="space-y-4 font-mono text-xs text-neutral-400">
                                <div className="flex items-center gap-3">
                                    <Users size={14} className="text-cyan-400 shrink-0" />
                                    <span>Type: <strong className="text-white uppercase">{event.participation_type} participation</strong></span>
                                </div>
                                {event.creator_staff_name && (
                                    <div className="flex items-center gap-3">
                                        <User size={14} className="text-violet-400 shrink-0" />
                                        <span>Created by: <strong className="text-white">{event.creator_staff_name}</strong></span>
                                    </div>
                                )}
                                <div className="flex items-center gap-3">
                                    <Calendar size={14} className="text-indigo-400 shrink-0" />
                                    <span>Registration ends: <strong className="text-white">{new Date(event.registration_end_date).toLocaleString()}</strong></span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <MapPin size={14} className="text-emerald-400 shrink-0" />
                                    <span>Venue Location: <strong className="text-white">{event.venue}</strong></span>
                                </div>
                            </div>

                            {/* Action Buttons */}
                            {isStudent ? (
                                isRegistrationClosed ? (
                                    <div className="p-3 text-center rounded bg-neutral-900 border border-neutral-850 text-neutral-500 font-mono text-xs uppercase tracking-wider font-semibold">
                                        Registration Closed
                                    </div>
                                ) : (
                                    <button
                                        onClick={() => setShowModal(true)}
                                        className="w-full bg-cyan-500 text-black hover:bg-cyan-600 transition-colors font-semibold py-3 rounded-lg text-sm flex items-center justify-center gap-2 cursor-pointer shadow-md active:scale-[0.98]"
                                    >
                                        Register for Event
                                    </button>
                                )
                            ) : (
                                <div className="p-4 rounded-lg bg-neutral-900/50 border border-neutral-950/80 text-neutral-500 text-xs flex gap-2 font-mono">
                                    <Info size={14} className="shrink-0 mt-0.5" />
                                    <span>Faculty and Staff profiles are not permitted to register as competitors for events.</span>
                                </div>
                            )}

                        </div>
                    </div>
                </div>

                {/* RIGHT COLUMN: Details description */}
                <div className="lg:col-span-7 space-y-8 bg-[#0A0A0A] border border-neutral-900 rounded-xl p-8 relative overflow-hidden">
                    
                    {/* Header typography */}
                    <div className="space-y-4">
                        <div className="flex flex-wrap gap-2 items-center">
                            <span className="px-2.5 py-0.5 rounded bg-neutral-900 border border-neutral-800 text-[10px] text-cyan-400 font-mono font-bold uppercase tracking-widest">
                                {event.category_name}
                            </span>
                            {event.series_name && (
                                <span className="px-2.5 py-0.5 rounded bg-cyan-950/20 border border-cyan-900/40 text-[10px] text-indigo-400 font-mono font-bold uppercase tracking-widest">
                                    Series: {event.series_name}
                                </span>
                            )}
                        </div>
                        <h2 className="text-3xl md:text-4xl font-light text-white tracking-tight leading-tight">
                            {event.event_name}
                        </h2>
                    </div>

                    {/* Real-time Ticking Countdown clock widget */}
                    {!isRegistrationClosed && (
                        <div className="p-4 rounded-lg bg-[#030303] border border-neutral-900 flex items-center justify-between">
                            <span className="text-xs uppercase tracking-wider text-neutral-500 font-bold font-mono">Closing In</span>
                            <span className="text-base font-black font-mono text-cyan-400 tracking-wide animate-pulse">
                                {timeLeft}
                            </span>
                        </div>
                    )}

                    {/* Descriptions */}
                    <div className="space-y-4 leading-relaxed font-light text-neutral-300">
                        <h3 className="text-sm font-semibold uppercase tracking-widest text-neutral-400 font-mono">Event Overview</h3>
                        <p className="text-sm">{event.short_description}</p>
                        {event.detailed_description && (
                            <div className="text-sm text-neutral-400 border-t border-neutral-900/60 pt-4 space-y-2">
                                <h3 className="text-sm font-semibold uppercase tracking-widest text-neutral-500 font-mono">Detailed Rulebook</h3>
                                <p>{event.detailed_description}</p>
                            </div>
                        )}
                    </div>

                    {/* Assigned Coordinator contact cards */}
                    {coordinators.length > 0 && (
                        <div className="space-y-4 border-t border-neutral-900/60 pt-6">
                            <h3 className="text-sm font-semibold uppercase tracking-widest text-neutral-400 font-mono">Coordinators Panel</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {coordinators.map((coord) => (
                                    <div key={coord.id} className="p-3 bg-[#030303] border border-neutral-900 rounded-lg text-xs space-y-1">
                                        <p className="font-semibold text-white">{coord.name}</p>
                                        <p className="text-neutral-500 font-mono">{coord.email}</p>
                                        <p className="text-[10px] text-cyan-500 uppercase font-mono tracking-wider pt-1">{coord.coordinator_type.replace('_', ' ')}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                </div>

            </div>

            {/* CONFIRMATION / TEAM REGISTRATION MODAL PANEL */}
            {showModal && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
                    <div className="bg-[#0A0A0A] border border-neutral-900 rounded-xl w-full max-w-lg p-8 relative space-y-6">
                        
                        <div className="flex justify-between items-start">
                            <div>
                                <h3 className="text-xl font-bold text-white tracking-tight">Event Registration</h3>
                                <p className="text-neutral-500 text-xs font-mono uppercase tracking-widest mt-1">
                                    {event.participation_type} Enrollment
                                </p>
                            </div>
                            <button
                                onClick={() => setShowModal(false)}
                                className="text-neutral-500 hover:text-white transition-colors cursor-pointer font-mono"
                            >
                                [X]
                            </button>
                        </div>

                        {event.participation_type === 'INDIVIDUAL' ? (
                            // INDIVIDUAL REGISTRATION FLOW
                            <div className="space-y-6">
                                <p className="text-sm text-neutral-300 leading-relaxed">
                                    Are you sure you want to register for <strong className="text-white">{event.event_name}</strong>? Your profile information (name, registration number, department) will be submitted to the event coordinators.
                                </p>
                                <div className="flex gap-4">
                                    <button
                                        onClick={handleRegister}
                                        disabled={registering}
                                        className="flex-1 bg-cyan-500 hover:bg-cyan-600 disabled:opacity-50 text-black font-semibold py-3 rounded-lg text-sm flex items-center justify-center gap-2 cursor-pointer transition-colors"
                                    >
                                        {registering && <Loader2 size={16} className="animate-spin" />}
                                        <span>Confirm Registration</span>
                                    </button>
                                    <button
                                        onClick={() => setShowModal(false)}
                                        className="flex-1 bg-neutral-900 border border-neutral-800 hover:bg-neutral-800 text-neutral-400 font-semibold py-3 rounded-lg text-sm cursor-pointer transition-colors"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        ) : (
                            // GROUP/TEAM REGISTRATION FLOW
                            <form onSubmit={handleRegister} className="space-y-5">
                                
                                {/* Team Name */}
                                <div className="space-y-2">
                                    <label className="block text-xs uppercase tracking-widest text-neutral-400 font-mono font-semibold">
                                        Team Name
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={teamName}
                                        onChange={(e) => setTeamName(e.target.value)}
                                        placeholder="Enter team name..."
                                        className="w-full bg-[#030303] border border-neutral-800 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 text-white rounded-lg px-4 py-2.5 text-sm transition-all outline-none font-mono"
                                    />
                                </div>

                                {/* Teammates Selection */}
                                <div className="space-y-3">
                                    <div className="flex justify-between items-center text-xs uppercase tracking-widest text-neutral-400 font-mono font-semibold">
                                        <span>Invited Teammates ({invitedTeammates.length + 1} / {event.max_team_size})</span>
                                        <span className="text-[10px] text-cyan-500 lowercase font-light">Req: {event.min_team_size} - {event.max_team_size} members</span>
                                    </div>

                                    {/* Selected Team Members List */}
                                    <div className="space-y-2">
                                        {/* Creator (Current User) */}
                                        <div className="p-3 bg-[#030303] border border-neutral-900 rounded-lg flex items-center justify-between text-xs font-mono">
                                            <div>
                                                <p className="text-white font-semibold">{user.name} (You)</p>
                                                <p className="text-neutral-500 text-[10px]">{user.email}</p>
                                            </div>
                                            <span className="text-[9px] bg-cyan-950/40 border border-cyan-900/50 text-cyan-400 px-2 py-0.5 rounded uppercase font-bold tracking-wider">Creator</span>
                                        </div>

                                        {/* Invited members */}
                                        {invitedTeammates.map((teammate) => (
                                            <div key={teammate.user_id} className="p-3 bg-[#030303] border border-neutral-900 rounded-lg flex items-center justify-between text-xs font-mono">
                                                <div>
                                                    <p className="text-white font-semibold">{teammate.name}</p>
                                                    <p className="text-neutral-500 text-[10px]">{teammate.registration_id} | {teammate.email}</p>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => removeTeammate(teammate.user_id)}
                                                    className="text-red-400 hover:text-red-300 transition-colors p-1 cursor-pointer"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Teammate Search Input Box (only shown if team is below max size) */}
                                    {invitedTeammates.length + 1 < event.max_team_size && (
                                        <div className="relative pt-2">
                                            <div className="relative">
                                                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-neutral-500">
                                                    <Search size={14} />
                                                </span>
                                                <input
                                                    type="text"
                                                    value={searchQuery}
                                                    onChange={(e) => setSearchQuery(e.target.value)}
                                                    placeholder="Search teammates by name..."
                                                    className="w-full bg-[#030303] border border-neutral-800 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 text-white rounded-lg pl-9 pr-4 py-2 text-xs transition-all outline-none font-mono"
                                                />
                                                {searchingStudents && (
                                                    <span className="absolute inset-y-0 right-0 pr-3 flex items-center text-cyan-400">
                                                        <Loader2 size={12} className="animate-spin" />
                                                    </span>
                                                )}
                                            </div>

                                            {/* Teammate Lookup Results Dropdown */}
                                            {searchResults.length > 0 && (
                                                <div className="absolute left-0 right-0 mt-1 bg-[#0A0A0A] border border-neutral-800 rounded-lg shadow-xl overflow-hidden max-h-48 overflow-y-auto z-55">
                                                    {searchResults.map((student) => (
                                                        <div
                                                            key={student.user_id}
                                                            onClick={() => addTeammate(student)}
                                                            className="p-3 hover:bg-neutral-900 border-b border-neutral-900 last:border-0 cursor-pointer transition-colors flex items-center justify-between text-xs font-mono"
                                                        >
                                                            <div>
                                                                <p className="text-white font-semibold">{student.name}</p>
                                                                <p className="text-neutral-500 text-[10px]">{student.registration_id} | {student.school_name}</p>
                                                            </div>
                                                            <Plus size={14} className="text-cyan-400" />
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                <div className="flex gap-4 pt-4 border-t border-neutral-900/60">
                                    <button
                                        type="submit"
                                        disabled={registering || (invitedTeammates.length + 1 < event.min_team_size)}
                                        className="flex-grow bg-cyan-500 hover:bg-cyan-600 disabled:opacity-50 text-black font-semibold py-3 rounded-lg text-sm flex items-center justify-center gap-2 cursor-pointer transition-colors"
                                    >
                                        {registering && <Loader2 size={16} className="animate-spin" />}
                                        <span>Initialize Team & Register</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setShowModal(false)}
                                        className="bg-neutral-900 border border-neutral-800 hover:bg-neutral-800 text-neutral-400 font-semibold py-3 px-6 rounded-lg text-sm cursor-pointer transition-colors"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </form>
                        )}

                    </div>
                </div>
            )}

        </div>
    );
}
