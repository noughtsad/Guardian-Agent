import { GoogleGenerativeAI, type GenerateContentResult, type FunctionDeclaration, SchemaType } from '@google/generative-ai';
import type { Message, ToolCall, ToolDefinition, LLMResponse } from '../policy/types.js';
import { v4 as uuidv4 } from 'uuid';

// Custom LLM error types
export class LLMAuthError extends Error {
  constructor(message: string) { super(message); this.name = 'LLMAuthError'; }
}
export class LLMRateLimitError extends Error {
  constructor(message: string) { super(message); this.name = 'LLMRateLimitError'; }
}
export class LLMTimeoutError extends Error {
  constructor(message: string) { super(message); this.name = 'LLMTimeoutError'; }
}

export class LLMClient {
  private client: GoogleGenerativeAI;
  private model: string;

  constructor() {
    const apiKey = process.env.LLM_API_KEY;
    if (!apiKey) throw new LLMAuthError('LLM_API_KEY environment variable not set');

    this.model = process.env.LLM_MODEL || 'gemini-2.5-flash';
    this.client = new GoogleGenerativeAI(apiKey);
  }

  /**
   * Send a chat request to Gemini with tool definitions.
   * Automatically retries once on rate limit (429) errors.
   */
  async chat(messages: Message[], tools: ToolDefinition[]): Promise<LLMResponse> {
    return this.chatWithRetry(messages, tools, 0);
  }

  private async chatWithRetry(messages: Message[], tools: ToolDefinition[], attempt: number): Promise<LLMResponse> {
    try {
      const geminiTools = this.convertToolsToGemini(tools);
      const geminiMessages = this.convertMessagesToGemini(messages);

      const model = this.client.getGenerativeModel({
        model: this.model,
        tools: geminiTools.length > 0 ? [{ functionDeclarations: geminiTools }] : undefined,
      });

      // Build the chat - Gemini expects alternating user/model pairs
      const history = geminiMessages.slice(0, -1);
      const lastMessage = geminiMessages[geminiMessages.length - 1];

      const chat = model.startChat({
        history: history.length > 0 ? history : undefined,
      });

      const result = await chat.sendMessage(lastMessage.parts);

      return this.parseGeminiResponse(result);
    } catch (err: any) {
      if (err instanceof LLMAuthError || err instanceof LLMRateLimitError || err instanceof LLMTimeoutError) {
        throw err;
      }

      const message = err?.message || String(err);

      if (message.includes('API key') || message.includes('401') || message.includes('403')) {
        throw new LLMAuthError(`Authentication failed: ${message}`);
      }

      if (message.includes('429') || message.includes('quota') || message.includes('rate')) {
        // Retry once on rate limit
        if (attempt < 1) {
          // Parse retry delay from error message, default 60s
          const retryMatch = message.match(/retry\s+in\s+([\d.]+)s/i);
          const waitSeconds = retryMatch ? Math.ceil(parseFloat(retryMatch[1])) : 60;
          console.log(`[LLMClient] Rate limited. Retrying in ${waitSeconds}s (attempt ${attempt + 1})...`);
          await new Promise(resolve => setTimeout(resolve, waitSeconds * 1000));
          return this.chatWithRetry(messages, tools, attempt + 1);
        }
        throw new LLMRateLimitError(`Rate limit exceeded after retry: ${message}`);
      }

      if (message.includes('timeout') || message.includes('ETIMEDOUT')) {
        throw new LLMTimeoutError(`Request timed out: ${message}`);
      }

      throw err;
    }
  }

  /**
   * Convert our ToolDefinition[] to Gemini FunctionDeclaration[].
   */
  private convertToolsToGemini(tools: ToolDefinition[]): FunctionDeclaration[] {
    return tools.map(tool => {
      const params = this.convertJsonSchemaToGemini(tool.inputSchema);
      return {
        name: tool.name,
        description: tool.description,
        parameters: params,
      } as FunctionDeclaration;
    });
  }

  /**
   * Convert JSON Schema to Gemini schema format.
   */
  private convertJsonSchemaToGemini(schema: Record<string, unknown>): any {
    if (!schema || Object.keys(schema).length === 0) {
      return { type: SchemaType.OBJECT, properties: {} };
    }

    const result: any = {};

    if (schema.type === 'object') {
      result.type = SchemaType.OBJECT;
      if (schema.properties) {
        result.properties = {};
        for (const [key, value] of Object.entries(schema.properties as Record<string, any>)) {
          result.properties[key] = this.convertPropertySchema(value);
        }
      }
      if (schema.required) {
        result.required = schema.required;
      }
    } else {
      result.type = SchemaType.OBJECT;
      result.properties = {};
    }

    return result;
  }

  /**
   * Convert a single property schema.
   */
  private convertPropertySchema(prop: any): any {
    if (!prop) return { type: SchemaType.STRING };

    const result: any = {};

    switch (prop.type) {
      case 'string':
        result.type = SchemaType.STRING;
        break;
      case 'number':
      case 'integer':
        result.type = SchemaType.NUMBER;
        break;
      case 'boolean':
        result.type = SchemaType.BOOLEAN;
        break;
      case 'array':
        result.type = SchemaType.ARRAY;
        if (prop.items) {
          result.items = this.convertPropertySchema(prop.items);
        }
        break;
      case 'object':
        result.type = SchemaType.OBJECT;
        if (prop.properties) {
          result.properties = {};
          for (const [key, value] of Object.entries(prop.properties as Record<string, any>)) {
            result.properties[key] = this.convertPropertySchema(value);
          }
        }
        break;
      default:
        result.type = SchemaType.STRING;
    }

    if (prop.description) {
      result.description = prop.description;
    }

    return result;
  }

  /**
   * Convert our Message[] to Gemini content format.
   */
  private convertMessagesToGemini(messages: Message[]): any[] {
    const geminiMessages: any[] = [];

    for (const msg of messages) {
      if (msg.role === 'user') {
        geminiMessages.push({
          role: 'user',
          parts: [{ text: msg.content }],
        });
      } else if (msg.role === 'assistant') {
        const parts: any[] = [];

        if (msg.content) {
          parts.push({ text: msg.content });
        }

        if (msg.toolCalls && msg.toolCalls.length > 0) {
          for (const tc of msg.toolCalls) {
            parts.push({
              functionCall: {
                name: tc.name,
                args: tc.input,
              },
            });
          }
        }

        if (parts.length > 0) {
          geminiMessages.push({ role: 'model', parts });
        }
      } else if (msg.role === 'tool') {
        // Tool results as function responses
        geminiMessages.push({
          role: 'function',
          parts: [{
            functionResponse: {
              name: 'tool_response',
              response: { result: msg.content },
            },
          }],
        });
      }
    }

    // Ensure there's at least one message
    if (geminiMessages.length === 0) {
      geminiMessages.push({
        role: 'user',
        parts: [{ text: 'Hello' }],
      });
    }

    return geminiMessages;
  }

  /**
   * Parse Gemini response into our canonical LLMResponse format.
   */
  private parseGeminiResponse(result: GenerateContentResult): LLMResponse {
    const response = result.response;
    const candidate = response.candidates?.[0];

    if (!candidate) {
      return { content: 'No response from model', toolCalls: [], usage: { inputTokens: 0, outputTokens: 0 } };
    }

    const toolCalls: ToolCall[] = [];
    let textContent = '';

    for (const part of candidate.content.parts) {
      if ('text' in part && part.text) {
        textContent += part.text;
      }
      if ('functionCall' in part && part.functionCall) {
        toolCalls.push({
          id: uuidv4(),
          name: part.functionCall.name,
          input: (part.functionCall.args || {}) as Record<string, unknown>,
          serverName: '', // Will be resolved by MCPClientManager
        });
      }
    }

    const usage = response.usageMetadata;

    return {
      content: textContent || null,
      toolCalls,
      usage: {
        inputTokens: usage?.promptTokenCount || 0,
        outputTokens: usage?.candidatesTokenCount || 0,
      },
    };
  }
}
