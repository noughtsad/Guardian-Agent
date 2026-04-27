import { useState, useEffect, useCallback } from 'react';
import { api, type Conversation, type ConversationTurn } from '../api/client';

export function useConversations() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(() => {
    setLoading(true);
    api.getConversations()
      .then(setConversations)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { conversations, loading, refresh };
}

export function useConversationTurns(conversationId: string | null) {
  const [turns, setTurns] = useState<ConversationTurn[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!conversationId) {
      setTurns([]);
      return;
    }

    setLoading(true);
    api.getConversationTurns(conversationId)
      .then(setTurns)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [conversationId]);

  return { turns, loading };
}
