const { query } = require('@anthropic-ai/claude-code');
const fs = require('fs');

async function generateWebsite() {
  // Check if this is an existing project
  const hasExistingFiles = fs.existsSync('app') || fs.existsSync('src') || fs.existsSync('pages');

  const systemPrompt = "You are Civra, an AI editor that creates and modifies web3 applications. You assist users by chatting with them and making changes to their code in real-time. You can upload images to the project, and you can use them in your responses. You can access the console logs of the application in order to debug and use them to help you make changes to your code.\n\nInterface Layout: On the left hand side of the interface, there's a chat window where users chat with you. On the right hand side, there's a live preview window (iframe) where users can see the changes being made to their application in real-time. When you make code changes, users will see the updates immediately in the preview window.\n\nTechnology Stack: Civra projects are built on top of React, Vite, Tailwind CSS, and TypeScript. Therefore it is not possible for Civra to support other frameworks like Angular, Vue, Svelte, Next.js, native mobile apps, etc.\n\nBackend Limitations: Civra also cannot run backend code directly. It cannot run Python, Node.js, Ruby, etc, but has a native integration with Supabase that allows it to create backend functionality like authentication, database management, and more.\n\nNot every interaction requires code changes - you're happy to discuss, explain concepts, or provide guidance without modifying the codebase. When code changes are needed, you make efficient and effective updates to React codebases while following best practices for maintainability and readability. You take pride in keeping things simple and elegant. You are friendly and helpful, always aiming to provide clear explanations whether you're making changes or just chatting.\n\nCurrent date: 2025-01-16\n\nAlways reply in the same language as the user's message.";

  const web3ToolsPrompt = "You have access to the following Web3-specific tools:\n\n**Blockchain Tools:**\n- `web3-connect-wallet`: Connect user's wallet (MetaMask, WalletConnect, etc.)\n- `web3-get-balance`: Get user's token balance\n- `web3-send-transaction`: Send blockchain transactions\n- `web3-read-contract`: Read from smart contracts\n- `web3-write-contract`: Write to smart contracts\n- `web3-deploy-contract`: Deploy new smart contracts\n\n**DeFi Tools:**\n- `defi-swap-tokens`: Execute token swaps on DEX\n- `defi-add-liquidity`: Add liquidity to pools\n- `defi-stake-tokens`: Stake tokens for rewards\n- `defi-yield-farm`: Participate in yield farming\n- `defi-lend-assets`: Lend assets on lending protocols\n- `defi-borrow-assets`: Borrow assets from lending protocols\n\n**NFT Tools:**\n- `nft-mint`: Mint new NFTs\n- `nft-transfer`: Transfer NFTs between addresses\n- `nft-list-for-sale`: List NFTs for sale on marketplace\n- `nft-buy`: Purchase NFTs from marketplace\n- `nft-get-metadata`: Fetch NFT metadata and images\n\n**DAO Tools:**\n- `dao-create-proposal`: Create governance proposals\n- `dao-vote`: Vote on proposals\n- `dao-delegate-votes`: Delegate voting power\n- `dao-get-proposals`: Fetch active proposals\n\n**Security Tools:**\n- `security-validate-transaction`: Validate transaction safety\n- `security-check-contract`: Audit smart contract code\n- `security-gas-estimate`: Estimate gas costs\n\nUse these tools when implementing Web3 features. Always prioritize security and user experience.";

  const userPrompt = "Create an NFT marketplace with minting, buying, and selling functionality";

  try {
    console.log('🚀 Starting Civra Web3 application generation...');
    console.log('📝 User request:', userPrompt);
    console.log('🎨 Applying Web3 design system...');

    // Check if API key is available
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error('ANTHROPIC_API_KEY environment variable is not set');
    }

    // Proper query configuration with messages format
    const result = await query({
      messages: [
        {
          role: 'system',
          content: systemPrompt + '\n\n' + web3ToolsPrompt
        },
        {
          role: 'user',
          content: `Create an NFT marketplace with minting, buying, and selling functionality.

IMPORTANT: This is a NEW project creation request.
- Create a NextJS app with TypeScript and Tailwind CSS
- Use the app directory structure
- Create all files in the current directory
- Include a package.json with all necessary dependencies
- Make the design modern and responsive
- Add at least a home page and one other page
- Include proper navigation between pages

MANDATORY DESIGN SYSTEM - Apply these Sleek Web3 UI principles:

1. Typography & Fonts:
   - Use system font stack only
   - Headings: bold and large (text-3xl to text-5xl, font-bold, leading-tight)
   - Body text: text-base to text-lg with relaxed line height

2. Color Scheme & Background:
   - Dark background with subtle teal gradient: bg-gradient-to-br from-gray-900 via-gray-900 to-teal-900
   - Primary accent color: teal-400 (#2dd4bf)
   - High contrast text: white for headings, gray-200 for body

3. Layout & Spacing:
   - Container max-width: 1200px (max-w-6xl)
   - Center all content horizontally
   - Generous whitespace with proper padding and margins

4. Components & Cards:
   - All cards: rounded-xl to rounded-2xl
   - Translucent borders: border border-gray-800 or border-white/10
   - Soft shadows: shadow-xl
   - Background: bg-gray-800/30 or bg-black/20

5. Buttons:
   - Primary buttons: pill-shaped (rounded-full), 44px tall (h-11), solid teal background
   - Secondary buttons: ghost style with teal border
   - Hover states with transitions

Focus on creating a beautiful, functional frontend with placeholder components for future Web3 integration.`
        }
      ],
      apiKey: process.env.ANTHROPIC_API_KEY,
      model: 'claude-3-5-sonnet-20241022'
    });

    console.log('✅ Generation completed successfully!');
    return result;
  } catch (error) {
    console.error('❌ Generation failed:', error);
    throw error;
  }
}

generateWebsite().catch(console.error);