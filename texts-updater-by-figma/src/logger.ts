import { createConsola } from 'consola';

export const IS_TTY = process.stdout.isTTY && !process.env.CI;

export const logger = createConsola();

export interface ErrorLogOptions {
  context?: string;
}

function buildErrorMessage(error: unknown): string {
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

export function logError(error: unknown, options: ErrorLogOptions = {}): void {
  const { context } = options;
  const baseMessage = buildErrorMessage(error);
  const message = context ? `${context}: ${baseMessage}` : baseMessage;

  logger.error(message);

  if (error instanceof Error && error.stack) {
    const [, ...stack] = error.stack.split('\n');

    stack
      .map((line) => line.trim())
      .filter(Boolean)
      .forEach((line) => logger.error(line));
  }
}

export function withErrorContext(error: unknown, context: string): Error {
  const baseMessage = buildErrorMessage(error);
  const message = `${context}: ${baseMessage}`;

  if (error instanceof Error) {
    return new Error(message, { cause: error });
  }

  return new Error(message);
}

export function clearLine() {
  if (typeof process.stdout.clearLine === 'function') {
    process.stdout.clearLine(0);
  }

  if (typeof process.stdout.cursorTo === 'function') {
    process.stdout.cursorTo(0);
  }
}

export function writeLine(output: string) {
  clearLine();

  const columns = typeof process.stdout.columns === 'number' ? process.stdout.columns : null;

  if (!columns || output.length < columns) {
    process.stdout.write(output);
    return;
  }

  process.stdout.write(output.substring(0, columns - 1));
}
