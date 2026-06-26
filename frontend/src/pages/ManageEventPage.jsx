import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import API from '../services/api';
import { Calendar, MapPin, Loader2, AlertCircle, Plus, Search, X, Upload, FileText, Trophy } from 'lucide-react';

const inputCls = 'w-full bg-[#0A0A0A] border border-neutral-800 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 text-white rounded-lg px-3 py-2 text-xs transition-all outline-none font-mono';
const labelCls = 'block text-[10px] uppercase tracking-widest text-neutral-400 font-mono font-semibold mb-1';

export default function ManageEventPage() {
    const { user } = useAuth();
    const navigate = useNavigate();

    // Data lists
    const [createdEvents, setCreatedEvents] = useState([]);
    const [coordinatingEvents, setCoordinatingEvents] = useState([]);
    const [seriesList, setSeriesList] = useState([]);
    const [categories, setCategories] = useState([]);
    const [owners, setOwners] = useState([]);
    const [staffList, setStaffList] = useState([]);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Modal Control
    const [showModal, setShowModal] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState('');

    // Form inputs (Mandatory fields highlighted)
    const [eventName, setEventName] = useState('');
    const [selectedSeriesId, setSelectedSeriesId] = useState('');
    const [createNewSeries, setCreateNewSeries] = useState(false);
    const [newSeriesName, setNewSeriesName] = useState('');

    // Coordinators selection
    const [selectedFacultyIds, setSelectedFacultyIds] = useState([]); // List of staff user IDs
    const [studentCoordinators, setStudentCoordinators] = useState([]); // List of student objects: { user_id, name, registration_id }
    
    // Search students for coordinators
    const [studentQuery, setStudentQuery] = useState('');
    const [studentResults, setStudentResults] = useState([]);
    const [searchingStudents, setSearchingStudents] = useState(false);

    // Optional fields (pre-populated with defaults)
    const [selectedCategoryId, setSelectedCategoryId] = useState('');
    const [selectedOwnerId, setSelectedOwnerId] = useState('');
    const [participationType, setParticipationType] = useState('INDIVIDUAL');
    const [venue, setVenue] = useState('Campus Arena');
    const [shortDescription, setShortDescription] = useState('');
    const [detailedDescription, setDetailedDescription] = useState('');
    const [participantCap, setParticipantCap] = useState(100);
    const [minTeamSize, setMinTeamSize] = useState(2);
    const [maxTeamSize, setMaxTeamSize] = useState(4);
    const [resultPositions, setResultPositions] = useState(3);
    const [registrationStartDate, setRegistrationStartDate] = useState('');
    const [registrationEndDate, setRegistrationEndDate] = useState('');
    const [eventStartDate, setEventStartDate] = useState('');
    const [eventEndDate, setEventEndDate] = useState('');

    // File upload state
    const [posterFile, setPosterFile] = useState(null);
    const [posterPreview, setPosterPreview] = useState(null);
    const [posterUploading, setPosterUploading] = useState(false);
    const [posterFileId, setPosterFileId] = useState(null);
    const [pdfFile, setPdfFile] = useState(null);
    const [pdfUploading, setPdfUploading] = useState(false);
    const [pdfFileId, setPdfFileId] = useState(null);
    const posterInputRef = useRef(null);
    const pdfInputRef = useRef(null);

    // Fetch dashboard data on mount — split into two independent calls so a 403
    // on the staff dashboard doesn't prevent the modal dropdown data from loading.
    const fetchDashboardData = async () => {
        setLoading(true);
        setError('');

        // Set default dates regardless of API results
        const now = new Date();
        const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
        const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        setRegistrationStartDate(now.toISOString().slice(0, 16));
        setRegistrationEndDate(tomorrow.toISOString().slice(0, 16));
        setEventStartDate(tomorrow.toISOString().slice(0, 16));
        setEventEndDate(nextWeek.toISOString().slice(0, 16));

        // 1. Load dropdown data (series, categories, owners, staff) — needed for the modal
        try {
            const [seriesRes, catRes, ownerRes, staffRes] = await Promise.all([
                API.get('/event-series'),
                API.get('/event-categories'),
                API.get('/owners'),
                API.get('/auth/staff')
            ]);

            const seriesData = seriesRes.data || [];
            const catData = catRes.data || [];
            const ownerData = ownerRes.data || [];

            setSeriesList(seriesData);
            setCategories(catData);
            setOwners(ownerData);
            setStaffList(staffRes.data || []);

            // Set initial dropdown defaults
            if (seriesData.length > 0) setSelectedSeriesId(seriesData[0].id);
            if (catData.length > 0) setSelectedCategoryId(catData[0].id);
            if (ownerData.length > 0) setSelectedOwnerId(ownerData[0].id);
        } catch (err) {
            console.error('Error fetching dropdown data:', err);
            // Non-fatal: modal will show empty dropdowns, user can still see event lists
        }

        // 2. Load staff dashboard events — 403 here means user has wrong role
        try {
            const dashRes = await API.get('/events/staff/dashboard');
            setCreatedEvents(dashRes.data.createdEvents || []);
            setCoordinatingEvents(dashRes.data.coordinatingEvents || []);
        } catch (err) {
            console.error('Error fetching dashboard events:', err);
            const status = err.response?.status;
            if (status === 403) {
                setError('Access denied: Only Staff accounts can view the event dashboard.');
            } else {
                setError('Failed to load event dashboard data. Please refresh the page.');
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDashboardData();
    }, []);

    // Search students lookup
    useEffect(() => {
        if (studentQuery.trim().length < 2) {
            setStudentResults([]);
            return;
        }

        const delayDebounce = setTimeout(async () => {
            setSearchingStudents(true);
            try {
                const res = await API.get('/students/search', {
                    params: { name: studentQuery }
                });
                const filtered = res.data.filter(
                    (student) => !studentCoordinators.some((c) => c.user_id === student.user_id)
                );
                setStudentResults(filtered);
            } catch (err) {
                console.error('Error searching students:', err);
            } finally {
                setSearchingStudents(false);
            }
        }, 300);

        return () => clearTimeout(delayDebounce);
    }, [studentQuery, studentCoordinators]);

    // File upload handlers
    const handlePosterChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setPosterFile(file);
        setPosterFileId(null);
        const reader = new FileReader();
        reader.onload = (ev) => setPosterPreview(ev.target.result);
        reader.readAsDataURL(file);
        setPosterUploading(true);
        try {
            const formData = new FormData();
            formData.append('file', file);
            const res = await API.post('/files/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
            setPosterFileId(res.data.file.id);
        } catch (err) {
            console.error('Poster upload error:', err);
            setSubmitError('Poster image upload failed. Please try again.');
        } finally {
            setPosterUploading(false);
        }
    };

    const handlePdfChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setPdfFile(file);
        setPdfFileId(null);
        setPdfUploading(true);
        try {
            const formData = new FormData();
            formData.append('file', file);
            const res = await API.post('/files/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
            setPdfFileId(res.data.file.id);
        } catch (err) {
            console.error('PDF upload error:', err);
            setSubmitError('Details PDF upload failed. Please try again.');
        } finally {
            setPdfUploading(false);
        }
    };

    // Handle creation submit
    const handleCreateEvent = async (e) => {
        e.preventDefault();
        setSubmitError('');
        setSubmitting(true);

        try {
            let finalSeriesId = selectedSeriesId;

            // 1. Validate required fields before sending
            if (!createNewSeries && !finalSeriesId) {
                throw new Error('Please select an event series or create a new one.');
            }
            if (!selectedCategoryId) {
                throw new Error('Please select an event category.');
            }
            if (!selectedOwnerId) {
                throw new Error('Please select an organizing body.');
            }
            if ((posterFile && !posterFileId) || (pdfFile && !pdfFileId)) {
                throw new Error('File upload is still in progress. Please wait a moment.');
            }

            // 2. Create series first if user chose to create a new one
            if (createNewSeries) {
                if (!newSeriesName.trim()) {
                    throw new Error('Please enter a new event series name.');
                }
                const newSeriesResponse = await API.post('/event-series', {
                    seriesName: newSeriesName.trim()
                });
                finalSeriesId = newSeriesResponse.data.series.id;
            }

            // 3. Format coordinator list
            const initialCoordinators = [
                // Faculty coordinators
                ...selectedFacultyIds.map((id) => ({
                    userId: id,
                    type: 'Faculty_Coordinator'
                })),
                // Student coordinators
                ...studentCoordinators.map((c) => ({
                    userId: c.user_id,
                    type: 'Student_Coordinator'
                }))
            ];

            if (initialCoordinators.length === 0) {
                throw new Error('At least one Faculty or Student Coordinator is required.');
            }

            // 4. Assemble full event payload
            const payload = {
                eventSeriesId: finalSeriesId,
                eventName,
                ownerId: selectedOwnerId,
                eventCategoryId: selectedCategoryId,
                participationType,
                venue,
                shortDescription,
                detailedDescription,
                participantCap,
                minTeamSize: participationType === 'GROUP' ? minTeamSize : null,
                maxTeamSize: participationType === 'GROUP' ? maxTeamSize : null,
                resultPositions,
                registrationStartDate,
                registrationEndDate,
                eventStartDate,
                eventEndDate,
                posterFileId: posterFileId || null,
                detailsPdfFileId: pdfFileId || null,
                initialCoordinators
            };

            await API.post('/events', payload);
            
            // Success reset
            setShowModal(false);
            setEventName('');
            setNewSeriesName('');
            setCreateNewSeries(false);
            setSelectedFacultyIds([]);
            setStudentCoordinators([]);
            setPosterFile(null); setPosterPreview(null); setPosterFileId(null);
            setPdfFile(null); setPdfFileId(null); setSubmitError('');
            fetchDashboardData(); // Refresh list

        } catch (err) {
            console.error('Create event error:', err);
            // Handle express-validator array errors from backend
            const backendErrors = err.response?.data?.errors;
            if (backendErrors && Array.isArray(backendErrors)) {
                setSubmitError(backendErrors.map(e => e.msg).join(' | '));
            } else {
                setSubmitError(err.response?.data?.message || err.message || 'Error creating event.');
            }
        } finally {
            setSubmitting(false);
        }
    };

    const toggleFaculty = (id) => {
        setSelectedFacultyIds((prev) =>
            prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
        );
    };

    const addStudentCoord = (student) => {
        setStudentCoordinators((prev) => [...prev, student]);
        setStudentQuery('');
        setStudentResults([]);
    };

    const removeStudentCoord = (userId) => {
        setStudentCoordinators((prev) => prev.filter((c) => c.user_id !== userId));
    };

    return (
        <div className="max-w-7xl mx-auto px-6 py-10 w-full space-y-12">
            
            {/* WORKSPACE HEADER BAR */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 border-b border-neutral-900 pb-6">
                <div>
                    <h1 className="text-3xl font-light tracking-tight text-white">
                        Events Workspace Manager
                    </h1>
                    <p className="text-neutral-500 text-xs mt-1 uppercase tracking-widest font-mono">
                        Staff administration terminal
                    </p>
                </div>
                <button
                    onClick={() => setShowModal(true)}
                    className="bg-cyan-500 text-black hover:bg-cyan-600 transition-colors font-semibold py-3 px-6 rounded-lg text-xs font-mono uppercase tracking-wider flex items-center gap-2 cursor-pointer shadow-md"
                >
                    <Plus size={14} /> Establish New Event
                </button>
            </div>

            {error && (
                <div className="p-4 rounded-lg bg-red-950/20 border border-red-900/50 flex items-center gap-3 text-red-400 text-sm">
                    <AlertCircle size={16} />
                    <span>{error}</span>
                </div>
            )}

            {loading ? (
                <div className="flex flex-col items-center justify-center py-20 text-neutral-600 gap-3">
                    <Loader2 className="animate-spin text-cyan-400" size={32} />
                    <span className="text-xs font-mono tracking-widest uppercase text-neutral-500">Stitching Event Grids...</span>
                </div>
            ) : (
                <div className="space-y-12">
                    
                    {/* SECTION 1: EVENTS CREATED BY USER */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 border-b border-neutral-900 pb-2">
                            <span className="w-2 h-2 rounded-full bg-cyan-400" />
                            <h2 className="text-lg font-mono uppercase tracking-widest text-neutral-400 font-bold">
                                Events Created by You
                            </h2>
                        </div>
                        {createdEvents.length === 0 ? (
                            <p className="text-neutral-500 text-xs font-mono py-4">You have not established any events yet.</p>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {createdEvents.map((event) => (
                                    <div
                                        key={event.id}
                                        onClick={() => navigate(`/manage-event/${event.id}`)}
                                        className="bg-[#0A0A0A] border border-neutral-900 hover:border-cyan-900/40 hover:scale-[1.02] active:scale-[0.99] transition-all duration-300 rounded-xl p-5 flex flex-col justify-between cursor-pointer group"
                                    >
                                        <div className="space-y-3">
                                            <div className="flex items-center justify-between">
                                                <span className="px-2 py-0.5 rounded bg-neutral-900 border border-neutral-800 text-[10px] text-cyan-400 font-mono font-bold uppercase tracking-widest">
                                                    {event.category_name || 'Category'}
                                                </span>
                                                <span className={`text-[10px] font-mono px-2 py-0.5 rounded uppercase font-bold tracking-wider ${
                                                    event.event_status === 'ACTIVE' ? 'bg-emerald-950/30 border border-emerald-900/40 text-emerald-400' : 'bg-neutral-900 border border-neutral-800 text-neutral-500'
                                                }`}>
                                                    {event.event_status}
                                                </span>
                                            </div>
                                            <h3 className="text-base font-bold text-white tracking-tight group-hover:text-cyan-400 transition-colors line-clamp-1">
                                                {event.event_name}
                                            </h3>
                                            <p className="text-neutral-500 text-[10px] font-mono uppercase tracking-widest leading-none">Series: {event.series_name || 'None'}</p>
                                        </div>
                                        <div className="border-t border-neutral-900/60 pt-4 mt-4 flex items-center justify-between text-xs text-neutral-500 font-mono">
                                            <div className="flex items-center gap-1">
                                                <Calendar size={11} className="text-cyan-400" />
                                                <span>{new Date(event.event_start_date).toLocaleDateString()}</span>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <MapPin size={11} className="text-indigo-400" />
                                                <span className="line-clamp-1 max-w-[120px]">{event.venue}</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* SECTION 2: EVENTS WHERE USER IS COORDINATOR */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 border-b border-neutral-900 pb-2">
                            <span className="w-2 h-2 rounded-full bg-indigo-400" />
                            <h2 className="text-lg font-mono uppercase tracking-widest text-neutral-400 font-bold">
                                Events You Coordinate
                            </h2>
                        </div>
                        {coordinatingEvents.length === 0 ? (
                            <p className="text-neutral-500 text-xs font-mono py-4">You are not designated as a coordinator for any active events.</p>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {coordinatingEvents.map((event) => (
                                    <div
                                        key={event.id}
                                        onClick={() => navigate(`/manage-event/${event.id}`)}
                                        className="bg-[#0A0A0A] border border-neutral-900 hover:border-cyan-900/40 hover:scale-[1.02] active:scale-[0.99] transition-all duration-300 rounded-xl p-5 flex flex-col justify-between cursor-pointer group"
                                    >
                                        <div className="space-y-3">
                                            <div className="flex items-center justify-between">
                                                <span className="px-2 py-0.5 rounded bg-neutral-900 border border-neutral-800 text-[10px] text-cyan-400 font-mono font-bold uppercase tracking-widest">
                                                    {event.category_name || 'Category'}
                                                </span>
                                                <span className={`text-[10px] font-mono px-2 py-0.5 rounded uppercase font-bold tracking-wider ${
                                                    event.event_status === 'ACTIVE' ? 'bg-emerald-950/30 border border-emerald-900/40 text-emerald-400' : 'bg-neutral-900 border border-neutral-800 text-neutral-500'
                                                }`}>
                                                    {event.event_status}
                                                </span>
                                            </div>
                                            <h3 className="text-base font-bold text-white tracking-tight group-hover:text-cyan-400 transition-colors line-clamp-1">
                                                {event.event_name}
                                            </h3>
                                            <p className="text-neutral-500 text-[10px] font-mono uppercase tracking-widest leading-none">Series: {event.series_name || 'None'}</p>
                                        </div>
                                        <div className="border-t border-neutral-900/60 pt-4 mt-4 flex items-center justify-between text-xs text-neutral-500 font-mono">
                                            <div className="flex items-center gap-1">
                                                <Calendar size={11} className="text-cyan-400" />
                                                <span>{new Date(event.event_start_date).toLocaleDateString()}</span>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <MapPin size={11} className="text-indigo-400" />
                                                <span className="line-clamp-1 max-w-[120px]">{event.venue}</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                </div>
            )}

            {/* CREATE EVENT MODAL DIALOG */}
            {showModal && (
                <div
                    className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 overflow-y-auto"
                    onClick={(e) => { if (e.target === e.currentTarget) setShowModal(false); }}
                >
                    <div className="min-h-full flex items-start justify-center p-4 py-8">
                    <div className="bg-[#0A0A0A] border border-neutral-900 rounded-xl w-full max-w-2xl p-8 relative space-y-6">
                        
                        <div className="flex justify-between items-start">
                            <div>
                                <h3 className="text-xl font-bold text-white tracking-tight">Establish New Event</h3>
                                <p className="text-neutral-500 text-xs font-mono uppercase tracking-widest mt-1">
                                    Event Registration Registry Setup
                                </p>
                            </div>
                            <button
                                onClick={() => setShowModal(false)}
                                className="text-neutral-500 hover:text-white transition-colors cursor-pointer p-1"
                                aria-label="Close modal"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {submitError && (
                            <div className="p-4 rounded-lg bg-red-950/20 border border-red-900/50 flex items-center gap-3 text-red-400 text-sm">
                                <AlertCircle size={16} className="shrink-0" />
                                <span>{submitError}</span>
                            </div>
                        )}

                        <form onSubmit={handleCreateEvent} className="space-y-6">
                            
                            {/* Section: Mandatory fields */}
                            <div className="bg-[#030303] border border-neutral-900 rounded-lg p-5 space-y-4">
                                <h4 className="text-[10px] text-cyan-400 uppercase font-mono font-bold tracking-widest leading-none mb-2 border-b border-neutral-900 pb-1.5">Mandatory Core Setup</h4>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {/* Event Name */}
                                    <div className="space-y-1.5 col-span-2">
                                        <label className="block text-xs uppercase tracking-widest text-neutral-400 font-mono font-semibold">
                                            Event Title Name *
                                        </label>
                                        <input
                                            type="text"
                                            required
                                            value={eventName}
                                            onChange={(e) => setEventName(e.target.value)}
                                            placeholder="e.g. Code Debugging Championship"
                                            className="w-full bg-[#0A0A0A] border border-neutral-800 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 text-white rounded-lg px-3 py-2 text-xs transition-all outline-none font-mono"
                                        />
                                    </div>

                                    {/* Event Series Dropdown + Toggle */}
                                    <div className="space-y-1.5 col-span-2">
                                        <div className="flex justify-between items-center">
                                            <label className="block text-xs uppercase tracking-widest text-neutral-400 font-mono font-semibold">
                                                Event Series *
                                            </label>
                                            <button
                                                type="button"
                                                onClick={() => setCreateNewSeries(!createNewSeries)}
                                                className="text-[10px] text-cyan-400 hover:text-cyan-300 font-mono font-bold underline cursor-pointer"
                                            >
                                                {createNewSeries ? 'Choose Existing Series' : 'Create New Series'}
                                            </button>
                                        </div>

                                        {createNewSeries ? (
                                            <input
                                                type="text"
                                                required
                                                value={newSeriesName}
                                                onChange={(e) => setNewSeriesName(e.target.value)}
                                                placeholder="Enter new event series title..."
                                                className="w-full bg-[#0A0A0A] border border-neutral-800 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 text-white rounded-lg px-3 py-2 text-xs transition-all outline-none font-mono animate-fade-in"
                                            />
                                        ) : (
                                            <select
                                                value={selectedSeriesId}
                                                onChange={(e) => setSelectedSeriesId(e.target.value)}
                                                className="w-full bg-[#0A0A0A] border border-neutral-800 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 text-white rounded-lg px-3 py-2 text-xs transition-all outline-none font-mono"
                                            >
                                                {seriesList.map((series) => (
                                                    <option key={series.id} value={series.id}>
                                                        {series.series_name}
                                                    </option>
                                                ))}
                                            </select>
                                        )}
                                    </div>

                                    {/* Faculty Coordinators (Checklist selector) */}
                                    <div className="space-y-1.5 col-span-2">
                                        <label className="block text-xs uppercase tracking-widest text-neutral-400 font-mono font-semibold">
                                            Faculty Coordinators * (Select other staff)
                                        </label>
                                        <div className="bg-[#0A0A0A] border border-neutral-800 rounded-lg p-3 max-h-32 overflow-y-auto grid grid-cols-2 gap-2 font-mono text-[10px]">
                                            {staffList.map((staff) => (
                                                <label key={staff.id} className="flex items-center gap-2 text-neutral-400 hover:text-white cursor-pointer select-none">
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedFacultyIds.includes(staff.id)}
                                                        onChange={() => toggleFaculty(staff.id)}
                                                        className="rounded border-neutral-800 bg-[#030303] text-cyan-500 focus:ring-cyan-500"
                                                    />
                                                    <span className="line-clamp-1">{staff.name}</span>
                                                </label>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Student Coordinators (Directory lookup selector) */}
                                    <div className="space-y-1.5 col-span-2">
                                        <label className="block text-xs uppercase tracking-widest text-neutral-400 font-mono font-semibold">
                                            Student Coordinators *
                                        </label>
                                        
                                        {/* Added student list */}
                                        {studentCoordinators.length > 0 && (
                                            <div className="flex flex-wrap gap-2 pb-2">
                                                {studentCoordinators.map((student) => (
                                                    <span key={student.user_id} className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-neutral-900 border border-neutral-800 text-[10px] text-indigo-400 font-mono">
                                                        {student.name}
                                                        <button
                                                            type="button"
                                                            onClick={() => removeStudentCoord(student.user_id)}
                                                            className="text-red-400 hover:text-red-300 ml-1"
                                                        >
                                                            &times;
                                                        </button>
                                                    </span>
                                                ))}
                                            </div>
                                        )}

                                        <div className="relative">
                                            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-neutral-500">
                                                <Search size={12} />
                                            </span>
                                            <input
                                                type="text"
                                                value={studentQuery}
                                                onChange={(e) => setStudentQuery(e.target.value)}
                                                placeholder="Search student coordinator by name..."
                                                className="w-full bg-[#0A0A0A] border border-neutral-800 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 text-white rounded-lg pl-8 pr-4 py-2 text-xs transition-all outline-none font-mono"
                                            />
                                            {searchingStudents && (
                                                <span className="absolute inset-y-0 right-0 pr-3 flex items-center text-cyan-400">
                                                    <Loader2 size={12} className="animate-spin" />
                                                </span>
                                            )}

                                            {/* Student Search drop list */}
                                            {studentResults.length > 0 && (
                                                <div className="absolute left-0 right-0 mt-1 bg-[#0A0A0A] border border-neutral-800 rounded-lg shadow-xl overflow-hidden max-h-32 overflow-y-auto z-55 text-[11px] font-mono">
                                                    {studentResults.map((student) => (
                                                        <div
                                                            key={student.user_id}
                                                            onClick={() => addStudentCoord(student)}
                                                            className="p-2 hover:bg-neutral-900 border-b border-neutral-900 last:border-0 cursor-pointer transition-colors flex items-center justify-between"
                                                        >
                                                            <span>{student.name} ({student.registration_id})</span>
                                                            <Plus size={12} className="text-cyan-400" />
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                </div>
                            </div>

                            {/* Section: Media & Documents */}
                            <div className="bg-[#030303] border border-neutral-900 rounded-lg p-5 space-y-4">
                                <h4 className="text-[10px] text-violet-400 uppercase font-mono font-bold tracking-widest leading-none mb-2 border-b border-neutral-900 pb-1.5">Media &amp; Documents</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {/* Poster Image Upload */}
                                    <div className="space-y-1">
                                        <label className="block text-[10px] uppercase tracking-widest text-neutral-400 font-mono font-semibold mb-1">Event Poster Image (JPEG/PNG, max 5MB)</label>
                                        <div onClick={() => posterInputRef.current?.click()} className="relative w-full h-36 rounded-lg border-2 border-dashed border-neutral-800 hover:border-violet-600/50 transition-colors cursor-pointer overflow-hidden flex items-center justify-center bg-[#080808]">
                                            {posterPreview ? (
                                                <img src={posterPreview} alt="Poster preview" className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="flex flex-col items-center gap-1 text-neutral-600">
                                                    <Upload size={20} />
                                                    <span className="text-[10px] font-mono text-center">Click to upload poster<br /><span className="text-neutral-700">JPEG / PNG</span></span>
                                                </div>
                                            )}
                                            {posterUploading && <div className="absolute inset-0 bg-black/60 flex items-center justify-center"><Loader2 size={20} className="animate-spin text-violet-400" /></div>}
                                        </div>
                                        <input ref={posterInputRef} type="file" accept="image/jpeg,image/png,image/jpg" className="hidden" onChange={handlePosterChange} />
                                        {posterFile && (
                                            <p className="text-[10px] font-mono text-neutral-500 truncate">
                                                {posterFileId ? <span className="text-emerald-400">&#10003; Uploaded: </span> : <span className="text-yellow-500">Uploading: </span>}
                                                {posterFile.name}
                                            </p>
                                        )}
                                    </div>
                                    {/* PDF Upload */}
                                    <div className="space-y-1">
                                        <label className="block text-[10px] uppercase tracking-widest text-neutral-400 font-mono font-semibold mb-1">Details / Rulebook PDF (max 5MB)</label>
                                        <div onClick={() => pdfInputRef.current?.click()} className="relative w-full h-36 rounded-lg border-2 border-dashed border-neutral-800 hover:border-violet-600/50 transition-colors cursor-pointer flex flex-col items-center justify-center gap-2 bg-[#080808]">
                                            {pdfFile ? (
                                                <>
                                                    <FileText size={28} className={pdfUploading ? 'text-violet-400 animate-pulse' : 'text-violet-400'} />
                                                    <span className="text-[10px] font-mono text-neutral-400 text-center max-w-[90%] truncate">{pdfFile.name}</span>
                                                    <span className="text-[9px] font-mono text-neutral-600">Click to replace</span>
                                                </>
                                            ) : (
                                                <div className="flex flex-col items-center gap-1 text-neutral-600">
                                                    <Upload size={20} />
                                                    <span className="text-[10px] font-mono text-center">Click to upload PDF</span>
                                                </div>
                                            )}
                                            {pdfUploading && <div className="absolute inset-0 bg-black/60 flex items-center justify-center"><Loader2 size={20} className="animate-spin text-violet-400" /></div>}
                                        </div>
                                        <input ref={pdfInputRef} type="file" accept="application/pdf" className="hidden" onChange={handlePdfChange} />
                                        {pdfFile && (
                                            <p className="text-[10px] font-mono text-neutral-500">
                                                {pdfFileId ? <span className="text-emerald-400">&#10003; Uploaded</span> : <span className="text-yellow-500">Uploading...</span>}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Section: Optional fields pre-populated with defaults */}
                            <div className="bg-[#030303] border border-neutral-900 rounded-lg p-5 space-y-4">
                                <h4 className="text-[10px] text-neutral-500 uppercase font-mono font-bold tracking-widest leading-none mb-2 border-b border-neutral-900 pb-1.5">Optional Configuration Details</h4>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                                    {/* Category Select */}
                                    <div className="space-y-1">
                                        <label className="block text-[10px] uppercase tracking-widest text-neutral-400 font-mono font-semibold">
                                            Category
                                        </label>
                                        <select
                                            value={selectedCategoryId}
                                            onChange={(e) => setSelectedCategoryId(e.target.value)}
                                            className="w-full bg-[#0A0A0A] border border-neutral-800 focus:border-cyan-500 text-white rounded-lg px-2.5 py-2 transition-all outline-none font-mono"
                                        >
                                            {categories.map((cat) => (
                                                <option key={cat.id} value={cat.id}>{cat.category_name}</option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Owner Select */}
                                    <div className="space-y-1">
                                        <label className="block text-[10px] uppercase tracking-widest text-neutral-400 font-mono font-semibold">
                                            Organizing Body / Department
                                        </label>
                                        <select
                                            value={selectedOwnerId}
                                            onChange={(e) => setSelectedOwnerId(e.target.value)}
                                            className="w-full bg-[#0A0A0A] border border-neutral-800 focus:border-cyan-500 text-white rounded-lg px-2.5 py-2 transition-all outline-none font-mono"
                                        >
                                            {owners.map((owner) => (
                                                <option key={owner.id} value={owner.id}>{owner.owner_name}</option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Participation Type */}
                                    <div className="space-y-1">
                                        <label className="block text-[10px] uppercase tracking-widest text-neutral-400 font-mono font-semibold">
                                            Participation Type
                                        </label>
                                        <select
                                            value={participationType}
                                            onChange={(e) => setParticipationType(e.target.value)}
                                            className="w-full bg-[#0A0A0A] border border-neutral-800 focus:border-cyan-500 text-white rounded-lg px-2.5 py-2 transition-all outline-none font-mono"
                                        >
                                            <option value="INDIVIDUAL">INDIVIDUAL</option>
                                            <option value="GROUP">GROUP</option>
                                        </select>
                                    </div>

                                    {/* Venue */}
                                    <div className="space-y-1">
                                        <label className="block text-[10px] uppercase tracking-widest text-neutral-400 font-mono font-semibold">
                                            Venue Location
                                        </label>
                                        <input
                                            type="text"
                                            value={venue}
                                            onChange={(e) => setVenue(e.target.value)}
                                            placeholder="Campus Arena"
                                            className="w-full bg-[#0A0A0A] border border-neutral-800 focus:border-cyan-500 text-white rounded-lg px-2.5 py-2 transition-all outline-none font-mono"
                                        />
                                    </div>

                                    {/* Team Size bounds (only shown if GROUP participation) */}
                                    {participationType === 'GROUP' && (
                                        <>
                                            <div className="space-y-1">
                                                <label className="block text-[10px] uppercase tracking-widest text-neutral-400 font-mono font-semibold">
                                                    Minimum Team Size
                                                </label>
                                                <input
                                                    type="number"
                                                    min="2"
                                                    value={minTeamSize}
                                                    onChange={(e) => setMinTeamSize(parseInt(e.target.value))}
                                                    className="w-full bg-[#0A0A0A] border border-neutral-800 focus:border-cyan-500 text-white rounded-lg px-2.5 py-2 transition-all outline-none font-mono"
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="block text-[10px] uppercase tracking-widest text-neutral-400 font-mono font-semibold">
                                                    Maximum Team Size
                                                </label>
                                                <input
                                                    type="number"
                                                    min={minTeamSize}
                                                    value={maxTeamSize}
                                                    onChange={(e) => setMaxTeamSize(parseInt(e.target.value))}
                                                    className="w-full bg-[#0A0A0A] border border-neutral-800 focus:border-cyan-500 text-white rounded-lg px-2.5 py-2 transition-all outline-none font-mono"
                                                />
                                            </div>
                                        </>
                                    )}

                                    {/* Participant Cap */}
                                    <div className="space-y-1">
                                        <label className="block text-[10px] uppercase tracking-widest text-neutral-400 font-mono font-semibold">
                                            Participant Cap (total registrations allowed)
                                        </label>
                                        <input
                                            type="number"
                                            min="1"
                                            value={participantCap}
                                            onChange={(e) => setParticipantCap(parseInt(e.target.value))}
                                            placeholder="e.g. 100"
                                            className="w-full bg-[#0A0A0A] border border-neutral-800 focus:border-cyan-500 text-white rounded-lg px-2.5 py-2 transition-all outline-none font-mono"
                                        />
                                    </div>

                                    {/* Result Positions */}
                                    <div className="space-y-1">
                                        <label className="block text-[10px] uppercase tracking-widest text-neutral-400 font-mono font-semibold">
                                            Result Positions (number of winners)
                                        </label>
                                        <input
                                            type="number"
                                            min="1"
                                            max="10"
                                            value={resultPositions}
                                            onChange={(e) => setResultPositions(parseInt(e.target.value))}
                                            placeholder="e.g. 3 (1st, 2nd, 3rd)"
                                            className="w-full bg-[#0A0A0A] border border-neutral-800 focus:border-cyan-500 text-white rounded-lg px-2.5 py-2 transition-all outline-none font-mono"
                                        />
                                    </div>

                                    {/* Short Description */}
                                    <div className="space-y-1 col-span-2">
                                        <label className="block text-[10px] uppercase tracking-widest text-neutral-400 font-mono font-semibold">
                                            Short Description (shown in carousels and listing cards)
                                        </label>
                                        <textarea
                                            value={shortDescription}
                                            onChange={(e) => setShortDescription(e.target.value)}
                                            rows="2"
                                            placeholder="A brief 1-2 sentence summary shown on event listing cards and carousels..."
                                            className="w-full bg-[#0A0A0A] border border-neutral-800 focus:border-cyan-500 text-white rounded-lg px-2.5 py-2 transition-all outline-none font-mono"
                                        />
                                    </div>

                                    {/* Detailed Description */}
                                    <div className="space-y-1 col-span-2">
                                        <label className="block text-[10px] uppercase tracking-widest text-neutral-400 font-mono font-semibold">
                                            Detailed Description &amp; Rules
                                        </label>
                                        <textarea
                                            value={detailedDescription}
                                            onChange={(e) => setDetailedDescription(e.target.value)}
                                            rows="5"
                                            placeholder="Full event description: rules, eligibility criteria, judging parameters, prizes, contact info, schedule breakdown, etc..."
                                            className="w-full bg-[#0A0A0A] border border-neutral-800 focus:border-cyan-500 text-white rounded-lg px-2.5 py-2 transition-all outline-none font-mono"
                                        />
                                    </div>

                                    {/* Dates Grid */}
                                    <div className="space-y-1">
                                        <label className="block text-[10px] uppercase tracking-widest text-neutral-400 font-mono font-semibold">
                                            Registration Start Date
                                        </label>
                                        <input
                                            type="datetime-local"
                                            value={registrationStartDate}
                                            onChange={(e) => setRegistrationStartDate(e.target.value)}
                                            className="w-full bg-[#0A0A0A] border border-neutral-800 focus:border-cyan-500 text-white rounded-lg px-2.5 py-2 transition-all outline-none font-mono"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="block text-[10px] uppercase tracking-widest text-neutral-400 font-mono font-semibold">
                                            Registration End Date
                                        </label>
                                        <input
                                            type="datetime-local"
                                            value={registrationEndDate}
                                            onChange={(e) => setRegistrationEndDate(e.target.value)}
                                            className="w-full bg-[#0A0A0A] border border-neutral-800 focus:border-cyan-500 text-white rounded-lg px-2.5 py-2 transition-all outline-none font-mono"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="block text-[10px] uppercase tracking-widest text-neutral-400 font-mono font-semibold">
                                            Event Start Date
                                        </label>
                                        <input
                                            type="datetime-local"
                                            value={eventStartDate}
                                            onChange={(e) => setEventStartDate(e.target.value)}
                                            className="w-full bg-[#0A0A0A] border border-neutral-800 focus:border-cyan-500 text-white rounded-lg px-2.5 py-2 transition-all outline-none font-mono"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="block text-[10px] uppercase tracking-widest text-neutral-400 font-mono font-semibold">
                                            Event End Date
                                        </label>
                                        <input
                                            type="datetime-local"
                                            value={eventEndDate}
                                            onChange={(e) => setEventEndDate(e.target.value)}
                                            className="w-full bg-[#0A0A0A] border border-neutral-800 focus:border-cyan-500 text-white rounded-lg px-2.5 py-2 transition-all outline-none font-mono"
                                        />
                                    </div>

                                </div>
                            </div>

                            {/* Buttons */}
                            <div className="flex gap-4 pt-4 border-t border-neutral-900">
                                <button
                                    type="submit"
                                    disabled={submitting || posterUploading || pdfUploading}
                                    className="flex-grow bg-cyan-500 hover:bg-cyan-600 disabled:opacity-50 disabled:cursor-not-allowed text-black font-semibold py-3 rounded-lg text-sm flex items-center justify-center gap-2 cursor-pointer transition-colors"
                                >
                                    {submitting && <Loader2 size={16} className="animate-spin" />}
                                    <span>{submitting ? 'Creating Event...' : 'Establish Core Event'}</span>
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

                    </div>
                    </div>
                </div>
            )}

        </div>
    );
}
