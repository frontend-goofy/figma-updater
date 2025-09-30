import { createConsola } from 'consola';

import type { ErrorLogOptions } from './types.js';

export const IS_TTY = Boolean(process.stdout.isTTY && !process.env.CI);

export const logger = createConsola();

function toMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === 'string') {
    return error;
  }

  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}

export function logError(error: unknown, { context }: ErrorLogOptions = {}): void {
  const prefix = context ? `${context}: ` : '';
  logger.error(`${prefix}${toMessage(error)}`);

  if (error instanceof Error && error.stack) {
    error.stack
      .split('\n')
      .slice(1)
      .map((line) => line.trim())
      .filter(Boolean)
      .forEach((line) => logger.error(line));
  }
}

export function withErrorContext(error: unknown, context: string): Error {
  const message = `${context}: ${toMessage(error)}`;
  return error instanceof Error ? new Error(message, { cause: error }) : new Error(message);
}

export function clearLine(): void {
  if (typeof process.stdout.clearLine === 'function') {
    process.stdout.clearLine(0);
  }

  if (typeof process.stdout.cursorTo === 'function') {
    process.stdout.cursorTo(0);
  }
}

export function writeLine(output: string): void {
  clearLine();

  const columns = typeof process.stdout.columns === 'number' ? process.stdout.columns : null;

  if (!columns || output.length < columns) {
    process.stdout.write(output);
    return;
  }

  process.stdout.write(output.slice(0, columns - 1));
}
