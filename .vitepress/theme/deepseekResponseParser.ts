import type { DeepSeekAnswerResult } from './deepseekApi'

type ChatCompletionPayload = {
  choices?: Array<{
    message?: { content?: unknown }
    finish_reason?: string
  }>
}

const EMPTY_ANSWER: DeepSeekAnswerResult = { content: '', truncated: false }

export const extractDeepSeekAnswer = (payload: unknown): DeepSeekAnswerResult => {
  const response = payload as ChatCompletionPayload
  const choice = response.choices?.[0]
  const content = choice?.message?.content
  return {
    content: typeof content === 'string' ? content.trim() : '',
    truncated: choice?.finish_reason === 'length'
  }
}

export { EMPTY_ANSWER }
