import { Change } from 'diff';

export function getDiffSize(d: Change[]) {
  return d.reduce(
    (prev, c) => (c.added || c.removed ? c.value.length + prev : prev),
    0,
  );
}
