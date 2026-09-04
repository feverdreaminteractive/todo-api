import express from 'express';

// Placeholder entrypoint for the scaffolding step (issue #1). This gets replaced
// by the real app.ts/server.ts split in issue #5 (HTTP layer) -- for now it just
// proves the toolchain (build/dev/start) works end to end.
const app = express();
const port = process.env.PORT ?? 3000;

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.listen(port, () => {
  console.log(`Listening on port ${port}`);
});
