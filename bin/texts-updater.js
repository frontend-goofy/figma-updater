#!/usr/bin/env node

async function start() {
  await import('../lib/es/cli.mjs');
}

start().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
