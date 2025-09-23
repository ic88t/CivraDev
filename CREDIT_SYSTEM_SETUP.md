# Credit System Implementation Guide

## 🎯 Overview

This guide walks you through implementing a complete credit-based billing system for your Sonas Web3 Development Platform. The system enforces usage limits for free users and provides upgrade paths to paid plans.

## 📋 What's Been Implemented

### ✅ **Database Schema** (`supabase-schema-credits.sql`)
- **Subscriptions table**: Tracks user plans and billing status
- **Credit balances table**: Manages monthly credit allocations
- **Credit transactions table**: Detailed transaction history
- **Enhanced usage table**: Links usage to credit consumption
- **Database functions**: Automated credit management

### ✅ **Credit Management System** (`lib/credits.ts`)
- Credit checking and consumption functions
- Plan limit configurations matching your pricing
- Usage tracking with credit deduction
- Monthly credit reset functionality

### ✅ **API Enforcement**
- **Generation API**: Credit checks before project creation
- **Chat API**: Credit checks before message processing
- **Usage API**: Real-time usage statistics

### ✅ **User Interface**
- **Usage Dashboard**: Visual credit usage tracking
- **Credit Warnings**: Alerts when running low
- **Upgrade Prompts**: Direct links to pricing page
- **Error Handling**: Graceful credit exhaustion handling

## 🚀 Setup Instructions

### Step 1: Update Your Database Schema

Run the new schema to add credit management tables:

```sql
-- Apply the enhanced schema
-- File: supabase-schema-credits.sql
-- This adds all the necessary tables and functions
```

**Important**: This will add new tables without affecting existing data.

### Step 2: Configure Plan Limits

The system is pre-configured with your pricing structure:

```typescript
// Already configured in lib/credits.ts
FREE: { message_limit: 10, integration_limit: 100, project_limit: 3 }
STARTER: { message_limit: 100, integration_limit: 2000, project_limit: unlimited }
BUILDER: { message_limit: 250, integration_limit: 10000, project_limit: unlimited }
PRO: { message_limit: 500, integration_limit: 20000, project_limit: unlimited }
ELITE: { message_limit: 1200, integration_limit: 50000, project_limit: unlimited }
```

### Step 3: Test the Credit System

1. **Create a test user account**
2. **Verify initial credit allocation** (10 message credits for free users)
3. **Test generation limits** (should block after 10 attempts)
4. **Test project limits** (should block after 3 projects)
5. **Test chat limits** (should block after remaining credits exhausted)

### Step 4: Monitor Usage

Access the usage dashboard at `/` in the "My Projects" tab to see:
- Real-time credit balances
- Usage percentages
- Billing period information
- Upgrade prompts

## 🔧 Credit Types Explained

### **Message Credits**
- **Used for**: Project generation, chat messages
- **Free tier**: 10/month
- **Cost**: 1 credit per generation or chat message

### **Project Limits**
- **Used for**: Total number of projects you can create
- **Free tier**: 3 projects maximum
- **Paid plans**: Unlimited projects

### **Integration Credits** 
- **Used for**: API integrations, blockchain calls (future)
- **Free tier**: 100/month  
- **Cost**: Variable based on integration type

## 📊 How It Works

### **New User Flow**
1. User signs up → Automatic free plan assignment
2. Credits allocated → 10 message + 100 integration + 3 projects max
3. Usage tracked → Every API call checked and recorded
4. Limits enforced → Blocked when credits exhausted or project limit reached

### **Credit Consumption Flow**
1. **Pre-check**: Verify sufficient credits before processing
2. **Processing**: Handle the actual request (generation/chat)
3. **Post-consume**: Deduct credits and record transaction
4. **Rollback**: Restore credits if processing fails

### **Monthly Reset**
Credits reset automatically at the start of each billing period using the `reset_monthly_credits()` database function.

## 🛠️ Testing Commands

### Check User Credits
```sql
SELECT * FROM credit_balances WHERE user_id = 'user-id-here';
```

### View Usage History
```sql
SELECT * FROM usage WHERE user_id = 'user-id-here' ORDER BY created_at DESC;
```

### Manually Reset Credits (for testing)
```sql
SELECT reset_monthly_credits('user-id-here');
```

### Simulate Credit Consumption
```sql
SELECT consume_credits('user-id-here', 'message', 1, 'Test consumption');
```

## 🚨 Error Handling

The system provides user-friendly error messages:

- **402 Payment Required**: When credits are exhausted
- **Upgrade prompts**: Direct links to pricing page
- **Visual warnings**: When approaching credit limits
- **Graceful degradation**: Clear messaging about limitations

## 🔄 Integration Points

### **Generation API** (`/api/generate-daytona`)
- Checks message credits before processing
- Consumes 1 credit per successful generation
- Returns 402 error when insufficient credits

### **Chat API** (`/api/chat-continue`) 
- Checks message credits before processing
- Consumes 1 credit per successful message
- Returns 402 error when insufficient credits

### **Usage API** (`/api/usage`)
- Returns real-time credit balances
- Provides usage statistics
- Shows billing period information

## 📈 Monitoring & Analytics

Track these key metrics:
- **Credit consumption rates** by plan
- **Upgrade conversion** from free to paid
- **Usage patterns** by user segment
- **Credit exhaustion** frequency

## 🔮 Future Enhancements

Ready for these additions:
- **Stripe integration** for automatic billing
- **Credit top-ups** for existing plans  
- **Usage alerts** via email/notifications
- **Team billing** for workspace features
- **Integration credits** for blockchain APIs

## ✅ Verification Checklist

- [ ] Database schema applied successfully
- [ ] New users get default free plan (10 credits, 3 projects max)
- [ ] Generation blocked after credit exhaustion
- [ ] Generation blocked after 3 projects created
- [ ] Chat blocked after credit exhaustion
- [ ] Usage dashboard shows correct information
- [ ] Project limits displayed for free users
- [ ] Error messages include upgrade links
- [ ] Credit warnings appear at 80% usage
- [ ] Monthly reset function works correctly

Your credit system is now fully implemented and ready for production use!
