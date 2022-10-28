<script setup>
import { zhCN, dateZhCN} from 'naive-ui'
import { MdSearch, MdSettings, MdArchive, MdOpen } from '@vicons/ionicons4'
import { onMounted, ref } from 'vue'
import Waterfall from 'vue-waterfall/lib/waterfall.vue'
import WaterfallSlot from 'vue-waterfall/lib/waterfall-slot.vue'
import Message from './components/Message.vue'
import Dialog from './components/Dialog.vue'

const messageRef = ref(null)
const dialogRef = ref(null)
const printMessage = (type, msg) => {
  messageRef.value.message.destroyAll()
  messageRef.value.message[type](msg)
}
const sortList = (label)=>{
  return (a, b)=>{
    if (a[label] && b[label]) {
      if (a[label] > b[label]) {
        return -1
      } else if (a[label] < b[label]) {
        return 1
      } else {
        return 0
      }
    } else if (a[label]) {
      return -1
    } else if (b[label]) {
      return 1
    } else {
      return 0
    }
  }
}

onMounted(()=>{
  ipcRenderer['send-message']((event, arg)=>{
    printMessage('info', arg)
    if (arg.includes('failed')) {
      console.error(arg)
    } else {
      console.log(arg)
    }
  })
})

const handleSearch = ()=>{
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

//setting
const showSettingModel = ref(false)
let setting = ref({})
onMounted(()=>{
  ipcRenderer['load-setting']()
  .then(res=>{
    setting.value = res
  })
})
const saveSetting = ()=>{
  ipcRenderer['save-setting'](_.cloneDeep(setting.value))
}
const addLibraryPath = (index)=>{
  ipcRenderer['select-folder']()
  .then(res=>{
    if (res) {
      if (setting.value.library.length == 1) {
        setting.value.library[0] = res
      } else {
        setting.value.library[index] = res
      }
      saveSetting()
    } else {
      if (setting.value.library.length == 1) {
        setting.value.library = []
      } else {
        setting.value.library.splice(index, 1)
      }
    }
  })
}
const handleChooseImageExplorer = ()=>{
  ipcRenderer['select-file']()
  .then(res=>{
    if (res) {
      setting.value.imageExplorer = res
      saveSetting()
    }
  })
}
const languageOption = [
  {label: 'default', value: 'default'},
  {label: 'zh-CN', value: 'zh-CN'},
  {label: 'en-US', value: 'en-US'},
]
const scanLibrary = ()=>{

}
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
          <n-gi :span="5">
            <n-button class="header-button" type="primary" ghost @click="showSettingModel = true">
              <template #icon><n-icon><MdSettings /></n-icon></template>
            </n-button>
            <n-button class="header-button" type="primary" ghost>
              <template #icon><n-icon><MdArchive /></n-icon></template>
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
      preset="dialog"
      :title="$t('ui.setting')"
      style="width: 50vw"
      :show-icon="false"
    >
      <n-divider />
      <n-form :model="setting">
        <n-form-item path="library" :label="$t('ui.library')">
          <n-dynamic-input
            v-model:value="setting.library"
            @create="addLibraryPath"
            @remove="saveSetting"
          >
            <template #create-button-default>
              {{$t('ui.addLibraryPath')}}
            </template>
          </n-dynamic-input>
        </n-form-item>
        <n-form-item path="imageExplorer" :label="$t('ui.imageExplorer')">
          <n-input-group>
            <n-input
              v-model:value="setting.imageExplorer"
            ></n-input>
            <n-button type="primary" ghost @click="handleChooseImageExplorer">
              <template #icon><n-icon><MdOpen /></n-icon></template>
            </n-button>
          </n-input-group>
        </n-form-item>
        <n-form-item path="language" :label="$t('ui.language')">
          <n-select
            v-model:value="setting.language"
            :options="languageOption"
            @update:value="saveSetting"
          ></n-select>
        </n-form-item>
      </n-form>
      <n-button class="action-button" secondary type="primary" @click="scanLibrary">{{$t('ui.manualScan')}}</n-button>
      <n-button class="action-button" secondary type="warning">{{$t('ui.getTag')}}</n-button>
      <template #action>
        <n-button type="success" @click="saveSetting">{{$t('ui.save')}}</n-button>
      </template>
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
.header-button
  margin-right: 12px

.action-button
  margin-right: 4px
</style>
