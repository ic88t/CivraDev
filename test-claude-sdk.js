const { query } = require('@anthropic-ai/claude-code');

async function testSDK() {
  console.log('Testing Claude Code SDK...');

  // Test different API formats to find the correct one
  const testCases = [
    // Format 1: Simple string
    async () => {
      console.log('Testing format 1: Simple string');
      return await query("Hello, create a simple HTML file");
    },

    // Format 2: Messages array
    async () => {
      console.log('Testing format 2: Messages array');
      return await query({
        messages: [
          { role: 'user', content: 'Hello, create a simple HTML file' }
        ]
      });
    },

    // Format 3: With options
    async () => {
      console.log('Testing format 3: With options');
      return await query("Hello, create a simple HTML file", {
        maxTurns: 5
      });
    }
  ];

  for (let i = 0; i < testCases.length; i++) {
    try {
      console.log(`\n=== Test Case ${i + 1} ===`);
      const result = await testCases[i]();
      console.log('SUCCESS! This format works.');
      console.log('Result type:', typeof result);
      console.log('Result:', result?.toString?.()?.substring(0, 100) + '...');
      break;
    } catch (error) {
      console.log('FAILED:', error.message);
    }
  }
}

testSDK().catch(console.error);