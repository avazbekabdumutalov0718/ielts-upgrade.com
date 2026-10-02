# VIVID IELTS V26 — Native 100 Day Upgrade

- Old `/100day/` mini-site removed completely.
- New `journey100.js` + `journey100.css` run directly inside the main VIVID IELTS shell.
- No second login, signup, iframe, redirect, or separate auth flow.
- Main VIVID IELTS session remains the only authentication layer.
- 100 Day dashboard, 100-day map, daily checklist, reflection notes, statistics, settings, custom tasks and streaks are integrated.
- 100 Day state is included in the existing VIVID cloud snapshot and queued through the existing Supabase sync.
- Root `/index.html` remains the only Vercel landing page.
