#!/bin/bash

echo "🚀 Preparing for Vercel deployment..."

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "📦 Installing Vercel CLI..."
    npm install -g vercel
fi

# Build the project
echo "🔨 Building project..."
npm run build

# Check if build was successful
if [ $? -eq 0 ]; then
    echo "✅ Build successful!"
    echo "🚀 Deploying to Vercel..."
    vercel --prod
else
    echo "❌ Build failed! Please fix the errors before deploying."
    exit 1
fi
