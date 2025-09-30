#!/usr/bin/env node

import getFigmaDiffs from 'figma-diff';
import makeEdits from './index.js';
const args = process.argv.slice(2);
const [figmaUrl, oldVersion, newVersion] = args;

if (!figmaUrl) {
    console.log('Usage: node cli.js <figma-url> <old-version-id> <new-version-id>');
    process.exit(1);
}

async function main() {
    console.log('Getting diffs...');
    const diffs = await getFigmaDiffs(figmaUrl, oldVersion, newVersion);
    if (diffs === undefined) {
        process.exit(1);
    }

    console.log('Updating files...');
    await makeEdits({ diffs });
}

main();
