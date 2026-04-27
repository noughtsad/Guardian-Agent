import React from 'react';

interface TokenUsageBarProps {
    tokensIn: number;
    tokensOut: number;
}

// Gemini 2.5 Flash pricing (per million tokens)
const COST_PER_M_INPUT = 0.15;
const COST_PER_M_OUTPUT = 0.60;

export function TokenUsageBar({ tokensIn, tokensOut }: TokenUsageBarProps) {
    const totalTokens = tokensIn + tokensOut;
    const cost = (tokensIn / 1_000_000) * COST_PER_M_INPUT + (tokensOut / 1_000_000) * COST_PER_M_OUTPUT;
    const inputPct = totalTokens > 0 ? (tokensIn / totalTokens) * 100 : 50;

    return (
        <div className="glass-card p-4">
            <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-surface-300">Token Usage</span>
                <span className="text-sm font-mono text-brand-400">
                    ${cost.toFixed(6)}
                </span>
            </div>

            {/* Bar */}
            <div className="h-2 bg-surface-900 rounded-full overflow-hidden mb-2">
                <div className="h-full flex">
                    <div
                        className="bg-brand-500 transition-all duration-500"
                        style={{ width: `${inputPct}%` }}
                    />
                    <div
                        className="bg-emerald-500 transition-all duration-500"
                        style={{ width: `${100 - inputPct}%` }}
                    />
                </div>
            </div>

            {/* Legend */}
            <div className="flex justify-between text-xs text-surface-500">
                <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-brand-500" />
                    Input: {tokensIn.toLocaleString()}
                </div>
                <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-emerald-500" />
                    Output: {tokensOut.toLocaleString()}
                </div>
            </div>
        </div>
    );
}
