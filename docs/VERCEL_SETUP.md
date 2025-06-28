# 🚀 Vercel Setup Guide for PR Previews

This guide will help you set up Vercel deployment for automatic PR previews with clean URLs.

## 📋 **What You'll Get**

After setup, every PR will automatically get:
- **Clean URLs**: `https://pr-5-pr-review-checker.vercel.app`
- **Automatic SSL**: HTTPS by default
- **Global CDN**: Fast loading worldwide
- **Instant deployments**: Usually under 30 seconds

## 🛠️ **Step-by-Step Setup**

### **Step 1: Install Vercel CLI**

```bash
# Install Vercel CLI globally
npm install -g vercel

# Login to your Vercel account
vercel login
```

### **Step 2: Link Your Project**

```bash
# Navigate to your project directory
cd /path/to/pr-review-checker

# Link to Vercel (creates .vercel directory)
vercel link
```

**During `vercel link`, you'll be asked:**
1. **Set up and deploy?** → `Y`
2. **Which scope?** → Choose your account/team
3. **Link to existing project?** → `N` (create new)
4. **Project name?** → `pr-review-checker` (or your preferred name)
5. **Directory with code?** → `./client` (important!)

### **Step 3: Get Required Tokens**

#### **3.1 Get Vercel Token**
1. Go to [Vercel Dashboard](https://vercel.com/account/tokens)
2. Click **"Create Token"**
3. Name: `GitHub Actions PR Previews`
4. Scope: **Full Account** or your specific team
5. Copy the token (starts with `vercel_`)

#### **3.2 Get Organization ID**
```bash
# Method 1: From CLI
vercel teams list

# Method 2: From dashboard
# Go to https://vercel.com/teams/[team-name]/settings
# Copy the Team ID
```

#### **3.3 Get Project ID**
```bash
# Method 1: From CLI (in your project directory)
cat .vercel/project.json

# Method 2: From dashboard
# Go to your project → Settings → General
# Copy the Project ID
```

### **Step 4: Add Secrets to GitHub**

1. **Go to your GitHub repository**
2. **Navigate to**: `Settings` → `Secrets and variables` → `Actions`
3. **Click**: `New repository secret`
4. **Add these three secrets:**

| Secret Name | Value | Example |
|-------------|-------|---------|
| `VERCEL_TOKEN` | Your Vercel token | `vercel_abc123...` |
| `VERCEL_ORG_ID` | Your team/org ID | `team_abc123...` |
| `VERCEL_PROJECT_ID` | Your project ID | `prj_abc123...` |

### **Step 5: Test the Setup**

1. **Push a commit** to your PR branch
2. **Check GitHub Actions** - should show Vercel deployment
3. **Look for PR comment** with Vercel preview URL
4. **Visit the URL** - should show your deployed app

## 🔧 **Configuration Options**

### **Custom Domain (Optional)**

If you have a custom domain on Vercel:

```yaml
# In .github/workflows/pr-preview-hosted.yml
alias-domains: |
  pr-${{ github.event.number }}.yourdomain.com
```

### **Environment Variables**

Add environment variables in Vercel dashboard:
1. Go to **Project Settings** → **Environment Variables**
2. Add variables for **Preview** deployments
3. Common variables:
   - `REACT_APP_API_URL`
   - `REACT_APP_GITHUB_TOKEN`

### **Build Settings**

Vercel should auto-detect React, but you can customize:

**vercel.json** (in project root):
```json
{
  "builds": [
    {
      "src": "client/package.json",
      "use": "@vercel/static-build",
      "config": {
        "distDir": "build"
      }
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "/client/$1"
    }
  ]
}
```

## 🐛 **Troubleshooting**

### **Common Issues**

#### **❌ "Project not found"**
```bash
# Re-link the project
rm -rf .vercel
vercel link
```

#### **❌ "Invalid token"**
- Check token hasn't expired
- Ensure token has correct permissions
- Regenerate token if needed

#### **❌ "Build failed"**
- Check build logs in Vercel dashboard
- Ensure `client/` directory has valid React app
- Check for missing dependencies

#### **❌ "Wrong directory deployed"**
Make sure `working-directory: ./client` is set in workflow

### **Debug Commands**

```bash
# Test local deployment
cd client
vercel --prod

# Check project configuration
vercel inspect

# View deployment logs
vercel logs [deployment-url]
```

## 📊 **Vercel Dashboard**

After setup, monitor deployments at:
- **Main Dashboard**: https://vercel.com/dashboard
- **Project Page**: https://vercel.com/[team]/[project]
- **Deployment Logs**: Click any deployment for details

## 💰 **Pricing**

**Hobby Plan (Free):**
- ✅ 100GB bandwidth/month
- ✅ 100 deployments/day
- ✅ Unlimited static sites
- ✅ Custom domains

**Pro Plan ($20/month):**
- ✅ 1TB bandwidth/month
- ✅ 3000 deployments/day
- ✅ Team features
- ✅ Analytics

For most development teams, the **free Hobby plan is sufficient**.

## 🎉 **Success Checklist**

- [ ] Vercel CLI installed and logged in
- [ ] Project linked with `vercel link`
- [ ] Three secrets added to GitHub repository
- [ ] Workflow file updated (already done)
- [ ] Test PR created and deployed successfully
- [ ] Preview URL working and accessible

## 🔄 **Next Steps**

After Vercel is working:

1. **Enable GitHub Pages fallback** - For when Vercel is down
2. **Set up custom domain** - For branded preview URLs
3. **Configure environment variables** - For API endpoints
4. **Monitor usage** - Stay within free tier limits

## 📞 **Getting Help**

- **Vercel Docs**: https://vercel.com/docs
- **GitHub Actions Logs**: Check workflow runs for errors
- **Vercel Support**: https://vercel.com/help

Your PR previews will be live on Vercel with professional URLs! 🚀 