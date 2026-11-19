# Tagna-Ani

Tagna-Ani is a farm dashboard and SMS advisory service for Mindanao, built by
Team prECEsion. The web interface uses TanStack Start and React. The Node
service handles accounts, SMS, and the admin API.

## Run locally

Use Node 24.

```bash
npm ci
npm run dev
npm test
```

To test the deployed build locally, run `npm run build` and `npm start`.
Development uses local SQLite unless `DATABASE_URL` is configured.
Set the variables in `.env.example` in your shell as needed. Enable
`TAGNA_ADMIN_USERNAME` and `TAGNA_ADMIN_PASSWORD` to test the admin page.

The public landing page is at `/`. The farm dashboard is at `/dashboard`,
and the authenticated admin page is at `/admin`. Browser-local farm records
and server-stored account and SMS data use separate data stores.

## Deploy Tagna-Ani on Render

Use the existing web service with root directory `tagnaAni`, Node 24, build command
`npm ci && npm run build`, and start command `npm start`. Set the health check
path to `/__tagna/health`. Keep a persistent PostgreSQL database and set
`DATABASE_URL` to its connection string. Local development uses an ignored SQLite
file when PostgreSQL is absent.

Set `TAGNA_ADMIN_USERNAME` and `TAGNA_ADMIN_PASSWORD` in Render's environment
before first launch, then log in and open **Admin** on the dashboard or go to
`/admin`. The password must be at least 12 characters. Changing the password for
that username in Render rotates the account password and revokes its sessions on
the next start. Keep administrator credentials and all SMS secrets server-side.
Use the Render dashboard for service restarts and deployments.

The Render-created account is the primary admin and counts toward the seven
admin slots. In Admin, use **Create an administrator** to add up to six more.
Share the displayed temporary password privately. Invited administrators must
set their own password before using admin tools. The Admin action log shows the
most recent 1,000 actions, their actors, and the fields changed. A phone number
assigned by an administrator requires verification by the farmer before SMS
password recovery works on the new number.

If upgrading from the original plaintext-file version, back up any active
private account and farm data first. The Postgres version does not import those
files. If the app already uses Postgres, keep the same `DATABASE_URL` and admin
username to preserve its accounts, including across rebuilds. Browser-only farm
records remain tied to the same browser and account.
Treat passwords and the old MacroDroid reply trigger in Git history as exposed.
Rotate the trigger and ask affected users to change any reused credentials.
Removing files from the current branch leaves earlier Git history intact.

Set the following public values before building if available.

- `VITE_TAGNA_SMS_NUMBER` — verified Philippine service number in `+639XXXXXXXXX`
  format. The built-in contact number is 09269656818. Set an empty value to hide
  the number until you finish a real end-to-end SMS test.
- `VITE_TAGNA_CONTACT_EMAIL` — shared inbox monitored by Team prECEsion.

### Keep MacroDroid for testing

Create a new MacroDroid reply webhook and put the URL in `MACRODROID_REPLY_URL`.
Its Send SMS action uses the webhook query values `reply_number` and
`reply_text`. On the inbound macro, filter the full body using
`(?i)^\s*ANI(?:\s|$)` if your MacroDroid version supports regex matching.
Set the inbound action to HTTP POST
`https://<service>.onrender.com/__tagna/sms/inbound` with
`Content-Type: application/json` and `Authorization: Bearer <SMS_INBOUND_SECRET>`.
Store the same random `SMS_INBOUND_SECRET` on Render. Pass the actual SMS sender
and body as JSON fields `from` and `message`. The Render value is the secret
alone. The MacroDroid header value is `Bearer ` followed by the same secret.
Use MacroDroid's JSON-safe value
encoding and include a stable per-message `id` if available. There is no ntfy step.
A successful webhook response means the outbound relay accepted the request.
Check the phone's Send SMS action for actual carrier delivery.

The admin page groups new advisory requests by sender, with up to 1,000
entries from the last 30 days. Each entry shows whether the SMS relay
accepted the reply request. Receipt on the destination phone still requires
a real SMS test. Help, subscription commands, and verification codes are
excluded from this history.

Farm setup uses Open-Meteo's Philippine location search alongside the
bundled Mindanao city and ZIP list. Manual coordinates are checked against
the Natural Earth 1:50m Philippine land boundary from world-atlas. Some
small islands and coastal points may need a named-location search instead.
SMS also looks up Philippine places outside its bundled city and ZIP list. A barangay prefix can accompany a recognized city or municipality, for example `ANI Burnay Gitagum | rice drought`. The place displayed in an SMS can be more specific than the forecast grid.

### Switch to hosted two-way SMS

Get a service number or short code that can receive SMS from the Philippine
networks you expect to serve. Confirm inbound and outbound support, registration,
and fees with the provider before provisioning. For Twilio, configure a form POST
to `https://<service>.onrender.com/__tagna/sms/twilio`. Set that exact URL as
`TWILIO_WEBHOOK_URL` and set `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, and
`TWILIO_FROM_NUMBER` for the approved outbound sender. Configure the inbound
number separately if the carrier requires a different approved sender for replies.
Validate with real Philippine SIMs with the MacroDroid phone powered off. On
Render Free, also test after the service has been idle. Cold starts can outlast
SMS provider webhook deadlines. Use always-on compute or a provider-facing
durable queue with retries if you need reliable delivery.

### Daily reminders, announcements, and redeploys

To turn on automatic delivery, include the root-level
`.github/workflows/daily-sms.yml` file in your GitHub default branch
alongside the `tagnaAni` folder. Add the same fresh random value as
`SMS_DAILY_SECRET` in **Render → Environment** and **GitHub → Settings →
Secrets and variables → Actions → New repository secret**. Use a different
value from `SMS_INBOUND_SECRET`. The workflow targets
`https://tagna-ani-app.onrender.com` by default. If your service URL differs,
set the GitHub Actions variable `SMS_SERVICE_URL`.

The workflow queues daily SMS at 6:00 a.m. Philippine time (22:00 UTC the
previous day). It has retry runs within the next hour. GitHub scheduling and
Render Free cold starts can delay delivery. GitHub Actions must be enabled,
and the MacroDroid gateway needs cellular service, internet, and SMS
permission. Opt in from the app with a verified number or send `ANI ALERTS ON`
after a successful advisory SMS. Run the workflow manually after 6 a.m. to
check delivery with a test subscriber. Subscribers can text `ANI ALERTS OFF`
to stop.

In Admin, open **Messages and deployment**. **Daily reminder subscribers · SMS**
queues a custom SMS to opted-in numbers. Keep the tab open to drain the queue.
If interrupted, use **Resume pending SMS broadcast**. The scheduled worker
also resumes pending messages. The relay requests are spaced out. An accepted
request indicates relay acceptance. Check the destination phone for delivery.
**All app accounts · dashboard announcement** publishes a notice with clickable
HTTPS links for signed-in app users.

To enable **Redeploy on Render**, copy the service's deploy hook from **Render →
Settings** and save it as `RENDER_DEPLOY_HOOK_URL` in Render's environment.
The primary admin can type `REDEPLOY` to request the latest GitHub commit
from the linked branch. Keep the hook URL private.

### Android APK

Keep the hosted HTTPS app and server as the source of account and SMS logic.
For an initial APK, consider a Trusted Web Activity once the site has a PWA
manifest and can publish Digital Asset Links for the signing certificate. For an
offline-first APK, package a dedicated client with Capacitor and add a versioned
HTTPS API with mobile sessions and offline record sync. Store only public
configuration in the APK. The current browser-local records do not sync across
devices.

SMS advisories use Open-Meteo or, when it is unavailable, MET Norway for
available weather fields. NASA POWER climatology supplies a historical
monthly root-zone wetness index and the inputs for the optional 18-month
rotation screen. The rotation is a planning option and uses assumed crop
thresholds. Unavailable weather fields are labeled. CO2 is omitted because the available sources do not measure it at the farm. The dashboard planner uses NASA POWER historical monthly values for its baseline, with ±25% rainfall sensitivity tabs and an 18-month PDF export.
`ANI HELP BISAYA`, `ANI HELP TAGALOG`, and `ANI HELP ENGLISH` send the
format, examples, supported crop presets, and typical farm problems.
