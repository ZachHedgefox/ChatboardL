# 💬 Chatboard

A tiny chatboard: type a username, send a message, and everyone sees it live.

- **No dependencies** – just Node.js 18+
- Live updates using Server-Sent Events
- Messages saved to `messages.json` (last 200 kept)
- Basic protections: length limits, HTML-safe rendering, 1 message/second rate limit

## Run it

```bash
git clone https://github.com/<your-username>/chatboard.git
cd chatboard
npm start
```

Open http://localhost:3000 in a browser (open two tabs to see live updates).

## Deploy it

GitHub Pages only hosts static files, so it can't run `server.js`. To put the
chatboard online, deploy the repo to any Node host, for example
[Render](https://render.com), [Railway](https://railway.app), or
[Fly.io](https://fly.io):

- Build command: *(none)*
- Start command: `npm start`

The host's `PORT` environment variable is picked up automatically.

> Note: free hosts often have temporary disk storage, so `messages.json` may
> reset when the app restarts.

## Project structure

```
server.js        Node server (API + static files + live stream)
public/
  index.html     Page
  style.css      Styles
  app.js         Frontend logic
```

## License

MIT
