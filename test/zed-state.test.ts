import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readZedState } from '../src/zed-state.ts';
import { createZedDb } from './fixture.ts';

test('reads the active file and selection for a matching workspace', async () => {
  const dbPath = createZedDb({
    workspacePath: '/work/project',
    bufferPath: '/work/project/a.ts',
    contents: 'one\ntwo\nthree\n',
    selections: [[4, 8]],
  });
  const state = await readZedState({ dbPath, cwd: '/work/project' });
  assert.equal(state.activeFile, '/work/project/a.ts');
  assert.deepEqual(state.openFiles, ['/work/project/a.ts']);
  assert.equal(state.selections[0]?.text, 'two\n');
});

test('matches a cwd inside a directory whose name starts with two dots', async () => {
  const dbPath = createZedDb({
    workspacePath: '/work/project',
    bufferPath: '/work/project/a.ts',
    contents: 'one\n',
  });
  const state = await readZedState({ dbPath, cwd: '/work/project/..cache' });
  assert.equal(state.activeFile, '/work/project/a.ts');
});
