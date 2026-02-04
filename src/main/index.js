import { app, BrowserWindow, ipcMain, dialog, Menu, Tray } from 'electron';
import { fileURLToPath } from 'url';
import path from 'path';
import PrinterManager from './printer-manager.js';
import UsbDetector from './usb-detector.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let mainWindow = null;
let tray = null;
let printerManager = null;
let usbDetector = null;

const createWindow = () => {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 1024,
    minHeight: 768,
    show: false,
    frame: true,
    icon: path.join(__dirname, '../../build/icon.ico'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, '../preload/index.js')
    }
  });

  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:3000');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../../dist/renderer/index.html'));
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    
    // 初始化打印机管理器
    printerManager = new PrinterManager();
    usbDetector = new UsbDetector();
    
    // 启动USB设备检测
    usbDetector.startMonitoring();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
    if (usbDetector) {
      usbDetector.stopMonitoring();
    }
  });
};

const createTray = () => {
  tray = new Tray(path.join(__dirname, '../../build/icon.ico'));
  
  const contextMenu = Menu.buildFromTemplate([
    { label: '打开主界面', click: () => mainWindow.show() },
    { label: '检查打印机', click: () => checkPrinters() },
    { type: 'separator' },
    { label: '退出', click: () => app.quit() }
  ]);
  
  tray.setToolTip('POS打印机服务');
  tray.setContextMenu(contextMenu);
  tray.on('click', () => mainWindow.show());
};

const setupIpcHandlers = () => {
  // 打印机相关
  ipcMain.handle('get-printers', async () => {
    return await printerManager.getAvailablePrinters();
  });

  ipcMain.handle('check-printer-status', async () => {
    return await printerManager.checkPrinterStatus();
  });

  ipcMain.handle('print-receipt', async (event, printData) => {
    try {
      const result = await printerManager.printReceipt(printData);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('print-test-page', async (event, printerName) => {
    return await printerManager.printTestPage(printerName);
  });

  ipcMain.handle('detect-usb-printers', async () => {
    return await usbDetector.detectUsbPrinters();
  });

  ipcMain.handle('install-printer-driver', async (event, driverPath) => {
    return await printerManager.installDriver(driverPath);
  });

  // ESC/POS 指令打印
  ipcMain.handle('print-esc-pos', async (event, { printerType, config, data }) => {
    return await printerManager.printEscPos(printerType, config, data);
  });

  // 设置默认打印机
  ipcMain.handle('set-default-printer', async (event, printerName) => {
    return await printerManager.setDefaultPrinter(printerName);
  });

  // 系统对话框
  ipcMain.handle('show-open-dialog', async (event, options) => {
    const result = await dialog.showOpenDialog(mainWindow, options);
    return result;
  });

  ipcMain.handle('show-save-dialog', async (event, options) => {
    const result = await dialog.showSaveDialog(mainWindow, options);
    return result;
  });
};

app.whenReady().then(() => {
  createWindow();
  createTray();
  setupIpcHandlers();
  
  // 检查管理员权限
  if (process.platform === 'win32' && !process.env.SUDO_UID) {
    console.log('以管理员权限运行，可以访问USB设备');
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

app.on('before-quit', () => {
  if (usbDetector) {
    usbDetector.stopMonitoring();
  }
});