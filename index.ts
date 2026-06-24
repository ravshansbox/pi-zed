import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";
import { Text } from "@earendil-works/pi-tui";
import { Type } from "typebox";
import { buildPromptContext, formatWidgetLines, readZedState } from "./src/zed-state.ts";

const widgetId = "pi-zed";
const refreshMs = 1000;

export default function (pi: ExtensionAPI) {
  let timer: ReturnType<typeof setInterval> | undefined;

  async function refreshWidget(ctx: Pick<ExtensionContext, "cwd" | "ui">): Promise<void> {
    const state = await readZedState({ cwd: ctx.cwd });
    const lines = formatWidgetLines(state);
    ctx.ui.setWidget(widgetId, (_tui, theme) => {
      const body = lines.map((line) => line.map((segment) => theme.fg(segment.role, segment.text)).join("")).join("\n");
      return new Text(body, 0, 0);
    }, { placement: "aboveEditor" });
  }

  pi.on("session_start", async (_event, ctx) => {
    await refreshWidget(ctx);
    timer = setInterval(() => {
      refreshWidget(ctx).catch(() => {
        ctx.ui.setWidget(widgetId, (_tui, theme) => new Text(theme.fg("muted", "zed: unable to refresh"), 0, 0), { placement: "aboveEditor" });
      });
    }, refreshMs);
  });

  pi.on("session_shutdown", async (_event, ctx) => {
    if (timer) clearInterval(timer);
    timer = undefined;
    ctx.ui.setWidget(widgetId, undefined);
  });

  pi.on("before_agent_start", async (_event, ctx) => {
    const state = await readZedState({ cwd: ctx.cwd });
    await refreshWidget(ctx);
    const context = buildPromptContext(state);
    return {
      message: {
        customType: "zed-context",
        content: context,
        display: false,
      },
    };
  });

  pi.registerTool({
    name: "zed_current_context",
    label: "zed current context",
    description: "return zed's active file, open files, and selected text for the current project.",
    promptSnippet: "read current zed active file, open files, selected line ranges, and selected text",
    promptGuidelines: [
      "use zed_current_context when the user asks about what is open or selected in zed.",
    ],
    parameters: Type.Object({}),
    async execute(_toolCallId, _params, _signal, _onUpdate, ctx) {
      const state = await readZedState({ cwd: ctx.cwd });
      return {
        content: [{ type: "text", text: buildPromptContext(state) }],
        details: state,
      };
    },
  });

  pi.registerTool({
    name: "zed_open_files",
    label: "zed open files",
    description: "return file paths currently open in the matching zed workspace.",
    promptSnippet: "list files currently open in zed",
    promptGuidelines: [
      "use zed_open_files when the user asks which files are currently open in zed.",
    ],
    parameters: Type.Object({}),
    async execute(_toolCallId, _params, _signal, _onUpdate, ctx) {
      const state = await readZedState({ cwd: ctx.cwd });
      const text = state.unavailableReason
        ? `zed unavailable: ${state.unavailableReason}`
        : state.openFiles.length > 0
          ? state.openFiles.join("\n")
          : "no open zed files found.";
      return {
        content: [{ type: "text", text }],
        details: { activeFile: state.activeFile, openFiles: state.openFiles, unavailableReason: state.unavailableReason },
      };
    },
  });

  pi.registerTool({
    name: "zed_selected_lines",
    label: "zed selected lines",
    description: "return selected text from zed with file names and line numbers.",
    promptSnippet: "read selected zed lines with file paths, line numbers, and text",
    promptGuidelines: [
      "use zed_selected_lines when the user asks about selected text or selected lines in zed.",
    ],
    parameters: Type.Object({}),
    async execute(_toolCallId, _params, _signal, _onUpdate, ctx) {
      const state = await readZedState({ cwd: ctx.cwd });
      const text = state.unavailableReason
        ? `zed unavailable: ${state.unavailableReason}`
        : state.selections.length > 0
          ? buildPromptContext({ ...state, openFiles: [] })
          : "no selected zed lines found.";
      return {
        content: [{ type: "text", text }],
        details: { activeFile: state.activeFile, selections: state.selections, unavailableReason: state.unavailableReason },
      };
    },
  });
}
