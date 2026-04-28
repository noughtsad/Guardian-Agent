import React, { useState } from 'react';
import { MessageSquare, ChevronDown, ChevronRight, Send, Loader2 } from 'lucide-react';
import { ConversationLog } from '../components/ConversationLog';
import { useConversations, useConversationTurns } from '../hooks/useConversations';
import { api } from '../api/client';

export function ConversationsPage() {
    const { conversations, loading, refresh } = useConversations();
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const { turns, loading: turnsLoading } = useConversationTurns(selectedId);
    const [chatMessage, setChatMessage] = useState('');
    const [chatConvId, setChatConvId] = useState<string | undefined>(undefined);
    const [chatLoading, setChatLoading] = useState(false);
    const [chatReply, setChatReply] = useState<string | null>(null);

    const handleSendMessage = async () => {
        if (!chatMessage.trim() || chatLoading) return;

        setChatLoading(true);
        setChatReply(null);

        try {
            const result = await api.chat(chatMessage.trim(), chatConvId);
            setChatReply(result.reply);
            setChatConvId(result.conversationId);
            setChatMessage('');
            refresh();
        } catch (err) {
            setChatReply(`Error: ${(err as Error).message}`);
        }

        setChatLoading(false);
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-brand-tertiary/20 text-tertiary">
                    <MessageSquare size={24} />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-on-surface">Conversations</h1>
                    <p className="text-sm text-on-surface-variant">
                        {conversations.length} conversation{conversations.length !== 1 ? 's' : ''}
                    </p>
                </div>
            </div>

            {/* Chat Input */}
            <div className="soft-card p-4">
                <div className="flex items-center gap-3">
                    <input
                        type="text"
                        className="input-field flex-1"
                        value={chatMessage}
                        onChange={(e) => setChatMessage(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                        placeholder="Send a message to the agent..."
                        disabled={chatLoading}
                    />
                    <button
                        onClick={handleSendMessage}
                        disabled={chatLoading || !chatMessage.trim()}
                        className="btn-primary flex items-center gap-2"
                    >
                        {chatLoading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                        Send
                    </button>
                </div>
                {chatConvId && (
                    <div className="mt-2 text-xs text-on-surface-variant">
                        Conversation: <code className="text-brand-primary">{chatConvId.slice(0, 8)}...</code>
                        <button
                            onClick={() => { setChatConvId(undefined); setChatReply(null); }}
                            className="ml-2 text-brand-secondary hover:text-brand-primary"
                        >
                            New conversation
                        </button>
                    </div>
                )}
                {chatReply && (
                    <div className="mt-3 p-3 bg-brand-bg rounded-lg border border-brand-border">
                        <div className="text-xs text-brand-tertiary mb-1 font-medium">Agent Reply:</div>
                        <div className="text-sm text-on-surface whitespace-pre-wrap">{chatReply}</div>
                    </div>
                )}
            </div>

            {/* Conversation List */}
            {loading ? (
                <div className="flex justify-center py-8">
                    <Loader2 size={24} className="animate-spin text-brand-primary" />
                </div>
            ) : conversations.length === 0 ? (
                <div className="soft-card p-12 text-center shadow-none border-dashed border-2 hover:border-brand-primary/30 transition-colors">
                    <MessageSquare size={48} className="mx-auto text-on-surface-variant mb-4 opacity-50" />
                    <h3 className="text-lg font-medium text-on-surface mb-2">No conversations yet</h3>
                    <p className="text-on-surface-variant">Send a message above to start a conversation with the agent.</p>
                </div>
            ) : (
                <div className="space-y-2">
                    {conversations.map((conv) => (
                        <div key={conv.id}>
                            <div
                                className="soft-card-hover p-4 cursor-pointer"
                                onClick={() => setSelectedId(selectedId === conv.id ? null : conv.id)}
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3 min-w-0">
                                        {selectedId === conv.id ? (
                                            <ChevronDown size={16} className="text-on-surface-variant flex-shrink-0" />
                                        ) : (
                                            <ChevronRight size={16} className="text-on-surface-variant flex-shrink-0" />
                                        )}
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-2">
                                                <code className="text-sm font-mono text-brand-primary">{conv.id.slice(0, 8)}...</code>
                                                <span className="badge bg-brand-bg text-on-surface-variant border border-brand-border">{conv.turnCount} turns</span>
                                            </div>
                                            {conv.lastMessage && (
                                                <p className="text-sm text-on-surface-variant truncate mt-1">{conv.lastMessage}</p>
                                            )}
                                        </div>
                                    </div>
                                    <div className="text-right flex-shrink-0">
                                        <div className="text-xs text-on-surface-variant">
                                            {new Date(conv.updatedAt).toLocaleString()}
                                        </div>
                                        <div className="text-xs text-on-surface-variant mt-0.5 opacity-70">
                                            {conv.totalTokensIn + conv.totalTokensOut} tokens
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Expanded Conversation */}
                            {selectedId === conv.id && (
                                <div className="ml-6 mt-2 mb-4">
                                    {turnsLoading ? (
                                        <div className="flex justify-center py-4">
                                            <Loader2 size={20} className="animate-spin text-brand-primary" />
                                        </div>
                                    ) : (
                                        <ConversationLog
                                            turns={turns}
                                            totalTokensIn={conv.totalTokensIn}
                                            totalTokensOut={conv.totalTokensOut}
                                        />
                                    )}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
