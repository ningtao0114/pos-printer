import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  // 初始化检查
  isMainProcessReady: () => ipcRenderer.invoke('is-main-process-ready'),
  
  // 打印机相关
  getPrinters: () => ipcRenderer.invoke('get-printers'),
  checkPrinterStatus: () => ipcRenderer.invoke('check-printer-status'),
  printReceipt: (data) => ipcRenderer.invoke('print-receipt', data),
  printTestPage: (printerName) => ipcRenderer.invoke('print-test-page', printerName),
  printEscPos: (options) => ipcRenderer.invoke('print-esc-pos', options),
  setDefaultPrinter: (printerName) => ipcRenderer.invoke('set-default-printer', printerName),
  
  // USB设备
  detectUsbPrinters: () => ipcRenderer.invoke('detect-usb-printers'),
  installPrinterDriver: (driverPath) => ipcRenderer.invoke('install-printer-driver', driverPath),
  
  // 对话框
  showOpenDialog: (options) => ipcRenderer.invoke('show-open-dialog', options),
  showSaveDialog: (options) => ipcRenderer.invoke('show-save-dialog', options),
  
  // 事件监听
  onUsbDeviceChange: (callback) => {
    ipcRenderer.on('usb-device-change', (event, ...args) => callback(...args));
  },
  
  removeUsbDeviceChange: () => {
    ipcRenderer.removeAllListeners('usb-device-change');
  }
});