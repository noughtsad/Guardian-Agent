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
            <div className="text-center py-8 text-surface-500">
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
                        className={`glass-card p-4 animate-fade-in ${turn.blocked ? 'border-red-500/30' : ''
                            }`}
                    >
                        <div className="flex items-start gap-3">
                            {/* Avatar */}
                            <div className={`p-2 rounded-lg ${turn.role === 'user'
                                    ? 'bg-brand-600/20 text-brand-400'
                                    : turn.role === 'assistant'
                                        ? 'bg-emerald-600/20 text-emerald-400'
                                        : 'bg-surface-600/20 text-surface-400'
                                }`}>
                                {turn.role === 'user' ? <User size={16} /> :
                                    turn.role === 'assistant' ? <Bot size={16} /> :
                                        <Wrench size={16} />}
                            </div>

                            <div className="flex-1 min-w-0">
                                {/* Header */}
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="text-sm font-medium text-surface-300 capitalize">
                                        {turn.role}
                                    </span>
                                    {turn.toolName && (
                                        <code className="px-1.5 py-0.5 bg-surface-900/80 rounded text-xs font-mono text-brand-300">
                                            {turn.toolName}
                                        </code>
                                    )}
                                    {turn.blocked && (
                                        <span className="badge-block flex items-center gap-1">
                                            <ShieldAlert size={10} />
                                            BLOCKED
                                        </span>
                                    )}
                                    <span className="text-xs text-surface-600 ml-auto">
                                        {new Date(turn.createdAt).toLocaleTimeString()}
                                    </span>
                                </div>

                                {/* Content */}
                                {turn.content && (
                                    <div className="text-sm text-surface-200 whitespace-pre-wrap break-words">
                                        {turn.content}
                                    </div>
                                )}

                                {/* Block Reason */}
                                {turn.blockReason && (
                                    <div className="mt-2 p-2 bg-red-500/10 rounded-lg border border-red-500/20 text-xs text-red-300">
                                        ⚠️ {turn.blockReason}
                                    </div>
                                )}

                                {/* Tool Input/Output */}
                                {turn.toolInput && (
                                    <details className="mt-2">
                                        <summary className="text-xs text-surface-500 cursor-pointer hover:text-surface-400">
                                            Tool Input
                                        </summary>
                                        <pre className="mt-1 p-2 bg-surface-900/80 rounded text-xs font-mono text-surface-300 overflow-x-auto">
                                            {JSON.stringify(JSON.parse(turn.toolInput), null, 2)}
                                        </pre>
                                    </details>
                                )}
                                {turn.toolResult && !turn.content && (
                                    <details className="mt-2" open>
                                        <summary className="text-xs text-surface-500 cursor-pointer hover:text-surface-400">
                                            Tool Result
                                        </summary>
                                        <pre className="mt-1 p-2 bg-surface-900/80 rounded text-xs font-mono text-surface-300 overflow-x-auto max-h-48">
                                            {(() => {
                                                try { return JSON.stringify(JSON.parse(turn.toolResult), null, 2); }
                                                catch { return turn.toolResult; }
                                            })()}
                                        </pre>
                                    </details>
                                )}

                                {/* Token info */}
                                {(turn.tokensIn > 0 || turn.tokensOut > 0) && (
                                    <div className="mt-2 text-xs text-surface-600">
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
