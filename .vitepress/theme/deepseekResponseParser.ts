type ChatCompletionPayload = {
  choices?: Array<{ message?: { content?: unknown } }>
}

export const extractDeepSeekAnswer = (payload: unknown) => {
  const response = payload as ChatCompletionPayload
  const content = response.choices?.[0]?.message?.content
  return typeof content === 'string' ? content.trim() : ''
}
