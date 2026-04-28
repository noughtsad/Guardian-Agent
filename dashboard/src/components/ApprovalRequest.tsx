import React, { useState, useEffect } from 'react';
import { Clock, Check, X, AlertTriangle } from 'lucide-react';
import type { ApprovalRequest as ApprovalRequestType } from '../api/client';
import { api } from '../api/client';

interface ApprovalRequestProps {
    approval: ApprovalRequestType;
}

export function ApprovalRequestCard({ approval }: ApprovalRequestProps) {
    const [timeLeft, setTimeLeft] = useState(0);
    const [rejectReason, setRejectReason] = useState('');
    const [showRejectInput, setShowRejectInput] = useState(false);
    const [processing, setProcessing] = useState(false);

    useEffect(() => {
        const createdAt = new Date(approval.createdAt).getTime();
        const expiresAt = createdAt + approval.timeoutSeconds * 1000;

        const update = () => {
            const now = Date.now();
            const remaining = Math.max(0, Math.ceil((expiresAt - now) / 1000));
            setTimeLeft(remaining);
        };

        update();
        const interval = setInterval(update, 1000);
        return () => clearInterval(interval);
    }, [approval]);

    const handleApprove = async () => {
        setProcessing(true);
        try {
            await api.approveRequest(approval.id);
        } catch (err) {
            console.error('Approve failed:', err);
        }
        setProcessing(false);
    };

    const handleReject = async () => {
        setProcessing(true);
        try {
            await api.rejectRequest(approval.id, rejectReason || 'Rejected by admin');
        } catch (err) {
            console.error('Reject failed:', err);
        }
        setProcessing(false);
        setShowRejectInput(false);
    };

    const urgency = timeLeft < 30 ? 'border-error animate-pulse-glow' :
        timeLeft < 60 ? 'border-brand-primary' : '';

    return (
        <div className={`soft-card p-5 animate-slide-up ${urgency}`}>
            <div className="flex items-start justify-between gap-3 mb-4">
                <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-error-container text-on-error-container">
                        <AlertTriangle size={18} />
                    </div>
                    <div>
                        <h3 className="font-semibold text-on-surface">Approval Required</h3>
                        <code className="text-sm font-mono text-brand-primary">{approval.toolCall.name}</code>
                    </div>
                </div>

                <div className="flex items-center gap-1.5 text-sm">
                    <Clock size={14} className={timeLeft < 30 ? 'text-error' : 'text-on-surface-variant'} />
                    <span className={timeLeft < 30 ? 'text-error font-medium' : 'text-on-surface-variant'}>
                        {timeLeft}s
                    </span>
                </div>
            </div>

            {/* Tool Input */}
            <div className="mb-4 p-3 bg-brand-bg rounded-lg border border-brand-border">
                <div className="text-xs text-on-surface-variant mb-1">Tool Input:</div>
                <pre className="text-sm font-mono text-on-surface overflow-x-auto max-h-40">
                    {JSON.stringify(approval.toolCall.input, null, 2)}
                </pre>
            </div>

            {/* Server */}
            <div className="text-xs text-on-surface-variant mb-4">
                Server: <span className="text-on-surface">{approval.toolCall.serverName}</span>
            </div>

            {/* Reject reason input */}
            {showRejectInput && (
                <div className="mb-4">
                    <input
                        type="text"
                        className="input-field text-sm"
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                        placeholder="Rejection reason (optional)"
                        autoFocus
                    />
                </div>
            )}

            {/* Action buttons */}
            <div className="flex gap-3">
                <button
                    onClick={handleApprove}
                    disabled={processing}
                    className="btn-success flex items-center gap-2 flex-1"
                >
                    <Check size={16} />
                    Approve
                </button>
                {showRejectInput ? (
                    <button
                        onClick={handleReject}
                        disabled={processing}
                        className="btn-danger flex items-center gap-2 flex-1"
                    >
                        <X size={16} />
                        Confirm Reject
                    </button>
                ) : (
                    <button
                        onClick={() => setShowRejectInput(true)}
                        disabled={processing}
                        className="btn-danger flex items-center gap-2 flex-1"
                    >
                        <X size={16} />
                        Reject
                    </button>
                )}
            </div>
        </div>
    );
}
