import React, { useEffect } from 'react';
import { AlertTriangle, CheckCircle } from 'lucide-react';
import { ApprovalRequestCard } from '../components/ApprovalRequest';
import { useRuleStore } from '../store/ruleStore';
import { api } from '../api/client';

export function ApprovalPage() {
    const { approvals, setApprovals } = useRuleStore();

    useEffect(() => {
        api.getPendingApprovals().then(setApprovals).catch(console.error);
    }, [setApprovals]);

    const pendingApprovals = approvals.filter(a => a.status === 'pending');

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-amber-600/20 text-amber-400">
                    <AlertTriangle size={24} />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-white">Approvals</h1>
                    <p className="text-sm text-surface-400">
                        {pendingApprovals.length} pending approval{pendingApprovals.length !== 1 ? 's' : ''}
                    </p>
                </div>
            </div>

            {/* Pending Approvals */}
            {pendingApprovals.length === 0 ? (
                <div className="glass-card p-12 text-center">
                    <CheckCircle size={48} className="mx-auto text-emerald-600 mb-4" />
                    <h3 className="text-lg font-medium text-surface-300 mb-2">All clear!</h3>
                    <p className="text-surface-500">No pending approval requests. They'll appear here in real-time.</p>
                </div>
            ) : (
                <div className="grid gap-4">
                    {pendingApprovals.map((approval) => (
                        <ApprovalRequestCard key={approval.id} approval={approval} />
                    ))}
                </div>
            )}
        </div>
    );
}
