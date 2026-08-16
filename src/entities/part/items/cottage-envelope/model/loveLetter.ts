import type { PartParameterValues } from '../../../model/partTypes'
import { sanitizePlainText } from '@/shared/lib'
import {
  DEFAULT_LOVE_LETTER_CONTENT,
  LOVE_LETTER_TEXT_LIMITS,
  type LoveLetterContent,
} from '../../../model/cottageEnvelopeMetadata'

export {
  DEFAULT_LOVE_LETTER_CONTENT,
  LOVE_LETTER_TEXT_LIMITS,
  type LoveLetterContent,
}

/** 移除不可见控制字符并按 Unicode 字符限长，正文保留换行。 */
export function sanitizeLoveLetterText(
  value: unknown,
  fallback: string,
  maxLength: number,
  multiline: boolean,
) {
  if (typeof value !== 'string') return fallback
  return sanitizePlainText(value, {
    maxLength,
    multiline,
    collapseBlankLines: multiline,
    trim: true,
  })
}

export function resolveLoveLetterContent(
  parameters: Readonly<PartParameterValues> | Readonly<Record<string, unknown>>,
): LoveLetterContent {
  return {
    title: sanitizeLoveLetterText(
      parameters.letterTitle,
      DEFAULT_LOVE_LETTER_CONTENT.title,
      LOVE_LETTER_TEXT_LIMITS.title,
      false,
    ),
    salutation: sanitizeLoveLetterText(
      parameters.letterSalutation,
      DEFAULT_LOVE_LETTER_CONTENT.salutation,
      LOVE_LETTER_TEXT_LIMITS.salutation,
      false,
    ),
    body: sanitizeLoveLetterText(
      parameters.letterBody,
      DEFAULT_LOVE_LETTER_CONTENT.body,
      LOVE_LETTER_TEXT_LIMITS.body,
      true,
    ),
    signature: sanitizeLoveLetterText(
      parameters.letterSignature,
      DEFAULT_LOVE_LETTER_CONTENT.signature,
      LOVE_LETTER_TEXT_LIMITS.signature,
      false,
    ),
  }
}
