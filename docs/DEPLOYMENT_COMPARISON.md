# 🚀 PR Preview Deployment: Self-Hosted vs GitHub-Hosted

This guide compares the two deployment approaches for PR previews to help you choose the best option for your needs.

## 📊 **Quick Comparison**

| Feature | Self-Hosted Runner | GitHub-Hosted Runner |
|---------|-------------------|---------------------|
| **Setup Complexity** | ⚠️ Moderate | ✅ Simple |
| **Maintenance** | ❌ You manage | ✅ GitHub manages |
| **Full-Stack Support** | ✅ Frontend + API | ⚠️ Frontend only* |
| **Custom Domains** | ✅ Complete control | ⚠️ Service dependent |
| **Cost (Low Usage)** | ❌ Fixed server cost | ✅ Free/cheap |
| **Cost (High Usage)** | ✅ Predictable | ❌ Can get expensive |
| **Deployment Speed** | ✅ Very fast | ⚠️ Depends on service |
| **Customization** | ✅ Unlimited | ⚠️ Limited |

*Can be made full-stack with additional services

## 🏠 **Self-Hosted Runner Approach**

### **Best For:**
- Teams that need full-stack previews (frontend + API)
- Organizations with existing server infrastructure
- Projects requiring custom server configurations
- High-volume development teams
- Complete control over the deployment environment

### **Architecture:**
```
GitHub PR → Self-Hosted Runner → Your Server
                                      ↓
                               PM2 + Nginx
                                      ↓
                            pr-5.yourdomain.com
```

### **Pros:**
- ✅ **Full-stack deployment** - Both React frontend and Node.js API
- ✅ **Direct server control** - Custom domains, SSL, server config
- ✅ **Fast deployments** - No external service dependencies
- ✅ **Cost predictable** - Fixed server costs regardless of usage
- ✅ **Complete customization** - Install any tools, configure any way
- ✅ **Real environment testing** - Exact production-like setup

### **Cons:**
- ❌ **Server maintenance** - You manage updates, security, uptime
- ❌ **Initial setup complexity** - Requires server configuration
- ❌ **Single point of failure** - If server goes down, no previews
- ❌ **Security responsibility** - You handle server security

### **Setup Steps:**
1. Run `./scripts/setup-runner.sh` on Ubuntu server
2. Configure GitHub Actions runner
3. Update domain in workflow
4. Optional: Configure Nginx for clean URLs

## ☁️ **GitHub-Hosted Runner Approach**

### **Best For:**
- Teams just starting with PR previews
- Frontend-only applications
- Small teams or personal projects
- Organizations wanting zero infrastructure management
- Projects using external APIs (don't need custom backend)

### **Architecture:**
```
GitHub PR → GitHub Runner → External Service
                                   ↓
                            Vercel/Netlify/AWS
                                   ↓
                         pr-5-myapp.vercel.app
```

### **Deployment Options:**

#### **1. 🔷 Vercel (Recommended for React)**
```yaml
# Add to repository secrets:
VERCEL_TOKEN: your_vercel_token
VERCEL_ORG_ID: your_org_id
VERCEL_PROJECT_ID: your_project_id
```
- **URL**: `https://pr-5-myapp.vercel.app`
- **Features**: Automatic SSL, CDN, instant deployments
- **Cost**: Free tier generous, pay-per-use

#### **2. 🟢 Netlify**
```yaml
# Add to repository secrets:
NETLIFY_AUTH_TOKEN: your_netlify_token
NETLIFY_SITE_ID: your_site_id
```
- **URL**: `https://pr-5-myapp--site.netlify.app`
- **Features**: Forms, functions, split testing
- **Cost**: Free tier available, then monthly plans

#### **3. 📄 GitHub Pages (Free)**
```yaml
# Add to repository variables:
USE_GITHUB_PAGES: 'true'
```
- **URL**: `https://username.github.io/repo/pr-5`
- **Features**: Free, simple, integrated with GitHub
- **Limitations**: Static only, no custom domains on free

#### **4. ☁️ AWS S3 + CloudFront**
```yaml
# Add to repository secrets:
AWS_ACCESS_KEY_ID: your_access_key
AWS_SECRET_ACCESS_KEY: your_secret_key
AWS_S3_BUCKET: your_bucket_name
```
- **URL**: Custom domain or S3 website URL
- **Features**: Enterprise-grade, global CDN
- **Cost**: Pay-per-use, very scalable

#### **5. 🔥 Firebase Hosting**
```yaml
# Add to repository secrets:
FIREBASE_SERVICE_ACCOUNT: your_service_account_json
FIREBASE_PROJECT_ID: your_project_id
```
- **URL**: `https://project--pr-5.web.app`
- **Features**: Google infrastructure, fast
- **Cost**: Generous free tier

## 🎯 **Recommendation by Use Case**

### **🚀 Just Getting Started**
**Use: GitHub-Hosted + Vercel**
- Fastest setup (5 minutes)
- Professional URLs
- Zero maintenance
- Free tier sufficient for most teams

### **🏢 Enterprise/Production**
**Use: Self-Hosted Runner**
- Full control and customization
- Complete full-stack testing
- Predictable costs
- Security compliance

### **💰 Budget Conscious**
**Use: GitHub-Hosted + GitHub Pages**
- Completely free
- Simple setup
- Good for frontend-only apps

### **🔧 Need Backend Testing**
**Use: Self-Hosted Runner**
- Only option for full-stack previews
- Test API endpoints with frontend
- Database integration testing

## 🛠️ **Implementation Guide**

### **Option A: Start with GitHub-Hosted**

1. **Enable GitHub-Hosted Workflow:**
   ```bash
   # Rename the workflow file
   mv .github/workflows/pr-preview.yml .github/workflows/pr-preview-self-hosted.yml
   mv .github/workflows/pr-preview-hosted.yml .github/workflows/pr-preview.yml
   ```

2. **Choose a Service (Vercel Example):**
   ```bash
   # Install Vercel CLI
   npm i -g vercel
   
   # Login and get tokens
   vercel login
   vercel link
   ```

3. **Add Repository Secrets:**
   - Go to GitHub repo → Settings → Secrets and variables → Actions
   - Add required secrets for your chosen service

### **Option B: Use Self-Hosted**

1. **Setup Server:**
   ```bash
   ./scripts/setup-runner.sh
   ```

2. **Configure Runner:**
   - Follow GitHub's self-hosted runner setup
   - Update domain in workflow file

## 🔄 **Migration Path**

You can easily switch between approaches:

### **GitHub-Hosted → Self-Hosted**
1. Set up your server with the setup script
2. Configure self-hosted runner
3. Switch workflow files
4. Update DNS if using custom domains

### **Self-Hosted → GitHub-Hosted**
1. Choose external hosting service
2. Configure service credentials
3. Switch workflow files
4. Optionally keep server for other uses

## 💡 **Best Practices**

### **For GitHub-Hosted:**
- Use Vercel or Netlify for best developer experience
- Set up custom domains for professional appearance
- Monitor usage to avoid unexpected costs
- Use branch previews for feature development

### **For Self-Hosted:**
- Set up monitoring and alerting
- Regular server maintenance schedule
- Backup and disaster recovery plan
- SSL certificate auto-renewal
- Resource monitoring (CPU, memory, disk)

## 🎉 **Conclusion**

**Start Simple, Scale When Needed:**

1. **Begin with GitHub-Hosted** (Vercel/Netlify) for quick wins
2. **Test the workflow** and team adoption
3. **Migrate to Self-Hosted** when you need:
   - Full-stack testing
   - Complete control
   - High-volume usage
   - Custom server requirements

Both approaches are valid and can coexist. You can even use GitHub-Hosted for frontend previews and Self-Hosted for full-stack integration testing!

Choose based on your current needs, and remember - you can always change later. 🚀 