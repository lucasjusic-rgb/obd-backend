# AI Mechanic Backend

Minimal Express server that relays requests from the Flutter app to Groq's
free LLM API, so the API key never ships inside the app itself.

## Setup

```bash
npm install
cp .env.example .env
```

Open `.env` and paste your real Groq key in place of `paste_your_groq_key_here`:

```
GROQ_API_KEY=gsk_your_real_key_here
```

## Run it

```bash
npm start
```

You should see:
```
AI Mechanic backend listening on http://localhost:3000
```

## Test it without the app

In a second terminal window:

```bash
curl http://localhost:3000/health
```

Should return `{"status":"ok"}`.

Try a real chat request:

```bash
curl -X POST http://localhost:3000/api/diagnose/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "My check engine light just came on, what should I do?", "history": [], "context": {}}'
```

You should get back a JSON reply from the AI mechanic.

## Connecting the Flutter app to this backend

The app is currently pointed at a placeholder URL
(`lib/core/constants/app_constants.dart` → `aiProxyEndpoint`). While
developing locally with the iOS Simulator, `http://localhost:3000` works.
**On a real iPhone**, `localhost` means the phone itself, not your Mac — so
you need your Mac's local network IP instead. Find it with:

```bash
ipconfig getifaddr en0
```

Then in `app_constants.dart`, set:

```dart
static const String aiProxyEndpoint = 'http://YOUR_MAC_IP:3000/api/diagnose';
```

Your phone and Mac need to be on the same WiFi network for this to work.

## Going further

- Deploy to Railway or Render (free tier) so the app works away from your
  home network — then swap `aiProxyEndpoint` to the deployed URL.
- Add basic auth or a shared secret header so randoms on the internet can't
  use your backend once it's deployed publicly.
