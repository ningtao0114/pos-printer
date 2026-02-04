<template>
  <a-config-provider>
    <div id="app">
      <a-layout style="min-height: 100vh">
        <a-layout-header class="header">
          <div class="logo">
            <printer-outlined style="font-size: 24px; margin-right: 10px" />
            <span style="font-size: 18px; font-weight: bold">POS打印机管理系统</span>
          </div>
          <div class="user-info">
            <a-avatar icon="user" />
            <span style="margin-left: 8px">管理员</span>
          </div>
        </a-layout-header>
        
        <a-layout>
          <a-layout-sider width="200" style="background: #fff">
            <a-menu
              v-model:selectedKeys="selectedKeys"
              mode="inline"
              @click="handleMenuClick"
            >
              <a-menu-item key="dashboard">
                <template #icon>
                  <dashboard-outlined />
                </template>
                仪表盘
              </a-menu-item>
              <a-menu-item key="printers">
                <template #icon>
                  <printer-outlined />
                </template>
                打印机管理
              </a-menu-item>
              <a-menu-item key="orders">
                <template #icon>
                  <shopping-cart-outlined />
                </template>
                订单打印
              </a-menu-item>
              <a-menu-item key="settings">
                <template #icon>
                  <setting-outlined />
                </template>
                系统设置
              </a-menu-item>
            </a-menu>
          </a-layout-sider>
          
          <a-layout-content style="padding: 20px">
            <router-view />
          </a-layout-content>
        </a-layout>
        
        <a-layout-footer style="text-align: center">
          POS打印机管理系统 ©2023
        </a-layout-footer>
      </a-layout>
    </div>
  </a-config-provider>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import {
  PrinterOutlined,
  DashboardOutlined,
  ShoppingCartOutlined,
  SettingOutlined
} from '@ant-design/icons-vue';

const router = useRouter();
const selectedKeys = ref(['dashboard']);

const handleMenuClick = ({ key }) => {
  router.push(`/${key}`);
};
</script>

<style>
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #001529;
  color: white;
  padding: 0 20px;
}

.logo {
  display: flex;
  align-items: center;
}

.user-info {
  display: flex;
  align-items: center;
}
</style>