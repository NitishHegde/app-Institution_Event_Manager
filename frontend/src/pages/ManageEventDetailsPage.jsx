import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import API from '../services/api';
import { Calendar, MapPin, Loader2, AlertCircle, CheckCircle, Shield, Award, Users, Info, Plus, Trash2, Search, ArrowLeft, Bookmark, Upload, X } from 'lucide-react';

export default function ManageEventDetailsPage() {
    const { eventId } = useParams();
    const { user } = useAuth();
    const navigate = useNavigate();

    // Data states
    const [event, setEvent] = useState(null);
    const [categories, setCategories] = useState([]);
    const [owners, setOwners] = useState([]);
    const [seriesList, setSeriesList] = useState([]);
    const [staffList, setStaffList] = useState([]);

    const [isCreator, setIsCreator] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Form states
    const [eventName, setEventName] = useState('');
    const [selectedSeriesId, setSelectedSeriesId] = useState('');
    const [selectedCategoryId, setSelectedCategoryId] = useState('');
    const [selectedOwnerId, setSelectedOwnerId] = useState('');
    const [participationType, setParticipationType] = useState('INDIVIDUAL');
    const [venue, setVenue] = useState('');
    const [shortDescription, setShortDescription] = useState('');
    const [detailedDescription, setDetailedDescription] = useState('');
    const [participantCap, setParticipantCap] = useState(100);
    const [minTeamSize, setMinTeamSize] = useState(2);
    const [maxTeamSize, setMaxTeamSize] = useState(4);
    const [registrationStartDate, setRegistrationStartDate] = useState('');
    const [registrationEndDate, setRegistrationEndDate] = useState('');
    const [eventStartDate, setEventStartDate] = useState('');
    const [eventEndDate, setEventEndDate] = useState('');
    const [eventStatus, setEventStatus] = useState('DRAFT');

    // Coordinators states
    const [selectedFacultyIds, setSelectedFacultyIds] = useState([]);
    const [studentCoordinators, setStudentCoordinators] = useState([]);

    // Student Coordinators search
    const [studentQuery, setStudentQuery] = useState('');
    const [studentResults, setStudentResults] = useState([]);
    const [searchingStudents, setSearchingStudents] = useState(false);

    // Save states
    const [saving, setSaving] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState('');
    const [saveError, setSaveError] = useState('');

    // Poster upload state
    const [posterFile, setPosterFile] = useState(null);
    const [posterPreview, setPosterPreview] = useState(null);
    const [posterUploading, setPosterUploading] = useState(false);
    const [posterFileId, setPosterFileId] = useState(undefined); // undefined = not changed, null = removed, string = new ID
    const posterInputRef = useRef(null);

    // Fetch initial parameters
    const fetchEventData = async () => {
        setLoading(true);
        setError('');
        try {
            const [
                detailsRes,
                coordRes,
                dashRes,
                seriesRes,
                catRes,
                ownerRes,
                staffRes
            ] = await Promise.all([
                API.get(`/events/${eventId}/details`),
                API.get(`/events/${eventId}/coordinators`),
                API.get('/events/staff/dashboard'),
                API.get('/event-series'),
                API.get('/event-categories'),
                API.get('/owners'),
                API.get('/auth/staff')
            ]);

            const evt = detailsRes.data;
            setEvent(evt);
            setSeriesList(seriesRes.data);
            setCategories(catRes.data);
            setOwners(ownerRes.data);
            setStaffList(staffRes.data);

            // Populate form fields
            setEventName(evt.event_name);
            setSelectedSeriesId(evt.event_series_id);
            setSelectedCategoryId(evt.event_category_id);
            setSelectedOwnerId(evt.owner_id);
            setParticipationType(evt.participation_type);
            setVenue(evt.venue || '');
            setShortDescription(evt.short_description || '');
            setDetailedDescription(evt.detailed_description || '');
            setParticipantCap(evt.participant_cap || 100);
            setMinTeamSize(evt.min_team_size || 2);
            setMaxTeamSize(evt.max_team_size || 4);
            setEventStatus(evt.event_status);

            // Format dates
            if (evt.registration_start_date) setRegistrationStartDate(new Date(evt.registration_start_date).toISOString().slice(0, 16));
            if (evt.registration_end_date) setRegistrationEndDate(new Date(evt.registration_end_date).toISOString().slice(0, 16));
            if (evt.event_start_date) setEventStartDate(new Date(evt.event_start_date).toISOString().slice(0, 16));
            if (evt.event_end_date) setEventEndDate(new Date(evt.event_end_date).toISOString().slice(0, 16));

            // Reset poster upload state — keep undefined so existing poster_file_id is preserved
            setPosterFile(null);
            setPosterPreview(null);
            setPosterFileId(undefined);

            // Separate coordinators
            const coords = coordRes.data;
            const facIds = coords
                .filter((c) => c.coordinator_type === 'Faculty_Coordinator')
                .map((c) => c.user_id);
            const studCoords = coords.filter((c) => c.coordinator_type === 'Student_Coordinator');

            setSelectedFacultyIds(facIds);
            setStudentCoordinators(studCoords);

            // Verify Creator permission via dashboard listing
            const createdMatch = dashRes.data.createdEvents.some((e) => e.id === eventId);
            const coordinatingMatch = dashRes.data.coordinatingEvents.some((e) => e.id === eventId);

            if (createdMatch) {
                setIsCreator(true);
            } else if (coordinatingMatch) {
                setIsCreator(false);
            } else {
                setError('Unauthorized access: You are not tied to this event configuration list.');
            }

        } catch (err) {
            console.error('Error fetching event details:', err);
            setError('Failed to fetch event editor attributes.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchEventData();
    }, [eventId]);

    // Student search debounced query
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

    // Poster upload handler
    const handlePosterChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setPosterFile(file);
        const reader = new FileReader();
        reader.onload = (ev) => setPosterPreview(ev.target.result);
        reader.readAsDataURL(file);
        setPosterUploading(true);
        setSaveError('');
        try {
            const formData = new FormData();
            formData.append('file', file);
            const res = await API.post('/files/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
            setPosterFileId(res.data.file.id);
        } catch (err) {
            console.error('Poster upload error:', err);
            setSaveError('Poster image upload failed. Please try again.');
            setPosterFile(null);
            setPosterPreview(null);
        } finally {
            setPosterUploading(false);
        }
    };

    // Handle updates
    const handleUpdate = async (e) => {
        e.preventDefault();
        setSaveError('');
        setSaveSuccess('');
        setSaving(true);

        try {
            // 1. Update Status via PATCH if changed
            if (eventStatus !== event.event_status) {
                await API.patch(`/events/${eventId}/status`, { eventStatus });
            }

            // 2. Format coordinator payloads
            const facultyCoordinators = selectedFacultyIds;
            const studentCoordinatorsPayload = studentCoordinators.map((c) => c.user_id);

            // 3. Assemble PUT payload
            const payload = {
                eventSeriesId: selectedSeriesId,
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
                registrationStartDate,
                registrationEndDate,
                eventStartDate,
                eventEndDate,
                facultyCoordinators,
                studentCoordinators: studentCoordinatorsPayload,
                // Only include posterFileId if user actually changed it (posterFileId !== undefined)
                ...(posterFileId !== undefined ? { posterFileId } : {})
            };

            await API.put(`/events/${eventId}`, payload);
            setSaveSuccess('Event workspace configurations saved successfully!');
            // Refresh data
            fetchEventData();
        } catch (err) {
            console.error('Error saving details:', err);
            setSaveError(err.response?.data?.message || 'Error updating event details.');
        } finally {
            setSaving(false);
        }
    };

    const toggleFaculty = (id) => {
        if (!isCreator) return;
        setSelectedFacultyIds((prev) =>
            prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
        );
    };

    const addStudentCoord = (student) => {
        if (!isCreator) return;
        setStudentCoordinators((prev) => [...prev, student]);
        setStudentQuery('');
        setStudentResults([]);
    };

    const removeStudentCoord = (userId) => {
        if (!isCreator) return;
        setStudentCoordinators((prev) => prev.filter((c) => c.user_id !== userId));
    };

    if (loading) {
        return (
            <div className="flex-grow flex flex-col items-center justify-center py-20 text-neutral-600 gap-3">
                <Loader2 className="animate-spin text-cyan-400" size={32} />
                <span className="text-xs font-mono tracking-widest uppercase text-neutral-500">Stitching Event Editor...</span>
            </div>
        );
    }

    if (error) {
        return (
            <div className="max-w-3xl mx-auto px-6 py-12 space-y-6">
                <div className="p-4 rounded-lg bg-red-950/20 border border-red-900/50 text-red-400 text-sm flex gap-2 items-center">
                    <AlertCircle size={16} />
                    <span>{error}</span>
                </div>
                <Link to="/manage-event" className="text-sm font-mono text-cyan-400 hover:underline flex items-center gap-1">
                    <ArrowLeft size={12} /> Return to Manage workspace
                </Link>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto px-6 py-10 w-full space-y-8">
            
            {/* Header info */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 border-b border-neutral-900 pb-6">
                <div>
                    <h1 className="text-3xl font-light text-white leading-tight">
                        Modify Event Workspace
                    </h1>
                    <p className="text-neutral-500 text-xs mt-1 uppercase tracking-widest font-mono flex items-center gap-1.5">
                        <Shield size={12} className="text-indigo-400" /> 
                        {isCreator ? 'Creator authorization' : 'Assigned Coordinator View'}
                    </p>
                </div>
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

            {/* SPLIT LAYOUT FORM EDITOR */}
            <form onSubmit={handleUpdate} className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
                
                {/* LEFT COLUMN: Main constraints & Metadata */}
                <div className="lg:col-span-5 space-y-6">
                    <div className="bg-[#0A0A0A] border border-neutral-900 rounded-xl p-6 space-y-6">
                        
                        {/* Event status config */}
                        <div className="space-y-2">
                            <label className="block text-xs uppercase tracking-widest text-neutral-400 font-mono font-semibold">
                                Event Status Visibility
                            </label>
                            <select
                                value={eventStatus}
                                onChange={(e) => setEventStatus(e.target.value)}
                                className="w-full bg-[#030303] border border-neutral-800 focus:border-cyan-500 text-white rounded-lg px-3 py-2.5 text-xs transition-all outline-none font-mono"
                            >
                                <option value="DRAFT">DRAFT (HIDDEN)</option>
                                <option value="ACTIVE">ACTIVE (VISIBLE)</option>
                                <option value="INACTIVE">INACTIVE (HIDDEN)</option>
                            </select>
                        </div>

                        {/* Event name (locked for coordinators) */}
                        <div className="space-y-2">
                            <div className="flex justify-between items-center">
                                <label className="block text-xs uppercase tracking-widest text-neutral-400 font-mono font-semibold">
                                    Event Title Name
                                </label>
                                {!isCreator && (
                                    <span className="text-[9px] uppercase font-mono bg-red-950/40 text-red-400 border border-red-900/50 px-2 py-0.5 rounded leading-none">Locked</span>
                                )}
                            </div>
                            <input
                                type="text"
                                required
                                disabled={!isCreator}
                                value={eventName}
                                onChange={(e) => setEventName(e.target.value)}
                                className="w-full bg-[#030303] border border-neutral-800 focus:border-cyan-500 text-white rounded-lg px-3 py-2.5 text-xs transition-all outline-none font-mono disabled:opacity-50 disabled:cursor-not-allowed"
                            />
                        </div>

                        {/* Poster Image */}
                        <div className="space-y-2">
                            <label className="block text-xs uppercase tracking-widest text-neutral-400 font-mono font-semibold">
                                Event Poster Image
                            </label>
                            <div
                                onClick={() => posterInputRef.current?.click()}
                                className="relative w-full h-40 rounded-lg border-2 border-dashed border-neutral-800 hover:border-violet-600/50 transition-colors cursor-pointer overflow-hidden flex items-center justify-center bg-[#030303]"
                            >
                                {posterPreview ? (
                                    <img src={posterPreview} alt="New poster preview" className="w-full h-full object-cover" />
                                ) : event?.poster_file_id ? (
                                    <img
                                        src={`http://localhost:5000/api/public/events/poster/${event.poster_file_id}`}
                                        alt="Current poster"
                                        className="w-full h-full object-cover opacity-70"
                                    />
                                ) : (
                                    <div className="flex flex-col items-center gap-1 text-neutral-600">
                                        <Upload size={20} />
                                        <span className="text-[10px] font-mono text-center">Click to upload poster<br /><span className="text-neutral-700">JPEG / PNG · max 5MB</span></span>
                                    </div>
                                )}
                                {posterUploading && (
                                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                                        <Loader2 size={20} className="animate-spin text-violet-400" />
                                    </div>
                                )}
                                {(posterPreview || event?.poster_file_id) && !posterUploading && (
                                    <div className="absolute bottom-1 right-1 bg-black/70 text-[9px] font-mono text-neutral-400 px-1.5 py-0.5 rounded">
                                        {posterPreview ? (posterFileId ? '✓ New poster ready' : 'Uploading...') : 'Current poster · click to change'}
                                    </div>
                                )}
                            </div>
                            <input ref={posterInputRef} type="file" accept="image/jpeg,image/png,image/jpg" className="hidden" onChange={handlePosterChange} />
                        </div>

                        {/* Event Series dropdown (locked for coordinators) */}
                        <div className="space-y-2">
                            <div className="flex justify-between items-center">
                                <label className="block text-xs uppercase tracking-widest text-neutral-400 font-mono font-semibold">
                                    Event Series
                                </label>
                                {!isCreator && (
                                    <span className="text-[9px] uppercase font-mono bg-red-950/40 text-red-400 border border-red-900/50 px-2 py-0.5 rounded leading-none">Locked</span>
                                )}
                            </div>
                            <select
                                disabled={!isCreator}
                                value={selectedSeriesId}
                                onChange={(e) => setSelectedSeriesId(e.target.value)}
                                className="w-full bg-[#030303] border border-neutral-800 focus:border-cyan-500 text-white rounded-lg px-3 py-2.5 text-xs transition-all outline-none font-mono disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {seriesList.map((series) => (
                                    <option key={series.id} value={series.id}>{series.series_name}</option>
                                ))}
                            </select>
                        </div>

                        {/* Faculty Coordinators (locked for coordinators) */}
                        <div className="space-y-2">
                            <div className="flex justify-between items-center">
                                <label className="block text-xs uppercase tracking-widest text-neutral-400 font-mono font-semibold">
                                    Faculty Coordinators
                                </label>
                                {!isCreator && (
                                    <span className="text-[9px] uppercase font-mono bg-red-950/40 text-red-400 border border-red-900/50 px-2 py-0.5 rounded leading-none">Locked</span>
                                )}
                            </div>
                            <div className="bg-[#030303] border border-neutral-800 rounded-lg p-3 max-h-32 overflow-y-auto grid grid-cols-1 gap-2 font-mono text-[10px] disabled:opacity-50">
                                {staffList.map((staff) => (
                                    <label key={staff.id} className="flex items-center gap-2 text-neutral-400 hover:text-white cursor-pointer select-none">
                                        <input
                                            type="checkbox"
                                            disabled={!isCreator}
                                            checked={selectedFacultyIds.includes(staff.id)}
                                            onChange={() => toggleFaculty(staff.id)}
                                            className="rounded border-neutral-800 bg-[#030303] text-cyan-500 focus:ring-cyan-500 disabled:opacity-50"
                                        />
                                        <span className="line-clamp-1">{staff.name}</span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        {/* Student Coordinators (locked for coordinators) */}
                        <div className="space-y-2">
                            <div className="flex justify-between items-center">
                                <label className="block text-xs uppercase tracking-widest text-neutral-400 font-mono font-semibold">
                                    Student Coordinators
                                </label>
                                {!isCreator && (
                                    <span className="text-[9px] uppercase font-mono bg-red-950/40 text-red-400 border border-red-900/50 px-2 py-0.5 rounded leading-none">Locked</span>
                                )}
                            </div>

                            {studentCoordinators.length > 0 && (
                                <div className="flex flex-wrap gap-2 pb-2">
                                    {studentCoordinators.map((student) => (
                                        <span key={student.user_id} className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#030303] border border-neutral-800 text-[10px] text-indigo-400 font-mono">
                                            {student.name}
                                            {isCreator && (
                                                <button
                                                    type="button"
                                                    onClick={() => removeStudentCoord(student.user_id)}
                                                    className="text-red-400 hover:text-red-300 ml-1"
                                                >
                                                    &times;
                                                </button>
                                            )}
                                        </span>
                                    ))}
                                </div>
                            )}

                            {isCreator && (
                                <div className="relative">
                                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-neutral-500">
                                        <Search size={12} />
                                    </span>
                                    <input
                                        type="text"
                                        value={studentQuery}
                                        onChange={(e) => setStudentQuery(e.target.value)}
                                        placeholder="Search student by name..."
                                        className="w-full bg-[#030303] border border-neutral-800 focus:border-cyan-500 text-white rounded-lg pl-8 pr-4 py-2 text-xs transition-all outline-none font-mono"
                                    />
                                    {searchingStudents && (
                                        <span className="absolute inset-y-0 right-0 pr-3 flex items-center text-cyan-400">
                                            <Loader2 size={12} className="animate-spin" />
                                        </span>
                                    )}

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
                            )}
                        </div>

                    </div>
                </div>

                {/* RIGHT COLUMN: General configurations */}
                <div className="lg:col-span-7 space-y-6 bg-[#0A0A0A] border border-neutral-900 rounded-xl p-8">
                    <h3 className="text-xs uppercase tracking-widest text-neutral-400 font-mono font-bold border-b border-neutral-900 pb-2">
                        General Configuration Properties
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs font-mono">
                        {/* Category Select */}
                        <div className="space-y-1">
                            <div className="flex justify-between items-center">
                                <label className="block text-[10px] uppercase tracking-widest text-neutral-450 font-bold">
                                    Category
                                </label>
                                {!isCreator && (
                                    <span className="text-[8px] bg-red-950/45 text-red-400 px-1.5 rounded uppercase leading-none">Locked</span>
                                )}
                            </div>
                            <select
                                disabled={!isCreator}
                                value={selectedCategoryId}
                                onChange={(e) => setSelectedCategoryId(e.target.value)}
                                className="w-full bg-[#030303] border border-neutral-800 focus:border-cyan-500 text-white rounded-lg px-2.5 py-2 transition-all outline-none disabled:opacity-50"
                            >
                                {categories.map((cat) => (
                                    <option key={cat.id} value={cat.id}>{cat.category_name}</option>
                                ))}
                            </select>
                        </div>

                        {/* Owner Select */}
                        <div className="space-y-1">
                            <div className="flex justify-between items-center">
                                <label className="block text-[10px] uppercase tracking-widest text-neutral-455 font-bold">
                                    Organizing Body / Department
                                </label>
                                {!isCreator && (
                                    <span className="text-[8px] bg-red-950/45 text-red-400 px-1.5 rounded uppercase leading-none">Locked</span>
                                )}
                            </div>
                            <select
                                disabled={!isCreator}
                                value={selectedOwnerId}
                                onChange={(e) => setSelectedOwnerId(e.target.value)}
                                className="w-full bg-[#030303] border border-neutral-800 focus:border-cyan-500 text-white rounded-lg px-2.5 py-2 transition-all outline-none disabled:opacity-50"
                            >
                                {owners.map((owner) => (
                                    <option key={owner.id} value={owner.id}>{owner.owner_name}</option>
                                ))}
                            </select>
                        </div>

                        {/* Participation Type */}
                        <div className="space-y-1">
                            <div className="flex justify-between items-center">
                                <label className="block text-[10px] uppercase tracking-widest text-neutral-460 font-bold">
                                    Participation Type
                                </label>
                                {!isCreator && (
                                    <span className="text-[8px] bg-red-950/45 text-red-400 px-1.5 rounded uppercase leading-none">Locked</span>
                                )}
                            </div>
                            <select
                                disabled={!isCreator}
                                value={participationType}
                                onChange={(e) => setParticipationType(e.target.value)}
                                className="w-full bg-[#030303] border border-neutral-800 focus:border-cyan-500 text-white rounded-lg px-2.5 py-2 transition-all outline-none disabled:opacity-50"
                            >
                                <option value="INDIVIDUAL">INDIVIDUAL</option>
                                <option value="GROUP">GROUP</option>
                            </select>
                        </div>

                        {/* Venue */}
                        <div className="space-y-1">
                            <label className="block text-[10px] uppercase tracking-widest text-neutral-400 font-bold">
                                Venue Location
                            </label>
                            <input
                                type="text"
                                value={venue}
                                onChange={(e) => setVenue(e.target.value)}
                                className="w-full bg-[#030303] border border-neutral-800 focus:border-cyan-500 text-white rounded-lg px-2.5 py-2 transition-all outline-none"
                            />
                        </div>

                        {/* Team size constraints */}
                        {participationType === 'GROUP' && (
                            <>
                                <div className="space-y-1">
                                    <div className="flex justify-between items-center">
                                        <label className="block text-[10px] uppercase tracking-widest text-neutral-400 font-bold">
                                            Minimum Team Size
                                        </label>
                                        {!isCreator && (
                                            <span className="text-[8px] bg-red-950/45 text-red-400 px-1.5 rounded uppercase leading-none">Locked</span>
                                        )}
                                    </div>
                                    <input
                                        type="number"
                                        min="2"
                                        disabled={!isCreator}
                                        value={minTeamSize}
                                        onChange={(e) => setMinTeamSize(parseInt(e.target.value))}
                                        className="w-full bg-[#030303] border border-neutral-800 focus:border-cyan-500 text-white rounded-lg px-2.5 py-2 transition-all outline-none disabled:opacity-50"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <div className="flex justify-between items-center">
                                        <label className="block text-[10px] uppercase tracking-widest text-neutral-400 font-bold">
                                            Maximum Team Size
                                        </label>
                                        {!isCreator && (
                                            <span className="text-[8px] bg-red-950/45 text-red-400 px-1.5 rounded uppercase leading-none">Locked</span>
                                        )}
                                    </div>
                                    <input
                                        type="number"
                                        min={minTeamSize}
                                        disabled={!isCreator}
                                        value={maxTeamSize}
                                        onChange={(e) => setMaxTeamSize(parseInt(e.target.value))}
                                        className="w-full bg-[#030303] border border-neutral-800 focus:border-cyan-500 text-white rounded-lg px-2.5 py-2 transition-all outline-none disabled:opacity-50"
                                    />
                                </div>
                            </>
                        )}

                        {/* Participant Cap */}
                        <div className="space-y-1">
                            <label className="block text-[10px] uppercase tracking-widest text-neutral-400 font-bold">
                                Participant Cap
                            </label>
                            <input
                                type="number"
                                value={participantCap}
                                onChange={(e) => setParticipantCap(parseInt(e.target.value))}
                                className="w-full bg-[#030303] border border-neutral-800 focus:border-cyan-500 text-white rounded-lg px-2.5 py-2 transition-all outline-none"
                            />
                        </div>

                        {/* Short description */}
                        <div className="space-y-1 col-span-2">
                            <label className="block text-[10px] uppercase tracking-widest text-neutral-400 font-bold">
                                Short Description
                            </label>
                            <textarea
                                value={shortDescription}
                                onChange={(e) => setShortDescription(e.target.value)}
                                rows="2"
                                className="w-full bg-[#030303] border border-neutral-800 focus:border-cyan-500 text-white rounded-lg px-2.5 py-2 transition-all outline-none"
                            />
                        </div>

                        {/* Detailed Description */}
                        <div className="space-y-1 col-span-2">
                            <label className="block text-[10px] uppercase tracking-widest text-neutral-400 font-bold">
                                Detailed Description & Rules
                            </label>
                            <textarea
                                value={detailedDescription}
                                onChange={(e) => setDetailedDescription(e.target.value)}
                                rows="4"
                                className="w-full bg-[#030303] border border-neutral-800 focus:border-cyan-500 text-white rounded-lg px-2.5 py-2 transition-all outline-none"
                            />
                        </div>

                        {/* Dates */}
                        <div className="space-y-1">
                            <label className="block text-[10px] uppercase tracking-widest text-neutral-400 font-bold">
                                Registration Start Date
                            </label>
                            <input
                                type="datetime-local"
                                value={registrationStartDate}
                                onChange={(e) => setRegistrationStartDate(e.target.value)}
                                className="w-full bg-[#030303] border border-neutral-800 focus:border-cyan-500 text-white rounded-lg px-2.5 py-2 transition-all outline-none"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="block text-[10px] uppercase tracking-widest text-neutral-400 font-bold">
                                Registration End Date
                            </label>
                            <input
                                type="datetime-local"
                                value={registrationEndDate}
                                onChange={(e) => setRegistrationEndDate(e.target.value)}
                                className="w-full bg-[#030303] border border-neutral-800 focus:border-cyan-500 text-white rounded-lg px-2.5 py-2 transition-all outline-none"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="block text-[10px] uppercase tracking-widest text-neutral-400 font-bold">
                                Event Start Date
                            </label>
                            <input
                                type="datetime-local"
                                value={eventStartDate}
                                onChange={(e) => setEventStartDate(e.target.value)}
                                className="w-full bg-[#030303] border border-neutral-800 focus:border-cyan-500 text-white rounded-lg px-2.5 py-2 transition-all outline-none"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="block text-[10px] uppercase tracking-widest text-neutral-400 font-bold">
                                Event End Date
                            </label>
                            <input
                                type="datetime-local"
                                value={eventEndDate}
                                onChange={(e) => setEventEndDate(e.target.value)}
                                className="w-full bg-[#030303] border border-neutral-800 focus:border-cyan-500 text-white rounded-lg px-2.5 py-2 transition-all outline-none"
                            />
                        </div>

                    </div>

                    {/* Actions */}
                    <div className="flex gap-4 border-t border-neutral-900 pt-6">
                        <button
                            type="submit"
                            disabled={saving}
                            className="flex-grow bg-cyan-500 hover:bg-cyan-600 disabled:opacity-50 text-black font-semibold py-3 rounded-lg text-sm flex items-center justify-center gap-2 cursor-pointer transition-colors"
                        >
                            {saving && <Loader2 size={16} className="animate-spin" />}
                            <span>Save Event Configuration</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => navigate('/manage-event')}
                            className="bg-neutral-900 border border-neutral-800 hover:bg-neutral-800 text-neutral-400 font-semibold py-3 px-6 rounded-lg text-sm cursor-pointer transition-colors"
                        >
                            Cancel
                        </button>
                    </div>

                </div>

            </form>

        </div>
    );
}
