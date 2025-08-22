import { SyncHooks } from './hooks';

export interface Life {
  [name: string]: Function;
}

export interface LifeCycle {
  [name: string]: SyncHooks;
}

function asyncFn(step: string): SyncHooks {
  return new SyncHooks(step);
}

export function getLifeCycle(life: Life, meta): LifeCycle {
  const lifeCycle: LifeCycle = {};

  const keys = Object.keys(life);

  keys.forEach((k: string) => {
    lifeCycle[k] = asyncFn(k);
    lifeCycle[k].setMeta(meta);
  });

  return lifeCycle;
}