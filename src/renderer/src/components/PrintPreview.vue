<template>
  <div class="print-preview">
    <a-modal
      v-model:open="visible"
      title="打印预览"
      width="90%"
      :footer="null"
      :maskClosable="false"
      @cancel="handleCancel"
    >
      <!-- 预览控制栏 -->
      <div class="preview-controls">
        <a-space>
          <a-button @click="rotatePreview">
            <template #icon><rotate-left-outlined /></template>
            旋转
          </a-button>
          <a-button @click="zoomIn">
            <template #icon><zoom-in-outlined /></template>
            放大
          </a-button>
          <a-button @click="zoomOut">
            <template #icon><zoom-out-outlined /></template>
            缩小
          </a-button>
          <a-button @click="resetZoom">
            <template #icon><fullscreen-outlined /></template>
            重置
          </a-button>
          
          <a-divider type="vertical" />
          
          <a-select
            v-model:value="selectedTemplate"
            style="width: 150px"
            @change="changeTemplate"
          >
            <a-select-option
              v-for="template in templateList"
              :key="template.value"
              :value="template.value"
            >
              {{ template.label }}
            </a-select-option>
          </a-select>
          
          <a-divider type="vertical" />
          
          <a-button type="primary" @click="handlePrint" :loading="printing">
            <template #icon><printer-outlined /></template>
            立即打印
          </a-button>
          
          <a-button @click="handleSave">
            <template #icon><download-outlined /></template>
            保存为PDF
          </a-button>
        </a-space>
      </div>
      
      <!-- 预览区域 -->
      <div class="preview-container" :style="containerStyle">
        <div class="preview-wrapper" :style="wrapperStyle">
          <!-- 小票预览 -->
          <div 
            ref="previewElement"
            class="receipt-preview"
            :style="previewStyle"
            v-html="previewHtml"
          ></div>
          
          <!-- 打印机模拟边界 -->
          <div class="printer-boundary">
            <div class="paper-guide"></div>
          </div>
        </div>
      </div>
      
      <!-- 打印设置 -->
      <a-card title="打印设置" size="small" style="margin-top: 20px">
        <a-form layout="inline">
          <a-form-item label="打印机">
            <a-select
              v-model:value="printConfig.printer"
              style="width: 200px"
              placeholder="选择打印机"
            >
              <a-select-option
                v-for="printer in availablePrinters"
                :key="printer.name"
                :value="printer.name"
              >
                {{ printer.name }}
                <a-tag v-if="printer.isDefault" color="green" size="small">默认</a-tag>
              </a-select-option>
            </a-select>
          </a-form-item>
          
          <a-form-item label="打印份数">
            <a-input-number
              v-model:value="printConfig.copies"
              :min="1"
              :max="99"
              style="width: 100px"
            />
          </a-form-item>
          
          <a-form-item label="纸张大小">
            <a-select
              v-model:value="printConfig.paperSize"
              style="width: 120px"
            >
              <a-select-option value="58mm">58mm</a-select-option>
              <a-select-option value="80mm">80mm</a-select-option>
              <a-select-option value="A4">A4</a-select-option>
            </a-select>
          </a-form-item>
          
          <a-form-item label="打印方向">
            <a-radio-group v-model:value="printConfig.orientation">
              <a-radio value="portrait">纵向</a-radio>
              <a-radio value="landscape">横向</a-radio>
            </a-radio-group>
          </a-form-item>
          
          <a-form-item label="双面打印">
            <a-switch v-model:checked="printConfig.duplex" />
          </a-form-item>
        </a-form>
        
        <!-- 高级设置 -->
        <a-collapse :bordered="false" ghost style="margin-top: 10px">
          <a-collapse-panel key="1" header="高级设置">
            <a-form layout="vertical">
              <a-row :gutter="16">
                <a-col :span="8">
                  <a-form-item label="页边距 (毫米)">
                    <a-input-number
                      v-model:value="printConfig.marginTop"
                      placeholder="上边距"
                      :min="0"
                      :max="50"
                      style="width: 100%"
                    />
                  </a-form-item>
                </a-col>
                <a-col :span="8">
                  <a-form-item label="&nbsp;">
                    <a-input-number
                      v-model:value="printConfig.marginBottom"
                      placeholder="下边距"
                      :min="0"
                      :max="50"
                      style="width: 100%"
                    />
                  </a-form-item>
                </a-col>
                <a-col :span="8">
                  <a-form-item label="&nbsp;">
                    <a-input-number
                      v-model:value="printConfig.marginLeft"
                      placeholder="左边距"
                      :min="0"
                      :max="50"
                      style="width: 100%"
                    />
                  </a-form-item>
                </a-col>
              </a-row>
              
              <a-form-item label="打印质量">
                <a-radio-group v-model:value="printConfig.quality">
                  <a-radio value="draft">草稿</a-radio>
                  <a-radio value="normal">普通</a-radio>
                  <a-radio value="high">高质量</a-radio>
                </a-radio-group>
              </a-form-item>
              
              <a-form-item label="打印选项">
                <a-checkbox-group v-model:value="printConfig.options">
                  <a-checkbox value="grayscale">灰度打印</a-checkbox>
                  <a-checkbox value="collate">自动整理</a-checkbox>
                  <a-checkbox value="reverse">逆序打印</a-checkbox>
                </a-checkbox-group>
              </a-form-item>
            </a-form>
          </a-collapse-panel>
        </a-collapse>
      </a-card>
    </a-modal>
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch, onMounted, nextTick } from 'vue';
import { message } from 'ant-design-vue';
import html2canvas from 'html2canvas';
import PrintTemplate from '../utils/print-template';
import {
  PrinterOutlined,
  RotateLeftOutlined,
  ZoomInOutlined,
  ZoomOutOutlined,
  FullscreenOutlined,
  DownloadOutlined,
  CloseOutlined
} from '@ant-design/icons-vue';

// 组件属性
const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  printData: {
    type: Object,
    default: () => ({})
  },
  printers: {
    type: Array,
    default: () => []
  }
});

// 组件事件
const emit = defineEmits(['update:visible', 'print', 'save']);

// 响应式数据
const previewElement = ref(null);
const visible = computed({
  get: () => props.visible,
  set: (value) => emit('update:visible', value)
});

// 预览相关状态
const previewHtml = ref('');
const selectedTemplate = ref('simple');
const zoomLevel = ref(1);
const rotation = ref(0);
const printing = ref(false);

// 模板列表
const templateList = PrintTemplate.getTemplateList();

// 打印机列表
const availablePrinters = computed(() => props.printers);

// 打印配置
const printConfig = reactive({
  printer: '',
  copies: 1,
  paperSize: '80mm',
  orientation: 'portrait',
  duplex: false,
  marginTop: 10,
  marginBottom: 10,
  marginLeft: 10,
  marginRight: 10,
  quality: 'normal',
  options: []
});

// 计算样式
const containerStyle = computed(() => ({
  height: '500px',
  overflow: 'auto',
  backgroundColor: '#f0f2f5',
  border: '1px solid #d9d9d9',
  borderRadius: '4px',
  marginTop: '10px',
  position: 'relative'
}));

const wrapperStyle = computed(() => ({
  transform: `rotate(${rotation.value}deg)`,
  transition: 'transform 0.3s',
  padding: '20px',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'flex-start'
}));

const previewStyle = computed(() => {
  const paperWidth = printConfig.paperSize === '58mm' ? '58mm' : '80mm';
  const scale = zoomLevel.value;
  
  return {
    transform: `scale(${scale})`,
    transformOrigin: 'top center',
    width: paperWidth,
    backgroundColor: 'white',
    boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
    padding: '10px',
    minHeight: '300px',
    transition: 'transform 0.3s'
  };
});

// 生成预览HTML
const generatePreview = async () => {
  try {
    // 合并打印数据和配置
    const previewData = {
      ...props.printData,
      storeInfo: {
        name: '测试店铺',
        address: '测试地址',
        phone: '13800138000',
        businessHours: '09:00-22:00'
      }
    };
    
    // 生成HTML
    previewHtml.value = PrintTemplate.generateHtml(
      selectedTemplate.value,
      previewData,
      {
        paperSize: printConfig.paperSize
      }
    );
    
    // 等待DOM更新
    await nextTick();
    
    // 模拟打印机效果
    simulatePrinterEffect();
  } catch (error) {
    console.error('生成预览失败:', error);
    message.error('生成预览失败: ' + error.message);
  }
};

// 模拟打印机效果
const simulatePrinterEffect = () => {
  if (!previewElement.value) return;
  
  // 添加打印机特有的样式效果
  const receipt = previewElement.value;
  
  // 模拟热敏纸效果
  receipt.style.boxShadow = 'inset 0 0 20px rgba(0,0,0,0.05)';
  
  // 模拟切纸线动画
  const cutLines = receipt.querySelectorAll('.cut-line');
  cutLines.forEach(line => {
    line.style.animation = 'cutLineEffect 2s infinite';
  });
};

// 旋转预览
const rotatePreview = () => {
  rotation.value = (rotation.value + 90) % 360;
};

// 放大
const zoomIn = () => {
  if (zoomLevel.value < 2) {
    zoomLevel.value += 0.1;
  }
};

// 缩小
const zoomOut = () => {
  if (zoomLevel.value > 0.5) {
    zoomLevel.value -= 0.1;
  }
};

// 重置缩放
const resetZoom = () => {
  zoomLevel.value = 1;
  rotation.value = 0;
};

// 切换模板
const changeTemplate = () => {
  generatePreview();
};

// 处理打印
const handlePrint = async () => {
  if (!printConfig.printer) {
    message.warning('请先选择打印机');
    return;
  }
  
  printing.value = true;
  
  try {
    // 准备打印数据
    const printData = {
      printerName: printConfig.printer,
      printerType: 'system',
      useEscPos: false,
      data: {
        ...props.printData,
        template: selectedTemplate.value,
        config: {
          copies: printConfig.copies,
          paperSize: printConfig.paperSize,
          orientation: printConfig.orientation,
          duplex: printConfig.duplex
        }
      }
    };
    
    // 发送打印请求
    const result = await window.electronAPI.printReceipt(printData);
    
    if (result.success) {
      message.success('打印任务已发送');
      emit('print', printData);
    } else {
      message.error('打印失败: ' + result.error);
    }
  } catch (error) {
    console.error('打印错误:', error);
    message.error('打印失败: ' + error.message);
  } finally {
    printing.value = false;
  }
};

// 保存为PDF
const handleSave = async () => {
  if (!previewElement.value) {
    message.warning('预览内容为空');
    return;
  }
  
  try {
    // 显示保存对话框
    const result = await window.electronAPI.showSaveDialog({
      title: '保存为PDF',
      defaultPath: `收据_${props.printData.orderNo || Date.now()}.pdf`,
      filters: [
        { name: 'PDF文件', extensions: ['pdf'] },
        { name: '所有文件', extensions: ['*'] }
      ]
    });
    
    if (!result.canceled && result.filePath) {
      // 将HTML转换为图片
      const canvas = await html2canvas(previewElement.value, {
        scale: 2,
        backgroundColor: '#ffffff',
        useCORS: true,
        logging: false
      });
      
      // 创建图片数据
      const imageData = canvas.toDataURL('image/png');
      
      // 这里需要实现将图片保存为PDF的功能
      // 由于Electron环境下需要额外处理，这里简化为提示
      message.success('PDF保存功能开发中，文件路径: ' + result.filePath);
      
      emit('save', {
        filePath: result.filePath,
        imageData: imageData
      });
    }
  } catch (error) {
    console.error('保存PDF失败:', error);
    message.error('保存失败: ' + error.message);
  }
};

// 处理取消
const handleCancel = () => {
  visible.value = false;
  resetZoom();
};

// 自动选择默认打印机
const selectDefaultPrinter = () => {
  const defaultPrinter = availablePrinters.value.find(p => p.isDefault);
  if (defaultPrinter) {
    printConfig.printer = defaultPrinter.name;
  } else if (availablePrinters.value.length > 0) {
    printConfig.printer = availablePrinters.value[0].name;
  }
};

// 监听可见性变化
watch(() => props.visible, (newVal) => {
  if (newVal) {
    generatePreview();
    selectDefaultPrinter();
  }
});

// 监听打印数据变化
watch(() => props.printData, () => {
  if (props.visible) {
    generatePreview();
  }
}, { deep: true });

// 初始化
onMounted(() => {
  // 添加CSS动画
  const style = document.createElement('style');
  style.textContent = `
    @keyframes cutLineEffect {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }
    
    .printer-boundary {
      position: absolute;
      top: 0;
      left: 50%;
      transform: translateX(-50%);
      width: calc(100% - 40px);
      height: 100%;
      pointer-events: none;
      z-index: 10;
    }
    
    .paper-guide {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      border: 2px dashed #1890ff;
      border-radius: 4px;
      opacity: 0.3;
    }
    
    .receipt-preview {
      position: relative;
      z-index: 1;
    }
    
    /* 小票特殊样式 */
    .receipt-preview .cut-line {
      position: relative;
      overflow: hidden;
    }
    
    .receipt-preview .cut-line::after {
      content: '';
      position: absolute;
      top: 50%;
      left: 0;
      right: 0;
      height: 1px;
      background: repeating-linear-gradient(
        90deg,
        #000,
        #000 5px,
        transparent 5px,
        transparent 10px
      );
      transform: translateY(-50%);
    }
  `;
  document.head.appendChild(style);
});

// 暴露方法给父组件
defineExpose({
  refreshPreview: generatePreview,
  getPrintConfig: () => ({ ...printConfig }),
  setPrintConfig: (config) => Object.assign(printConfig, config)
});
</script>

<style scoped>
.print-preview {
  width: 100%;
}

.preview-controls {
  padding: 10px 0;
  border-bottom: 1px solid #f0f0f0;
  margin-bottom: 15px;
}

.preview-container {
  display: flex;
  justify-content: center;
  align-items: center;
}

.preview-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
}

/* 响应式调整 */
@media (max-width: 768px) {
  .preview-controls .ant-space {
    flex-direction: column;
    align-items: flex-start;
  }
  
  .preview-controls .ant-space-item {
    margin-bottom: 8px;
  }
}
</style>