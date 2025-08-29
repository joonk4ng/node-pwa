# Vercel Deployment Guide

## Quick Deploy

### Option 1: Deploy via Vercel CLI

1. **Install Vercel CLI** (if not already installed):
   ```bash
   npm i -g vercel
   ```

2. **Login to Vercel**:
   ```bash
   vercel login
   ```

3. **Deploy from project directory**:
   ```bash
   vercel
   ```

4. **Follow the prompts**:
   - Link to existing project or create new
   - Confirm deployment settings
   - Wait for build and deployment

### Option 2: Deploy via GitHub Integration

1. **Push your code to GitHub**

2. **Go to [vercel.com](https://vercel.com)**

3. **Click "New Project"**

4. **Import your GitHub repository**

5. **Configure project settings**:
   - Framework Preset: `Vite`
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Install Command: `npm install`

6. **Click "Deploy"**

## Environment Variables

No environment variables are required for this deployment.

## Build Configuration

The project is configured with:
- **Framework**: Vite + React
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Node Version**: 18.x

## Features

- ✅ **PWA Support**: Progressive Web App with offline capabilities
- ✅ **PDF Generation**: Client-side PDF generation with pdf-lib
- ✅ **Mobile Optimized**: Responsive design for mobile devices
- ✅ **Fast Loading**: Optimized bundle splitting and caching

## Post-Deployment

After deployment:
1. Your app will be available at the provided Vercel URL
2. Each push to your main branch will trigger automatic deployments
3. Preview deployments are created for pull requests

## Troubleshooting

### Common Issues:

1. **Build Fails**: Check that all dependencies are in `package.json`
2. **PDF Generation Issues**: Ensure pdf-lib and pdfjs-dist are properly installed
3. **PWA Not Working**: Verify the manifest and service worker configuration

### Support:
- Check Vercel deployment logs in the dashboard
- Review build output for specific error messages
- Ensure all TypeScript errors are resolved before deployment
