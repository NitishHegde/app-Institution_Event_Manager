import React from 'react';
import { Outlet } from 'react-router-dom';

export default function PublicLayout() {
    return (
        <div className="min-h-screen bg-[#030303] text-[#E5E5E5] font-sans relative overflow-x-hidden selection:bg-cyan-500 selection:text-black">
            {/* Ambient Background Layer */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
                {/* Structural Engineering Grid Lines over Pure Black with subtle blue tint */}
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#06b6d405_1px,transparent_1px),linear-gradient(to_bottom,#06b6d405_1px,transparent_1px)] bg-[size:4rem_4rem]" />

                {/* Ultra-faint minimalist ambient smoke glows */}
                <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-cyan-950/10 blur-[150px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-neutral-900/30 blur-[150px]" />
            </div>

            <div className="relative z-10 flex flex-col min-h-screen">
                <Outlet />
            </div>
        </div>
    );
}