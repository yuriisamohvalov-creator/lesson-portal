/**
 * Helpers for contentEditable toolbar (document.execCommand).
 * Toolbar buttons must call preventDefault on mousedown so the editor keeps selection.
 */

export function normalizeFormatBlockValue(value?: string): string | undefined {
  if (!value) return value;
  // Chrome/Firefox expect "<h1>", not "h1"
  if (/^[a-zA-Z][a-zA-Z0-9]*$/.test(value)) {
    return `<${value}>`;
  }
  return value;
}

export function runEditorCommand(
  editor: HTMLElement | null,
  command: string,
  value?: string,
): boolean {
  if (!editor) return false;
  editor.focus();
  const arg =
    command === 'formatBlock' ? normalizeFormatBlockValue(value) : value;
  // execCommand is deprecated but still the practical API for lightweight editors
  const ok = document.execCommand(command, false, arg);
  editor.focus();
  return ok;
}
