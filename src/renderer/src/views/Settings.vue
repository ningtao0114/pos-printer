<template>
  <div class="settings">
    <a-card title="系统设置">
      <a-form layout="vertical">
        <a-form-item label="默认打印机">
          <a-select v-model:value="defaultPrinter" placeholder="选择默认打印机">
            <a-select-option v-for="printer in printers" :key="printer.name" :value="printer.name">
              {{ printer.name }}
            </a-select-option>
          </a-select>
        </a-form-item>
        
        <a-form-item label="打印份数">
          <a-input-number v-model:value="copies" :min="1" :max="10" />
        </a-form-item>
        
        <a-form-item>
          <a-button type="primary" @click="saveSettings">保存设置</a-button>
        </a-form-item>
      </a-form>
    </a-card>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { message } from 'ant-design-vue';

const defaultPrinter = ref('');
const copies = ref(1);
const printers = ref([]);

const loadSettings = async () => {
  try {
    const result = await window.electronAPI.getPrinters();
    printers.value = result.allPrinters || [];
    defaultPrinter.value = result.defaultPrinter || '';
  } catch (error) {
    message.error('加载设置失败: ' + error.message);
  }
};

const saveSettings = async () => {
  try {
    if (defaultPrinter.value) {
      await window.electronAPI.setDefaultPrinter(defaultPrinter.value);
    }
    message.success('设置已保存');
  } catch (error) {
    message.error('保存设置失败: ' + error.message);
  }
};

onMounted(() => {
  loadSettings();
});
</script>

<style scoped>
.settings {
  width: 100%;
}
</style>
