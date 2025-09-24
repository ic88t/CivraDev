#!/usr/bin/env tsx

/**
 * Setup script for authentication and database
 * Run with: npx tsx scripts/setup-auth.ts
 */

import { execSync } from 'child_process';
import { existsSync } from 'fs';
import path from 'path';

console.log('🚀 Setting up Civra authentication system...\n');

// Check if required files exist
const requiredFiles = [
  'prisma/schema.prisma',
  'lib/auth.ts',
  'lib/prisma.ts',
  '.env.example'
];

console.log('📋 Checking required files...');
for (const file of requiredFiles) {
  if (existsSync(path.join(process.cwd(), file))) {
    console.log(`✅ ${file}`);
  } else {
    console.log(`❌ ${file} - MISSING!`);
    process.exit(1);
  }
}

// Check if .env exists
if (!existsSync('.env') && !existsSync('.env.local')) {
  console.log('\n⚠️  No .env file found. Please create one using .env.example as template:');
  console.log('   cp .env.example .env');
  console.log('\n   Then fill in your OAuth credentials and other required values.');
  process.exit(1);
}

console.log('\n📦 Installing additional dependencies...');
try {
  execSync('npm install @prisma/client @next-auth/prisma-adapter', { stdio: 'inherit' });
} catch (error) {
  console.error('❌ Failed to install dependencies');
  process.exit(1);
}

console.log('\n🗄️  Setting up database...');
try {
  // Generate Prisma client
  execSync('npx prisma generate', { stdio: 'inherit' });

  // Run database migrations
  execSync('npx prisma db push', { stdio: 'inherit' });

  console.log('✅ Database setup complete!');
} catch (error) {
  console.error('❌ Database setup failed');
  console.error('Make sure DATABASE_URL is set correctly in your .env file');
  process.exit(1);
}

console.log('\n🎉 Authentication system setup complete!');
console.log('\nNext steps:');
console.log('1. Set up OAuth applications:');
console.log('   - Google: https://console.developers.google.com/');
console.log('   - GitHub: https://github.com/settings/developers');
console.log('');
console.log('2. Update your .env file with OAuth credentials');
console.log('');
console.log('3. Start your development server:');
console.log('   npm run dev');
console.log('');
console.log('4. Test authentication at: http://localhost:3000/auth/signin');