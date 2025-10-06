/**
 * Parser for Civra-style XML command tags
 * Handles: <dec-write>, <dec-delete>, <dec-rename>, <dec-add-dependency>
 */

export interface FileOperation {
  type: 'write' | 'delete' | 'rename' | 'add-dependency';
  filePath?: string;
  content?: string;
  originalPath?: string;
  newPath?: string;
  package?: string;
}

export interface ParsedResponse {
  explanation?: string;
  codeBlock?: string;
  operations: FileOperation[];
  summary?: string;
}

/**
 * Extract content between <dec-code> tags
 */
function extractDecCodeBlock(text: string): { codeBlock: string; remainder: string } | null {
  const decCodeStart = text.indexOf('<dec-code>');
  const decCodeEnd = text.indexOf('</dec-code>');

  if (decCodeStart === -1 || decCodeEnd === -1) {
    return null;
  }

  const codeBlock = text.substring(decCodeStart + 10, decCodeEnd).trim();
  const beforeCode = text.substring(0, decCodeStart).trim();
  const afterCode = text.substring(decCodeEnd + 11).trim();

  return {
    codeBlock,
    remainder: beforeCode + '\n' + afterCode
  };
}

/**
 * Parse <dec-write> tags
 */
function parseWriteOperations(codeBlock: string): FileOperation[] {
  const operations: FileOperation[] = [];
  const writeRegex = /<dec-write\s+file_path="([^"]+)">([\s\S]*?)<\/dec-write>/g;

  let match;
  while ((match = writeRegex.exec(codeBlock)) !== null) {
    operations.push({
      type: 'write',
      filePath: match[1],
      content: match[2].trim()
    });
  }

  return operations;
}

/**
 * Parse <dec-delete> tags
 */
function parseDeleteOperations(codeBlock: string): FileOperation[] {
  const operations: FileOperation[] = [];
  const deleteRegex = /<dec-delete\s+file_path="([^"]+)"\s*\/>/g;

  let match;
  while ((match = deleteRegex.exec(codeBlock)) !== null) {
    operations.push({
      type: 'delete',
      filePath: match[1]
    });
  }

  return operations;
}

/**
 * Parse <dec-rename> tags
 */
function parseRenameOperations(codeBlock: string): FileOperation[] {
  const operations: FileOperation[] = [];
  const renameRegex = /<dec-rename\s+original_file_path="([^"]+)"\s+new_file_path="([^"]+)"\s*\/>/g;

  let match;
  while ((match = renameRegex.exec(codeBlock)) !== null) {
    operations.push({
      type: 'rename',
      originalPath: match[1],
      newPath: match[2]
    });
  }

  return operations;
}

/**
 * Parse <dec-add-dependency> tags
 */
function parseAddDependencyOperations(codeBlock: string): FileOperation[] {
  const operations: FileOperation[] = [];
  const depRegex = /<dec-add-dependency>(.*?)<\/dec-add-dependency>/g;

  let match;
  while ((match = depRegex.exec(codeBlock)) !== null) {
    operations.push({
      type: 'add-dependency',
      package: match[1].trim()
    });
  }

  return operations;
}

/**
 * Main parser function
 */
export function parseCivraResponse(responseText: string): ParsedResponse {
  const result: ParsedResponse = {
    operations: []
  };

  // Extract dec-code block
  const codeExtraction = extractDecCodeBlock(responseText);

  if (codeExtraction) {
    result.codeBlock = codeExtraction.codeBlock;

    // Extract explanation (before dec-code)
    const lines = codeExtraction.remainder.split('\n');
    const explanationLines = [];
    const summaryLines = [];
    let inSummary = false;

    for (const line of lines) {
      if (line.trim().length === 0) continue;

      // Check if this looks like a summary (usually comes after dec-code)
      if (inSummary || line.match(/^(These changes|This|The)/i)) {
        summaryLines.push(line);
        inSummary = true;
      } else {
        explanationLines.push(line);
      }
    }

    result.explanation = explanationLines.join('\n').trim();
    result.summary = summaryLines.join('\n').trim();

    // Parse all operations from code block
    result.operations = [
      ...parseWriteOperations(result.codeBlock),
      ...parseDeleteOperations(result.codeBlock),
      ...parseRenameOperations(result.codeBlock),
      ...parseAddDependencyOperations(result.codeBlock)
    ];
  } else {
    // No dec-code block found, treat entire response as explanation
    result.explanation = responseText.trim();
  }

  return result;
}

/**
 * Helper to check if response contains code operations
 */
export function hasCodeOperations(responseText: string): boolean {
  return responseText.includes('<dec-code>') && responseText.includes('</dec-code>');
}

/**
 * Extract just the text content, removing all XML tags
 */
export function extractTextContent(responseText: string): string {
  let text = responseText;

  // Remove dec-code blocks but keep internal text
  text = text.replace(/<dec-code>([\s\S]*?)<\/dec-code>/g, '');

  // Remove all other dec- tags
  text = text.replace(/<\/?dec-[^>]+>/g, '');

  return text.trim();
}
