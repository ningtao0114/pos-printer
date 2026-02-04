import { createRouter, createWebHashHistory } from 'vue-router';
import Dashboard from '../views/Dashboard.vue';
import PrinterManagement from '../views/PrinterManagement.vue';
import OrderPrint from '../views/OrderPrint.vue';
import Settings from '../views/Settings.vue';

const routes = [
  {
    path: '/',
    redirect: '/dashboard'
  },
  {
    path: '/dashboard',
    name: 'Dashboard',
    component: Dashboard
  },
  {
    path: '/printers',
    name: 'Printers',
    component: PrinterManagement
  },
  {
    path: '/orders',
    name: 'Orders',
    component: OrderPrint
  },
  {
    path: '/settings',
    name: 'Settings',
    component: Settings
  }
];

const router = createRouter({
  history: createWebHashHistory(),
  routes
});

export default router;