# Discord-Style Community Platform

A full-featured, web-based community platform inspired by Discord, supporting advanced chat, audio, video, roles, bots, moderation, and more. Built with a focus on learning, modularity, and cost-efficiency.

## 🎯 Project Goals

- **Learning-First Approach**: Each MVP increment is explained thoroughly before implementation
- **Modular Architecture**: Build incrementally with testable, real-world relevant features
- **Cost-Efficient**: Leverage free tiers and open-source tools
- **Production-Ready**: Scalable, accessible, and well-documented

## 🛠 Tech Stack

### Frontend
- **React.js** - UI library
- **Next.js** - React framework with SSR/SSG
- **Chakra UI** - Component library for rapid UI development
- **Zustand** - State management
- **React Hook Form + Zod** - Form handling and validation

### Backend
- **Supabase** - Backend-as-a-Service (Postgres, Auth, Realtime, Storage)
- **Supabase Functions** - Serverless functions
- **Socket.io** - Real-time communication (fallback/alternative)

### Real-Time & Media
- **Supabase Realtime** - Real-time subscriptions
- **WebRTC** - Voice and video communication
- **Jitsi** (optional) - Advanced video meeting features

### Testing
- **Jest** - Unit testing
- **Testing Library** - Component testing
- **Cypress** (optional) - E2E testing

### Deployment
- **Vercel** - Frontend hosting
- **Supabase** - Backend hosting
- **GitHub Actions** - CI/CD

## 📁 Project Structure

```
community/
├── src/                    # Frontend source code
│   ├── components/         # React components
│   ├── pages/              # Next.js pages
│   ├── hooks/              # Custom React hooks
│   ├── store/              # State management (Zustand)
│   ├── lib/                # Utilities and helpers
│   ├── types/              # TypeScript type definitions
│   └── styles/             # Global styles
├── public/                 # Static assets
│   ├── images/             # Image assets
│   └── icons/              # Icon assets
├── api/                    # Backend API routes
│   └── functions/          # Supabase Edge Functions
├── docs/                   # Documentation
│   ├── mvp/                # MVP-specific documentation
│   └── architecture/       # Architecture decisions
├── tests/                  # Test files
├── .env.example            # Environment variables template
├── .gitignore              # Git ignore rules
├── LICENSE                 # MIT License
└── README.md               # This file
```

## 🚀 Getting Started

### Prerequisites

- **Node.js** >= 18.0.0
- **npm** >= 9.0.0 (or yarn/pnpm)
- **Git**
- **Supabase Account** (free tier)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd community
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   ```
   Then fill in your Supabase credentials:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. **Run the development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)



This project follows a lean, modular MVP approach. Each MVP is a building block:

1. ✅ **Repository & Project Scaffold** - Current MVP
2. ⏳ Frontend Skeleton & Theme Engine
3. ⏳ Authentication System
4. ⏳ Profile System
5. ⏳ Community Hub Creation (Servers)
6. ⏳ Text Channel Management
7. ⏳ Real-Time Messaging (Channels)
8. ⏳ Direct Messaging (1:1 / Small Group)
9. ⏳ Media Sharing
10. ⏳ Invite System


See the [Complete Project Specification](./#%20Discord-Style%20Community%20Platform%20–%20Complete%20Project%20Specification.md) for the full roadmap.

## 🧪 Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage
```

## 🤝 Contributing

This is a learning project. Contributions, suggestions, and improvements are welcome!

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🔗 Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Chakra UI Documentation](https://chakra-ui.com)
- [Supabase Documentation](https://supabase.com/docs)
- [React Documentation](https://react.dev)

## 📧 Support

For questions or issues, please open an issue on GitHub.

---

**Built with ❤️ for learning and community building**

