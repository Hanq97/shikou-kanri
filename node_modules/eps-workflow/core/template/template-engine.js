/**
 * Template Engine for Week 15 Execute Command
 * Day 3: Template Execution - Part 1
 *
 * Features:
 * - Variable substitution: {{variableName}}
 * - Loops: {{#each items}}...{{/each}}
 * - Conditionals: {{#if condition}}...{{else}}...{{/if}}
 * - Partials: {{> partialName}}
 * - Comments: {{!-- comment --}}
 *
 * Architecture:
 * - Layer 1: Template Parser (tokenize, build AST)
 * - Layer 2: Template Processor (process AST with variables)
 * - Layer 3: Output Validator (validate against plan)
 */

const fs = require('fs');
const path = require('path');

// Template cache for performance
const templateCache = new Map();

/**
 * Main entry point for template processing
 * @param {string} codeTemplate - Template with {{}} syntax
 * @param {object} templateVars - Variables to substitute
 * @param {object} context - Validated context from Day 2
 * @returns {string} Generated code
 */
function fillTemplate(codeTemplate, templateVars, context) {
  try {
    // Step 1: Parse template (with caching)
    const cacheKey = hashString(codeTemplate);
    let parsedTemplate;

    if (templateCache.has(cacheKey)) {
      parsedTemplate = templateCache.get(cacheKey);
    } else {
      parsedTemplate = parseTemplate(codeTemplate);
      templateCache.set(cacheKey, parsedTemplate);
    }

    // Step 2: Validate template syntax
    const syntaxValidation = validateTemplateSyntax(parsedTemplate);
    if (!syntaxValidation.valid) {
      throw new Error(`Template syntax invalid: ${JSON.stringify(syntaxValidation.errors)}`);
    }

    // Step 3: Validate all variables exist
    const varValidation = validateTemplateVariables(parsedTemplate, templateVars, context);
    if (!varValidation.valid) {
      throw new Error(`Template variables invalid: ${JSON.stringify(varValidation.errors)}`);
    }

    // Step 4: Process template
    const output = processTemplate(parsedTemplate, templateVars, context);

    // Step 5: Post-process output
    return postProcessOutput(output);

  } catch (error) {
    throw new Error(`Template processing failed: ${error.message}`);
  }
}

/**
 * Parse template string into AST
 * @param {string} template - Template string
 * @returns {Array} AST nodes
 */
function parseTemplate(template) {
  // Step 1: Tokenize
  const tokens = tokenize(template);

  // Step 2: Build AST
  const ast = buildAST(tokens);

  // Step 3: Optimize AST
  return optimizeAST(ast);
}

/**
 * Tokenize template string
 * @param {string} template - Template string
 * @returns {Array} Tokens
 */
function tokenize(template) {
  const tokens = [];
  let position = 0;
  const length = template.length;

  while (position < length) {
    // Find next {{
    const openPos = template.indexOf('{{', position);

    if (openPos === -1) {
      // No more tags, add remaining text
      if (position < length) {
        tokens.push({
          type: 'TEXT',
          value: template.substring(position),
          position
        });
      }
      break;
    }

    // Add text before {{
    if (openPos > position) {
      tokens.push({
        type: 'TEXT',
        value: template.substring(position, openPos),
        position
      });
    }

    // Find matching }}
    const closePos = template.indexOf('}}', openPos + 2);
    if (closePos === -1) {
      throw new Error(`Unclosed tag at position ${openPos}`);
    }

    // Extract and classify tag
    const tagContent = template.substring(openPos + 2, closePos).trim();
    const token = classifyTag(tagContent, openPos);
    tokens.push(token);

    position = closePos + 2;
  }

  return tokens;
}

/**
 * Classify tag type based on content
 * @param {string} tagContent - Content between {{ and }}
 * @param {number} position - Position in template
 * @returns {object} Token
 */
function classifyTag(tagContent, position) {
  // Comment: {{!-- comment --}}
  if (tagContent.startsWith('!--') && tagContent.endsWith('--')) {
    return {
      type: 'COMMENT',
      value: tagContent.substring(3, tagContent.length - 2).trim(),
      position
    };
  }

  // Loop start: {{#each items}} or {{#each items as item}}
  if (tagContent.startsWith('#each ')) {
    const match = tagContent.match(/^#each\s+(\S+)(?:\s+as\s+(\S+)(?:\s*,\s*(\S+))?)?$/);
    if (!match) {
      throw new Error(`Invalid #each syntax at position ${position}: ${tagContent}`);
    }

    return {
      type: 'LOOP_START',
      collection: match[1],
      iterator: match[2] || 'this',
      indexVar: match[3] || null,
      position
    };
  }

  // Loop end: {{/each}}
  if (tagContent === '/each') {
    return {
      type: 'LOOP_END',
      position
    };
  }

  // Conditional start: {{#if condition}}
  if (tagContent.startsWith('#if ')) {
    const condition = tagContent.substring(4).trim();
    return {
      type: 'IF_START',
      condition,
      position
    };
  }

  // Else if: {{else if condition}}
  if (tagContent.startsWith('else if ')) {
    const condition = tagContent.substring(8).trim();
    return {
      type: 'ELSE_IF',
      condition,
      position
    };
  }

  // Else: {{else}}
  if (tagContent === 'else') {
    return {
      type: 'ELSE',
      position
    };
  }

  // Conditional end: {{/if}}
  if (tagContent === '/if') {
    return {
      type: 'IF_END',
      position
    };
  }

  // Partial: {{> partialName}} or {{> partialName param="value"}}
  if (tagContent.startsWith('>')) {
    const match = tagContent.match(/^>\s*(\S+)(.*)$/);
    const partialName = match[1];
    const paramString = match[2].trim();
    const params = parsePartialParams(paramString);

    return {
      type: 'PARTIAL',
      name: partialName,
      params,
      position
    };
  }

  // Variable: {{variableName}}
  return {
    type: 'VARIABLE',
    path: tagContent,
    position
  };
}

/**
 * Parse partial parameters
 * @param {string} paramString - Parameter string
 * @returns {object} Parameters
 */
function parsePartialParams(paramString) {
  if (!paramString) return {};

  const params = {};
  const paramMatches = paramString.matchAll(/(\w+)="([^"]+)"/g);

  for (const match of paramMatches) {
    params[match[1]] = match[2];
  }

  return params;
}

/**
 * Build AST from tokens
 * @param {Array} tokens - Tokens
 * @returns {Array} AST nodes
 */
function buildAST(tokens) {
  const ast = [];
  let position = 0;

  while (position < tokens.length) {
    const token = tokens[position];

    switch (token.type) {
      case 'TEXT':
        ast.push({
          type: 'TEXT',
          value: token.value
        });
        position++;
        break;

      case 'VARIABLE':
        ast.push({
          type: 'VARIABLE',
          path: splitVariablePath(token.path)
        });
        position++;
        break;

      case 'LOOP_START':
        const loopResult = buildLoopNode(tokens, position);
        ast.push(loopResult.node);
        position = loopResult.endPosition + 1;
        break;

      case 'IF_START':
        const conditionalResult = buildConditionalNode(tokens, position);
        ast.push(conditionalResult.node);
        position = conditionalResult.endPosition + 1;
        break;

      case 'PARTIAL':
        ast.push({
          type: 'PARTIAL',
          name: token.name,
          params: token.params
        });
        position++;
        break;

      case 'COMMENT':
        // Skip comments
        position++;
        break;

      default:
        throw new Error(`Unexpected token type: ${token.type} at position ${token.position}`);
    }
  }

  return ast;
}

/**
 * Build loop node from tokens
 * @param {Array} tokens - Tokens
 * @param {number} startPosition - Start position
 * @returns {object} Loop node and end position
 */
function buildLoopNode(tokens, startPosition) {
  const startToken = tokens[startPosition];
  const bodyTokens = [];
  let position = startPosition + 1;
  let depth = 1;

  // Find matching /each
  while (position < tokens.length && depth > 0) {
    const token = tokens[position];

    if (token.type === 'LOOP_START') {
      depth++;
    } else if (token.type === 'LOOP_END') {
      depth--;
      if (depth === 0) {
        break;
      }
    }

    bodyTokens.push(token);
    position++;
  }

  if (depth !== 0) {
    throw new Error(`Unclosed {{#each}} starting at position ${startToken.position}`);
  }

  // Recursively parse body
  const bodyAST = buildAST(bodyTokens);

  const node = {
    type: 'LOOP',
    collection: startToken.collection,
    iterator: startToken.iterator,
    indexVar: startToken.indexVar,
    body: bodyAST
  };

  return {
    node,
    endPosition: position
  };
}

/**
 * Build conditional node from tokens
 * @param {Array} tokens - Tokens
 * @param {number} startPosition - Start position
 * @returns {object} Conditional node and end position
 */
function buildConditionalNode(tokens, startPosition) {
  const branches = [];
  let elseBody = [];
  let currentBranch = {
    condition: tokens[startPosition].condition,
    body: []
  };

  let position = startPosition + 1;
  let depth = 1;
  let inElse = false;

  while (position < tokens.length && depth > 0) {
    const token = tokens[position];

    if (token.type === 'IF_START') {
      depth++;
      if (inElse) {
        elseBody.push(token);
      } else {
        currentBranch.body.push(token);
      }
    } else if (token.type === 'ELSE_IF' && depth === 1) {
      // Save current branch
      currentBranch.body = buildAST(currentBranch.body);
      branches.push(currentBranch);

      // Start new branch
      currentBranch = {
        condition: token.condition,
        body: []
      };
    } else if (token.type === 'ELSE' && depth === 1) {
      // Save current branch
      currentBranch.body = buildAST(currentBranch.body);
      branches.push(currentBranch);

      // Start else body
      inElse = true;
      currentBranch = null;
    } else if (token.type === 'IF_END') {
      depth--;
      if (depth === 0) {
        break;
      }
      if (inElse) {
        elseBody.push(token);
      } else {
        currentBranch.body.push(token);
      }
    } else {
      if (inElse) {
        elseBody.push(token);
      } else {
        currentBranch.body.push(token);
      }
    }

    position++;
  }

  if (depth !== 0) {
    throw new Error(`Unclosed {{#if}} starting at position ${tokens[startPosition].position}`);
  }

  // Save last branch if not saved yet
  if (currentBranch !== null) {
    currentBranch.body = buildAST(currentBranch.body);
    branches.push(currentBranch);
  }

  // Parse else body
  if (elseBody.length > 0) {
    elseBody = buildAST(elseBody);
  }

  const node = {
    type: 'CONDITIONAL',
    branches,
    elseBody
  };

  return {
    node,
    endPosition: position
  };
}

/**
 * Optimize AST (combine adjacent text nodes)
 * @param {Array} ast - AST nodes
 * @returns {Array} Optimized AST
 */
function optimizeAST(ast) {
  const optimized = [];
  let currentText = null;

  for (const node of ast) {
    if (node.type === 'TEXT') {
      if (currentText === null) {
        currentText = node.value;
      } else {
        currentText += node.value;
      }
    } else {
      if (currentText !== null) {
        optimized.push({ type: 'TEXT', value: currentText });
        currentText = null;
      }
      optimized.push(node);
    }
  }

  if (currentText !== null) {
    optimized.push({ type: 'TEXT', value: currentText });
  }

  return optimized;
}

/**
 * Process template AST with variables
 * @param {Array} ast - AST nodes
 * @param {object} variables - Template variables
 * @param {object} context - Validated context
 * @returns {string} Processed output
 */
function processTemplate(ast, variables, context) {
  let output = '';

  for (const node of ast) {
    switch (node.type) {
      case 'TEXT':
        output += node.value;
        break;

      case 'VARIABLE':
        const value = resolveVariable(node.path, variables, context);
        output += toString(value);
        break;

      case 'LOOP':
        output += processLoop(node, variables, context);
        break;

      case 'CONDITIONAL':
        output += processConditional(node, variables, context);
        break;

      case 'PARTIAL':
        output += processPartial(node, variables, context);
        break;

      default:
        throw new Error(`Unknown node type: ${node.type}`);
    }
  }

  return output;
}

/**
 * Process loop node
 * @param {object} loopNode - Loop node
 * @param {object} variables - Template variables
 * @param {object} context - Validated context
 * @returns {string} Processed output
 */
function processLoop(loopNode, variables, context) {
  // Resolve collection (split path first for nested properties like "this.roles")
  const collectionPath = splitVariablePath(loopNode.collection);
  const collection = resolveVariable(collectionPath, variables, context);

  if (!Array.isArray(collection)) {
    throw new Error(`Loop collection is not an array: ${loopNode.collection} (type: ${typeof collection})`);
  }

  let output = '';

  for (let index = 0; index < collection.length; index++) {
    const item = collection[index];

    // Create loop scope
    const loopVariables = JSON.parse(JSON.stringify(variables)); // Deep clone

    // Set iterator variable
    if (loopNode.iterator === 'this') {
      loopVariables['this'] = item;
    } else {
      loopVariables[loopNode.iterator] = item;
    }

    // Set index variable if specified
    if (loopNode.indexVar !== null) {
      loopVariables[loopNode.indexVar] = index;
    }

    // Process loop body with loop variables
    output += processTemplate(loopNode.body, loopVariables, context);
  }

  return output;
}

/**
 * Process conditional node
 * @param {object} conditionalNode - Conditional node
 * @param {object} variables - Template variables
 * @param {object} context - Validated context
 * @returns {string} Processed output
 */
function processConditional(conditionalNode, variables, context) {
  // Evaluate branches in order
  for (const branch of conditionalNode.branches) {
    const conditionResult = evaluateCondition(branch.condition, variables, context);

    if (conditionResult) {
      return processTemplate(branch.body, variables, context);
    }
  }

  // No branch matched, use else body
  if (conditionalNode.elseBody.length > 0) {
    return processTemplate(conditionalNode.elseBody, variables, context);
  }

  return '';
}

/**
 * Evaluate conditional expression
 * @param {string} condition - Condition expression
 * @param {object} variables - Template variables
 * @param {object} context - Validated context
 * @returns {boolean} Condition result
 */
function evaluateCondition(condition, variables, context) {
  // Handle simple variable (truthy/falsy)
  if (!condition.includes(' == ') && !condition.includes(' != ') &&
      !condition.includes(' < ') && !condition.includes(' > ') &&
      !condition.includes(' <= ') && !condition.includes(' >= ') &&
      !condition.includes(' && ') && !condition.includes(' || ') &&
      !condition.startsWith('!')) {
    const varPath = splitVariablePath(condition.trim());
    const value = resolveVariable(varPath, variables, context);
    return isTruthy(value);
  }

  // AND operator
  if (condition.includes(' && ')) {
    const parts = condition.split(' && ');
    return parts.every(part => evaluateCondition(part.trim(), variables, context));
  }

  // OR operator
  if (condition.includes(' || ')) {
    const parts = condition.split(' || ');
    return parts.some(part => evaluateCondition(part.trim(), variables, context));
  }

  // NOT operator
  if (condition.trim().startsWith('!')) {
    const subCondition = condition.trim().substring(1).trim();
    return !evaluateCondition(subCondition, variables, context);
  }

  // Comparison operators
  const operators = ['==', '!=', '<=', '>=', '<', '>'];
  for (const op of operators) {
    if (condition.includes(` ${op} `)) {
      const parts = condition.split(` ${op} `);
      const leftPath = splitVariablePath(parts[0].trim());
      const left = resolveVariable(leftPath, variables, context);
      const right = parseValue(parts[1].trim(), variables, context);

      return compare(left, right, op);
    }
  }

  throw new Error(`Unable to evaluate condition: ${condition}`);
}

/**
 * Process partial
 * @param {object} partialNode - Partial node
 * @param {object} variables - Template variables
 * @param {object} context - Validated context
 * @returns {string} Processed output
 */
function processPartial(partialNode, variables, context) {
  // For now, return empty string (partials will be implemented in Day 4)
  return '';
}

/**
 * Resolve variable path to value
 * @param {Array} path - Path parts
 * @param {object} variables - Template variables
 * @param {object} context - Validated context
 * @returns {any} Resolved value
 */
function resolveVariable(path, variables, context) {
  // Special context variables
  if (path.length === 1) {
    if (path[0] === 'stackName') {
      return context.stack.stack;
    } else if (path[0] === 'variantName') {
      return context.stack.variant;
    }
  }

  // Try resolving from variables first
  const value = resolveFromObject(path, variables);
  if (value !== null) {
    return value;
  }

  // Not found
  throw new Error(`Variable not found: ${path.join('.')}`);
}

/**
 * Resolve variable from object
 * @param {Array} path - Path parts
 * @param {object} obj - Object to resolve from
 * @returns {any} Resolved value or null
 */
function resolveFromObject(path, obj) {
  let value = obj;

  for (const part of path) {
    // Handle array indexing: items[0]
    if (part.includes('[')) {
      const match = part.match(/^(\w+)\[(\d+)\]$/);
      if (!match) {
        return null;
      }

      const arrayName = match[1];
      const arrayIndex = parseInt(match[2], 10);

      if (!value.hasOwnProperty(arrayName)) {
        return null;
      }

      value = value[arrayName];
      if (!Array.isArray(value) || arrayIndex >= value.length) {
        return null;
      }

      value = value[arrayIndex];
    } else {
      // Regular property access
      if (!value || typeof value !== 'object' || !value.hasOwnProperty(part)) {
        return null;
      }

      value = value[part];
    }
  }

  return value;
}

/**
 * Split variable path string into parts
 * @param {string} pathString - Path string
 * @returns {Array} Path parts
 */
function splitVariablePath(pathString) {
  // Handle simple variable
  if (!pathString.includes('.')) {
    return [pathString.trim()];
  }

  // Split by . but preserve array indexing
  const parts = [];
  let currentPart = '';
  let inBracket = false;

  for (const char of pathString) {
    if (char === '[') {
      inBracket = true;
      currentPart += char;
    } else if (char === ']') {
      inBracket = false;
      currentPart += char;
    } else if (char === '.' && !inBracket) {
      if (currentPart.length > 0) {
        parts.push(currentPart.trim());
        currentPart = '';
      }
    } else {
      currentPart += char;
    }
  }

  if (currentPart.length > 0) {
    parts.push(currentPart.trim());
  }

  return parts;
}

/**
 * Validate template syntax
 * @param {Array} ast - AST nodes
 * @returns {object} Validation result
 */
function validateTemplateSyntax(ast) {
  const errors = [];

  function validateNode(node, depth) {
    switch (node.type) {
      case 'VARIABLE':
        if (!node.path || node.path.length === 0) {
          errors.push(`Empty variable path at depth ${depth}`);
        }
        break;

      case 'LOOP':
        if (!node.collection) {
          errors.push(`Loop missing collection at depth ${depth}`);
        }
        for (const childNode of node.body) {
          validateNode(childNode, depth + 1);
        }
        break;

      case 'CONDITIONAL':
        for (const branch of node.branches) {
          if (!branch.condition) {
            errors.push(`Conditional branch missing condition at depth ${depth}`);
          }
          for (const childNode of branch.body) {
            validateNode(childNode, depth + 1);
          }
        }
        for (const childNode of node.elseBody) {
          validateNode(childNode, depth + 1);
        }
        break;

      case 'PARTIAL':
        if (!node.name || node.name.length === 0) {
          errors.push(`Partial missing name at depth ${depth}`);
        }
        break;
    }
  }

  for (const node of ast) {
    validateNode(node, 0);
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validate that all variables used in template exist
 * @param {Array} ast - AST nodes
 * @param {object} variables - Template variables
 * @param {object} context - Validated context
 * @returns {object} Validation result
 */
function validateTemplateVariables(ast, variables, context) {
  const errors = [];
  const warnings = [];

  function validateNode(node, scopedVars) {
    switch (node.type) {
      case 'VARIABLE':
        // Skip validation for loop-scoped variables (this, item, etc.)
        const firstPart = node.path[0];
        if (firstPart === 'this' || firstPart.match(/^[a-z]+$/)) {
          // Check if this is a loop-scoped variable
          if (scopedVars && scopedVars.hasOwnProperty(firstPart)) {
            return; // Skip validation - will be created during loop execution
          }
        }

        try {
          resolveVariable(node.path, scopedVars || variables, context);
        } catch (error) {
          errors.push({
            type: 'MISSING_VARIABLE',
            path: node.path.join('.'),
            message: `Variable not found: ${node.path.join('.')}`
          });
        }
        break;

      case 'LOOP':
        // Validate collection exists
        try {
          // Parse collection path (e.g., "items" or "this.roles")
          const collectionPath = splitVariablePath(node.collection);
          const collection = resolveVariable(collectionPath, scopedVars || variables, context);

          if (!Array.isArray(collection)) {
            errors.push({
              type: 'INVALID_COLLECTION',
              collection: node.collection,
              message: `Loop collection is not an array: ${node.collection}`
            });
            return; // Skip body validation if collection is invalid
          }

          // Create scoped variables for loop body validation
          // Add iterator variable with mock value
          const loopScopedVars = { ...(scopedVars || variables) };
          if (collection.length > 0) {
            loopScopedVars[node.iterator] = collection[0];
          } else {
            // Mock value for empty collections
            loopScopedVars[node.iterator] = {};
          }

          // Validate body with scoped variables
          for (const childNode of node.body) {
            validateNode(childNode, loopScopedVars);
          }
        } catch (error) {
          // Collection not found - this might be OK if it's a loop-scoped variable
          // Only error if the collection path doesn't start with a loop-scoped variable
          const collectionPath = splitVariablePath(node.collection);
          const firstPart = collectionPath[0];

          if (!scopedVars || !scopedVars.hasOwnProperty(firstPart)) {
            errors.push({
              type: 'MISSING_COLLECTION',
              collection: node.collection,
              message: `Collection not found: ${node.collection}`
            });
          }
        }
        break;

      case 'CONDITIONAL':
        for (const branch of node.branches) {
          for (const childNode of branch.body) {
            validateNode(childNode, scopedVars);
          }
        }

        for (const childNode of node.elseBody) {
          validateNode(childNode, scopedVars);
        }
        break;

      case 'PARTIAL':
        // Partials will be validated in Day 4
        break;
    }
  }

  for (const node of ast) {
    validateNode(node, null);
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Post-process output (clean up whitespace)
 * @param {string} output - Generated output
 * @returns {string} Cleaned output
 */
function postProcessOutput(output) {
  // Remove excessive blank lines (more than 2 consecutive)
  output = output.replace(/\n{3,}/g, '\n\n');

  // Trim trailing whitespace from each line
  const lines = output.split('\n');
  for (let i = 0; i < lines.length; i++) {
    lines[i] = lines[i].trimEnd();
  }
  output = lines.join('\n');

  // Ensure file ends with single newline
  output = output.trimEnd() + '\n';

  return output;
}

/**
 * Convert value to string
 * @param {any} value - Value to convert
 * @returns {string} String representation
 */
function toString(value) {
  if (value === null || value === undefined) {
    return '';
  } else if (typeof value === 'string') {
    return value;
  } else if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  } else if (Array.isArray(value)) {
    return '[' + value.map(toString).join(', ') + ']';
  } else if (typeof value === 'object') {
    return JSON.stringify(value);
  } else {
    return String(value);
  }
}

/**
 * Check if value is truthy
 * @param {any} value - Value to check
 * @returns {boolean} Truthy or falsy
 */
function isTruthy(value) {
  return !!value;
}

/**
 * Parse value from string
 * @param {string} valueString - Value string
 * @param {object} variables - Template variables
 * @param {object} context - Validated context
 * @returns {any} Parsed value
 */
function parseValue(valueString, variables, context) {
  // Try parsing as number
  if (/^-?\d+(\.\d+)?$/.test(valueString)) {
    return parseFloat(valueString);
  }

  // Try parsing as boolean
  if (valueString === 'true') return true;
  if (valueString === 'false') return false;

  // Try parsing as string literal
  if ((valueString.startsWith('"') && valueString.endsWith('"')) ||
      (valueString.startsWith("'") && valueString.endsWith("'"))) {
    return valueString.slice(1, -1);
  }

  // Try resolving as variable
  try {
    const varPath = splitVariablePath(valueString);
    return resolveVariable(varPath, variables, context);
  } catch (error) {
    // Return as string
    return valueString;
  }
}

/**
 * Compare two values
 * @param {any} left - Left value
 * @param {any} right - Right value
 * @param {string} op - Operator
 * @returns {boolean} Comparison result
 */
function compare(left, right, op) {
  switch (op) {
    case '==':
      return left == right; // eslint-disable-line eqeqeq
    case '!=':
      return left != right; // eslint-disable-line eqeqeq
    case '<':
      return left < right;
    case '>':
      return left > right;
    case '<=':
      return left <= right;
    case '>=':
      return left >= right;
    default:
      throw new Error(`Unknown operator: ${op}`);
  }
}

/**
 * Simple hash function for template caching
 * @param {string} str - String to hash
 * @returns {string} Hash
 */
function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return hash.toString();
}

/**
 * Clear template cache
 */
function clearTemplateCache() {
  templateCache.clear();
}

module.exports = {
  fillTemplate,
  parseTemplate,
  tokenize,
  classifyTag,
  buildAST,
  processTemplate,
  resolveVariable,
  splitVariablePath,
  validateTemplateSyntax,
  validateTemplateVariables,
  clearTemplateCache
};
