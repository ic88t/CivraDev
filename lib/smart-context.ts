/**
 * Smart context management for Civra
 * Intelligently selects relevant files to include in context
 */

interface ConversationMessage {
  role: string;
  content: string;
}

/**
 * Core files that should always be included in context
 */
const CORE_FILES = [
  'package.json',
  'tsconfig.json',
  'next.config.ts',
  'next.config.js',
  'tailwind.config.ts',
  'app/globals.css'
];

/**
 * Extract file paths mentioned in text
 */
export function extractFileReferences(text: string): string[] {
  const files = new Set<string>();

  // Match common file patterns
  const patterns = [
    // app/page.tsx, src/components/Button.tsx, etc.
    /(?:app|src|components|lib|pages|utils|styles)\/[\w\-\/]+\.[jt]sx?/g,
    // Quoted paths: "app/layout.tsx"
    /"([\w\-\/]+\.[jt]sx?)"/g,
    // Path with backticks: `app/page.tsx`
    /`([\w\-\/]+\.[jt]sx?)`/g,
  ];

  patterns.forEach(pattern => {
    const matches = text.matchAll(pattern);
    for (const match of matches) {
      const file = match[1] || match[0];
      files.add(file);
    }
  });

  return Array.from(files);
}

/**
 * Extract files that were modified in previous conversation
 */
export function getFilesFromHistory(
  conversationHistory: ConversationMessage[],
  lastN: number = 5
): string[] {
  const files = new Set<string>();

  // Get last N messages
  const recentMessages = conversationHistory.slice(-lastN);

  recentMessages.forEach(msg => {
    if (msg.role === 'assistant' && msg.content) {
      // Extract files from dec-write tags
      const writeRegex = /<dec-write\s+file_path="([^"]+)"/g;
      let match;
      while ((match = writeRegex.exec(msg.content)) !== null) {
        files.add(match[1]);
      }

      // Extract files from dec-search-replace tags
      const searchReplaceRegex = /<dec-search-replace\s+file_path="([^"]+)"/g;
      while ((match = searchReplaceRegex.exec(msg.content)) !== null) {
        files.add(match[1]);
      }

      // Extract files from dec-rename tags
      const renameRegex = /<dec-rename\s+original_file_path="([^"]+)"\s+new_file_path="([^"]+)"/g;
      while ((match = renameRegex.exec(msg.content)) !== null) {
        files.add(match[2]); // Add the new path
      }
    }
  });

  return Array.from(files);
}

/**
 * Determine relevant files based on the user's message content
 */
export function inferRelevantFiles(message: string): string[] {
  const files = new Set<string>();
  const lowerMessage = message.toLowerCase();

  // Component-related keywords
  if (lowerMessage.includes('button') || lowerMessage.includes('click')) {
    files.add('components/ui/button.tsx');
  }

  if (lowerMessage.includes('form') || lowerMessage.includes('input')) {
    files.add('components/ui/input.tsx');
    files.add('components/ui/form.tsx');
  }

  if (lowerMessage.includes('layout') || lowerMessage.includes('navbar') || lowerMessage.includes('header')) {
    files.add('app/layout.tsx');
  }

  if (lowerMessage.includes('home') || lowerMessage.includes('landing') || lowerMessage.includes('main page')) {
    files.add('app/page.tsx');
  }

  if (lowerMessage.includes('style') || lowerMessage.includes('color') || lowerMessage.includes('design') || lowerMessage.includes('theme')) {
    files.add('app/globals.css');
    files.add('tailwind.config.ts');
  }

  if (lowerMessage.includes('api') || lowerMessage.includes('endpoint') || lowerMessage.includes('route')) {
    // Will be expanded based on specific API mention
  }

  return Array.from(files);
}

/**
 * Main function to get relevant files for context
 */
export function getRelevantFiles(
  message: string,
  conversationHistory: ConversationMessage[] = []
): string[] {
  const allFiles = new Set<string>();

  // 1. Always include core files
  CORE_FILES.forEach(f => allFiles.add(f));

  // 2. Extract explicitly mentioned files
  extractFileReferences(message).forEach(f => allFiles.add(f));

  // 3. Get files from recent conversation
  getFilesFromHistory(conversationHistory, 5).forEach(f => allFiles.add(f));

  // 4. Infer relevant files based on message content
  inferRelevantFiles(message).forEach(f => allFiles.add(f));

  return Array.from(allFiles);
}

/**
 * Build file context string from file contents
 */
export function buildFileContext(files: Record<string, string>): string {
  let context = '## Current Project Context\n\n';
  context += 'The following files are currently in your context. DO NOT read these files again.\n\n';

  Object.entries(files).forEach(([path, content]) => {
    context += `### ${path}\n\`\`\`\n${content}\n\`\`\`\n\n`;
  });

  return context;
}

/**
 * Check if a file is already in context
 */
export function isFileInContext(filePath: string, contextFiles: string[]): boolean {
  return contextFiles.includes(filePath);
}
