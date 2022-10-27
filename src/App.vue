<script setup lang="ts">
import { zhCN, dateZhCN} from 'naive-ui'
import { MdSearch, MdSettings } from '@vicons/ionicons4'
import { ref } from 'vue'
import Message from './components/Message.vue'
import Dialog from './components/Dialog.vue'

const showSettingModel = ref(false)
const messageRef = ref<InstanceType<typeof Message> | null>(null)
const dialogRef = ref<InstanceType<typeof Dialog> | null>(null)

const handleSearch = () => {
}
</script>

<template>
  <n-config-provider :locale="zhCN" :date-locale="dateZhCN">
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
