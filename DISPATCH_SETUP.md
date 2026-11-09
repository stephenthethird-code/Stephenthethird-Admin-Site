# Studio OS — Dispatch Setup Guide

Complete instructions to activate SMS ingestion (Twilio), Instagram DMs (Meta),
audio analysis (librosa), Gmail integration, and cloud storage.

---

## Step 0 — Make your backend reachable from the internet

Twilio and Meta need a public URL to send webhooks to. Since your backend runs on
`localhost:5050`, you need a tunnel. **ngrok** is the easiest option.

1. Download ngrok: https://ngrok.com/download (free account)
2. In a terminal:
   ```
   ngrok http 5050
   ```
3. Copy the HTTPS URL it gives you, e.g. `https://abc123.ngrok-free.app`
4. This is your `PUBLIC_URL` — you'll use it everywhere below
5. **Keep ngrok running** whenever you want webhooks to work

> For a permanent setup later, deploy the Flask backend to a VPS (Railway, Render,
> or DigitalOcean) and use that URL instead of ngrok.

---

## Step 1 — Install librosa (audio analysis)

In your terminal, navigate to your backend folder and activate your venv:

```bash
cd ~/Downloads/CLAUDE\ SHYT\!/music\ hub/backend
source ../.venv/bin/activate      # or: .venv/Scripts/activate on Windows
pip install librosa soundfile numpy
```

Test it worked:
```bash
python -c "import librosa; print('librosa ready')"
```

Once installed, every file you upload through the batch uploader will automatically
get BPM, key, genre, and instrument tags written back to its track record.

---

## Step 2 — Twilio SMS

**What this does:** Any text sent to your Twilio number appears in Dispatch,
auto-matched to your CRM contacts by phone number.

### 2a. Create your Twilio account
1. Go to https://www.twilio.com/try-twilio — sign up free
2. Verify your personal phone number
3. Click **"Get a Trial Number"** — choose a US number with SMS capability
4. Your free trial gives you $15 credit (~150 messages)

### 2b. Get your credentials
1. In the Twilio Console dashboard, find:
   - **Account SID** (starts with AC...)
   - **Auth Token** (click the eye icon to reveal)
2. Copy both

### 2c. Set the webhook
1. In Twilio Console → **Phone Numbers** → **Manage** → **Active Numbers**
2. Click your number
3. Under **Messaging** → **"A message comes in"**:
   - Set to: **Webhook**
   - URL: `https://YOUR-NGROK-URL/api/webhook/twilio`
   - Method: **HTTP POST**
4. Save

### 2d. Set environment variables
In your terminal before starting Flask, or in a `.env` file:
```
TWILIO_AUTH_TOKEN=your_auth_token_here
PUBLIC_URL=https://YOUR-NGROK-URL
```

Start Flask:
```bash
python app.py
```

**Test it:** Text your Twilio number from any phone. It should appear in Dispatch
within seconds. If the sender's number matches a contact in your CRM, it'll show
their name and tier automatically.

---

## Step 3 — Instagram DMs (Meta API)

> **Heads up:** Meta requires an App Review for DM permissions. The setup below takes
> about 20 minutes. The review itself can take 1–2 weeks. Build it now so you're in
> the queue.

### 3a. Create a Meta Developer App
1. Go to https://developers.facebook.com
2. Click **My Apps** → **Create App**
3. Choose **"Business"** type → Next
4. Name it something like "S3 Studio OS" → Create
5. On the app dashboard, click **Add Product** → find **Instagram** → Set Up

### 3b. Connect your Instagram Business account
1. In the Instagram product → **Instagram Basic Display** (or **Instagram API**)
2. Under Settings → add your Instagram account
3. Make sure your IG account is set to **Business** or **Creator** in the Instagram app
   (Settings → Account → Switch to Professional Account)

### 3c. Configure the webhook
1. In your app → **Products** → **Webhooks**
2. Click **Subscribe to this object** → choose **Instagram**
3. **Callback URL:** `https://YOUR-NGROK-URL/api/webhook/ig`
4. **Verify Token:** `s3dispatch` (exactly this — it's hardcoded in the backend)
5. Click **Verify and Save**
6. After verification, subscribe to the **messages** field

### 3d. Set environment variables
```
META_VERIFY_TOKEN=s3dispatch
META_APP_SECRET=your_app_secret_here
```

Find your App Secret: App Dashboard → Settings → Basic → App Secret (click Show)

### 3e. Request permissions (App Review)
1. App Dashboard → **App Review** → **Permissions and Features**
2. Request: `instagram_manage_messages`
3. Fill out the use case form — explain you're managing your own DMs as an artist
4. Submit — Meta typically reviews in 3–10 business days

**While waiting for approval:** Use the **"Log Message"** button in Dispatch to
manually paste any DM you receive. Full automation kicks in once approved.

---

## Step 4 — Gmail Integration

**What this does:** Every contact's profile shows a scrollable history of all
emails sent and received with that person.

### 4a. Create a Google Cloud project
1. Go to https://console.cloud.google.com
2. Click the project dropdown (top left) → **New Project**
3. Name it "S3 Studio OS" → Create

### 4b. Enable APIs
1. In your project → **APIs & Services** → **Enable APIs and Services**
2. Search for and enable:
   - **Gmail API**
   - **Google Drive API** (covers both Gmail and Drive in one OAuth flow)

### 4c. Create OAuth credentials
1. **APIs & Services** → **Credentials** → **Create Credentials** → **OAuth Client ID**
2. Application type: **Desktop App**
3. Name: "S3 Studio OS Local"
4. Click Create → **Download JSON**
5. Rename the downloaded file to `credentials.json`
6. Move it to: `~/Downloads/CLAUDE SHYT!/music hub/backend/credentials.json`

### 4d. Set environment variable
```
GDRIVE_CREDENTIALS_JSON=/Users/YOUR_NAME/Downloads/CLAUDE SHYT!/music hub/backend/credentials.json
```

### 4e. Connect
1. Start your Flask backend
2. Open: http://localhost:5050/api/gmail/auth
3. Google OAuth consent screen appears → sign in with your Gmail account
4. Approve the permissions
5. Tab closes automatically — you're connected

**To sync a contact's email history:**
Open any contact in Contacts → the Gmail timeline syncs automatically when you
open the contact detail panel (calls `/api/gmail/sync/<contact_id>`).

---

## Step 5 — Dropbox Integration

### 5a. Create a Dropbox App
1. Go to https://www.dropbox.com/developers/apps
2. Click **Create App**
3. Choose **Scoped Access** → **Full Dropbox** (so you can browse all folders)
4. Name it "S3 Studio OS"
5. Under **Permissions** tab, enable: `files.metadata.read`, `files.content.read`, `sharing.read`
6. Under **Settings**, add redirect URI: `http://localhost:5050/api/cloud/dropbox/callback`

### 5b. Get your credentials
From the App Console → Settings:
- **App key**
- **App secret**

### 5c. Set environment variables
```
DROPBOX_APP_KEY=your_app_key
DROPBOX_APP_SECRET=your_app_secret
```

### 5d. Connect
1. Start Flask backend
2. Open: http://localhost:5050/api/cloud/dropbox/auth
3. Authorize the app in Dropbox
4. You'll see `{"ok": true, "message": "Dropbox connected!"}`
5. Head to Tracks → click the **Dropbox** source tab to browse your files

---

## Step 6 — Your .env file (put it all together)

Create a file called `.env` in your backend folder:

```
# Server
PUBLIC_URL=https://YOUR-NGROK-URL
ADMIN_TOKEN=s3admin

# Email (Gmail App Password)
SMTP_USER=your@gmail.com
SMTP_PASS=xxxx-xxxx-xxxx-xxxx

# Twilio
TWILIO_AUTH_TOKEN=your_twilio_auth_token

# Meta / Instagram
META_VERIFY_TOKEN=s3dispatch
META_APP_SECRET=your_meta_app_secret

# Google (Gmail + Drive)
GDRIVE_CREDENTIALS_JSON=/full/path/to/credentials.json

# Dropbox
DROPBOX_APP_KEY=your_dropbox_key
DROPBOX_APP_SECRET=your_dropbox_secret
```

Then start Flask with:
```bash
cd ~/Downloads/CLAUDE\ SHYT\!/music\ hub/backend
source ../.venv/bin/activate
export $(cat .env | xargs)
python app.py
```

Or install `python-dotenv` (`pip install python-dotenv`) and add
`from dotenv import load_dotenv; load_dotenv()` at the top of `app.py`.

---

## Quick-start checklist

| Feature | Time to set up | Status |
|---|---|---|
| librosa (auto-tagging) | 2 min | Run `pip install librosa soundfile` |
| ngrok (public URL) | 5 min | Required for webhooks |
| Twilio SMS | 15 min | Ready same day |
| Dropbox browsing | 10 min | Ready same day |
| Gmail timeline | 10 min | Ready same day |
| Instagram DMs | 20 min setup + review | 1–2 weeks for Meta approval |

**Recommended order:** librosa → ngrok → Twilio → Dropbox → Gmail → Meta (while waiting on review)
