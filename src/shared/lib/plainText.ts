export interface PlainTextSanitizationOptions {
  maxLength: number
  multiline?: boolean
  collapseBlankLines?: boolean
  trim?: boolean
}

/** 统一清理不可见控制字符，并以 Unicode 字符数而非 UTF-16 单元限长。 */
export function sanitizePlainText(
  value: string,
  {
    maxLength,
    multiline = false,
    collapseBlankLines = false,
    trim = false,
  }: PlainTextSanitizationOptions,
) {
  const withoutControls = Array.from(value.replace(/\r\n?/gu, '\n'))
    .filter((character) => {
      if (character === '\n') return true
      const codePoint = character.codePointAt(0) ?? 0
      return codePoint >= 32 && codePoint !== 127
    })
    .join('')
    .replace(/\t/gu, ' ')
  const layoutSafe = multiline
    ? collapseBlankLines
      ? withoutControls.replace(/\n{3,}/gu, '\n\n')
      : withoutControls
    : withoutControls.replace(/\s*\n\s*/gu, ' ')
  const limited = Array.from(layoutSafe).slice(0, maxLength).join('')
  return trim ? limited.trim() : limited
}
