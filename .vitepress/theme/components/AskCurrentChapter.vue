<template>
  <template v-if="isCoursePage">
    <button
      v-if="placement === 'mobile'"
      class="chapter-ai-trigger"
      type="button"
      aria-controls="chapter-ai-panel"
      :aria-expanded="isOpen"
      @click="isOpen = true"
    >
      询问本章
    </button>

    <section
      v-if="placement === 'aside' || isOpen"
      id="chapter-ai-panel"
      class="chapter-ai-panel"
      :class="`chapter-ai-panel--${placement}`"
      :role="placement === 'mobile' ? 'dialog' : undefined"
      :aria-label="`询问：${chapterTitle}`"
    >
      <header class="chapter-ai-header">
        <div>
          <p class="chapter-ai-eyebrow">AI 助手</p>
          <h2>询问本章</h2>
        </div>
        <button
          v-if="placement === 'mobile'"
          class="chapter-ai-close"
          type="button"
          aria-label="关闭问答面板"
          @click="isOpen = false"
        >
          关闭
        </button>
      </header>

      <div class="chapter-ai-body">
        <details class="chapter-ai-settings">
          <summary>连接设置</summary>
          <label>
            API Key
            <input
              v-model.trim="apiKey"
              type="password"
              autocomplete="off"
              placeholder="请输入 DeepSeek API Key"
              @change="persistApiKey"
            >
          </label>
          <button class="chapter-ai-clear-key" type="button" :disabled="!apiKey" @click="clearApiKey">
            清除 Key
          </button>
          <label>
            模型
            <input v-model.trim="model" type="text" autocomplete="off" placeholder="deepseek-v4-flash" @change="persistModel">
          </label>
        </details>

        <section v-if="conversation.length" class="chapter-ai-answer" aria-live="polite">
          <header class="chapter-ai-answer-header">
            <h3>对话记录</h3>
            <button
              class="chapter-ai-collapse"
              type="button"
              aria-controls="chapter-ai-thread"
              :aria-expanded="isAnswerExpanded"
              @click="isAnswerExpanded = !isAnswerExpanded"
            >
              {{ isAnswerExpanded ? '收起' : '展开' }}
            </button>
          </header>
          <div v-if="isAnswerExpanded" id="chapter-ai-thread" class="chapter-ai-thread">
            <article
              v-for="(message, index) in conversation"
              :key="`${message.role}-${index}`"
              class="chapter-ai-message"
              :class="`chapter-ai-message--${message.role}`"
            >
              <div v-if="message.role === 'assistant'" class="chapter-ai-markdown" v-html="renderMarkdown(message.content)" />
              <p v-else class="chapter-ai-plain">{{ message.content }}</p>
            </article>
          </div>
        </section>
      </div>

      <div class="chapter-ai-footer">
        <textarea
          v-model="question"
          :maxlength="MAX_QUESTION_CHARS"
          rows="2"
          placeholder="提问…"
          :disabled="isLoading"
          @keydown.enter.exact.prevent="ask"
        />

        <div class="chapter-ai-actions">
          <button class="chapter-ai-submit" type="button" :disabled="!canSubmit" @click="ask">
            {{ isLoading ? '思考中…' : '发送' }}
          </button>
          <button v-if="conversation.length || error" class="chapter-ai-reset" type="button" :disabled="isLoading" @click="clearConversation">
            清空
          </button>
        </div>

        <p v-if="error" class="chapter-ai-error" role="alert">{{ error }}</p>
      </div>
    </section>
  </template>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { onContentUpdated, useData, useRoute } from 'vitepress'
import { extractChapterText } from '../chapterContext'
import { type ConversationMessage, requestDeepSeekAnswer } from '../deepseekApi'
import { renderMarkdown } from '../markdownRenderer'

const props = defineProps<{
  placement: 'aside' | 'mobile'
}>()

const MAX_QUESTION_CHARS = 1500
// 请求时仅保留第一条（携带章节上下文）与最近 4 轮问答，避免历史无限膨胀
const MAX_CONTEXT_TURNS = 4
const API_KEY_STORAGE = 'investment-learning.deepseek-api-key'
const MODEL_STORAGE = 'investment-learning.deepseek-model'
const DEFAULT_MODEL = 'deepseek-v4-flash'

const { page } = useData()
const route = useRoute()
const apiKey = ref('')
const model = ref(DEFAULT_MODEL)
const question = ref('')
const error = ref('')
const isLoading = ref(false)
const isOpen = ref(false)
const isAnswerExpanded = ref(false)
const chapterContent = ref('')
const conversation = ref<ConversationMessage[]>([])

const isCoursePage = computed(() => /^0[1-5]-/.test(page.value.relativePath))
const chapterTitle = computed(() => page.value.title || '当前章节')
const canSubmit = computed(() => Boolean(apiKey.value && model.value && question.value.trim() && chapterContent.value && !isLoading.value))

const syncChapterContent = async () => {
  if (typeof document === 'undefined' || !isCoursePage.value) {
    chapterContent.value = ''
    return
  }
  await nextTick()
  chapterContent.value = extractChapterText(document)
}

const persistApiKey = () => {
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(API_KEY_STORAGE, apiKey.value)
  }
}

const persistModel = () => {
  if (typeof window !== 'undefined' && model.value) {
    window.localStorage.setItem(MODEL_STORAGE, model.value)
  }
}

const clearApiKey = () => {
  apiKey.value = ''
  question.value = ''
  if (typeof window !== 'undefined') {
    window.localStorage.removeItem(API_KEY_STORAGE)
  }
  clearConversation()
}

const resetError = () => {
  error.value = ''
}

const clearConversation = () => {
  conversation.value = []
  isAnswerExpanded.value = false
  resetError()
}

const trimConversation = (messages: ConversationMessage[]): ConversationMessage[] => {
  if (messages.length <= MAX_CONTEXT_TURNS * 2 + 1) return messages
  const [first, ...rest] = messages
  return [first, ...rest.slice(-MAX_CONTEXT_TURNS * 2)]
}

const ask = async () => {
  resetError()

  if (!apiKey.value) {
    error.value = '请先在连接设置中输入你的 DeepSeek API Key。'
    return
  }
  if (!question.value.trim()) {
    error.value = '请输入想询问的问题。'
    return
  }
  if (!chapterContent.value) {
    error.value = '未能读取当前章节内容，请刷新页面后重试。'
    return
  }

  const currentQuestion = question.value.trim()
  const nextConversation = trimConversation([
    ...conversation.value,
    { role: 'user' as const, content: currentQuestion }
  ])

  persistApiKey()
  persistModel()

  isLoading.value = true
  try {
    const { content, truncated } = await requestDeepSeekAnswer({
      apiKey: apiKey.value,
      model: model.value,
      chapterTitle: chapterTitle.value,
      chapterPath: route.path,
      chapterContent: chapterContent.value,
      conversation: nextConversation
    })
    const displayAnswer = truncated
      ? `${content}\n\n> ⚠️ 回答较长，可能被截断，可以继续追问。`
      : content
    conversation.value = [
      ...nextConversation,
      { role: 'assistant', content: displayAnswer || '没有获得可显示的回答，请换一种问法重试。' }
    ]
    question.value = ''
    isAnswerExpanded.value = true
  } catch (requestError) {
    error.value = requestError instanceof Error ? requestError.message : '请求失败，请检查网络与 API Key 后重试。'
  } finally {
    isLoading.value = false
  }
}

watch(() => route.path, () => {
  question.value = ''
  clearConversation()
  void syncChapterContent()
}, { flush: 'post' })

onMounted(() => {
  apiKey.value = window.localStorage.getItem(API_KEY_STORAGE) ?? ''
  model.value = window.localStorage.getItem(MODEL_STORAGE) ?? DEFAULT_MODEL
  void syncChapterContent()
})

onContentUpdated(() => {
  void syncChapterContent()
})
</script>
