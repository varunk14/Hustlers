# Discord-Style Community Platform – Complete Project Specification  
  
## **Project Vision**  
Build a web-based, full-featured community platform inspired by Discord, supporting advanced chat, audio, video, roles, bots, moderation, and more, focused on learning, modularity, and cost-efficiency. Cursor will serve both as code assistant and teacher, prioritizing your understanding at every step.  
  
---  
  
## **Universal Project Rules & Learning Flow**  
  
1. **Explain Before Building:**    
   - For every MVP (minimum viable product) step, Cursor must FIRST explain:  
     - **What will be built**    
     - **Why it's necessary**    
     - **How it works (tech, architecture, internal flow, security, APIs)**    
     - **Tech/tool choices and tradeoffs**    
     - **How it fits into the overall platform**    
   - Explanations must be concise but thorough: diagrams/examples if useful, not just text.  
   - Each MVP increment should be approachable, testable, and real-world relevant.  
  
2. **Understanding Confirmation:**  
   - After explaining, Cursor MUST ask you:    
     > **“Do you fully understand this MVP and its under-the-hood process?”**  
   - If you say **YES**: Cursor proceeds to generate, test, and build that MVP increment.  
   - If you say **NO**:    
     - Cursor continues to explain the concept again, using new analogies, visuals, or deeper breakdowns until YOU explicitly confirm your understanding.  
     - No implementation occurs until understanding is confirmed.  
  
3. **Documentation & Learning:**  
   - All processes are documented for later review.  
   - Cursor should help generate inline comments, commit messages, and brief docs at every MVP.  
  
---  
  
## **Tech Stack (Prioritize Free Tier/Open Source)**  
  
- **Frontend:** React.js + Chakra UI or Material UI (open source)  
- **Backend:** Supabase Functions (preferred), or Node.js/Express, all deployable on free tiers (Supabase, Vercel, or Fly.io)  
- **Database:** Supabase Postgres (generous free plan)  
- **Real-Time Messaging:** Supabase Realtime or Socket.io (free, OSS)  
- **Authentication:** Supabase Auth (email, Google, Discord, GitHub)  
- **Voice/Video:** WebRTC (native, no cost), optionally Jitsi (OSS) for advanced features  
- **File/Media:** Supabase storage, or Cloudinary (free tier)  
- **Bots:** Node.js or Python (open-source libraries)  
- **Testing:** Jest, Testing Library, and optionally Cypress for e2e (all free tiers)  
- **Analytics:** Supabase dashboards, Vercel/Fly built-in analytics  
- **CI/CD:** GitHub Actions (free minutes), Vercel auto-deploy  
- **Hosting:** Vercel/Netlify for static/frontend, Supabase/Fly.io for backend  
  
---  
  
## **Lean, Modular MVP Roadmap**  
  
Each MVP is a building block of the platform. After every MVP, ensure it is tested, demoed, and documented.  
  
### **Core Platform**  
  
1. **Repository & Project Scaffold**  
   - Git repo, free license (MIT), standard folders (src, public, api, docs)  
   - README: project goals, tech stack, how to run locally  
  
2. **Frontend Skeleton & Theme Engine**  
   - Responsive design, theming (light/dark), landing page, main navigation  
  
3. **Authentication System**  
   - Email/password + OAuth (Google/GitHub/Discord), auth state persistence  
  
4. **Profile System**  
   - Profile page, editable display name, avatar upload, status message  
  
5. **Community Hub Creation (Servers)**  
   - Users create, join, leave community “hubs”; landing “discover” view  
  
6. **Text Channel Management**  
   - Create, edit, delete channels within hubs, channel navigation UI  
  
7. **Real-Time Messaging (Channels)**  
   - WebSocket/Supabase Realtime for low-latency text chat  
  
8. **Direct Messaging (1:1 / Small Group)**  
   - Private convos outside public channels  
  
9. **Media Sharing**  
   - Upload/share images, docs, GIFs within chat  
  
10. **Invite System**  
    - Role-based invitations via links or QR code  
  
### **Community & Feature Depth**  
  
11. **Roles & Permissions**  
    - Admin/Mod/User, role assignment UI, per-channel permissions  
  
12. **Moderation Tools**  
    - Kick, ban, mute, audit logs (track admin actions)  
  
13. **Presence Indicators**  
    - Online/away/busy visibility, per-channel typing/idle status  
  
14. **Pinned Messages & Channel Topics**  
    - Pin/star messages, set channel topics/descriptions  
  
15. **Channel Categories**  
    - Group channels for better navigation  
  
16. **Voice Channels (Audio)**  
    - Real-time audio rooms using WebRTC  
  
17. **Video Channels**  
    - Basic video rooms, option to host meetings via Jitsi  
  
18. **Reactions & Custom Emoji**  
    - Add emoji, create custom server emoji  
  
19. **Threaded/Reply Conversations**  
    - Threaded replies in text chat  
  
20. **Community Search & Discovery**  
    - Search for public communities, advanced filtering  
  
21. **Bot Framework**  
    - Integrate/test sample open-source bots (moderation, trivia, etc.)  
  
22. **Notifications**  
    - In-app, browser, email notifications for activity/messages  
  
23. **Pinned/Starred Sections**  
    - Central dashboard for starred/pinned content  
  
24. **Granular Channel Permissions**  
    - Fine-grained access, thread-level permissions  
  
25. **Settings & Privacy Panel**  
    - User settings, notification preferences, privacy controls  
  
26. **Help/FAQ/Feedback**  
    - Centralized help, reporting/feedback mechanism  
  
27. **Audit & Activity Logs**  
    - View community activity, admin logs, export reports  
  
28. **Analytics Dashboard**  
    - Key stats on usage, engagement for admins  
  
29. **Testing & Quality Assurance**  
    - Automated unit/component/e2e test setup  
  
30. **Deployment & CI/CD**  
    - Finalize automated deploy (Vercel/Fly), production-ready README, open source compliance  
  
---  
  
## **Enhanced Best Practices**  
  
- **Accessibility & Internationalization:**    
  - All UI accessible by keyboard, basic ARIA; internationalization framework set up early.  
- **Performance Monitoring:**    
  - Use service dashboards to monitor users, latency, errors from start.  
- **Version Control:**    
  - Descriptive Git commits, branches for major features, clear PRs.  
- **Documentation:**    
  - Auto-generated docs where possible, always update README and MVP changelog.  
- **Privacy/Security:**    
  - Use sensible defaults for data protection, prompt user consent.  
- **Scalability Pathways:**    
  - After each MVP, add a note: “How could this be made to scale if traffic grows?”  
  
---  
  
