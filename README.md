# PocketPlan 💚💗

A student budget tracker built for LaunchPad Hacks. Set a monthly budget, log what you spend, and PocketPlan tells you how much you can safely spend **per day** for the rest of the month.

## Features
- Add, edit and delete expenses (amount, category, note, date)
- Monthly budget with progress bar and warnings at 80% and when over budget
- "Safe per day" amount for the rest of the month
- Doughnut chart and category breakdown (Chart.js)
- Browse previous months, filter by category
- Export to CSV, load demo data, clear all data
- Responsive, keyboard-friendly, works offline after first load (except the chart library and fonts)
- Data stays in your browser (localStorage). No accounts, no server.

## Run it
No build step. Open `index.html` in a browser.

## Deploy (free)
- **Netlify Drop:** go to app.netlify.com/drop and drag the project folder in.
- **GitHub Pages:** push to a repo, then Settings → Pages → deploy from the `main` branch.
- **Vercel:** import the repo; no settings needed.

## Built with
HTML, CSS, vanilla JavaScript, Chart.js, localStorage.

## Devpost write-up (draft, edit it into your own words)

**Inspiration**
Student allowances disappear fast, and most budgeting apps are made for people with salaries. I wanted something simple that answers one question: how much can I spend today?

**What it does**
PocketPlan lets you set a monthly budget and log expenses by category. It shows how much is left, how much you can safely spend each day, and where your money goes with a chart. It warns you before you go over budget.

**How I built it**
HTML, CSS and vanilla JavaScript, with Chart.js for the chart. Everything is saved in the browser with localStorage, so there is no backend and no sign-up.

**Challenges**
Keeping the month logic correct (days left, switching months), and making the app easy to use on a phone.

**What I learned**
Structuring state and rendering without a framework, handling dates safely, and designing an accessible interface.

**What's next**
Recurring expenses, savings goals, and syncing across devices.

## Demo video script (about 2 minutes)
1. Say the problem in one sentence (10s).
2. Click "Load demo data" and show the summary, safe-per-day and chart (30s).
3. Add a new expense live and watch the numbers update (20s).
4. Edit an expense, then filter by category (20s).
5. Change the budget to a low number to show the warning (15s).
6. Switch to the previous month and export the CSV (15s).
7. Close with what's next (10s).
