<script setup>
import { zhCN, dateZhCN, enUS, dateEnUS, NIcon, NTag} from 'naive-ui'
import {
  MdSearch,
  MdSettings,
  MdArchive,
  MdOpen,
  MdClose,
  MdSkipForward,
  MdSkipBackward,
  MdShuffle,
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
const { locale:i18n, t } = useI18n()

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
onBeforeMount(()=>{
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
const resultImageList = computed(()=>{
  return displayImageList.value.concat(cacheImageList.value)
})
const onRequestAppend = (e)=>{
  let groupKey = (e.groupKey || 0) + 1
  for (let i=1; i<=20; i++) {
    if (!_.isEmpty(cacheImageList.value)) {
      let item = cacheImageList.value.shift()
      item.groupKey = groupKey
      displayImageList.value.push(item)
    }
  }
}
const imageDetail = ref({})
const showDetailDrawer = ref(false)
const openDetail = (index)=>{
  viewImageIndex.value = index
  showDetailDrawer.value = true
  imageDetail.value = resultImageList.value[index]
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
const predefinedTagList = computed(()=>{
  return _.trim(setting.value.predefinedTagList).split(/\s*(?:[,，]|$)\s*/).map(t=>({label:t,value:t}))
})
const concatedTags = computed(()=>{
  return tags.concat(predefinedTagList)
})
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
const order = ref('addTime||DESC')
const orderOptions = ref([])
const handleUpdateOrder = (value)=>{
  emptyList()
  ipcRenderer['search-folder']({folder: _.clone(selectNode.value.folder), order: value})
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
      ipcRenderer['search-folder']({folder: _.clone(option.folder), order: order.value})
    }
  }
}


// tag
const tagServerStatus = ref(false)
const fromDeepdanbooru = ref(true)
const fromTagSource = ref([])
const testInterval = ref(0)
const testServer = ()=>{
  axios.get('http://localhost:12421/test')
  .then(res=>{
    if (res.status == 200) {
      tagServerStatus.value = true
    }
  })
  .catch(error=>{
    tagServerStatus.value = false
    fromDeepdanbooru.value = false
  })
}
onMounted(async ()=>{
  let crawlerList = await ipcRenderer['get-crawler-list']()
  fromTagSource.value = crawlerList.map(label=>({label, value: false}))
  testServer()
  testInterval.value = setInterval(testServer, 10000)
})
onUnmounted(()=>{
  clearInterval(testInterval.value)
})
const forceGetTagForLibrary = ()=>{
  getTagForLibrary(true)
}
const test = async ()=>{
  showViewerDrawer.value = true
}
const getTagForLibrary = async (force)=>{
  printMessage('info', t('message.startGetTag'))
  try {
    let threshold = _.inRange(setting.value.deepdanbooruTagScoreThreshold, 0, 1) ? setting.value.deepdanbooruTagScoreThreshold : 0
    let allCount = imageLibrary.value.length
    let nowCount = 0
    for (let imageObject of imageLibrary.value) {
      try {
        if (force || _.isEmpty(imageObject.tags)) {
          let tags = []
          if (fromDeepdanbooru.value) {
            let fd = new FormData()
            fd.append('filepath', imageObject.path)
            let ddbrTags = await axios.post('http://localhost:12421/predict', fd)
            let filterResult = _.pickBy(ddbrTags.data, value=>value>threshold)
            tags = tags.concat(_.keys(filterResult))
          }
          for (let crawler of fromTagSource.value) {
            if (crawler.value) {
              tags = tags.concat(await ipcRenderer['get-tag-by-crawler']({
                crawlerName: crawler.label,
                filepath: imageObject.path
              }))
            }
          }
          tags = _.compact(tags)
          if (_.isEmpty(tags)) {
            imageObject.tags = ['not_matched']
          } else {
            imageObject.tags = tags
          }
          ipcRenderer['update-image'](_.cloneDeep(imageObject))
          nowCount++
          ipcRenderer['set-progress-bar'](nowCount/allCount)
          if (nowCount >= allCount) {
            ipcRenderer['set-progress-bar'](-1)
            printMessage('success', 'Get Tags Complete')
          }
        } else {
          nowCount++
        }
      } catch (error) {
        console.log(error)
        nowCount++
      }
    }
    ipcRenderer['set-progress-bar'](-1)
  } catch (error) {
    console.log(error)
    ipcRenderer['set-progress-bar'](-1)
  }
}

// viewer
const showViewerDrawer = ref(false)
const viewImageIndex = ref(0)
const viewImage = (index, inner)=>{
  viewImageIndex.value = index
  if (setting.value.rightClick !== 'externalImageExplorer' || inner) {
    showViewerDrawer.value = true
  } else {
    openWithExternalViewer(resultImageList.value[index].path)
  }
}
const viewBackwardImage = ()=>{
  if (viewImageIndex.value > 0) viewImageIndex.value--
}
const viewForwardImage = ()=>{
  if (viewImageIndex.value < resultImageList.value.length - 1) {
    viewImageIndex.value++
  } else {
    printMessage('info', t('message.firstImage'))
    viewImageIndex.value = 0
  }
}
const viewRandomImage = ()=>{
  viewImageIndex.value = _.random(0, resultImageList.value.length - 1)
}
const resolveKey = (event)=>{
  if (showViewerDrawer.value === true) {
    if (event.key === 'ArrowRight') {
      viewForwardImage()
    } else if (event.key === 'ArrowLeft') {
      viewBackwardImage()
    } else if (event.key === 'ArrowDown') {
      viewRandomImage()
    }
  }
}
onMounted(()=>{
  window.addEventListener('keydown', resolveKey)
})
onUnmounted(()=>{
  window.removeEventListener('keydown', resolveKey)
})

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
    orderOptions.value = [
      {label: t('ui.addTimeAsc'), value: 'addTime||ASC'},
      {label: t('ui.addTimeDesc'), value: 'addTime||DESC'},
      {label: t('ui.modifyTimeAsc'), value: 'modifyTime||ASC'},
      {label: t('ui.modifyTimeDesc'), value: 'modifyTime||DESC'},
      {label: t('ui.filenameAsc'), value: 'filename||ASC'},
      {label: t('ui.filenameDesc'), value: 'filename||DESC'},
      {label: t('ui.filesizeAsc'), value: 'filesize||ASC'},
      {label: t('ui.filesizeDesc'), value: 'filesize||DESC'},
    ]
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
const openTagCrawlerPath = ()=>{
  ipcRenderer['open-tag-crawler-path']()
}
const openStorePath = ()=>{
  ipcRenderer['open-store-path']()
}
onMounted(()=>{
  setTimeout(()=>scanLibrary(false), 2000)
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
              :options="concatedTags"
              @clear="clearSearch"
              ></n-select>
            <n-button type="primary" ghost @click="handleSearch">
              <template #icon><n-icon><MdSearch /></n-icon></template>
            </n-button>
          </n-input-group>
          <n-button class="header-button" type="primary" ghost @click="showSettingModel = true">
            <template #icon><n-icon><MdSettings /></n-icon></template>
          </n-button>
          <n-button class="header-button" type="primary" ghost @click="test">
            <template #icon><n-icon><MdArchive /></n-icon></template>
          </n-button>
          <n-select
            v-model:value="order"
            :options="orderOptions"
            :consistent-menu-width="false"
            @update:value="handleUpdateOrder"
          ></n-select>
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
              v-for="(item, index) in displayImageList"
              :key="item.id"
              :data-grid-groupkey="item.groupKey"
            >
              <img
                class="waterfall-image"
                :style="{
                  width: setting.waterfallThumbWidth || 200 + 'px',
                  height: item.thumbPath ? (setting.waterfallThumbWidth || 200) * item.thumbHeight / item.thumbWidth + 'px' : (setting.waterfallThumbWidth || 200) * item.height / item.width + 'px'
                }"
                :src="item.thumbPath ? item.thumbPath : item.path"
                @click="openDetail(index)"
                @contextmenu="viewImage(index)"
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
        <img class="detail-image" :src="imageDetail.path" @click="viewImage(viewImageIndex, true)"/>
        <n-divider dashed style="margin: 4px 0;"></n-divider>
        <n-button class="detail-button" size="small" secondary type="primary" @click="openWithExternalViewer(imageDetail.path)">{{$t('ui.view')}}</n-button>
        <n-button class="detail-button" size="small" secondary type="primary" @click="openImageLocale(imageDetail.path)">{{$t('ui.openLocale')}}</n-button>
        <n-button class="detail-button" size="small" secondary type="primary" @click="updateImage">{{$t('ui.saveTags')}}</n-button>
        <n-dynamic-tags
          v-model:value="imageDetail.tags"
          size="small"
          :render-tag="renderTag"
        >
        <template #input="{ submit, deactivate }">
          <n-select
            size="tiny"
            filterable
            tag
            :options="predefinedTagList"
            @update:value="(v)=>{submit(v);deactivate()}"
          ></n-select>
        </template>
        </n-dynamic-tags>
      </n-drawer-content>
    </n-drawer>
    <n-drawer
      v-model:show="showViewerDrawer"
      placement="bottom"
      height="100%"
      class="viewer-drawer"
    >
      <div class="viewer-image-frame">
        <n-button
          class="view-close-button"
          text
          type="primary"
          @click="showViewerDrawer = false"
        ><n-icon><MdClose /></n-icon></n-button>
        <img
          class="viewer-image"
          :src="resultImageList[viewImageIndex].path"
        />
      </div>
      <n-space justify="center">
        <n-tooltip :show-arrow="false" trigger="hover" :delay="500">
          <template #trigger>
            <n-button
              class="view-action-button"
              text
              @click="viewBackwardImage"
            ><n-icon><MdSkipBackward /></n-icon></n-button>
          </template>
          {{$t('ui.previousImage')}}
        </n-tooltip>
        <n-tooltip :show-arrow="false" trigger="hover" :delay="500">
          <template #trigger>
            <n-button
              class="view-action-button"
              text
              @click="viewForwardImage"
            ><n-icon><MdSkipForward /></n-icon></n-button>
          </template>
          {{$t('ui.nextImage')}}
        </n-tooltip>
        <n-tooltip :show-arrow="false" trigger="hover" :delay="500">
          <template #trigger>
            <n-button
              class="view-action-button"
              text
              @click="viewRandomImage"
            ><n-icon><MdShuffle /></n-icon></n-button>
          </template>
          {{$t('ui.nextRandomImage')}}
        </n-tooltip>
      </n-space>
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
          <n-popconfirm
            @negative-click="forceGetTagForLibrary"
            :negative-text="$t('ui.forceGetTag')"
            :negative-button-props="{type: 'warning'}"
            @positive-click="getTagForLibrary"
            :positive-text="$t('ui.getTag')"
            :show-icon="false"
          >
            <template #trigger>
              <n-button-group>
                <n-button class="action-button" secondary type="primary">{{$t('ui.getTag')}}</n-button>
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
            </template>
              <n-descriptions label-placement="left" :title="$t('ui.tagFrom')" :column="1">
                <n-descriptions-item>
                  <template #label>Deepdanbooru</template>
                  <n-switch class="popover-switch" v-model:value="fromDeepdanbooru" :disabled="!tagServerStatus"></n-switch>
                </n-descriptions-item>
                <n-descriptions-item v-for="item in fromTagSource" :key="item.label">
                  <template #label>{{item.label}}</template>
                  <n-switch class="popover-switch" v-model:value="item.value"></n-switch>
                </n-descriptions-item>
              </n-descriptions>
          </n-popconfirm>
          <n-divider style="margin: 4px 0;" />
          <n-form :model="setting">
            <n-form-item path="library" :label="$t('ui.library')">
              <n-dynamic-input
                v-model:value="setting.library"
                show-sort-button
                @create="addLibraryPath"
                @remove="saveSetting"
              >
                <template #create-button-default>
                  {{$t('ui.addLibraryPath')}}
                </template>
              </n-dynamic-input>
            </n-form-item>
            <n-form-item path="imageExplorer" :label="$t('ui.externalImageExplorer')">
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
          <n-button class="action-button" secondary type="primary" @click="openTagCrawlerPath">{{$t('ui.openTagCrawlerPath')}}</n-button>
          <n-button class="action-button" secondary type="primary" @click="openStorePath">{{$t('ui.openStorePath')}}</n-button>
          <n-divider style="margin: 4px 0;" />
          <n-form :model="setting">
            <n-form-item path="predefinedTagList" :label="$t('ui.predefinedTagList')">
              <n-input
                v-model:value="setting.predefinedTagList"
                type="textarea"
                :autosize="{minRows: 2}"
                @update:value="saveSetting"
              />
            </n-form-item>
            <n-form-item path="rightClick" :label="$t('ui.rightClick')">
              <n-radio-group v-model:value="setting.rightClick" @update:value="saveSetting">
                <n-radio value="internalImageExplorer">{{$t('ui.internalImageExplorer')}}</n-radio>
                <n-radio value="externalImageExplorer">{{$t('ui.externalImageExplorer')}}</n-radio>
              </n-radio-group>
            </n-form-item>
          </n-form>
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

.viewer-drawer
  background-color: #202020
  .viewer-image-frame
    height: calc(100vh - 56px)
    display: flex
    align-items: center
    justify-content: center
    .view-close-button
      position: absolute
      top: 16px
      right: 27px
      font-size: 36px
    .viewer-image
      max-height: calc(100vh - 56px)
      max-width: 100vw
  .view-action-button
    font-size: 48px
    margin-bottom: 8px

.action-button
  margin-right: 4px
.popover-switch
  margin-right: 4px
</style>