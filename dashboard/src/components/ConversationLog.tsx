import React from 'react';
import { User, Bot, Wrench, ShieldAlert } from 'lucide-react';
import type { ConversationTurn } from '../api/client';
import { TokenUsageBar } from './TokenUsageBar';

interface ConversationLogProps {
    turns: ConversationTurn[];
    totalTokensIn: number;
    totalTokensOut: number;
}

export function ConversationLog({ turns, totalTokensIn, totalTokensOut }: ConversationLogProps) {
    if (turns.length === 0) {
        return (
            <div className="text-center py-8 text-on-surface-variant">
                No conversation turns yet
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <TokenUsageBar tokensIn={totalTokensIn} tokensOut={totalTokensOut} />

            <div className="space-y-3">
                {turns.map((turn) => (
                    <div
                        key={turn.id}
                        className={`soft-card p-4 animate-fade-in ${turn.blocked ? 'border-error' : ''
                            }`}
                    >
                        <div className="flex items-start gap-3">
                            {/* Avatar */}
                            <div className={`p-2 rounded-lg ${turn.role === 'user'
                                ? 'bg-brand-primary/10 text-brand-primary'
                                : turn.role === 'assistant'
                                    ? 'bg-brand-tertiary/20 text-tertiary'
                                    : 'bg-brand-secondary/20 text-brand-secondary'
                                }`}>
                                {turn.role === 'user' ? <User size={16} /> :
                                    turn.role === 'assistant' ? <Bot size={16} /> :
                                        <Wrench size={16} />}
                            </div>

                            <div className="flex-1 min-w-0">
                                {/* Header */}
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="text-sm font-medium text-on-surface capitalize">
                                        {turn.role}
                                    </span>
                                    {turn.toolName && (
                                        <code className="px-1.5 py-0.5 bg-brand-bg border border-brand-border rounded text-xs font-mono text-brand-primary">
                                            {turn.toolName}
                                        </code>
                                    )}
                                    {turn.blocked && (
                                        <span className="badge-block flex items-center gap-1">
                                            <ShieldAlert size={10} />
                                            BLOCKED
                                        </span>
                                    )}
                                    <span className="text-xs text-on-surface-variant ml-auto">
                                        {new Date(turn.createdAt).toLocaleTimeString()}
                                    </span>
                                </div>

                                {/* Content */}
                                {turn.content && (
                                    <div className="text-sm text-on-surface whitespace-pre-wrap break-words">
                                        {turn.content}
                                    </div>
                                )}

                                {/* Block Reason */}
                                {turn.blockReason && (
                                    <div className="mt-2 p-2 bg-error-container rounded-lg border border-error-container text-xs text-on-error-container">
                                        ⚠️ {turn.blockReason}
                                    </div>
                                )}

                                {/* Tool Input/Output */}
                                {turn.toolInput && (
                                    <details className="mt-2">
                                        <summary className="text-xs text-on-surface-variant cursor-pointer hover:text-on-surface">
                                            Tool Input
                                        </summary>
                                        <pre className="mt-1 p-2 bg-brand-bg rounded text-xs font-mono text-on-surface overflow-x-auto border border-brand-border">
                                            {JSON.stringify(JSON.parse(turn.toolInput), null, 2)}
                                        </pre>
                                    </details>
                                )}
                                {turn.toolResult && !turn.content && (
                                    <details className="mt-2" open>
                                        <summary className="text-xs text-on-surface-variant cursor-pointer hover:text-on-surface">
                                            Tool Result
                                        </summary>
                                        <pre className="mt-1 p-2 bg-brand-bg rounded text-xs font-mono text-on-surface overflow-x-auto max-h-48 border border-brand-border">
                                            {(() => {
                                                try { return JSON.stringify(JSON.parse(turn.toolResult), null, 2); }
                                                catch { return turn.toolResult; }
                                            })()}
                                        </pre>
                                    </details>
                                )}

                                {/* Token info */}
                                {(turn.tokensIn > 0 || turn.tokensOut > 0) && (
                                    <div className="mt-2 text-xs text-on-surface-variant">
                                        Tokens: {turn.tokensIn} in / {turn.tokensOut} out
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
