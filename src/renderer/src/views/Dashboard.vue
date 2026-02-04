<template>
  <div class="dashboard">
    <a-row :gutter="16" style="margin-bottom: 20px">
      <a-col :span="16">
        <printer-status />
      </a-col>
      <a-col :span="8">
        <a-card title="快速操作">
          <a-space direction="vertical" style="width: 100%">
            <a-button type="primary" block @click="gotoPrint">
              <template #icon><printer-outlined /></template>
              快速打印
            </a-button>
            <a-button block @click="gotoPrinters">
              <template #icon><setting-outlined /></template>
              打印机管理
            </a-button>
            <a-button block @click="printTest">
              <template #icon><experiment-outlined /></template>
              打印测试页
            </a-button>
            <a-button block @click="checkStatus">
              <template #icon><sync-outlined /></template>
              检查打印机状态
            </a-button>
          </a-space>
        </a-card>
      </a-col>
    </a-row>
    
    <a-row :gutter="16">
      <a-col :span="24">
        <order-form />
      </a-col>
    </a-row>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router';
import { message } from 'ant-design-vue';
import PrinterStatus from '../components/PrinterStatus.vue';
import OrderForm from '../components/OrderForm.vue';
import {
  PrinterOutlined,
  SettingOutlined,
  ExperimentOutlined,
  SyncOutlined
} from '@ant-design/icons-vue';

const router = useRouter();

const gotoPrint = () => {
  router.push('/orders');
};

const gotoPrinters = () => {
  router.push('/printers');
};

const printTest = async () => {
  try {
    const result = await window.electronAPI.getPrinters();
    const defaultPrinter = result.defaultPrinter;
    
    if (defaultPrinter) {
      const printResult = await window.electronAPI.printTestPage(defaultPrinter);
      if (printResult.success) {
        message.success('测试页打印任务已发送');
      } else {
        message.error('打印失败: ' + printResult.error);
      }
    } else {
      message.warning('请先设置默认打印机');
    }
  } catch (error) {
    message.error('操作失败: ' + error.message);
  }
};

const checkStatus = async () => {
  try {
    const status = await window.electronAPI.checkPrinterStatus();
    const onlineCount = Object.values(status).filter(s => s === 'ready').length;
    message.info(`打印机状态检查完成：${onlineCount} 台在线`);
  } catch (error) {
    message.error('检查失败: ' + error.message);
  }
};
</script>

<style scoped>
.dashboard {
  width: 100%;
}
</style>