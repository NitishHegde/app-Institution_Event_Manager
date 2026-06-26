import React from 'react';

function PlaceholderLayout({ title, description }) {
    return (
        <div className="flex-grow flex items-center justify-center py-16 px-6">
            <div className="w-full max-w-lg bg-[#0A0A0A] border border-neutral-900 rounded-xl shadow-2xl p-8 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />
                <div className="flex flex-col items-center text-center">
                    <div className="w-10 h-10 rounded bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center font-mono font-black text-black text-sm tracking-tighter mb-4">
                        CU
                    </div>
                    <h2 className="text-2xl font-light text-white tracking-tight">{title}</h2>
                    <p className="text-neutral-500 text-xs mt-2 uppercase tracking-widest font-mono">Workspace Module</p>
                    <p className="text-neutral-400 text-sm mt-6 leading-relaxed font-light">{description}</p>
                </div>
            </div>
        </div>
    );
}

export function ParticipationPage() {
    return (
        <PlaceholderLayout
            title="Participation Registry"
            description="Your active event participations, historical attendance, and podium awards will display here once loaded from the student hub registry."
        />
    );
}



export function CoordinationPage() {
    return (
        <PlaceholderLayout
            title="Coordination Deck"
            description="Events where you are designated as a Faculty or Student Coordinator will display tracking boards and result sheets here."
        />
    );
}

export function ProfilePage() {
    return (
        <PlaceholderLayout
            title="User Settings"
            description="Manage your institutional email links, profile metadata credentials, passwords, and notification channels in this panel."
        />
    );
}

export function AttendancePage() {
    return (
        <PlaceholderLayout
            title="Attendance Registry"
            description="Track real-time check-ins, record manual attendance, and download participant sheets for this event."
        />
    );
}

export function PodiumPage() {
    return (
        <PlaceholderLayout
            title="Podium Awards"
            description="Declare winners, record podium positions, and award certifications for this event."
        />
    );
}

export function FindStudentPage() {
    return (
        <PlaceholderLayout
            title="Student Directory"
            description="Search engine to audit student achievements, attendance logs, and event records across all university departments."
        />
    );
}
