import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';

export interface FixtureOptions {
  workspacePath: string;
  bufferPath: string;
  contents?: string;
  selections?: [number, number][];
}

export function createZedDb(options: FixtureOptions): string {
  const dir = mkdtempSync(path.join(tmpdir(), 'pi-zed-'));
  const dbPath = path.join(dir, 'db.sqlite');
  const db = new DatabaseSync(dbPath);
  db.exec(`
    create table workspaces (workspace_id integer, paths text, timestamp text);
    create table panes (pane_id integer, workspace_id integer, active integer);
    create table items (item_id integer, workspace_id integer, pane_id integer, kind text, active integer);
    create table editors (item_id integer, workspace_id integer, buffer_path text, contents text);
    create table editor_selections (editor_id integer, workspace_id integer, start integer, end integer);
  `);
  db.prepare('insert into workspaces values (1, ?, ?)').run(
    options.workspacePath,
    '2026-01-01 00:00:00',
  );
  db.exec(`insert into panes values (1, 1, 1); insert into items values (1, 1, 1, 'Editor', 1);`);
  db.prepare('insert into editors values (1, 1, ?, ?)').run(
    options.bufferPath,
    options.contents ?? null,
  );
  for (const [start, end] of options.selections ?? []) {
    db.prepare('insert into editor_selections values (1, 1, ?, ?)').run(start, end);
  }
  db.close();
  return dbPath;
}
