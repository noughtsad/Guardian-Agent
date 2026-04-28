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
        <div className="min-h-screen bg-transparent flex text-on-surface">
            {/* Sidebar */}
            <aside className="w-64 bg-brand-neutral border-r border-brand-border flex flex-col fixed h-full z-10 shadow-ambient-sm">
                {/* Logo */}
                <div className="p-6 border-b border-brand-border">
                    <div className="flex items-center gap-3">
                        {/* <div className="p-2 rounded-xl bg-brand-primary/10 relative group">
                            <Shield size={22} className="text-brand-primary group-hover:scale-110 transition-transform duration-300" />
                        </div> */}
                        <div>
                            <h1 className="text-lg font-bold text-brand-primary tracking-tight">Guardian Agent</h1>
                            <p className="text-xs text-on-surface-variant">Admin Dashboard</p>
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
                                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-300 relative group ${isActive
                                    ? 'bg-brand-primary/10 text-brand-primary shadow-ambient-sm'
                                    : 'text-on-surface-variant hover:text-on-surface hover:bg-black/5'
                                }`
                            }
                        >
                            <Icon size={18} className={`transition-transform duration-300 group-hover:scale-110`} />
                            <span>{label}</span>
                            {label === 'Approvals' && pendingCount > 0 && (
                                <span className="ml-auto px-2 py-0.5 text-xs font-bold bg-error text-on-error rounded-full animate-pulse">
                                    {pendingCount}
                                </span>
                            )}
                        </NavLink>
                    ))}
                </nav>

                {/* Footer */}
                <div className="p-4 border-t border-brand-border">
                    <div className="flex items-center gap-2 text-xs text-on-surface-variant">
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
