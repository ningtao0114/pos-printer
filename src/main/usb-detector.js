import usb from 'usb';

class UsbDetector {
  constructor() {
    this.devices = new Map();
    this.isMonitoring = false;
    this.onDeviceChange = null;
    this.attachListener = null;
    this.detachListener = null;
  }

  // 开始监控USB设备
  startMonitoring() {
    if (this.isMonitoring) return;
    
    this.isMonitoring = true;
    
    // 初始扫描
    this.scanDevices();
    
    // 检查USB库是否支持事件监听
    if (typeof usb.on === 'function') {
      // 监听USB设备插入
      this.attachListener = (device) => {
        console.log('USB设备插入:', device);
        this.handleDeviceAttach(device);
      };
      usb.on('attach', this.attachListener);
      
      // 监听USB设备拔出
      this.detachListener = (device) => {
        console.log('USB设备拔出:', device);
        this.handleDeviceDetach(device);
      };
      usb.on('detach', this.detachListener);
    } else {
      // 如果不支持事件监听，使用轮询方式
      console.log('USB库不支持事件监听，使用轮询方式检测设备变化');
      this.startPolling();
    }
    
    console.log('USB设备监控已启动');
  }

  // 停止监控
  stopMonitoring() {
    this.isMonitoring = false;
    
    // 移除事件监听器
    if (this.attachListener && usb.removeListener) {
      usb.removeListener('attach', this.attachListener);
    }
    if (this.detachListener && usb.removeListener) {
      usb.removeListener('detach', this.detachListener);
    }
    
    // 停止轮询
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
    
    console.log('USB设备监控已停止');
  }

  // 开始轮询检测设备变化
  startPolling() {
    let previousDeviceCount = this.devices.size;
    
    this.pollInterval = setInterval(() => {
      const currentDevices = this.scanDevices();
      const currentDeviceCount = this.devices.size;
      
      if (currentDeviceCount > previousDeviceCount) {
        console.log('检测到新USB设备插入');
      } else if (currentDeviceCount < previousDeviceCount) {
        console.log('检测到USB设备拔出');
      }
      
      previousDeviceCount = currentDeviceCount;
    }, 5000); // 每5秒检查一次
  }

  // 扫描当前USB设备
  scanDevices() {
    try {
      const deviceList = usb.getDeviceList();
      const currentDevices = new Map();
      
      deviceList.forEach(device => {
        const key = this.getDeviceKey(device);
        const deviceInfo = this.getDeviceInfo(device);
        
        currentDevices.set(key, {
          device,
          info: deviceInfo,
          timestamp: Date.now()
        });
      });
      
      // 更新设备列表
      this.devices = currentDevices;
      
      return Array.from(currentDevices.values()).map(d => d.info);
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
    if (!device || !device.deviceDescriptor) {
      return 'unknown-device';
    }
    return `${device.deviceDescriptor.idVendor}-${device.deviceDescriptor.idProduct}`;
  }

  // 获取设备信息
  getDeviceInfo(device) {
    if (!device || !device.deviceDescriptor) {
      return {
        vendorId: 0,
        productId: 0,
        vendor: 'Unknown',
        product: 'Unknown Device',
        deviceType: 'unknown',
        serialNumber: 0
      };
    }
    
    return {
      vendorId: device.deviceDescriptor.idVendor,
      productId: device.deviceDescriptor.idProduct,
      vendor: this.getVendorName(device.deviceDescriptor.idVendor),
      product: this.getProductName(device.deviceDescriptor.idVendor, device.deviceDescriptor.idProduct),
      deviceType: this.getDeviceType(device),
      serialNumber: device.deviceDescriptor.iSerialNumber
    };
  }

  // 获取厂商名称（简化版）
  getVendorName(vendorId) {
    const vendors = {
      0x03F0: 'HP',
      0x04A9: 'Canon',
      0x04B8: 'Epson',
      0x04F9: 'Brother',
      0x067B: 'Prolific',
      0x0922: 'Samsung'
    };
    return vendors[vendorId] || `Vendor_0x${vendorId.toString(16).toUpperCase()}`;
  }

  // 获取产品名称（简化版）
  getProductName(vendorId, productId) {
    return `Product_0x${productId.toString(16).toUpperCase()}`;
  }

  // 判断设备类型
  getDeviceType(device) {
    if (!device || !device.deviceDescriptor) {
      return 'unknown';
    }
    
    // 简化的设备类型判断
    if (device.deviceDescriptor.bDeviceClass === 7) {
      return 'printer';
    }
    return 'unknown';
  }

  // 判断是否是打印机设备
  isPrinterDevice(device) {
    return this.getDeviceType(device) === 'printer';
  }

  // 通知打印机检测到
  notifyPrinterDetected(deviceInfo) {
    // 这里可以发送IPC消息到渲染进程
    console.log('USB打印机检测到:', deviceInfo);
  }

  // 检测USB打印机
  async detectUsbPrinters() {
    try {
      const devices = this.scanDevices();
      return devices.filter(device => this.isPrinterDevice(device.device));
    } catch (error) {
      console.error('检测USB打印机失败:', error);
      return [];
    }
  }

  // 设置设备变化回调
  setOnDeviceChange(callback) {
    this.onDeviceChange = callback;
  }
}

export default UsbDetector;