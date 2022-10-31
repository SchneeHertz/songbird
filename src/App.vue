<script setup>
import { zhCN, dateZhCN, enUS, dateEnUS, NIcon, NTag} from 'naive-ui'
import {
  MdSearch,
  MdSettings,
  MdArchive,
  MdOpen,
  MdCheckmarkCircleOutline,
  MdCloseCircleOutline,
  MdFolderOpen,
  MdRefresh,
} from '@vicons/ionicons4'
import { onMounted, ref } from 'vue'
import { nanoid } from 'nanoid'
import { MasonryInfiniteGrid } from "@egjs/vue3-infinitegrid"
import { useI18n } from 'vue-i18n'
import Message from './components/Message.vue'
import Dialog from './components/Dialog.vue'
import tags from './assets/tags.json'

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

// library
const imageLibrary = ref([])
onMounted(()=>{
  ipcRenderer['send-image']((event, imageList)=>{
    imageList.map(imageObject=>{
      imageObject.folder = imageObject.folder.split('||')
      imageObject.tags = JSON.parse(imageObject.tags)
    })
    imageLibrary.value = imageLibrary.value.concat(imageList)
    cacheImageList.value = cacheImageList.value.concat(imageList)
    if (displayImageList.value.length < 1) {
      onRequestAppend({})
    }
  })
})
const cacheImageList = ref([])
const displayImageList = ref([])
const onRequestAppend = (e)=>{
  let groupKey = (e.groupKey || 0) + 1
  for (let i=1; i<=20; i++) {
    if (!_.isEmpty(cacheImageList.value)) {
      let item = cacheImageList.value.pop()
      item.groupKey = groupKey
      displayImageList.value.push(item)
    }
  }
}
const imageDetail = ref({})
const showDetailDrawer = ref(false)
const openDetail = (imageObject)=>{
  showDetailDrawer.value = true
  imageDetail.value = imageObject
}
const renderTag = (tag, index) => {
  return h(
    NTag,
    {
      size: 'small',
      closable: true,
      'trigger-click-on-close': false,
      onClose: ()=>{
        imageDetail.value.tags.splice(index, 1)
      },
      onClick: ()=>{
        searchString.value.push(tag)
      }
    },
    {
      default: () => tag
    }
  );
}
const updateImage = ()=>{
  console.log(imageDetail.value)
  ipcRenderer['update-image'](_.cloneDeep(imageDetail.value))
}
const openWithExternalViewer = (path)=>{
  ipcRenderer['open-local-image'](path)
}
const openImageLocale = (path)=>{
  ipcRenderer['show-file'](path)
}

// search
const reloadPage = ()=>{
  window.location.reload()
}
const searchString = ref([])
const handleSearch = ()=>{
  if (_.isEmpty(searchString)) {
    clearSearch()
    return
  }
  cacheImageList.value = []
  displayImageList.value = []
  let result = _.filter(imageLibrary.value, imageObject=>{
    return _.every(searchString.value, word=>{
      return imageObject.tags.includes(word) || imageObject.path.includes(word)
    })
  })
  cacheImageList.value = result
  onRequestAppend({})
}
const clearSearch = ()=>{
  cacheImageList.value = [...imageLibrary.value]
  displayImageList.value = []
  onRequestAppend({})
}

// folder
const collapsed = ref(false)
const TriggerCollapse = ()=>{
  collapsed.value = !collapsed.value
}
const folderTree = ref([])
const selectNode = ref({})
const resolveFoldersList = (foldersList)=>{
  // _.reverse(foldersList)
  let folderTreeObject = {}
  for(let foldersStr of foldersList){
    let folders = foldersStr.split('||')
    _.set(folderTreeObject, folders, {})
  }
  let resolveTree = (preRoot, tree, initFolder)=>{
    _.forIn(tree, (node, label)=>{
      if (_.isEmpty(node)) {
        preRoot.push({
          label,
          key: nanoid(),
          folder: [...initFolder, label],
          prefix: ()=>h(NIcon, {}, {default: ()=>h(MdFolderOpen)})
        })
      } else {
        preRoot.push({
          label,
          key: nanoid(),
          folder: [...initFolder, label],
          children: resolveTree([], node, [...initFolder, label]),
          prefix: ()=>h(NIcon, {}, {default: ()=>h(MdFolderOpen)})
        })
      }
    })
    return preRoot
  }
  folderTree.value = _.reverse(resolveTree([], folderTreeObject, []))
}
const nodeProps = ({ option })=>{
  return {
    onClick() {
      emptyList()
      selectNode.value = option
      ipcRenderer['search-folder'](_.cloneDeep(option.folder))
    }
  }
}


// tag
const tagServerStatus = ref(false)
const testServer = ()=>{
  axios.get('http://localhost:12421/test')
  .then(res=>{
    if (res.status == 200) {
      tagServerStatus.value = true
    }
  })
  .catch(error=>{
    tagServerStatus.value = false
  })
}
let testInterval
onMounted(()=>{
  testServer()
  testInterval = setInterval(testServer, 10000)
})
onUnmounted(()=>{
  clearInterval(testInterval)
})
const getTagForLibrary = async ()=>{
  try {
    let threshold = _.inRange(setting.value.deepdanbooruTagScoreThreshold, 0, 1) ? setting.value.deepdanbooruTagScoreThreshold : 0
    let allCount = imageLibrary.value.length
    let nowCount = 0
    for (let imageObject of imageLibrary.value) {
      if (_.isEmpty(imageObject.tags)) {
        let fd = new FormData()
        fd.append('filepath', imageObject.path)
        await axios.post('http://localhost:12421/predict', fd)
        .then(res=>{
          let filterResult = _.pickBy(res.data, value=>value>threshold)
          if (_.isEmpty(filterResult)) {
            imageObject.tags = ['not_match']
          } else {
            imageObject.tags = _.keys(filterResult)
          }
          ipcRenderer['update-image'](_.cloneDeep(imageObject))
          nowCount++
          ipcRenderer['set-progress-bar'](nowCount/allCount)
          if (nowCount === allCount) {
            ipcRenderer['set-progress-bar'](-1)
            printMessage('success', 'Get Tags Complete')
          }
        })
      } else {
        nowCount++
      }
    }
    ipcRenderer['set-progress-bar'](-1)
  } catch (error) {
    console.log(error)
    ipcRenderer['set-progress-bar'](-1)
  }
}


//setting
const showSettingModel = ref(false)
let setting = ref({})
onMounted(()=>{
  ipcRenderer['load-setting']()
  .then(res=>{
    setting.value = res
    handleLanguageChange(setting.value.language)
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
const locale = ref({})
const dateLocale = ref({})
const { locale:i18n } = useI18n()
const handleLanguageChange = (val)=>{
  ipcRenderer['get-locale']().then(localeString=>{
    let languageCode
    if (!val || (val === 'default')) {
      languageCode = localeString
    } else {
      languageCode = val
    }
    switch (languageCode) {
      case 'zh-CN':
        locale.value = zhCN
        dateLocale.value = dateZhCN
        i18n.value = 'zh-CN'
        break
      case 'en-US':
        locale.value = enUS
        dateLocale.value = dateEnUS
        i18n.value = 'en-US'
        break
      default:
        locale.value = zhCn
        dateLocale.value = dateZhCN
        i18n.value = 'zh-CN'
        break
    }
    saveSetting()
  })
}
const emptyList = ()=>{
  imageLibrary.value = []
  cacheImageList.value = []
  displayImageList.value = []
}
const scanLibrary = (scan)=>{
  emptyList()
  ipcRenderer['load-image-list'](scan)
  .then(res=>resolveFoldersList(res))
}
const forceScanLibrary = ()=>{
  emptyList()
  ipcRenderer['force-load-image-list']()
  .then(res=>resolveFoldersList(res))
}
const refreshThumb = ()=>{
  ipcRenderer['refresh-thumb']()
  .then(()=>{
    emptyList()
    scanLibrary(false)
  })
}
onMounted(()=>{
  scanLibrary(false)
})
</script>

<template>
  <n-config-provider :locale="locale" :date-locale="dateLocale">
    <n-layout>
      <n-layout-header>
        <n-space justify="center">
          <n-button class="header-button" type="primary" ghost @click="reloadPage">
            <template #icon><n-icon><MdRefresh /></n-icon></template>
          </n-button>
          <n-input-group style="width: 50vw;">
            <n-select
              v-model:value="searchString"
              filterable
              multiple
              clearable
              tag
              max-tag-count="responsive"
              :options="tags"
              @clear="clearSearch"
              ></n-select>
            <n-button type="primary" ghost @click="handleSearch">
              <template #icon><n-icon><MdSearch /></n-icon></template>
            </n-button>
          </n-input-group>
          <n-button class="header-button" type="primary" ghost @click="showSettingModel = true">
            <template #icon><n-icon><MdSettings /></n-icon></template>
          </n-button>
          <n-button class="header-button" type="primary" ghost>
            <template #icon><n-icon><MdArchive /></n-icon></template>
          </n-button>
        </n-space>
      </n-layout-header>
      <n-layout has-sider>
        <n-layout-sider
          bordered
          :native-scrollbar="false"
          collapse-mode="width"
          :collapsed-width="10"
          :width="240"
          :collapsed="collapsed"
          show-trigger
          @collapse="TriggerCollapse"
          @expand="TriggerCollapse"
          style="margin-top:10px;"
        >
          <n-tree
            :data="folderTree"
            :node-props="nodeProps"
          ></n-tree>
        </n-layout-sider>
        <n-layout-content content-style="padding:10px;">
          <masonry-infinite-grid
            :gap="setting.waterfallGap || 10"
            :container="true"
            ref="masonry"
            className="masonry-container"
            @requestAppend="onRequestAppend"
          >
            <div
              class="item"
              v-for="item in displayImageList"
              :key="item.id"
              :data-grid-groupkey="item.groupKey"
            >
              <img
                class="waterfall-image"
                :style="{
                  width: setting.waterfallThumbWidth || 200 + 'px',
                  height: (setting.waterfallThumbWidth || 200) * item.thumbHeight / item.thumbWidth + 'px'
                }"
                :src="item.thumbPath"
                @click="openDetail(item)"
                @contextmenu="openWithExternalViewer(item.path)"
              />
            </div>
          </masonry-infinite-grid>
        </n-layout-content>
      </n-layout>
    </n-layout>
    <n-drawer
      v-model:show="showDetailDrawer"
      :width="600"
    >
      <n-drawer-content class="detail-drawer" :native-scrollbar="false">
        <img class="detail-image" :src="imageDetail.path" />
        <n-divider dashed style="margin: 4px 0;"></n-divider>
        <n-button class="detail-button" size="small" secondary type="primary" @click="openWithExternalViewer(imageDetail.path)">{{$t('ui.view')}}</n-button>
        <n-button class="detail-button" size="small" secondary type="primary" @click="openImageLocale(imageDetail.path)">{{$t('ui.openLocale')}}</n-button>
        <n-button class="detail-button" size="small" secondary type="primary" @click="updateImage">{{$t('ui.saveTags')}}</n-button>
        <n-dynamic-tags
          v-model:value="imageDetail.tags"
          size="small"
          :render-tag="renderTag"
        />
      </n-drawer-content>
    </n-drawer>
    <n-modal
      v-model:show="showSettingModel"
      preset="dialog"
      :title="$t('ui.setting')"
      style="width: 50vw"
      :show-icon="false"
    >
      <n-tabs type="line" animated default-value="default">
        <n-tab-pane name="default" :tab="$t('ui.defaultSetting')">
          <n-button class="action-button" secondary type="primary" @click="scanLibrary(true)">{{$t('ui.manualScan')}}</n-button>
          <n-popconfirm
            @positive-click="forceScanLibrary"
          >
            <template #trigger>
              <n-button class="action-button" secondary type="warning">{{$t('ui.forceScan')}}</n-button>
            </template>
            {{$t('ui.areYouSure')}}
          </n-popconfirm>
          <n-button-group>
            <n-button class="action-button" secondary type="primary" :disabled="!tagServerStatus" @click="getTagForLibrary">{{$t('ui.getTag')}}</n-button>
            <n-tooltip trigger="hover">
            <template #trigger>
              <n-button class="action-button" secondary :type="tagServerStatus ? 'primary' : 'error'" disabled tag="div">
                <template #icon><n-icon>
                  <MdCheckmarkCircleOutline v-if="tagServerStatus" />
                  <MdCloseCircleOutline v-else />
                </n-icon></template>
              </n-button>
            </template>
            {{tagServerStatus ? $t('ui.serverUpInfo') : $t('ui.serverDownInfo')}}
          </n-tooltip>
          </n-button-group>
          <n-divider style="margin: 4px 0;" />
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
                @update:value="handleLanguageChange(setting.language)"
              ></n-select>
            </n-form-item>
          </n-form>
          <n-form inline :model="setting" >
            <n-form-item path="deepdanbooruTagScoreThreshold" :label="$t('ui.deepdanbooruTagScoreThreshold')">
              <n-input-number
                v-model:value="setting.deepdanbooruTagScoreThreshold"
                :clearable="false"
                :max="1"
                :min="0"
                :precision="2"
                :step="0.1"
                @update:value="saveSetting"
              ></n-input-number>
            </n-form-item>
            <n-form-item path="waterfallGap" :label="$t('ui.waterfallGap')">
              <n-input-number
                v-model:value="setting.waterfallGap"
                :clearable="false"
                :min="1"
                @update:value="saveSetting"
              ></n-input-number>
            </n-form-item>
            <n-form-item path="waterfallThumbWidth" :label="$t('ui.waterfallThumbWidth')">
              <n-input-number
                v-model:value="setting.waterfallThumbWidth"
                :clearable="false"
                :min="100"
                @update:value="saveSetting"
              ></n-input-number>
            </n-form-item>
          </n-form>
        </n-tab-pane>
        <n-tab-pane name="advanced" :tab="$t('ui.advancedSetting')">
          <n-button class="action-button" secondary type="primary" @click="refreshThumb">{{$t('ui.refreshThumb')}}</n-button>          
          <n-divider style="margin: 4px 0;" />
        </n-tab-pane>
      </n-tabs>
      <template #action>
        <n-button type="success" @click="saveSetting">{{$t('ui.save')}}</n-button>
        <n-button type="info" @click="showSettingModel = false">{{$t('ui.close')}}</n-button>
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
  margin: 10px 0 10px 10px

.masonry-container
  height: calc(100vh - 75px)
  .waterfall-image
    border-radius: 4px

.detail-drawer
  text-align: center
  .detail-image
    max-width: 420px
    max-height: 500px
  .detail-button
    margin: 4px

.action-button
  margin-right: 4px
</style>
