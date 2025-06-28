# 🔍 PR Approval Finder v5.0

A modern web application that analyzes GitHub Pull Requests to determine the minimum required approvals based on CODEOWNERS files. Built with React and Node.js, featuring a beautiful theme system and comprehensive PR analysis.

## ✨ Features

### 🎯 **Core Functionality**
- **Smart CODEOWNERS Analysis**: Parses CODEOWNERS files with glob pattern matching
- **Minimum Approval Calculation**: Determines the exact number of approvals needed
- **File-by-File Breakdown**: Shows which files require which approvers
- **Real-time PR Status**: Displays current approval status and progress

### 🎨 **Modern UI/UX**
- **8 Beautiful Themes**: Light, Dark, Ocean, Forest, Sunset, Midnight, Arctic, Cherry
- **Responsive Design**: Works perfectly on desktop, tablet, and mobile
- **Skeleton Loaders**: Beautiful loading animations that mimic content structure
- **Smooth Animations**: Slide-in effects, hover animations, and micro-interactions
- **Glassmorphism Design**: Modern UI with backdrop blur and transparency effects

### 📊 **Advanced Features**
- **Progress Visualization**: Animated SVG progress ring showing completion percentage
- **PR History**: Recent PRs stored locally with quick access dropdown
- **Basic/Advanced Views**: Toggle between simplified and detailed analysis
- **User Avatars**: GitHub profile pictures and team indicators
- **Mobile Responsive**: Optimized experience across all devices

### 🔒 **Security & Privacy**
- **Optional GitHub Tokens**: Works with public repos, supports private repos with tokens
- **No Server Storage**: GitHub tokens never stored, PR history kept locally only
- **HTTPS Communication**: Secure API calls to GitHub

## 🚀 Quick Start

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/pr-approval-finder.git
   cd pr-approval-finder
   ```

2. **Install dependencies**
   ```bash
   npm install
   cd client && npm install
   cd ../server && npm install
   ```

3. **Start the application**
   ```bash
   npm run dev
   ```

4. **Open your browser**
   - Frontend: http://localhost:3000
   - Backend: http://localhost:3001

## 📋 Usage

1. **Enter a GitHub PR URL**
   ```
   https://github.com/owner/repo/pull/123
   ```

2. **Optional: Add GitHub Token**
   - For private repositories
   - Higher rate limits
   - Better performance

3. **Analyze!**
   - View minimum required approvals
   - See file-by-file breakdown
   - Track approval progress
   - Switch between Basic/Advanced views

## 🎨 Theme System

Choose from 8 beautiful themes:
- ☀️ **Light** - Clean and bright (default)
- 🌙 **Dark** - Easy on the eyes
- 🌊 **Ocean** - Deep blue vibes
- 🌲 **Forest** - Natural green tones
- 🌅 **Sunset** - Warm orange hues
- 🌌 **Midnight** - Deep purple night
- ❄️ **Arctic** - Cool blue-white
- 🌸 **Cherry** - Soft pink accents

## 🔧 Configuration

### Environment Variables (Optional)

Create a `.env` file in the `server` directory:

```env
GITHUB_TOKEN=your_github_token_here
PORT=3001
```

### GitHub Token Setup

1. Go to GitHub Settings → Developer settings → Personal access tokens
2. Generate a new token with `repo` scope
3. Add it to your `.env` file or enter it in the UI

## 🏗️ Architecture

### Frontend (React)
- **Framework**: React 18
- **Styling**: CSS with custom properties for theming
- **HTTP Client**: Axios
- **Build Tool**: Create React App

### Backend (Node.js)
- **Framework**: Express.js
- **GitHub API**: REST API v3
- **Pattern Matching**: Minimatch for glob patterns
- **CORS**: Enabled for cross-origin requests

### Key Components
- **Theme System**: CSS variables with persistent storage
- **Skeleton Loaders**: CSS animations for loading states
- **Progress Ring**: SVG-based progress visualization
- **Responsive Grid**: CSS Grid for adaptive layouts

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with ❤️ using React and Node.js
- GitHub API for PR and CODEOWNERS data
- Modern CSS techniques for beautiful UI
- Minimatch library for glob pattern matching

## 📞 Support

If you encounter any issues or have questions:
1. Check the [Issues](https://github.com/yourusername/pr-approval-finder/issues) page
2. Create a new issue with detailed information
3. Include PR URL and error messages if applicable

---

**© 2025 Aswin** - *Assisted with Cursor AI* 