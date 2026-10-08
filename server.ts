import path from 'path';
import express from 'express';
import { app, initializeServer } from './src/server/app.ts';
import { config } from './src/server/config.ts';

const distPath = path.resolve(process.cwd(), 'dist');

// Serve static frontend assets from dist in production
app.use(express.static(distPath));

// Fallback to index.html for client-side routing
app.get('*', (_req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

async function start() {
  await initializeServer();
  const port = config.port || 3000;
  app.listen(port, '0.0.0.0', () => {
    console.log(`SupportFlow production server running on port ${port}`);
  });
}

start().catch((err) => {
  console.error('Fatal error starting SupportFlow server:', err);
  process.exit(1);
});
