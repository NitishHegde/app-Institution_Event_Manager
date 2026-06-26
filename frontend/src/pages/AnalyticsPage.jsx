import React, { useState } from 'react';
import IndividualEventStats from '../components/analytics/IndividualEventStats';
import OrganizationStats from '../components/analytics/OrganizationStats';

export default function AnalyticsPage() {
    const [activeTab, setActiveTab] = useState('individual'); // 'individual' or 'organization'

    return (
        <div className="max-w-7xl mx-auto px-6 py-10 w-full space-y-8 flex flex-col min-h-[calc(100vh-80px)]">
            
            {/* Page Header */}
            <div className="border-b border-neutral-900 pb-6 space-y-4">
                <div>
                    <h1 className="text-3xl font-light text-white leading-tight">Analytics Hub</h1>
                    <p className="text-neutral-500 text-xs font-mono uppercase tracking-widest mt-1">
                        Platform-wide engagement metrics and historical event analysis
                    </p>
                </div>

                {/* Tabs */}
                <div className="flex items-center gap-2 pt-2">
                    <button
                        onClick={() => setActiveTab('individual')}
                        className={`px-5 py-2.5 rounded-lg text-xs font-mono uppercase tracking-wider transition-all duration-300 ${
                            activeTab === 'individual' 
                            ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20' 
                            : 'bg-neutral-900/50 text-neutral-500 hover:bg-neutral-900 hover:text-neutral-300 border border-transparent'
                        }`}
                    >
                        Individual Event
                    </button>
                    <button
                        onClick={() => setActiveTab('organization')}
                        className={`px-5 py-2.5 rounded-lg text-xs font-mono uppercase tracking-wider transition-all duration-300 ${
                            activeTab === 'organization' 
                            ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' 
                            : 'bg-neutral-900/50 text-neutral-500 hover:bg-neutral-900 hover:text-neutral-300 border border-transparent'
                        }`}
                    >
                        Organization Wide
                    </button>
                </div>
            </div>

            {/* Tab Content */}
            <div className="flex-grow">
                {activeTab === 'individual' ? <IndividualEventStats /> : <OrganizationStats />}
            </div>

        </div>
    );
}
