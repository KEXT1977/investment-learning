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
          <p class="chapter-ai-eyebrow">AI 学习助手</p>
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

      <p class="chapter-ai-context">将围绕「{{ chapterTitle }}」回答，不提供个性化买卖建议。</p>

      <details class="chapter-ai-settings">
        <summary>连接设置</summary>
        <label>
          DeepSeek API Key
          <input
            v-model.trim="apiKey"
            type="password"
            autocomplete="off"
            placeholder="请填写 DeepSeek API Key"
            @change="persistApiKey"
          >
        </label>
        <button class="chapter-ai-clear-key" type="button" :disabled="!apiKey" @click="clearApiKey">
          清除 Key
        </button>
        <label>
          DeepSeek 模型
          <input v-model.trim="model" type="text" autocomplete="off" placeholder="deepseek-chat" @change="persistModel">
        </label>
        <p>Key 与模型会保存在当前设备的浏览器中，刷新或重新打开网站后仍可恢复；网站不会上传 Key。仅在本人可信的设备上保存。</p>
      </details>

      <label class="chapter-ai-question">
        你的问题
        <textarea
          v-model="question"
          :maxlength="MAX_QUESTION_CHARS"
          rows="4"
          placeholder="例如：这一课中，股票价格为什么会波动？"
          :disabled="isLoading"
          @keydown.enter.exact.prevent="ask"
        />
      </label>

      <div class="chapter-ai-actions">
        <button class="chapter-ai-submit" type="button" :disabled="!canSubmit" @click="ask">
          {{ isLoading ? '正在思考…' : '发送问题' }}
        </button>
        <button v-if="answer || error" class="chapter-ai-reset" type="button" :disabled="isLoading" @click="resetAnswer">
          清空回答
        </button>
      </div>

      <p v-if="error" class="chapter-ai-error" role="alert">{{ error }}</p>
      <article v-if="answer" class="chapter-ai-answer" aria-live="polite">
        <h3>回答</h3>
        <p>{{ answer }}</p>
      </article>

      <p class="chapter-ai-disclaimer">DeepSeek 会接收课程内容与问题以生成回答。请勿输入账户、身份证、持仓明细等敏感信息。</p>
    </section>
  </template>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { onContentUpdated, useData, useRoute } from 'vitepress'
import { extractChapterText } from '../chapterContext'
import { requestDeepSeekAnswer } from '../deepseekApi'

const props = defineProps<{
  placement: 'aside' | 'mobile'
}>()

const MAX_QUESTION_CHARS = 1500
const API_KEY_STORAGE = 'investment-learning.deepseek-api-key'
const MODEL_STORAGE = 'investment-learning.deepseek-model'
const DEFAULT_MODEL = 'deepseek-chat'

const { page } = useData()
const route = useRoute()
const apiKey = ref('')
const model = ref(DEFAULT_MODEL)
const question = ref('')
const answer = ref('')
const error = ref('')
const isLoading = ref(false)
const isOpen = ref(false)
const chapterContent = ref('')

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
  resetAnswer()
}

const resetAnswer = () => {
  answer.value = ''
  error.value = ''
}

const ask = async () => {
  resetAnswer()

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

  persistApiKey()
  persistModel()

  isLoading.value = true
  try {
    answer.value = await requestDeepSeekAnswer({
      apiKey: apiKey.value,
      model: model.value,
      chapterTitle: chapterTitle.value,
      chapterPath: route.path,
      chapterContent: chapterContent.value,
      question: question.value
    })
  } catch (requestError) {
    error.value = requestError instanceof Error ? requestError.message : '请求失败，请检查网络与 API Key 后重试。'
  } finally {
    isLoading.value = false
  }
}

watch(() => route.path, () => {
  question.value = ''
  resetAnswer()
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
