import React from 'react';
import { Shield, ShieldAlert, Clock, Wand2, ToggleLeft, ToggleRight, Trash2 } from 'lucide-react';
import type { Rule } from '../api/client';

interface RuleCardProps {
    rule: Rule;
    onToggle: (id: string, enabled: boolean) => void;
    onDelete: (id: string) => void;
    onEdit: (rule: Rule) => void;
}

const RULE_TYPE_CONFIG: Record<string, { icon: any; color: string; badgeClass: string }> = {
    BLOCK: { icon: ShieldAlert, color: 'text-red-400', badgeClass: 'badge-block' },
    REQUIRE_APPROVAL: { icon: Clock, color: 'text-amber-400', badgeClass: 'badge-approval' },
    INPUT_VALIDATION: { icon: Shield, color: 'text-purple-400', badgeClass: 'badge-validation' },
    TRANSFORM: { icon: Wand2, color: 'text-blue-400', badgeClass: 'badge-transform' },
};

export function RuleCard({ rule, onToggle, onDelete, onEdit }: RuleCardProps) {
    const config = RULE_TYPE_CONFIG[rule.ruleType] || RULE_TYPE_CONFIG.BLOCK;
    const Icon = config.icon;

    return (
        <div
            className={`glass-card-hover p-5 animate-fade-in cursor-pointer ${!rule.enabled ? 'opacity-50' : ''
                }`}
            onClick={() => onEdit(rule)}
        >
            <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className={`p-2 rounded-lg bg-surface-700/50 ${config.color}`}>
                        <Icon size={18} />
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-white truncate">{rule.name}</h3>
                            <span className={config.badgeClass}>{rule.ruleType.replace('_', ' ')}</span>
                        </div>
                        <div className="flex items-center gap-3 text-sm text-surface-400">
                            <code className="px-1.5 py-0.5 bg-surface-900/80 rounded text-brand-300 font-mono text-xs">
                                {rule.toolPattern}
                            </code>
                            <span>Priority: {rule.priority}</span>
                        </div>
                        {rule.condition && (
                            <div className="mt-2 text-xs text-surface-500">
                                Condition: <code className="text-surface-300">{rule.condition.field} {rule.condition.operator} "{rule.condition.value}"</code>
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                    <button
                        onClick={() => onToggle(rule.id, !rule.enabled)}
                        className={`p-1 rounded transition-colors ${rule.enabled ? 'text-emerald-400 hover:text-emerald-300' : 'text-surface-500 hover:text-surface-400'
                            }`}
                        title={rule.enabled ? 'Disable rule' : 'Enable rule'}
                    >
                        {rule.enabled ? <ToggleRight size={24} /> : <ToggleLeft size={24} />}
                    </button>
                    <button
                        onClick={() => {
                            if (confirm(`Delete rule "${rule.name}"?`)) {
                                onDelete(rule.id);
                            }
                        }}
                        className="p-1 rounded text-surface-500 hover:text-red-400 transition-colors"
                        title="Delete rule"
                    >
                        <Trash2 size={16} />
                    </button>
                </div>
            </div>
        </div>
    );
}
