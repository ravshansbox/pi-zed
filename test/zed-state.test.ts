import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
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

test('reads the selection from a file on disk with crlf line endings', async () => {
  const workspacePath = mkdtempSync(path.join(tmpdir(), 'pi-zed-work-'));
  const bufferPath = path.join(workspacePath, 'a.ts');
  writeFileSync(bufferPath, 'one\r\ntwo\r\nthree\r\n');
  const dbPath = createZedDb({ workspacePath, bufferPath, selections: [[8, 14]] });
  const state = await readZedState({ dbPath, cwd: workspacePath });
  assert.equal(state.selections[0]?.text, 'three\n');
  assert.equal(state.selections[0]?.start.line, 3);
});
