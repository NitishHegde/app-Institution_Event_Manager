import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, MapPin, Mail, Phone, Globe, Trophy, Loader2 } from 'lucide-react';
import { eventService } from '../services/eventService';

export default function LandingPage() {
    const [events, setEvents] = useState([]);
    const [activeSlide, setActiveSlide] = useState(0);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchLandingData = async () => {
            try {
                const data = await eventService.getPublicLandingEvents();
                setEvents(data);
            } catch (err) {
                console.error("Pipeline connectivity error loading live events.");
            } finally {
                setLoading(false);
            }
        };
        fetchLandingData();
    }, []);

    useEffect(() => {
        if (events.length <= 1) return;
        const sliderInterval = setInterval(() => {
            setActiveSlide((prev) => (prev + 1) % events.length);
        }, 5000);
        return () => clearInterval(sliderInterval);
    }, [events]);

    return (
        <div className="flex flex-col min-h-screen justify-between bg-[#030303]">

            {/* NAVBAR */}
            <nav className="border-b border-neutral-900 bg-[#030303]/80 backdrop-blur-md sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        {/* Logo box with requested letters CU */}
                        <div className="w-9 h-9 rounded bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center font-mono font-black text-black text-sm tracking-tighter">
                            CU
                        </div>
                        {/* Updated Portal Name to Ayojana */}
                        <span className="inline-block text-xl font-black tracking-[0.2em] bg-gradient-to-r from-white via-neutral-100 to-cyan-400 bg-clip-text text-transparent font-mono uppercase transition-all duration-300 hover:tracking-[0.25em] cursor-default select-none">
                            AYOJANA
                        </span>
                    </div>

                    <div className="flex items-center gap-8">
                        <Link to="/login" className="text-sm font-medium text-neutral-400 hover:text-white transition-colors">
                            Login
                        </Link>
                        <Link to="/register" className="text-sm font-medium bg-white text-black hover:bg-neutral-200 transition-all px-5 py-2 rounded-full font-semibold">
                            Register
                        </Link>
                    </div>
                </div>
            </nav>

            {/* HERO SECTION */}
            <main className="flex-grow max-w-7xl mx-auto px-6 pt-16 pb-24 w-full grid grid-cols-1 lg:grid-cols-12 gap-16 items-center">

                {/* Left Typography Block */}
                <div className="lg:col-span-5 space-y-6">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/30 border border-cyan-900/50 text-cyan-400 text-xs font-mono tracking-wider uppercase">
                        <Trophy size={12} /> Unleash Your Potential
                    </div>

                    {/* Tagline updated with the original electric blue shade accent */}
                    <h1 className="text-5xl md:text-6xl font-light tracking-tight text-white leading-[1.1]">
                        Where Passion meets <br />
                        <span className="font-serif italic font-normal text-cyan-400 bg-gradient-to-r from-cyan-400 to-emerald-400 bg-clip-text text-transparent">
                            Pure Performance.
                        </span>
                    </h1>

                    <p className="text-neutral-400 text-base md:text-lg font-light leading-relaxed max-w-xl">
                        Step onto the stage, Team up with the brightest minds, and Turn your skills into Victories. Discover upcoming fests, hackathons, games and cultural battles happening live across the campus.
                    </p>
                </div>

                {/* Right Dynamic Card Carousel with Full Color Image Window */}
                <div className="lg:col-span-7 w-full flex flex-col justify-center">
                    <div className="mb-4 flex items-center justify-between px-1">
                        <span className="text-xs uppercase tracking-widest text-neutral-500 font-bold font-mono">Spotlight Arena</span>
                        {!loading && events.length > 0 && (
                            <span className="text-xs text-neutral-400 font-mono">0{activeSlide + 1} / 0{events.length}</span>
                        )}
                    </div>

                    <div className="relative min-h-[340px] w-full rounded-xl bg-[#0A0A0A] border border-neutral-900 shadow-2xl overflow-hidden grid grid-cols-1 md:grid-cols-12">

                        {loading ? (
                            <div className="col-span-12 flex flex-col items-center justify-center text-neutral-600 gap-3 p-12">
                                <Loader2 className="animate-spin text-cyan-400" size={24} />
                                <span className="text-xs font-mono tracking-widest uppercase text-neutral-500">Syncing Live Grid...</span>
                            </div>
                        ) : events.length === 0 ? (
                            <div className="col-span-12 flex flex-col items-center justify-center text-neutral-500 text-center p-12 space-y-3">
                                <Calendar size={32} className="text-neutral-800" />
                                <p className="text-sm font-medium text-neutral-300">The stage is currently quiet</p>
                                <p className="text-xs max-w-xs text-neutral-500 font-light">New events and tournament brackets will appear here as soon as they are declared live.</p>
                            </div>
                        ) : (
                            <>
                                {/* CAROUSEL IMAGE WINDOW - VIVID FULL COLOR MAP */}
                                <div className="md:col-span-5 relative min-h-[200px] md:min-h-full bg-neutral-900 overflow-hidden border-b md:border-b-0 md:border-r border-neutral-900">
                                    <img
                                        src={
                                            events[activeSlide].poster_file_id
                                                ? `http://localhost:5000/api/public/events/poster/${events[activeSlide].poster_file_id}`
                                                : "https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=800&q=80"
                                        }
                                        alt={events[activeSlide].event_name}
                                        className="absolute inset-0 w-full h-full object-cover opacity-95 transition-all duration-500 ease-in-out"
                                    />
                                    {/* Soft fading gradient edge to bleed smoothly into the content background */}
                                    <div className="absolute inset-0 bg-gradient-to-t md:bg-gradient-to-r from-transparent to-[#0A0A0A]" />
                                </div>

                                {/* CONTENT WINDOW */}
                                <div className="md:col-span-7 p-8 flex flex-col justify-between space-y-6">
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-2">
                                            <span className="px-2.5 py-0.5 rounded bg-neutral-900 border border-neutral-800 text-cyan-400 text-[10px] font-mono tracking-wider font-bold">
                                                {events[activeSlide].participation_type}
                                            </span>
                                            <span className="w-1 h-1 rounded-full bg-cyan-400 animate-pulse" />
                                        </div>

                                        <h3 className="text-2xl font-bold tracking-tight text-white line-clamp-2">
                                            {events[activeSlide].event_name}
                                        </h3>

                                        <p className="text-neutral-400 text-sm leading-relaxed font-light line-clamp-3">
                                            {events[activeSlide].short_description || "No description provided. Join inside to discover the full rulebook rules and criteria."}
                                        </p>
                                    </div>

                                    {/* Metadata Indicators */}
                                    <div className="border-t border-neutral-900/60 pt-4 flex flex-wrap gap-4 items-center text-xs text-neutral-400 font-medium">
                                        <div className="flex items-center gap-2">
                                            <Calendar size={13} className="text-cyan-500" />
                                            <span>
                                                {new Date(events[activeSlide].event_start_date).toLocaleDateString(undefined, {
                                                    month: 'short',
                                                    day: 'numeric',
                                                    year: 'numeric'
                                                })}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <MapPin size={13} className="text-indigo-400" />
                                            <span className="line-clamp-1">{events[activeSlide].venue || "Campus Arena"}</span>
                                        </div>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>

                    {/* Dots Indicator Interface */}
                    {!loading && events.length > 1 && (
                        <div className="flex justify-center gap-1.5 mt-6">
                            {events.map((_, index) => (
                                <button
                                    key={index}
                                    onClick={() => setActiveSlide(index)}
                                    className={`h-1 rounded-full transition-all duration-300 ${index === activeSlide ? 'w-6 bg-cyan-500' : 'w-1.5 bg-neutral-800'
                                        }`}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </main>

            {/* FOOTER */}
            <footer className="border-t border-neutral-950 bg-[#010101] py-12 text-sm text-neutral-600 font-mono">
                <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-8 items-center">
                    <div>
                        <p className="font-semibold text-neutral-400 mb-1">Ayojana Execution Framework</p>
                        <p className="text-xs text-neutral-600">Powered by centralized database sync routing.</p>
                    </div>

                    <div className="flex flex-col md:items-center space-y-1 text-xs">
                        <span>Contact: admin-portal@university.edu</span>
                        <span>Internal Ext: 4092</span>
                    </div>

                    <div className="flex md:justify-end">
                        <a href="#" className="hover:text-neutral-400 transition-colors flex items-center gap-1 text-xs uppercase tracking-wider">
                            <Globe size={12} /> Institutional Main Domain
                        </a>
                    </div>
                </div>
            </footer>

        </div>
    );
}