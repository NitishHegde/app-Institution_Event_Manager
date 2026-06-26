import React from 'react';
import { Link, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogOut } from 'lucide-react';

export default function Navbar() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    if (!user) return null;

    const isStudent = user.role === 'STUDENT';

    // Parse path to see if editing an event
    const match = location.pathname.match(/^\/manage-event\/([^/]+)/);
    // Exclude subroutes like "new" or any other non-id strings if any
    const editingEventId = match && match[1] && !['new'].includes(match[1]) ? match[1] : null;
    const isEditingEventMode = editingEventId && !isStudent;

    let navLinks = [];
    if (isEditingEventMode) {
        navLinks = [
            { name: 'Details', path: `/manage-event/${editingEventId}` },
            { name: 'Attendance', path: `/manage-event/${editingEventId}/attendance` },
            { name: 'Podium', path: `/manage-event/${editingEventId}/podium` },
        ];
    } else {
        navLinks = isStudent
            ? [
                { name: 'Participation', path: '/participation' },
                { name: 'Analytics', path: '/analytics' },
                { name: 'Coordination', path: '/coordination' },
                { name: 'Profile', path: '/profile' },
            ]
            : [
                { name: 'Analytics', path: '/analytics' },
                { name: 'Manage Event', path: '/manage-event' },
                { name: 'Find a Student', path: '/find-student' },
                { name: 'Profile', path: '/profile' },
            ];
    }

    const handleLogout = async () => {
        navigate('/');
        await logout();
    };

    return (
        <nav className="border-b border-neutral-900 bg-[#030303]/80 backdrop-blur-md sticky top-0 z-50">
            <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">

                {/* Logo and Branding Link to /home */}
                <Link to="/home" className="flex items-center gap-3 group">
                    <div className="w-9 h-9 rounded bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center font-mono font-black text-black text-sm tracking-tighter">
                        CU
                    </div>
                    <span className="inline-block text-xl font-black tracking-[0.2em] bg-gradient-to-r from-white via-neutral-100 to-cyan-400 bg-clip-text text-transparent font-mono uppercase transition-all duration-300 group-hover:tracking-[0.25em] cursor-pointer select-none">
                        AYOJANA
                    </span>
                </Link>

                {/* Role Specific Navigation Links */}
                <div className="flex items-center gap-8 font-mono text-xs uppercase tracking-wider">
                    {isEditingEventMode && (
                        <Link
                            to="/manage-event"
                            className="text-neutral-500 hover:text-cyan-400 transition-colors font-bold mr-4"
                        >
                            &larr; Back to Manage Event
                        </Link>
                    )}
                    {navLinks.map((link) => (
                        <NavLink
                            key={link.path}
                            to={link.path}
                            className={({ isActive }) =>
                                `transition-colors duration-200 hover:text-white ${isActive ? 'text-cyan-400 font-bold' : 'text-neutral-500'
                                }`
                            }
                        >
                            {link.name}
                        </NavLink>
                    ))}

                    {/* Logout Button */}
                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-1.5 text-neutral-500 hover:text-red-400 transition-colors duration-200 cursor-pointer font-bold"
                    >
                        <LogOut size={13} />
                        <span>Logout</span>
                    </button>
                </div>

            </div>
        </nav>
    );
}
