# Live test results (real Chrome)

Run: 2026-11-25T08:45:12.620Z

| # | Check | Result | Note |
|---|---|---|---|
| 1 | Home page loads with the 16-week roadmap | PASS | 16 chapters listed |
| 2 | Locked weeks show as locked, open weeks as open | PASS | Week 1-2 open, others locked (default) |
| 3 | Locked lesson (Week 3) is blocked and leaks no lesson text | PASS | shows 'Coming soon', no lesson text in the HTML |
| 4 | Open lesson renders (Week 1: Hello World) with all sections | PASS | 13-section lesson page |
| 5 | Visualize / Code / Algorithm tabs switch | PASS | all three views respond |
| 6 | Step-through animation moves forward | PASS | Step 1 of 3 -> Step 3 of 3 |
| 7 | 'Try it' sends the code to the Playground | PASS | opened /playground with the lesson code |
| 8 | Playground runs the program (Basic mode) and prints output | PASS | output shown, exit code 0 |
| 9 | Quiz: answer a question and XP changes; survives reload | PASS | My progress: level Beginner, 3 XP, 1 day streak -> My progress: level Beginner, 13 XP, 1 day streak |
| 10 | Practice hub, Review, Mock exam pages open | PASS | 3 pages render |
| 11 | Progress page shows XP, badges and a backup code | PASS | dashboard + backup visible |
| 12 | Search finds an open lesson | PASS | found 'variables' lesson |
| 13 | Tutor answers a definition question for free | PASS | free answer from the course notes |
| 14 | Settings panel opens (theme, language, text size) | PASS | panel opens and closes |
| 15 | Revision hubs and Privacy page open | PASS | both render |
| 16 | Phone layout (375px): no sideways scroll on home and lesson | PASS | fits the screen |
| 17 | Admin page requires login (not indexed, no student content) | PASS | login form shown |
| 18 | Wrong password is rejected | PASS | error shown, still signed out |
| 19 | Correct username and password sign in | PASS | dashboard opened |
| 20 | Website switch shows ON by default | PASS | 🟢 Website is ON |
| 21 | Unlock Week 3: students can then open the lesson | PASS | Week 3 lesson opened for students |
| 22 | Mark Week 1 as taught: badge appears for students | PASS | taught flag saved |
| 23 | Post an announcement: students see it; then delete it | PASS | banner visible on the student home page |
| 24 | Website OFF: the student site closes (home, lesson, playground, question API) | PASS | home, lesson and playground show 'closed'; question API refuses |
| 25 | Admin still works while the website is OFF | PASS | admin page unaffected |
| 26 | Website ON again: students get the site back | PASS | site restored |
| 27 | Admin tabs: Analytics, Audit log, Health, Settings, Backup | PASS | all 7 tabs open; audit log lists the actions above |
| 28 | Sign out returns to the login form | PASS | signed out |

Console errors during the whole run: 1
- http://localhost:3113/admin: Failed to load resource: the server responded with a status of 401 (Unauthorized)