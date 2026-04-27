import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../db/Database.js';
import type { ConversationTurn, Conversation } from '../policy/types.js';

export class ConversationStore {
  /**
   * Append a turn to the conversation history.
   */
  append(turn: Omit<ConversationTurn, 'id' | 'createdAt'>): ConversationTurn {
    const db = getDatabase();
    const id = uuidv4();
    const now = new Date().toISOString();

    const fullTurn: ConversationTurn = {
      ...turn,
      id,
      createdAt: now,
    };

    db.prepare(`
      INSERT INTO conversation_turns
        (id, conversation_id, role, content, tool_name, tool_input, tool_result, tokens_in, tokens_out, blocked, block_reason, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      fullTurn.id,
      fullTurn.conversationId,
      fullTurn.role,
      fullTurn.content || null,
      fullTurn.toolName || null,
      fullTurn.toolInput || null,
      fullTurn.toolResult || null,
      fullTurn.tokensIn,
      fullTurn.tokensOut,
      fullTurn.blocked ? 1 : 0,
      fullTurn.blockReason || null,
      fullTurn.createdAt,
    );

    return fullTurn;
  }

  /**
   * Get the full turn history for a conversation.
   */
  getHistory(conversationId: string): ConversationTurn[] {
    const db = getDatabase();
    const rows = db.prepare(
      'SELECT * FROM conversation_turns WHERE conversation_id = ? ORDER BY created_at ASC'
    ).all(conversationId) as any[];
    return rows.map(this.mapRow);
  }

  /**
   * List all conversations with summary info.
   */
  listConversations(): Conversation[] {
    const db = getDatabase();
    const rows = db.prepare(`
      SELECT
        conversation_id,
        COUNT(*) as turn_count,
        COALESCE(SUM(tokens_in), 0) as total_tokens_in,
        COALESCE(SUM(tokens_out), 0) as total_tokens_out,
        MIN(created_at) as first_turn,
        MAX(created_at) as last_turn
      FROM conversation_turns
      GROUP BY conversation_id
      ORDER BY MAX(created_at) DESC
    `).all() as any[];

    return rows.map(row => {
      // Get the last message content
      const lastTurn = db.prepare(
        'SELECT content FROM conversation_turns WHERE conversation_id = ? ORDER BY created_at DESC LIMIT 1'
      ).get(row.conversation_id) as any;

      return {
        id: row.conversation_id,
        lastMessage: lastTurn?.content || '',
        turnCount: row.turn_count,
        totalTokensIn: row.total_tokens_in,
        totalTokensOut: row.total_tokens_out,
        createdAt: row.first_turn,
        updatedAt: row.last_turn,
      };
    });
  }

  /**
   * Get turns for a specific conversation.
   */
  getTurns(conversationId: string): ConversationTurn[] {
    return this.getHistory(conversationId);
  }

  private mapRow(row: any): ConversationTurn {
    return {
      id: row.id,
      conversationId: row.conversation_id,
      role: row.role,
      content: row.content,
      toolName: row.tool_name,
      toolInput: row.tool_input,
      toolResult: row.tool_result,
      tokensIn: row.tokens_in,
      tokensOut: row.tokens_out,
      blocked: row.blocked === 1,
      blockReason: row.block_reason,
      createdAt: row.created_at,
    };
  }
}
