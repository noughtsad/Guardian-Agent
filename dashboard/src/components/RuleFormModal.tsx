import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import type { Rule } from '../api/client';

interface RuleFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (rule: Omit<Rule, 'id' | 'createdAt' | 'updatedAt'>) => void;
    editRule?: Rule | null;
}

export function RuleFormModal({ isOpen, onClose, onSubmit, editRule }: RuleFormModalProps) {
    const [formData, setFormData] = useState({
        name: '',
        ruleType: 'BLOCK' as Rule['ruleType'],
        toolPattern: '',
        priority: 100,
        enabled: true,
        conditionField: '',
        conditionOperator: 'contains',
        conditionValue: '',
        transformFn: '',
        timeoutSeconds: 120,
    });

    useEffect(() => {
        if (editRule) {
            setFormData({
                name: editRule.name,
                ruleType: editRule.ruleType,
                toolPattern: editRule.toolPattern,
                priority: editRule.priority,
                enabled: editRule.enabled,
                conditionField: editRule.condition?.field || '',
                conditionOperator: editRule.condition?.operator || 'contains',
                conditionValue: editRule.condition?.value || '',
                transformFn: editRule.transformFn || '',
                timeoutSeconds: editRule.timeoutSeconds || 120,
            });
        } else {
            setFormData({
                name: '', ruleType: 'BLOCK', toolPattern: '', priority: 100,
                enabled: true, conditionField: '', conditionOperator: 'contains',
                conditionValue: '', transformFn: '', timeoutSeconds: 120,
            });
        }
    }, [editRule, isOpen]);

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        const rule: any = {
            name: formData.name,
            ruleType: formData.ruleType,
            toolPattern: formData.toolPattern,
            priority: formData.priority,
            enabled: formData.enabled,
            timeoutSeconds: formData.timeoutSeconds,
        };

        if (formData.conditionField) {
            rule.condition = {
                field: formData.conditionField,
                operator: formData.conditionOperator,
                value: formData.conditionValue,
            };
        }

        if (formData.transformFn) {
            rule.transformFn = formData.transformFn;
        }

        onSubmit(rule);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

            {/* Modal */}
            <div className="relative glass-card p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto animate-slide-up">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-semibold text-white">
                        {editRule ? 'Edit Rule' : 'New Rule'}
                    </h2>
                    <button onClick={onClose} className="p-1 text-surface-400 hover:text-white transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Name */}
                    <div>
                        <label className="block text-sm text-surface-300 mb-1">Name</label>
                        <input
                            type="text"
                            className="input-field"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            placeholder="e.g., Block all deletes"
                            required
                        />
                    </div>

                    {/* Rule Type */}
                    <div>
                        <label className="block text-sm text-surface-300 mb-1">Rule Type</label>
                        <select
                            className="select-field"
                            value={formData.ruleType}
                            onChange={(e) => setFormData({ ...formData, ruleType: e.target.value as Rule['ruleType'] })}
                        >
                            <option value="BLOCK">🛑 BLOCK</option>
                            <option value="REQUIRE_APPROVAL">⏳ REQUIRE APPROVAL</option>
                            <option value="INPUT_VALIDATION">✅ INPUT VALIDATION</option>
                            <option value="TRANSFORM">🔄 TRANSFORM</option>
                        </select>
                    </div>

                    {/* Tool Pattern */}
                    <div>
                        <label className="block text-sm text-surface-300 mb-1">Tool Pattern</label>
                        <input
                            type="text"
                            className="input-field font-mono"
                            value={formData.toolPattern}
                            onChange={(e) => setFormData({ ...formData, toolPattern: e.target.value })}
                            placeholder="e.g., delete_* or db_delete_record"
                            required
                        />
                        <p className="text-xs text-surface-500 mt-1">Supports glob patterns: * matches any, ** recursion</p>
                    </div>

                    {/* Priority */}
                    <div>
                        <label className="block text-sm text-surface-300 mb-1">Priority (lower = higher precedence)</label>
                        <input
                            type="number"
                            className="input-field"
                            value={formData.priority}
                            onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) || 100 })}
                            min={1}
                            max={1000}
                        />
                    </div>

                    {/* Condition (Optional) */}
                    <div className="glass-card p-4">
                        <label className="block text-sm text-surface-300 mb-2">Condition (Optional)</label>
                        <div className="grid grid-cols-3 gap-2">
                            <input
                                type="text"
                                className="input-field text-sm"
                                value={formData.conditionField}
                                onChange={(e) => setFormData({ ...formData, conditionField: e.target.value })}
                                placeholder="input.path"
                            />
                            <select
                                className="select-field text-sm"
                                value={formData.conditionOperator}
                                onChange={(e) => setFormData({ ...formData, conditionOperator: e.target.value })}
                            >
                                <option value="contains">contains</option>
                                <option value="startsWith">startsWith</option>
                                <option value="equals">equals</option>
                                <option value="matches">matches (regex)</option>
                            </select>
                            <input
                                type="text"
                                className="input-field text-sm"
                                value={formData.conditionValue}
                                onChange={(e) => setFormData({ ...formData, conditionValue: e.target.value })}
                                placeholder="value"
                            />
                        </div>
                    </div>

                    {/* Timeout (for REQUIRE_APPROVAL) */}
                    {formData.ruleType === 'REQUIRE_APPROVAL' && (
                        <div>
                            <label className="block text-sm text-surface-300 mb-1">Timeout (seconds)</label>
                            <input
                                type="number"
                                className="input-field"
                                value={formData.timeoutSeconds}
                                onChange={(e) => setFormData({ ...formData, timeoutSeconds: parseInt(e.target.value) || 120 })}
                                min={10}
                                max={600}
                            />
                        </div>
                    )}

                    {/* Transform Function (for TRANSFORM) */}
                    {(formData.ruleType === 'TRANSFORM' || formData.ruleType === 'INPUT_VALIDATION') && (
                        <div>
                            <label className="block text-sm text-surface-300 mb-1">Transform Expression</label>
                            <textarea
                                className="input-field font-mono text-sm h-24 resize-y"
                                value={formData.transformFn}
                                onChange={(e) => setFormData({ ...formData, transformFn: e.target.value })}
                                placeholder="return { ...input, path: '/sandbox' + input.path };"
                            />
                        </div>
                    )}

                    {/* Enabled */}
                    <div className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            id="enabled"
                            checked={formData.enabled}
                            onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
                            className="w-4 h-4 rounded border-surface-600 text-brand-600 focus:ring-brand-500"
                        />
                        <label htmlFor="enabled" className="text-sm text-surface-300">Enabled</label>
                    </div>

                    {/* Submit */}
                    <div className="flex gap-3 pt-2">
                        <button type="submit" className="btn-primary flex-1">
                            {editRule ? 'Update Rule' : 'Create Rule'}
                        </button>
                        <button type="button" onClick={onClose} className="btn-secondary">
                            Cancel
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
