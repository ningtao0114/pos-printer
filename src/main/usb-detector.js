import usb from 'usb';

class UsbDetector {
  constructor() {
    this.devices = new Map();
    this.isMonitoring = false;
    this.onDeviceChange = null;
  }

  // 开始监控USB设备
  startMonitoring() {
    if (this.isMonitoring) return;
    
    this.isMonitoring = true;
    
    // 初始扫描
    this.scanDevices();
    
    // 监听USB设备插入
    usb.on('attach', (device) => {
      console.log('USB设备插入:', device);
      this.handleDeviceAttach(device);
    });
    
    // 监听USB设备拔出
    usb.on('detach', (device) => {
      console.log('USB设备拔出:', device);
      this.handleDeviceDetach(device);
    });
    
    console.log('USB设备监控已启动');
  }

  // 停止监控
  stopMonitoring() {
    this.isMonitoring = false;
    usb.removeAllListeners('attach');
    usb.removeAllListeners('detach');
    console.log('USB设备监控已停止');
  }

  // 扫描当前USB设备
  scanDevices() {
    try {
      const deviceList = usb.getDeviceList();
      this.devices.clear();
      
      deviceList.forEach(device => {
        const key = this.getDeviceKey(device);
        this.devices.set(key, {
          device,
          info: this.getDeviceInfo(device),
          timestamp: Date.now()
        });
      });
      
      return Array.from(this.devices.values()).map(d => d.info);
    } catch (error) {
      console.error('扫描USB设备失败:', error);
      return [];
    }
  }

  // 处理设备插入
  handleDeviceAttach(device) {
    const key = this.getDeviceKey(device);
    const deviceInfo = this.getDeviceInfo(device);
    
    this.devices.set(key, {
      device,
      info: deviceInfo,
      timestamp: Date.now()
    });
    
    if (this.onDeviceChange) {
      this.onDeviceChange('attach', deviceInfo);
    }
    
    // 检查是否是打印机
    if (this.isPrinterDevice(device)) {
      console.log('检测到打印机设备插入:', deviceInfo);
      this.notifyPrinterDetected(deviceInfo);
    }
  }

  // 处理设备拔出
  handleDeviceDetach(device) {
    const key = this.getDeviceKey(device);
    const deviceInfo = this.devices.get(key)?.info;
    
    this.devices.delete(key);
    
    if (this.onDeviceChange) {
      this.onDeviceChange('detach', deviceInfo);
    }
    
    if (deviceInfo && this.isPrinterDevice(device)) {
      console.log('打印机设备拔出:', deviceInfo);
    }
  }

  // 获取设备唯一标识
  getDeviceKey(device) {
    return `${device.busNumber}-${device.deviceAddress}`;
  }

  // 获取设备信息
  getDeviceInfo(device) {
    const descriptor = device.deviceDescriptor;
    
    return {
      vendorId: descriptor.idVendor.toString(16).padStart(4, '0'),
      productId: descriptor.idProduct.toString(16).padStart(4, '0'),
      vendorHex: `0x${descriptor.idVendor.toString(16).padStart(4, '0')}`,
      productHex: `0x${descriptor.idProduct.toString(16).padStart(4, '0')}`,
      manufacturer: descriptor.iManufacturer,
      product: descriptor.iProduct,
      busNumber: device.busNumber,
      deviceAddress: device.deviceAddress,
      deviceType: this.getDeviceType(descriptor)
    };
  }

  // 判断设备类型
  getDeviceType(descriptor) {
    // 常见打印机厂商ID
    const printerVendors = [
      0x04b8, // Epson
      0x04a9, // Canon
      0x0922, // Xprinter
      0x0483, // Gainscha
      0x0416, // Winpos
      0x0fe6  // Bixolon
    ];
    
    if (printerVendors.includes(descriptor.idVendor)) {
      return 'printer';
    }
    
    // 可以根据设备类别代码进一步判断
    if (descriptor.bDeviceClass === 7) {
      return 'printer';
    }
    
    return 'other';
  }

  // 判断是否是打印机设备
  isPrinterDevice(device) {
    const descriptor = device.deviceDescriptor;
    
    // 打印机设备类别代码
    if (descriptor.bDeviceClass === 7) {
      return true;
    }
    
    // 常见打印机厂商
    const printerVendors = [
      0x04b8, 0x04a9, 0x0922, 0x0483, 0x0416, 0x0fe6
    ];
    
    return printerVendors.includes(descriptor.idVendor);
  }

  // 检测USB打印机
  async detectUsbPrinters() {
    const devices = this.scanDevices();
    return devices.filter(device => device.deviceType === 'printer');
  }

  // 获取特定厂商的设备
  getDevicesByVendor(vendorId) {
    return Array.from(this.devices.values())
      .filter(d => d.info.vendorId === vendorId)
      .map(d => d.info);
  }

  // 设置设备变化回调
  setDeviceChangeCallback(callback) {
    this.onDeviceChange = callback;
  }

  // 通知打印机检测到
  notifyPrinterDetected(deviceInfo) {
    // 这里可以发送 IPC 消息到渲染进程
    // 或者执行其他处理逻辑
    console.log('打印机设备通知:', deviceInfo);
  }
}

export default UsbDetector;