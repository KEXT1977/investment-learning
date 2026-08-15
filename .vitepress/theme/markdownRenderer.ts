import MarkdownIt from 'markdown-it'

// AI 输出属于不可信数据：
// - html: false 会将原始 HTML 标签转义为纯文本，避免注入脚本
// - breaks: true 让单换行渲染为换行，符合聊天回答习惯
const markdownIt = new MarkdownIt({
  html: false,
  linkify: true,
  breaks: true
})

// 外链一律新窗口打开，并阻止反向链接
const defaultLinkOpen =
  markdownIt.renderer.rules.link_open ??
  ((tokens, idx, options, _env, self) => self.renderToken(tokens, idx, options))

markdownIt.renderer.rules.link_open = (tokens, idx, options, env, self) => {
  tokens[idx].attrSet('target', '_blank')
  tokens[idx].attrSet('rel', 'noopener noreferrer')
  return defaultLinkOpen(tokens, idx, options, env, self)
}

export const renderMarkdown = (source: string) => markdownIt.render(source)
