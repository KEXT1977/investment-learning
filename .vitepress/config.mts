import { defineConfig } from 'vitepress'

export default defineConfig({
  title: '投资学习课程',
  description: '系统化的投资知识学习路径',
  
  themeConfig: {
    nav: [
      { text: '课程总览', link: '/课程总览' },
      { text: '市场基础认知', link: '/01-市场基础认知/第一部分导读' }
    ],

    sidebar: [
      {
        text: '开始学习',
        items: [
          { text: '课程总览', link: '/课程总览' }
        ]
      },
      {
        text: '第一部分：市场基础认知',
        collapsed: false,
        items: [
          { text: '导读', link: '/01-市场基础认知/第一部分导读' },
          { text: '第01课 - 股票到底是什么', link: '/01-市场基础认知/第01课-股票到底是什么' },
          { text: '第02课 - 股票价格为什么会动', link: '/01-市场基础认知/第02课-股票价格为什么会动' },
          { text: '第03课 - 买卖股票时市场在做什么', link: '/01-市场基础认知/第03课-买卖股票时市场在做什么' },
          { text: '第04课 - 基金指数ETF分别是什么', link: '/01-市场基础认知/第04课-基金指数ETF分别是什么' },
          { text: '第05课 - A股港股美股初识', link: '/01-市场基础认知/第05课-A股港股美股初识' }
        ]
      }
    ],

    socialLinks: [
      { icon: 'github', link: 'https://github.com/yourusername/investment-learning' }
    ],

    search: {
      provider: 'local'
    },

    outline: {
      level: [2, 3],
      label: '本页目录'
    }
  }
})
