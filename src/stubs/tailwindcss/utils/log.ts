// eslint-disable-next-line @typescript-eslint/no-empty-function
export function log(): undefined {}

export function dim(input: string): string {
  return input
}

export default {
  info: log,
  warn: log,
  risk: log
}
