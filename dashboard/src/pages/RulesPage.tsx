import React, { useState } from 'react';
import { Plus, Shield } from 'lucide-react';
import { RuleCard } from '../components/RuleCard';
import { RuleFormModal } from '../components/RuleFormModal';
import { useRules } from '../hooks/useRules';
import { api, type Rule } from '../api/client';

export function RulesPage() {
    const rules = useRules();
    const [modalOpen, setModalOpen] = useState(false);
    const [editRule, setEditRule] = useState<Rule | null>(null);

    const handleCreateOrUpdate = async (ruleData: Omit<Rule, 'id' | 'createdAt' | 'updatedAt'>) => {
        try {
            if (editRule) {
                await api.updateRule(editRule.id, ruleData);
            } else {
                await api.createRule(ruleData);
            }
        } catch (err) {
            console.error('Save rule failed:', err);
            alert('Failed to save rule: ' + (err as Error).message);
        }
        setEditRule(null);
    };

    const handleToggle = async (id: string, enabled: boolean) => {
        try {
            await api.toggleRule(id, enabled);
        } catch (err) {
            console.error('Toggle failed:', err);
        }
    };

    const handleDelete = async (id: string) => {
        try {
            await api.deleteRule(id);
        } catch (err) {
            console.error('Delete failed:', err);
        }
    };

    const handleEdit = (rule: Rule) => {
        setEditRule(rule);
        setModalOpen(true);
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-brand-600/20 text-brand-400">
                        <Shield size={24} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-white">Policy Rules</h1>
                        <p className="text-sm text-surface-400">
                            {rules.length} rule{rules.length !== 1 ? 's' : ''} configured
                        </p>
                    </div>
                </div>
                <button
                    onClick={() => { setEditRule(null); setModalOpen(true); }}
                    className="btn-primary flex items-center gap-2"
                >
                    <Plus size={18} />
                    New Rule
                </button>
            </div>

            {/* Rules Grid */}
            {rules.length === 0 ? (
                <div className="glass-card p-12 text-center">
                    <Shield size={48} className="mx-auto text-surface-600 mb-4" />
                    <h3 className="text-lg font-medium text-surface-300 mb-2">No rules configured</h3>
                    <p className="text-surface-500 mb-4">Create your first policy rule to start guarding tool calls.</p>
                    <button
                        onClick={() => setModalOpen(true)}
                        className="btn-primary"
                    >
                        Create First Rule
                    </button>
                </div>
            ) : (
                <div className="grid gap-3">
                    {rules.map((rule) => (
                        <RuleCard
                            key={rule.id}
                            rule={rule}
                            onToggle={handleToggle}
                            onDelete={handleDelete}
                            onEdit={handleEdit}
                        />
                    ))}
                </div>
            )}

            {/* Modal */}
            <RuleFormModal
                isOpen={modalOpen}
                onClose={() => { setModalOpen(false); setEditRule(null); }}
                onSubmit={handleCreateOrUpdate}
                editRule={editRule}
            />
        </div>
    );
}
