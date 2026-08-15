<template>
  <DefaultTheme.Layout>
    <template #aside-top>
      <AskCurrentChapter placement="aside" />
    </template>
  </DefaultTheme.Layout>
  <AskCurrentChapter placement="mobile" />
</template>

<script setup lang="ts">
import DefaultTheme from 'vitepress/theme'
import AskCurrentChapter from './components/AskCurrentChapter.vue'
</script>
