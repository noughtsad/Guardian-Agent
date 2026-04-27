import { minimatch } from 'minimatch';
import type { ToolCall, Rule, PolicyDecision } from './types.js';

// Prompt injection patterns to scan for
const INJECTION_PATTERNS = [
  /ignore\s+(all\s+)?previous\s+instructions/i,
  /system\s*:/i,
  /\[INST\]/i,
  /<\|im_start\|>/i,
  /forget\s+your\s+instructions/i,
  /disregard\s+(all\s+)?(rules|policies|instructions)/i,
  /override\s+polic/i,
  /ignore\s+(all\s+)?rules/i,
  /bypass\s+(all\s+)?(rules|policies|safety|guardrails)/i,
];

/**
 * Scans tool call input for prompt injection attempts.
 * Returns the matched pattern description or null if clean.
 */
function detectPromptInjection(toolCall: ToolCall): string | null {
  const inputStr = JSON.stringify(toolCall.input).toLowerCase();
  for (const pattern of INJECTION_PATTERNS) {
    if (pattern.test(inputStr)) {
      return pattern.source;
    }
  }
  return null;
}

/**
 * Tests a condition against a tool call's input.
 */
function testCondition(
  condition: { field: string; operator: string; value: string },
  toolCall: ToolCall,
): boolean {
  // Resolve the field path from the tool call input (supports "input.field" syntax)
  const fieldPath = condition.field.replace(/^input\./, '');
  const fieldValue = getNestedValue(toolCall.input, fieldPath);

  if (fieldValue === undefined || fieldValue === null) return false;

  const strValue = String(fieldValue);
  const condValue = condition.value;

  switch (condition.operator) {
    case 'contains':
      return strValue.includes(condValue);
    case 'startsWith':
      return strValue.startsWith(condValue);
    case 'equals':
      return strValue === condValue;
    case 'matches':
      try {
        return new RegExp(condValue).test(strValue);
      } catch {
        return false;
      }
    default:
      return false;
  }
}

/**
 * Gets a nested value from an object using dot notation.
 */
function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  const parts = path.split('.');
  let current: unknown = obj;
  for (const part of parts) {
    if (current === null || current === undefined || typeof current !== 'object') {
      return undefined;
    }
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}

/**
 * Severity rank for conflict resolution (higher = more restrictive).
 */
const RESTRICTION_RANK: Record<string, number> = {
  BLOCK: 4,
  REQUIRE_APPROVAL: 3,
  TRANSFORM: 2,
  INPUT_VALIDATION: 2,
  ALLOW: 1,
};

/**
 * Evaluates a tool call against a set of rules.
 * Returns the policy decision.
 */
export function evaluate(toolCall: ToolCall, rules: Rule[]): PolicyDecision {
  // Step 0: Prompt injection scan (overrides all rules)
  const injectionPattern = detectPromptInjection(toolCall);
  if (injectionPattern) {
    return {
      action: 'BLOCK',
      reason: `Prompt injection attempt detected (pattern: ${injectionPattern})`,
    };
  }

  // Step 1: Filter enabled rules
  const enabledRules = rules.filter(r => r.enabled);

  // Step 2: Sort by priority ascending (lower number = higher precedence)
  const sorted = [...enabledRules].sort((a, b) => {
    if (a.priority !== b.priority) return a.priority - b.priority;
    // Conflict resolution: more restrictive wins at same priority
    return (RESTRICTION_RANK[b.ruleType] || 0) - (RESTRICTION_RANK[a.ruleType] || 0);
  });

  // Step 3-5: Test each rule
  for (const rule of sorted) {
    // Test tool name pattern (glob matching)
    if (!minimatch(toolCall.name, rule.toolPattern)) {
      continue;
    }

    // Test condition if present
    if (rule.condition) {
      if (!testCondition(rule.condition, toolCall)) {
        continue;
      }
    }

    // Rule matches — return decision based on rule type
    switch (rule.ruleType) {
      case 'BLOCK':
        return { action: 'BLOCK', reason: `Blocked by rule: ${rule.name}` };

      case 'REQUIRE_APPROVAL':
        return {
          action: 'REQUIRE_APPROVAL',
          ruleId: rule.id,
          timeoutSeconds: rule.timeoutSeconds || 120,
        };

      case 'TRANSFORM':
      case 'INPUT_VALIDATION':
        if (rule.ruleType === 'TRANSFORM' && rule.transformFn) {
          try {
            // Execute transform function in a sandboxed context
            const transformFn = new Function('input', 'toolCall', rule.transformFn) as (
              input: Record<string, unknown>,
              toolCall: ToolCall,
            ) => Record<string, unknown>;
            const transformedInput = transformFn({ ...toolCall.input }, toolCall);
            return {
              action: 'TRANSFORM',
              transformedCall: { ...toolCall, input: transformedInput as Record<string, unknown> },
            };
          } catch (err) {
            return {
              action: 'BLOCK',
              reason: `Transform function error: ${err instanceof Error ? err.message : String(err)}`,
            };
          }
        }
        // INPUT_VALIDATION: if condition matched, it means validation passed = ALLOW
        // If we got here with INPUT_VALIDATION and no transform, just allow
        return { action: 'ALLOW' };

      default:
        return { action: 'ALLOW' };
    }
  }

  // Step 6: No rule matched → ALLOW
  return { action: 'ALLOW' };
}
