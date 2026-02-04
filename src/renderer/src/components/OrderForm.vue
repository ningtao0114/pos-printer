<template>
  <div class="order-form">
    <a-card title="订单打印">
      <a-form
        ref="formRef"
        :model="formState"
        :rules="rules"
        :label-col="{ span: 6 }"
        :wrapper-col="{ span: 14 }"
      >
        <a-form-item label="打印机" name="printer">
          <a-select
            v-model:value="formState.printer"
            placeholder="请选择打印机"
            :loading="loadingPrinters"
            @focus="loadPrinters"
          >
            <a-select-option 
              v-for="printer in availablePrinters" 
              :key="printer.name"
              :value="printer.name"
            >
              {{ printer.name }} 
              <a-tag v-if="printer.isDefault" color="green" size="small">默认</a-tag>
              <a-tag :color="getStatusColor(printer.status)" size="small">
                {{ getStatusText(printer.status) }}
              </a-tag>
            </a-select-option>
          </a-select>
          <template #extra>
            <a-button type="link" @click="refreshPrinters" size="small">
              刷新打印机列表
            </a-button>
          </template>
        </a-form-item>
        
        <a-form-item label="打印方式" name="printMode">
          <a-radio-group v-model:value="formState.printMode">
            <a-radio value="system">系统打印</a-radio>
            <a-radio value="escpos">ESC/POS指令</a-radio>
          </a-radio-group>
        </a-form-item>
        
        <template v-if="formState.printMode === 'escpos'">
          <a-form-item label="打印机类型" name="printerType">
            <a-radio-group v-model:value="formState.printerType">
              <a-radio value="usb">USB打印机</a-radio>
              <a-radio value="network">网络打印机</a-radio>
              <a-radio value="bluetooth" disabled>蓝牙打印机</a-radio>
            </a-radio-group>
          </a-form-item>
          
          <template v-if="formState.printerType === 'network'">
            <a-form-item label="IP地址" name="ipAddress">
              <a-input v-model:value="formState.ipAddress" placeholder="例如: 192.168.1.100" />
            </a-form-item>
            <a-form-item label="端口" name="port">
              <a-input-number v-model:value="formState.port" :min="1" :max="65535" />
            </a-form-item>
          </template>
        </template>
        
        <a-divider>订单信息</a-divider>
        
        <a-form-item label="订单号" name="orderNo">
          <a-input v-model:value="formState.orderNo" placeholder="自动生成">
            <template #addonAfter>
              <a-button type="link" @click="generateOrderNo" size="small">
                生成
              </a-button>
            </template>
          </a-input>
        </a-form-item>
        
        <a-form-item label="收银员" name="cashier">
          <a-input v-model:value="formState.cashier" placeholder="请输入收银员姓名" />
        </a-form-item>
        
        <a-form-item label="商品列表">
          <a-table 
            :data-source="formState.items"
            :columns="itemColumns"
            :pagination="false"
            size="small"
          >
            <template #bodyCell="{ column, record, index }">
              <template v-if="column.key === 'action'">
                <a-button type="link" danger @click="removeItem(index)">
                  删除
                </a-button>
              </template>
              <template v-else-if="column.key === 'index'">
                {{ index + 1 }}
              </template>
              <template v-else-if="column.key === 'total'">
                ¥{{ (record.price * record.quantity).toFixed(2) }}
              </template>
            </template>
          </a-table>
          
          <a-button 
            type="dashed" 
            block 
            @click="addItem"
            style="margin-top: 10px"
          >
            <plus-outlined />
            添加商品
          </a-button>
        </a-form-item>
        
        <a-form-item label="小计">
          <a-input-number 
            v-model:value="formState.subtotal" 
            :precision="2" 
            readonly
            style="width: 200px"
          />
        </a-form-item>
        
        <a-form-item label="折扣金额" name="discount">
          <a-input-number 
            v-model:value="formState.discount" 
            :precision="2" 
            :min="0"
            :max="formState.subtotal"
            style="width: 200px"
          />
        </a-form-item>
        
        <a-form-item label="合计金额">
          <a-input-number 
            v-model:value="formState.total" 
            :precision="2" 
            readonly
            style="width: 200px"
          />
        </a-form-item>
        
        <a-form-item label="实收金额" name="paid">
          <a-input-number 
            v-model:value="formState.paid" 
            :precision="2" 
            :min="formState.total"
            style="width: 200px"
          />
        </a-form-item>
        
        <a-form-item label="找零金额">
          <a-input-number 
            v-model:value="formState.change" 
            :precision="2" 
            readonly
            style="width: 200px"
          />
        </a-form-item>
        
        <a-form-item label="底部信息" name="footer">
          <a-textarea 
            v-model:value="formState.footer" 
            placeholder="请输入底部显示的信息"
            :rows="3"
          />
        </a-form-item>
        
        <a-form-item :wrapper-col="{ offset: 6, span: 14 }">
          <a-space>
            <a-button type="primary" @click="handlePrint" :loading="printing">
              打印小票
            </a-button>
            <a-button @click="handlePreview">预览</a-button>
            <a-button @click="handleReset">重置</a-button>
          </a-space>
        </a-form-item>
      </a-form>
    </a-card>
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch } from 'vue';
import { message } from 'ant-design-vue';
import { PlusOutlined } from '@ant-design/icons-vue';

const printing = ref(false);
const loadingPrinters = ref(false);
const availablePrinters = ref([]);
const formRef = ref();

// 商品列表表格列
const itemColumns = [
  {
    title: '#',
    key: 'index',
    width: 50
  },
  {
    title: '商品名称',
    dataIndex: 'name',
    key: 'name'
  },
  {
    title: '单价',
    dataIndex: 'price',
    key: 'price',
    width: 100,
    align: 'right'
  },
  {
    title: '数量',
    dataIndex: 'quantity',
    key: 'quantity',
    width: 100,
    align: 'center'
  },
  {
    title: '小计',
    key: 'total',
    width: 100,
    align: 'right'
  },
  {
    title: '操作',
    key: 'action',
    width: 80
  }
];

// 表单状态
const formState = reactive({
  printer: '',
  printMode: 'system',
  printerType: 'usb',
  ipAddress: '192.168.1.100',
  port: 9100,
  orderNo: '',
  cashier: '收银员',
  items: [
    { name: '测试商品A', price: 10.00, quantity: 2 },
    { name: '测试商品B', price: 15.50, quantity: 1 }
  ],
  subtotal: 0,
  discount: 0,
  total: 0,
  paid: 50.00,
  change: 0,
  footer: '谢谢惠顾，欢迎再次光临！'
});

// 验证规则
const rules = {
  printer: [
    { required: true, message: '请选择打印机' }
  ],
  orderNo: [
    { required: true, message: '请输入订单号' }
  ],
  cashier: [
    { required: true, message: '请输入收银员' }
  ],
  paid: [
    { required: true, message: '请输入实收金额' },
    { 
      validator: (rule, value) => {
        return value >= formState.total;
      },
      message: '实收金额不能小于合计金额'
    }
  ]
};

// 计算小计
const calculateTotals = () => {
  let subtotal = 0;
  formState.items.forEach(item => {
    subtotal += item.price * item.quantity;
  });
  
  formState.subtotal = parseFloat(subtotal.toFixed(2));
  formState.total = parseFloat(Math.max(0, subtotal - formState.discount).toFixed(2));
  formState.change = parseFloat(Math.max(0, formState.paid - formState.total).toFixed(2));
};

// 监听变化，重新计算
watch(
  () => [
    formState.items,
    formState.discount,
    formState.paid
  ],
  () => {
    calculateTotals();
  },
  { deep: true }
);

// 状态颜色映射
const getStatusColor = (status) => {
  const colors = {
    ready: 'green',
    offline: 'red',
    printing: 'blue'
  };
  return colors[status] || 'gray';
};

// 状态文本映射
const getStatusText = (status) => {
  const texts = {
    ready: '就绪',
    offline: '离线',
    printing: '打印中'
  };
  return texts[status] || status;
};

// 加载打印机列表
const loadPrinters = async () => {
  if (availablePrinters.value.length > 0) return;
  
  loadingPrinters.value = true;
  try {
    // 检查主进程是否就绪
    const isReady = await window.electronAPI.isMainProcessReady();
    if (!isReady) {
      console.log('主进程未就绪，将在2秒后重试...');
      setTimeout(() => {
        loadPrinters();
      }, 2000);
      return;
    }
    
    const result = await window.electronAPI.getPrinters();
    availablePrinters.value = result.allPrinters || [];
    
    // 如果有默认打印机，自动选择
    const defaultPrinter = availablePrinters.value.find(p => p.isDefault);
    if (defaultPrinter) {
      formState.printer = defaultPrinter.name;
    }
  } catch (error) {
    if (error.message.includes('打印机管理器未初始化')) {
      // 打印机管理器未初始化，稍后重试
      console.log('打印机管理器未就绪，将在2秒后重试...');
      setTimeout(() => {
        loadPrinters();
      }, 2000);
    } else {
      message.error('加载打印机失败: ' + error.message);
    }
  } finally {
    loadingPrinters.value = false;
  }
};

// 刷新打印机列表
const refreshPrinters = async () => {
  loadingPrinters.value = true;
  try {
    const result = await window.electronAPI.getPrinters();
    availablePrinters.value = result.allPrinters || [];
    message.success('打印机列表已刷新');
  } catch (error) {
    message.error('刷新打印机失败: ' + error.message);
  } finally {
    loadingPrinters.value = false;
  }
};

// 生成订单号
const generateOrderNo = () => {
  const date = new Date();
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  formState.orderNo = `DD${year}${month}${day}${random}`;
};

// 添加商品
const addItem = () => {
  formState.items.push({
    name: '新商品',
    price: 0.00,
    quantity: 1
  });
};

// 删除商品
const removeItem = (index) => {
  formState.items.splice(index, 1);
};

// 打印
const handlePrint = async () => {
  try {
    await formRef.value.validate();
    
    printing.value = true;
    
    const printData = {
      printerName: formState.printer,
      printerType: formState.printerType,
      useEscPos: formState.printMode === 'escpos',
      config: {
        address: formState.ipAddress,
        port: formState.port
      },
      data: {
        orderNo: formState.orderNo,
        cashier: formState.cashier,
        items: formState.items,
        subtotal: formState.subtotal,
        discount: formState.discount,
        total: formState.total,
        paid: formState.paid,
        change: formState.change,
        footer: formState.footer
      }
    };
    
    const result = await window.electronAPI.printReceipt(printData);
    
    if (result.success) {
      message.success('打印任务已发送');
    } else {
      message.error('打印失败: ' + result.error);
    }
  } catch (error) {
    console.error('打印错误:', error);
    if (error.errorFields) {
      message.error('请检查表单填写是否正确');
    } else {
      message.error('打印失败: ' + error.message);
    }
  } finally {
    printing.value = false;
  }
};

// 预览
const handlePreview = () => {
  message.info('预览功能开发中...');
};

// 重置
const handleReset = () => {
  formRef.value.resetFields();
  formState.items = [
    { name: '测试商品A', price: 10.00, quantity: 2 },
    { name: '测试商品B', price: 15.50, quantity: 1 }
  ];
  calculateTotals();
};

// 初始化
calculateTotals();
generateOrderNo();
</script>

<style scoped>
.order-form {
  width: 100%;
}
</style>