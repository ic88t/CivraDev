#!/usr/bin/env node

/**
 * Diagnostic script to check Civra setup
 * Run with: node scripts/diagnose.js
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Civra Setup Diagnostic\n');

// Check Node.js version
console.log('📦 Environment Check:');
console.log(`   Node.js: ${process.version}`);
console.log(`   Platform: ${process.platform}\n`);

// Check if required files exist
console.log('📋 Required Files:');
const requiredFiles = [
  '.env',
  'package.json',
  'prisma/schema.prisma',
  'lib/auth.ts',
  'lib/prisma.ts',
  'app/api/auth/[...nextauth]/route.ts'
];

let allFilesExist = true;
for (const file of requiredFiles) {
  const exists = fs.existsSync(path.join(process.cwd(), file));
  console.log(`   ${exists ? '✅' : '❌'} ${file}`);
  if (!exists) allFilesExist = false;
}

// Check package.json dependencies
console.log('\n📦 Dependencies:');
try {
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  const requiredDeps = [
    '@prisma/client',
    'next-auth',
    '@next-auth/prisma-adapter',
    'prisma'
  ];

  for (const dep of requiredDeps) {
    const hasInDeps = packageJson.dependencies?.[dep];
    const hasInDevDeps = packageJson.devDependencies?.[dep];
    const exists = hasInDeps || hasInDevDeps;
    const location = hasInDeps ? '(deps)' : hasInDevDeps ? '(dev)' : '';
    console.log(`   ${exists ? '✅' : '❌'} ${dep} ${location}`);
  }
} catch (error) {
  console.log('   ❌ Could not read package.json');
}

// Check environment variables
console.log('\n🔐 Environment Variables:');
try {
  const envContent = fs.readFileSync('.env', 'utf8');
  const requiredEnvVars = [
    'DATABASE_URL',
    'NEXTAUTH_SECRET',
    'NEXTAUTH_URL',
    'ANTHROPIC_API_KEY',
    'DAYTONA_API_KEY'
  ];

  for (const envVar of requiredEnvVars) {
    const exists = envContent.includes(`${envVar}=`);
    console.log(`   ${exists ? '✅' : '❌'} ${envVar}`);
  }
} catch (error) {
  console.log('   ❌ Could not read .env file');
}

// Check if database exists
console.log('\n🗄️  Database:');
const dbExists = fs.existsSync(path.join(process.cwd(), 'prisma', 'dev.db'));
console.log(`   ${dbExists ? '✅' : '⚠️ '} SQLite database ${dbExists ? 'exists' : 'not found (run: npx prisma db push)'}`);

// Check node_modules
console.log('\n📁 Installation:');
const nodeModulesExists = fs.existsSync('node_modules');
console.log(`   ${nodeModulesExists ? '✅' : '❌'} node_modules ${nodeModulesExists ? 'exists' : 'missing (run: npm install)'}`);

// Summary
console.log('\n📊 Summary:');
if (allFilesExist && nodeModulesExists) {
  console.log('   🎉 Setup looks good! Try running: npm run dev');
} else {
  console.log('   ⚠️  Some issues found. Follow the steps above to fix them.');
}

console.log('\n💡 Quick Fix Commands:');
console.log('   npm install                  # Install dependencies');
console.log('   npx prisma generate         # Generate Prisma client');
console.log('   npx prisma db push          # Set up database');
console.log('   npm run dev                 # Start development server');