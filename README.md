# Soul Mate Connect

Starter application for a consent-based matchmaking directory with a luxury black, gold and white design.

## Included
- Public homepage and profile directory (no visitor registration required)
- Filters for age, county, occupation and relationship preference
- Profile detail dialog and pre-filled WhatsApp contact link
- Private administrator login and profile management
- MySQL database schema
- Public API only returns profiles that are approved and available
- Profiles must be confirmed as age 18+ and consent must be confirmed by the administrator

## Requirements
- Node.js 18+
- MySQL 8+
- A hosting account for deployment (Render or another Node.js host)
- A cloud image host for member photos (the starter accepts an image URL)

## Run locally
1. Create a MySQL database and tables by running `schema.sql`.
2. Copy `.env.example` to `.env`.
3. Set your database credentials, a long random `SESSION_SECRET`, a strong admin password (12+ characters), and the matchmaker WhatsApp number in international digits-only format (Kenya example: `2547XXXXXXXX`).
4. Install dependencies: `npm install`
5. Create the administrator: `npm run seed-admin`
6. Start: `npm start`
7. Open `http://localhost:3000` and admin area at `http://localhost:3000/admin.html`.

## Important setup and safety notes
- Do not commit `.env` or share administrator credentials.
- Use HTTPS in production. Set `NODE_ENV=production` and a strong unique `SESSION_SECRET`.
- Configure a production MySQL database and persistent session storage.
- The app does not collect visitor accounts; browsing and selecting profiles are public as requested.
- Only publish adults aged 18+ after receiving and recording their explicit permission for each displayed field and photograph. Provide a way to withdraw consent and promptly unpublish/delete a profile.
- Never publish private phone numbers, exact home addresses, ID documents, or sensitive information.
- The matchmaker must obtain the other person's agreement before sharing contact details or arranging an introduction.
- Add a visible privacy notice, terms, contact details and a report/removal process before public launch.
- The admin form currently accepts a hosted image URL; upload the photos to a reputable image host and use its secure URL. Do not use random image URLs or photos without permission.
- Add CSRF protection, account recovery, audit logging, stronger admin authorization controls, image validation and automated backups before production launch. The starter includes baseline security headers, rate limiting and hashed admin passwords but is not a complete production security audit.
- Free hosting/database tiers may sleep, impose limits or charge for storage/bandwidth. Verify current provider limits before launch.

## WhatsApp configuration
Set `MATCHMAKER_WHATSAPP` in `.env` to the central matchmaker number in international format with digits only, no `+`, spaces or hyphens. Example format: `2547XXXXXXXX`.

## Deploying
Push this project to a private GitHub repository. On Render, create a Node web service, set build command `npm install`, start command `npm start`, attach a MySQL-compatible database, and configure every `.env` value as an environment variable. Run `schema.sql` and `npm run seed-admin` against the production database before opening the site to the public.
