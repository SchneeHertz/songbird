<script setup>
import { zhCN, dateZhCN} from 'naive-ui'
import { MdSearch, MdSettings } from '@vicons/ionicons4'
import { onMounted, ref } from 'vue'
import Message from './components/Message.vue'
import Dialog from './components/Dialog.vue'

const messageRef = ref(null)
const dialogRef = ref(null)
const printMessage = (type, msg) => {
  messageRef.value.message.destroyAll()
  messageRef.value.message[type](msg)
}

let setting = ref({})
const showSettingModel = ref(false)

onMounted(()=>{
  ipcRenderer['send-message']((event, arg)=>{
    printMessage('info', arg)
    if (arg.includes('failed')) {
      console.error(arg)
    } else {
      console.log(arg)
    }
  })
  ipcRenderer['load-setting']()
  .then(res=>{
    setting.value = res
  })
})

const handleSearch = () => {
}

const collapsed = ref(false)
let folderTree = [
  {
    label: '1973年的弹珠玩具',
    key: 'pinball-1973',
    children: [
      {
        label: '鼠',
        key: 'rat'
      }
    ]
  },
  {
    label: '寻羊冒险记',
    key: 'a-wild-sheep-chase',
  }
]

</script>

<template>
  <n-config-provider :locale="zhCN" :date-locale="dateZhCN">
    <n-layout>
      <n-layout-header>
        <n-grid x-gap="12">
          <n-gi :offset="4" :span="10">
            <n-input-group>
              <n-input></n-input>
              <n-button type="primary" ghost @click="handleSearch">
                <template #icon><n-icon><MdSearch /></n-icon></template>
              </n-button>
            </n-input-group>
          </n-gi>
          <n-gi>
            <n-button type="primary" ghost @click="showSettingModel = true">
              <template #icon><n-icon><MdSettings /></n-icon></template>
            </n-button>
          </n-gi>
        </n-grid>
      </n-layout-header>
      <n-layout has-sider>
        <n-layout-sider
          bordered
          :native-scrollbar="false"
          collapse-mode="width"
          :collapsed-width="16"
          :width="240"
          :collapsed="collapsed"
          show-trigger
          @collapse="collapsed = true"
          @expand="collapsed = false"
        >
          <n-menu :options="folderTree"></n-menu>
        </n-layout-sider>
        <n-layout-content>
          <n-grid x-gap="12">
            <n-gi :span="4"></n-gi>
            <n-gi :span="4"></n-gi>
            <n-gi :span="6"></n-gi>
            <n-gi :span="6"></n-gi>
            <n-gi :span="4"></n-gi>
          </n-grid>
        </n-layout-content>
      </n-layout>
    </n-layout>
    <n-modal
      v-model:show="showSettingModel"
    >
      <n-card
        :title="$t('ui.setting')"
        style="width: 50vw"
      >
        <n-form :model="setting"></n-form>
      </n-card>
    </n-modal>
    <n-message-provider>
      <Message ref="messageRef"/>
    </n-message-provider>
    <n-dialog-provider>
      <Dialog ref="dialogRef" />
    </n-dialog-provider>
  </n-config-provider>
</template>

<style lang="stylus">
body
  margin: 10px
</style>
