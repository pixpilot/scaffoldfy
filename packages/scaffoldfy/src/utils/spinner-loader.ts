/* eslint-disable node/prefer-global/process */
/**
 * Cross-platform terminal spinner utility
 */
let spinnerCounter = 0;
const spinnerStates: Record<number, NodeJS.Timeout> = {};

export function startSpinner(message = 'Loading'): number {
  const frames = ['|', '/', '-', '\\', '.', '..', '...'];
  let index = 0;
  spinnerCounter++;
  const id = spinnerCounter;
  process.stdout.write(`${message} `);
  spinnerStates[id] = setInterval(() => {
    process.stdout.write(`\r${message} ${frames[index % frames.length]}   `);
    index++;
  }, 120);
  return id;
}

export function stopSpinner(id: number): void {
  if (spinnerStates[id]) {
    clearInterval(spinnerStates[id]);
    delete spinnerStates[id];
    process.stdout.write('\r');
    process.stdout.write(`${' '.repeat(30)}\r`);
  }
}
