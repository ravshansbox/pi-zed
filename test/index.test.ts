import assert from 'node:assert/strict';
import { setTimeout as delay } from 'node:timers/promises';
import { mock, test } from 'node:test';
import extension from '../index.ts';
import { createZedDb } from './fixture.ts';

type Handler = (event: unknown, ctx: unknown) => unknown;

function load() {
  const handlers = new Map<string, Handler>();
  const pi = {
    on: (name: string, handler: Handler) => handlers.set(name, handler),
    registerTool: () => {},
  };
  extension(pi as never);
  return handlers;
}

test('does not touch a stale context after session shutdown', async (t) => {
  process.env['PI_ZED_DB'] = createZedDb({
    workspacePath: '/work/project',
    bufferPath: '/work/project/a.ts',
    contents: 'one\n',
  });
  t.after(() => delete process.env['PI_ZED_DB']);
  mock.timers.enable({ apis: ['setInterval'] });
  t.after(() => mock.timers.reset());

  let stale = false;
  const widgetCallsAfterShutdown: unknown[] = [];
  const ui = {
    setWidget: (...args: unknown[]) => {
      if (stale) widgetCallsAfterShutdown.push(args);
    },
  };
  const ctx = {
    get cwd() {
      if (stale) throw new Error('stale ctx');
      return '/work/project';
    },
    get ui() {
      if (stale) throw new Error('stale ctx');
      return ui;
    },
  };
  const rejections: unknown[] = [];
  const onRejection = (reason: unknown) => rejections.push(reason);
  process.on('unhandledRejection', onRejection);
  t.after(() => process.off('unhandledRejection', onRejection));

  const handlers = load();
  await handlers.get('session_start')?.({}, ctx);
  mock.timers.tick(1000);
  await handlers.get('session_shutdown')?.({}, ctx);
  stale = true;
  await delay(300);

  assert.deepEqual(rejections, []);
  assert.deepEqual(widgetCallsAfterShutdown, []);
});
