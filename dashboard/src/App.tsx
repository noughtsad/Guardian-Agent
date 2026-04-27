import React from 'react';
import { Routes, Route, NavLink, Navigate } from 'react-router-dom';
import { Shield, MessageSquare, AlertTriangle, Activity } from 'lucide-react';
import { RulesPage } from './pages/RulesPage';
import { ConversationsPage } from './pages/ConversationsPage';
import { ApprovalPage } from './pages/ApprovalPage';
import { useWebSocket } from './hooks/useWebSocket';
import { useRuleStore } from './store/ruleStore';

const navItems = [
    { to: '/rules', label: 'Rules', icon: Shield },
    { to: '/conversations', label: 'Conversations', icon: MessageSquare },
    { to: '/approvals', label: 'Approvals', icon: AlertTriangle },
];

export default function App() {
    // Establish WebSocket connection
    useWebSocket();
    const approvals = useRuleStore((s) => s.approvals);
    const pendingCount = approvals.filter(a => a.status === 'pending').length;

    return (
        <div className="min-h-screen bg-surface-950 flex">
            {/* Sidebar */}
            <aside className="w-64 bg-surface-900/50 border-r border-surface-800 flex flex-col fixed h-full">
                {/* Logo */}
                <div className="p-6 border-b border-surface-800">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-gradient-to-br from-brand-600 to-brand-800 shadow-lg shadow-brand-600/20">
                            <Shield size={22} className="text-white" />
                        </div>
                        <div>
                            <h1 className="text-lg font-bold text-white tracking-tight">ArmorIQ</h1>
                            <p className="text-xs text-surface-400">Guarded AI Agent</p>
                        </div>
                    </div>
                </div>

                {/* Navigation */}
                <nav className="flex-1 p-4 space-y-1">
                    {navItems.map(({ to, label, icon: Icon }) => (
                        <NavLink
                            key={to}
                            to={to}
                            className={({ isActive }) =>
                                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${isActive
                                    ? 'bg-brand-600/20 text-brand-400 shadow-sm'
                                    : 'text-surface-400 hover:text-surface-200 hover:bg-surface-800/50'
                                }`
                            }
                        >
                            <Icon size={18} />
                            <span>{label}</span>
                            {label === 'Approvals' && pendingCount > 0 && (
                                <span className="ml-auto px-2 py-0.5 text-xs font-bold bg-red-500 text-white rounded-full animate-pulse">
                                    {pendingCount}
                                </span>
                            )}
                        </NavLink>
                    ))}
                </nav>

                {/* Footer */}
                <div className="p-4 border-t border-surface-800">
                    <div className="flex items-center gap-2 text-xs text-surface-600">
                        <Activity size={12} className="text-emerald-500" />
                        <span>System Online</span>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 ml-64 p-8">
                <div className="max-w-5xl mx-auto">
                    <Routes>
                        <Route path="/" element={<Navigate to="/rules" replace />} />
                        <Route path="/rules" element={<RulesPage />} />
                        <Route path="/conversations" element={<ConversationsPage />} />
                        <Route path="/approvals" element={<ApprovalPage />} />
                    </Routes>
                </div>
            </main>
        </div>
    );
}
