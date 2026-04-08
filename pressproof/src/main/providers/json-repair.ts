/**
 * Fix literal newlines, tabs, and carriage returns inside JSON string values.
 * LLMs sometimes output real newline characters instead of \n escape sequences,
 * which produces invalid JSON. This walks through the text char-by-char,
 * tracking whether we're inside a quoted string, and escapes as needed.
 */
export function fixJsonNewlines(text: string): string {
  const chars: string[] = []
  let inString = false
  let escaped = false

  for (let i = 0; i < text.length; i++) {
    const ch = text[i]

    if (escaped) {
      chars.push(ch)
      escaped = false
      continue
    }

    if (ch === '\\' && inString) {
      chars.push(ch)
      escaped = true
      continue
    }

    if (ch === '"') {
      inString = !inString
      chars.push(ch)
      continue
    }

    if (inString) {
      if (ch === '\n') { chars.push('\\n'); continue }
      if (ch === '\r') { chars.push('\\r'); continue }
      if (ch === '\t') { chars.push('\\t'); continue }
    }

    chars.push(ch)
  }

  return chars.join('')
}

/**
 * Extract the first complete JSON value (object or array) from text,
 * ignoring any trailing chatter the LLM may have appended after the JSON.
 */
export function tryExtractJson(text: string): unknown | null {
  const start = text.search(/[\[{]/)
  if (start === -1) return null

  const open = text[start]
  const close = open === '[' ? ']' : '}'
  let depth = 0
  let inStr = false
  let esc = false

  for (let i = start; i < text.length; i++) {
    const ch = text[i]
    if (esc) { esc = false; continue }
    if (ch === '\\' && inStr) { esc = true; continue }
    if (ch === '"') { inStr = !inStr; continue }
    if (inStr) continue
    if (ch === open) depth++
    else if (ch === close) {
      depth--
      if (depth === 0) {
        try {
          return JSON.parse(text.slice(start, i + 1))
        } catch {
          return null
        }
      }
    }
  }
  return null
}
