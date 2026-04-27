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
                <div className="p-2.5 rounded-xl bg-emerald-600/20 text-emerald-400">
                    <MessageSquare size={24} />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-white">Conversations</h1>
                    <p className="text-sm text-surface-400">
                        {conversations.length} conversation{conversations.length !== 1 ? 's' : ''}
                    </p>
                </div>
            </div>

            {/* Chat Input */}
            <div className="glass-card p-4">
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
                    <div className="mt-2 text-xs text-surface-500">
                        Conversation: <code className="text-surface-400">{chatConvId.slice(0, 8)}...</code>
                        <button
                            onClick={() => { setChatConvId(undefined); setChatReply(null); }}
                            className="ml-2 text-brand-400 hover:text-brand-300"
                        >
                            New conversation
                        </button>
                    </div>
                )}
                {chatReply && (
                    <div className="mt-3 p-3 bg-surface-900/80 rounded-lg">
                        <div className="text-xs text-emerald-400 mb-1">Agent Reply:</div>
                        <div className="text-sm text-surface-200 whitespace-pre-wrap">{chatReply}</div>
                    </div>
                )}
            </div>

            {/* Conversation List */}
            {loading ? (
                <div className="flex justify-center py-8">
                    <Loader2 size={24} className="animate-spin text-brand-400" />
                </div>
            ) : conversations.length === 0 ? (
                <div className="glass-card p-12 text-center">
                    <MessageSquare size={48} className="mx-auto text-surface-600 mb-4" />
                    <h3 className="text-lg font-medium text-surface-300 mb-2">No conversations yet</h3>
                    <p className="text-surface-500">Send a message above to start a conversation with the agent.</p>
                </div>
            ) : (
                <div className="space-y-2">
                    {conversations.map((conv) => (
                        <div key={conv.id}>
                            <div
                                className="glass-card-hover p-4 cursor-pointer"
                                onClick={() => setSelectedId(selectedId === conv.id ? null : conv.id)}
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3 min-w-0">
                                        {selectedId === conv.id ? (
                                            <ChevronDown size={16} className="text-surface-400 flex-shrink-0" />
                                        ) : (
                                            <ChevronRight size={16} className="text-surface-400 flex-shrink-0" />
                                        )}
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-2">
                                                <code className="text-sm font-mono text-brand-300">{conv.id.slice(0, 8)}...</code>
                                                <span className="badge bg-surface-700 text-surface-300">{conv.turnCount} turns</span>
                                            </div>
                                            {conv.lastMessage && (
                                                <p className="text-sm text-surface-400 truncate mt-1">{conv.lastMessage}</p>
                                            )}
                                        </div>
                                    </div>
                                    <div className="text-right flex-shrink-0">
                                        <div className="text-xs text-surface-500">
                                            {new Date(conv.updatedAt).toLocaleString()}
                                        </div>
                                        <div className="text-xs text-surface-600 mt-0.5">
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
                                            <Loader2 size={20} className="animate-spin text-brand-400" />
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
