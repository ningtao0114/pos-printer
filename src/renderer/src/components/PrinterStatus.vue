<template>
  <div class="printer-status">
    <a-card title="打印机状态监控">
      <template #extra>
        <a-space>
          <a-button type="primary" @click="refreshPrinters" :loading="loading">
            <template #icon><reload-outlined /></template>
            刷新
          </a-button>
          <a-button @click="detectUsbPrinters">
            <template #icon><usb-outlined /></template>
            检测USB打印机
          </a-button>
        </a-space>
      </template>
      
      <!-- 打印机列表 -->
      <a-list :data-source="printers" :loading="loading">
        <template #renderItem="{ item }">
          <a-list-item>
            <a-list-item-meta>
              <template #title>
                <a-space>
                  <printer-outlined />
                  <span>{{ item.name }}</span>
                  <a-tag v-if="item.isDefault" color="green">默认</a-tag>
                  <a-tag :color="getStatusColor(item.status)">
                    {{ getStatusText(item.status) }}
                  </a-tag>
                </a-space>
              </template>
              <template #description>
                <div>端口: {{ item.port }}</div>
                <div>驱动: {{ item.driver }}</div>
                <div v-if="item.vendor">厂商: {{ item.vendor }}</div>
              </template>
            </a-list-item-meta>
            
            <template #actions>
              <a-button-group>
                <a-button size="small" @click="printTestPage(item.name)">
                  测试
                </a-button>
                <a-button 
                  size="small" 
                  type="primary" 
                  @click="setDefaultPrinter(item.name)"
                  :disabled="item.isDefault"
                >
                  设默认
                </a-button>
                <a-button 
                  size="small" 
                  danger 
                  v-if="item.type === 'usb' && !item.driverInstalled"
                  @click="installDriver(item)"
                >
                  安装驱动
                </a-button>
              </a-button-group>
            </template>
          </a-list-item>
        </template>
      </a-list>
      
      <!-- USB打印机检测结果 -->
      <a-divider />
      <div v-if="usbPrinters.length > 0">
        <h3>检测到的USB打印机</h3>
        <a-table 
          :data-source="usbPrinters" 
          :columns="usbColumns" 
          size="small"
          :pagination="false"
        />
      </div>
      
      <!-- 状态统计 -->
      <a-divider />
      <a-row :gutter="16">
        <a-col :span="6">
          <a-statistic title="打印机总数" :value="printers.length" />
        </a-col>
        <a-col :span="6">
          <a-statistic 
            title="在线打印机" 
            :value="onlinePrintersCount" 
            :value-style="{ color: '#3f8600' }"
          />
        </a-col>
        <a-col :span="6">
          <a-statistic 
            title="离线打印机" 
            :value="offlinePrintersCount" 
            :value-style="{ color: '#cf1322' }"
          />
        </a-col>
        <a-col :span="6">
          <a-statistic 
            title="USB打印机" 
            :value="usbPrintersCount"
          />
        </a-col>
      </a-row>
    </a-card>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { message, Modal } from 'ant-design-vue';
import {
  PrinterOutlined,
  ReloadOutlined,
  UsbOutlined
} from '@ant-design/icons-vue';

const loading = ref(false);
const printers = ref([]);
const usbPrinters = ref([]);
const printerStatus = ref({});

const usbColumns = [
  {
    title: '厂商',
    dataIndex: 'vendor',
    key: 'vendor'
  },
  {
    title: '厂商ID',
    dataIndex: 'vendorId',
    key: 'vendorId'
  },
  {
    title: '产品ID',
    dataIndex: 'productId',
    key: 'productId'
  },
  {
    title: '状态',
    dataIndex: 'status',
    key: 'status',
    render: (text) => {
      const statusMap = {
        connected: { text: '已连接', color: 'green' },
        no_driver: { text: '无驱动', color: 'red' },
        error: { text: '错误', color: 'orange' }
      };
      const status = statusMap[text] || { text, color: 'gray' };
      return <a-tag color={status.color}>{status.text}</a-tag>;
    }
  },
  {
    title: '驱动',
    dataIndex: 'driverInstalled',
    key: 'driverInstalled',
    render: (installed) => {
      return installed ? 
        <a-tag color="green">已安装</a-tag> : 
        <a-tag color="red">未安装</a-tag>;
    }
  }
];

// 计算属性
const onlinePrintersCount = computed(() => {
  return printers.value.filter(p => p.status === 'ready').length;
});

const offlinePrintersCount = computed(() => {
  return printers.value.filter(p => p.status === 'offline').length;
});

const usbPrintersCount = computed(() => {
  return printers.value.filter(p => p.type === 'usb').length;
});

// 状态颜色映射
const getStatusColor = (status) => {
  const colors = {
    ready: 'green',
    offline: 'red',
    printing: 'blue',
    error: 'orange',
    warmup: 'yellow'
  };
  return colors[status] || 'gray';
};

// 状态文本映射
const getStatusText = (status) => {
  const texts = {
    ready: '就绪',
    offline: '离线',
    printing: '打印中',
    error: '错误',
    warmup: '预热中'
  };
  return texts[status] || status;
};

// 获取打印机列表
const refreshPrinters = async () => {
  loading.value = true;
  try {
    const result = await window.electronAPI.getPrinters();
    printers.value = result.allPrinters || [];
    
    // 获取打印机状态
    const status = await window.electronAPI.checkPrinterStatus();
    printerStatus.value = status;
    
    // 更新打印机状态
    printers.value = printers.value.map(printer => ({
      ...printer,
      status: status[printer.name] || 'unknown'
    }));
    
    message.success('打印机列表已刷新');
  } catch (error) {
    message.error('获取打印机列表失败: ' + error.message);
  } finally {
    loading.value = false;
  }
};

// 检测USB打印机
const detectUsbPrinters = async () => {
  try {
    const result = await window.electronAPI.detectUsbPrinters();
    usbPrinters.value = result;
    message.success(`检测到 ${result.length} 个USB打印机`);
  } catch (error) {
    message.error('检测USB打印机失败: ' + error.message);
  }
};

// 打印测试页
const printTestPage = async (printerName) => {
  try {
    const result = await window.electronAPI.printTestPage(printerName);
    if (result.success) {
      message.success('测试页打印任务已发送');
    } else {
      message.error('打印失败: ' + result.error);
    }
  } catch (error) {
    message.error('打印失败: ' + error.message);
  }
};

// 设置默认打印机
const setDefaultPrinter = async (printerName) => {
  try {
    const result = await window.electronAPI.setDefaultPrinter(printerName);
    if (result.success) {
      message.success('默认打印机设置成功');
      await refreshPrinters();
    } else {
      message.error('设置失败: ' + result.error);
    }
  } catch (error) {
    message.error('设置失败: ' + error.message);
  }
};

// 安装驱动
const installDriver = async (printer) => {
  Modal.confirm({
    title: '安装打印机驱动',
    content: `确定要为 ${printer.vendor} 打印机安装驱动吗？`,
    async onOk() {
      try {
        const result = await window.electronAPI.showOpenDialog({
          title: '选择驱动程序',
          filters: [
            { name: '驱动文件', extensions: ['inf', 'exe', 'dll'] }
          ],
          properties: ['openFile']
        });
        
        if (!result.canceled && result.filePaths.length > 0) {
          const driverPath = result.filePaths[0];
          const installResult = await window.electronAPI.installPrinterDriver(driverPath);
          
          if (installResult.success) {
            message.success('驱动安装成功');
            await refreshPrinters();
          } else {
            message.error('驱动安装失败: ' + installResult.error);
          }
        }
      } catch (error) {
        message.error('安装驱动失败: ' + error.message);
      }
    }
  });
};

// 初始化
onMounted(() => {
  refreshPrinters();
  
  // 监听USB设备变化
  window.electronAPI.onUsbDeviceChange((event, type, device) => {
    if (type === 'attach' && device.deviceType === 'printer') {
      message.info(`检测到新的USB打印机: ${device.vendor}`);
      refreshPrinters();
    }
  });
});
</script>

<style scoped>
.printer-status {
  width: 100%;
}
</style>