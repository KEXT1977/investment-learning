export const MAX_CHAPTER_CHARS = 24000

const normaliseText = (text: string) => text.replace(/\s+/g, ' ').trim()

export const extractChapterText = (root: ParentNode, maxChars = MAX_CHAPTER_CHARS) => {
  const content = root.querySelector<HTMLElement>('.vp-doc')?.innerText ?? ''
  return normaliseText(content).slice(0, maxChars)
}
