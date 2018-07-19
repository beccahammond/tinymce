import * as AsyncActions from '../pipe/AsyncActions';
import * as GeneralActions from '../pipe/GeneralActions';
import { DieFn, NextFn, Pipe, RunFn } from '../pipe/Pipe';
import { GuardFn } from './Guard';

export type Step<T, U> = (value: T, next: NextFn<U>, die: DieFn) => void;

const stateful = function <T, U>(f: RunFn<T, U>): Step<T, U> {
  return Pipe(f);
};

// Chiefly used for limiting things with timeouts.
const control = function <T, U, V>(step: Step<T, U>, guard: GuardFn<T, U, V>): Step<T, V> {
  return Pipe<T, V>(function (value: T, next: NextFn<V>, die: DieFn) {
    guard(step, value, next, die);
  });
};

const sync = function <T>(f: () => void): Step<T, T> {
  return Pipe<T, T>(function (value: T, next: NextFn<T>, die: DieFn) {
    f();
    next(value);
  });
};

const async = function <T>(f: (next: () => void, die: DieFn) => void): Step<T, T> {
  return Pipe<T, T>(function (value: T, next: NextFn<T>, die: DieFn) {
    f(function () {
      next(value);
    }, die);
  });
};

// Convenience functions
const debugging = sync<any>(GeneralActions.debug);

const log = function <T>(message: string): Step<T, T> {
  return sync<T>(GeneralActions.log(message));
};

const wait = function <T>(amount: number): Step<T, T> {
  return async<T>(AsyncActions.delay(amount));
};

const fail = function <T>(message: string): Step<T, T> {
  return async<T>(AsyncActions.fail(message));
};

const pass = sync<any>(GeneralActions.pass);

export const Step = {
  stateful,
  control,
  sync,
  async,
  debugging,
  log,
  wait,
  fail,
  pass
};