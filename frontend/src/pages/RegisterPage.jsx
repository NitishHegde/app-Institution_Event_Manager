import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import API from '../services/api';
import { User, Mail, Lock, Loader2, AlertCircle, School, CreditCard } from 'lucide-react';

export default function RegisterPage() {
    const { registerStudent, registerStaff } = useAuth();
    const navigate = useNavigate();

    // Form selection role: 'STUDENT' or 'STAFF'
    const [role, setRole] = useState('STUDENT');

    // Shared fields
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    // Student fields
    const [registrationId, setRegistrationId] = useState('');
    const [schoolId, setSchoolId] = useState('');

    // Dynamic database selections
    const [schools, setSchools] = useState([]);
    const [loadingSchools, setLoadingSchools] = useState(false);

    // Submission states
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState([]); // Array to store multiple validation errors

    // Fetch schools dropdown options on mount
    useEffect(() => {
        const fetchSchools = async () => {
            setLoadingSchools(true);
            try {
                const response = await API.get('/schools');
                setSchools(response.data);
                if (response.data.length > 0) {
                    setSchoolId(response.data[0].id);
                }
            } catch (err) {
                console.error('Error fetching schools:', err);
            } finally {
                setLoadingSchools(false);
            }
        };

        fetchSchools();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setErrors([]);
        setLoading(true);

        try {
            if (role === 'STUDENT') {
                if (!schoolId) {
                    setErrors([{ msg: 'Please select a valid school.' }]);
                    setLoading(false);
                    return;
                }
                await registerStudent({ name, email, password, registrationId, schoolId });
            } else {
                await registerStaff({ name, email, password });
            }
            // Navigate directly to login page so they can log in
            navigate('/login');
        } catch (err) {
            console.error('Registration error:', err);
            if (err.errors && Array.isArray(err.errors)) {
                setErrors(err.errors);
            } else {
                setErrors([{ msg: err.message || 'An error occurred during registration.' }]);
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex-grow flex items-center justify-center py-16 px-6">
            <div className="w-full max-w-lg bg-[#0A0A0A] border border-neutral-900 rounded-xl shadow-2xl p-8 relative overflow-hidden">
                
                {/* Background glows */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />

                <div className="flex flex-col items-center mb-6 relative z-10">
                    <div className="w-10 h-10 rounded bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center font-mono font-black text-black text-base tracking-tighter mb-4 shadow-lg">
                        CU
                    </div>
                    <h2 className="text-3xl font-light text-white tracking-tight text-center">
                        Create Account
                    </h2>
                    <p className="text-neutral-500 text-xs mt-2 uppercase tracking-widest font-mono">
                        Join college event arena
                    </p>
                </div>

                {/* Role Switcher Tabs */}
                <div className="flex bg-[#030303] border border-neutral-900 rounded-lg p-1 mb-8 relative z-10">
                    <button
                        type="button"
                        onClick={() => {
                            setRole('STUDENT');
                            setErrors([]);
                        }}
                        className={`flex-1 py-2 text-xs font-semibold font-mono uppercase tracking-wider rounded-md transition-all cursor-pointer ${
                            role === 'STUDENT'
                                ? 'bg-neutral-900 text-cyan-400 border border-neutral-800'
                                : 'text-neutral-500 hover:text-neutral-300'
                        }`}
                    >
                        Student Profile
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            setRole('STAFF');
                            setErrors([]);
                        }}
                        className={`flex-1 py-2 text-xs font-semibold font-mono uppercase tracking-wider rounded-md transition-all cursor-pointer ${
                            role === 'STAFF'
                                ? 'bg-neutral-900 text-cyan-400 border border-neutral-800'
                                : 'text-neutral-500 hover:text-neutral-300'
                        }`}
                    >
                        Staff Profile
                    </button>
                </div>

                {errors.length > 0 && (
                    <div className="mb-6 p-4 rounded-lg bg-red-950/20 border border-red-900/50 space-y-1.5 text-red-400 text-sm">
                        {errors.map((err, idx) => (
                            <div key={idx} className="flex items-start gap-2">
                                <AlertCircle className="shrink-0 mt-0.5" size={15} />
                                <span>{err.msg}</span>
                            </div>
                        ))}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5 relative z-10">
                    {/* Common Fields: Name */}
                    <div className="space-y-2">
                        <label className="block text-xs uppercase tracking-widest text-neutral-400 font-mono font-semibold">
                            Full Name
                        </label>
                        <div className="relative">
                            <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-neutral-500">
                                <User size={16} />
                            </span>
                            <input
                                type="text"
                                required
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="John Doe"
                                className="w-full bg-[#030303] border border-neutral-800 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 text-white rounded-lg pl-10 pr-4 py-3 text-sm transition-all outline-none placeholder:text-neutral-700"
                            />
                        </div>
                    </div>

                    {/* Common Fields: Email */}
                    <div className="space-y-2">
                        <label className="block text-xs uppercase tracking-widest text-neutral-400 font-mono font-semibold">
                            Institutional Email
                        </label>
                        <div className="relative">
                            <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-neutral-500">
                                <Mail size={16} />
                            </span>
                            <input
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="name@university.edu"
                                className="w-full bg-[#030303] border border-neutral-800 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 text-white rounded-lg pl-10 pr-4 py-3 text-sm transition-all outline-none placeholder:text-neutral-700"
                            />
                        </div>
                    </div>

                    {/* Student Specific Fields */}
                    {role === 'STUDENT' && (
                        <>
                            {/* Registration ID */}
                            <div className="space-y-2">
                                <label className="block text-xs uppercase tracking-widest text-neutral-400 font-mono font-semibold">
                                    Registration ID / Roll Number
                                </label>
                                <div className="relative">
                                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-neutral-500">
                                        <CreditCard size={16} />
                                    </span>
                                    <input
                                        type="text"
                                        required
                                        value={registrationId}
                                        onChange={(e) => setRegistrationId(e.target.value)}
                                        placeholder="e.g. 22BCS1024"
                                        className="w-full bg-[#030303] border border-neutral-800 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 text-white rounded-lg pl-10 pr-4 py-3 text-sm transition-all outline-none placeholder:text-neutral-700"
                                    />
                                </div>
                            </div>

                            {/* School Dropdown */}
                            <div className="space-y-2">
                                <label className="block text-xs uppercase tracking-widest text-neutral-400 font-mono font-semibold">
                                    Department / School
                                </label>
                                <div className="relative">
                                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-neutral-500">
                                        <School size={16} />
                                    </span>
                                    <select
                                        value={schoolId}
                                        onChange={(e) => setSchoolId(e.target.value)}
                                        className="w-full bg-[#030303] border border-neutral-800 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 text-white rounded-lg pl-10 pr-4 py-3 text-sm transition-all outline-none"
                                        disabled={loadingSchools}
                                    >
                                        {loadingSchools ? (
                                            <option>Loading schools...</option>
                                        ) : schools.length === 0 ? (
                                            <option>No schools available</option>
                                        ) : (
                                            schools.map((sch) => (
                                                <option key={sch.id} value={sch.id} className="bg-[#0A0A0A]">
                                                    {sch.school_name}
                                                </option>
                                            ))
                                        )}
                                    </select>
                                </div>
                            </div>
                        </>
                    )}

                    {/* Common Fields: Password */}
                    <div className="space-y-2">
                        <label className="block text-xs uppercase tracking-widest text-neutral-400 font-mono font-semibold">
                            Password
                        </label>
                        <div className="relative">
                            <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-neutral-500">
                                <Lock size={16} />
                            </span>
                            <input
                                type="password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                className="w-full bg-[#030303] border border-neutral-800 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 text-white rounded-lg pl-10 pr-4 py-3 text-sm transition-all outline-none placeholder:text-neutral-700"
                            />
                        </div>
                        <p className="text-[10px] text-neutral-600 font-mono">Minimum 6 characters long</p>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-white text-black font-semibold hover:bg-neutral-200 active:scale-[0.98] transition-all py-3 rounded-lg text-sm flex items-center justify-center gap-2 cursor-pointer shadow-md disabled:opacity-50 disabled:cursor-not-allowed mt-4"
                    >
                        {loading ? (
                            <>
                                <Loader2 className="animate-spin" size={16} />
                                <span>Creating account...</span>
                            </>
                        ) : (
                            <span>Register</span>
                        )}
                    </button>
                </form>

                <div className="mt-8 text-center text-xs text-neutral-500 font-mono relative z-10">
                    Already have an account?{' '}
                    <Link to="/login" className="text-cyan-400 hover:text-cyan-300 transition-colors underline underline-offset-4">
                        Login here
                    </Link>
                </div>
            </div>
        </div>
    );
}
