import { createApp } from 'vue'
// import './style.css'
import App from './App.vue'
import _ from 'lodash'
import 'viewerjs/dist/viewer.css'
import VueViewer from 'v-viewer'

import { createI18n } from 'vue-i18n'
import zhCn from './locales/zh-CN.json'
import enUs from './locales/en-US.json'

window._ = _

const app = createApp(App)
app.use(createI18n({
  legacy: false,
  locale: 'zh-CN',
  fallbackLocale: 'zh-CN',
  messages: {
    'zh-CN': zhCn,
    'en-US': enUs
  }
}))
app.use(VueViewer)
app.mount('#app')