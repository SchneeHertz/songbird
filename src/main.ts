import { createApp } from 'vue'
// import './style.css'
import App from './App.vue'

import { createI18n } from 'vue-i18n'
import zhCn from './locales/zh-CN.json'

const app = createApp(App)
app.use(createI18n({
  locale: 'zh-CN',
  fallbackLocale: 'zh-CN',
  messages: {
    'zh-CN': zhCn
  }
}))

app.mount('#app')
