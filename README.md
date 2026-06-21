# pi-zed

pi extension that reads zed's local sqlite state and exposes the active file, open files, and selected lines to pi.

## install

```sh
pi install git:github.com/ravshansbox/pi-zed
```

or try it for one run without installing:

```sh
pi -e git:github.com/ravshansbox/pi-zed
```

for local development:

```sh
pi -e ~/Projects/pi-zed/index.ts
```

the extension:

- shows a compact muted widget with the current zed active file, selected line range, and count of other open files
- injects active file, open files, selected line numbers, and selected text into each pi prompt as hidden untrusted context
- registers `zed_current_context`, `zed_open_files`, and `zed_selected_lines`

## database discovery

set `PI_ZED_DB` to override the zed database path. if unset, the extension tries:

- `$OPENCODE_ZED_DB`
- `~/Library/Application Support/Zed/db/0-stable/db.sqlite`
- `~/.local/share/zed/db/0-stable/db.sqlite`

requires the `sqlite3` cli.
