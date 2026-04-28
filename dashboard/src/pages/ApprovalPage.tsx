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
                <div className="p-2.5 rounded-xl bg-error-container text-on-error-container">
                    <AlertTriangle size={24} />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-on-surface">Approvals</h1>
                    <p className="text-sm text-on-surface-variant">
                        {pendingApprovals.length} pending approval{pendingApprovals.length !== 1 ? 's' : ''}
                    </p>
                </div>
            </div>

            {/* Pending Approvals */}
            {pendingApprovals.length === 0 ? (
                <div className="soft-card p-12 text-center shadow-none border-dashed border-2 hover:border-brand-primary/30">
                    <CheckCircle size={48} className="mx-auto text-brand-tertiary mb-4" />
                    <h3 className="text-lg font-medium text-on-surface mb-2">All clear!</h3>
                    <p className="text-on-surface-variant">No pending approval requests. They'll appear here in real-time.</p>
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
