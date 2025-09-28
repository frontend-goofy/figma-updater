import { createConsola } from 'consola';

export const IS_TTY = process.stdout.isTTY && !process.env.CI;

export const logger = createConsola();

export function clearLine() {
  process.stdout.clearLine(0);
  process.stdout.cursorTo(0);
}

export function writeLine(output: string) {
  clearLine();

  if (output.length < process.stdout.columns) {
    process.stdout.write(output);
  } else {
    process.stdout.write(output.substring(0, process.stdout.columns - 1));
  }
}
