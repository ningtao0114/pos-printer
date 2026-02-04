/**
 * USB打印机管理器 - 直接使用usb包通信
 */

import usb from 'usb';
import iconv from 'iconv-lite';

class UsbPrinter {
  constructor() {
    this.device = null;
    this.interface = null;
    this.endpoint = null;
    this.isConnected = false;
    
    // 常见打印机厂商ID
    this.printerVendors = {
      EPSON: 0x04b8,
      CANON: 0x04a9,
      XPRINTER: 0x0922,
      GAINSCHA: 0x0483,
      WINPOS: 0x0416,
      BIXOLON: 0x0fe6,
      STAR: 0x0519,
      CITIZEN: 0x0b59
    };
  }

  /**
   * 查找USB打印机
   */
  findPrinters() {
    const printers = [];
    const devices = usb.getDeviceList();
    
    for (const device of devices) {
      const vendorId = device.deviceDescriptor.idVendor;
      const productId = device.deviceDescriptor.idProduct;
      
      // 检查是否是打印机设备
      if (this.isPrinterDevice(device)) {
        const vendorName = this.getVendorName(vendorId);
        
        printers.push({
          device,
          vendorId,
          productId,
          vendorName,
          busNumber: device.busNumber,
          deviceAddress: device.deviceAddress
        });
      }
    }
    
    return printers;
  }

  /**
   * 判断是否是打印机设备
   */
  isPrinterDevice(device) {
    const descriptor = device.deviceDescriptor;
    
    // 方法1: 检查设备类别
    if (descriptor.bDeviceClass === 7) { // 打印机设备类别
      return true;
    }
    
    // 方法2: 检查厂商ID
    const vendorId = descriptor.idVendor;
    return Object.values(this.printerVendors).includes(vendorId);
  }

  /**
   * 获取厂商名称
   */
  getVendorName(vendorId) {
    for (const [name, id] of Object.entries(this.printerVendors)) {
      if (id === vendorId) {
        return name;
      }
    }
    return `Unknown (0x${vendorId.toString(16).padStart(4, '0')})`;
  }

  /**
   * 连接打印机
   */
  connect(device) {
    return new Promise((resolve, reject) => {
      try {
        this.device = device;
        this.device.open();
        
        // 查找打印接口 (通常是接口0)
        const iface = this.device.interfaces[0];
        if (!iface) {
          throw new Error('未找到打印机接口');
        }
        
        // 声明接口
        iface.claim();
        this.interface = iface;
        
        // 查找输出端点
        const endpoints = iface.endpoints;
        for (const endpoint of endpoints) {
          if (endpoint.direction === 'out') {
            this.endpoint = endpoint;
            break;
          }
        }
        
        if (!this.endpoint) {
          throw new Error('未找到输出端点');
        }
        
        this.isConnected = true;
        resolve(true);
      } catch (error) {
        this.disconnect();
        reject(error);
      }
    });
  }

  /**
   * 断开连接
   */
  disconnect() {
    if (this.interface) {
      try {
        this.interface.release();
      } catch (error) {
        // 忽略释放错误
      }
      this.interface = null;
    }
    
    if (this.device) {
      try {
        this.device.close();
      } catch (error) {
        // 忽略关闭错误
      }
      this.device = null;
    }
    
    this.endpoint = null;
    this.isConnected = false;
  }

  /**
   * 发送数据到打印机
   */
  write(data) {
    return new Promise((resolve, reject) => {
      if (!this.isConnected || !this.endpoint) {
        reject(new Error('打印机未连接'));
        return;
      }
      
      try {
        // 将数据转换为Buffer
        let buffer;
        if (typeof data === 'string') {
          buffer = Buffer.from(data, 'binary');
        } else if (Array.isArray(data)) {
          buffer = Buffer.from(data);
        } else if (Buffer.isBuffer(data)) {
          buffer = data;
        } else {
          throw new Error('不支持的数据类型');
        }
        
        // 发送数据
        this.endpoint.transfer(buffer, (error) => {
          if (error) {
            reject(error);
          } else {
            resolve(true);
          }
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * 发送ESC/POS指令
   */
  sendCommand(command) {
    return this.write(command);
  }

  /**
   * 初始化打印机
   */
  initialize() {
    return this.write([0x1b, 0x40]); // ESC @
  }

  /**
   * 设置字符集
   */
  setCharset(charset = 'GBK') {
    if (charset === 'GBK') {
      return this.write([0x1c, 0x21]); // FS !
    } else {
      return this.write([0x1b, 0x74, 0x00]); // ESC t 0 (PC437)
    }
  }

  /**
   * 设置对齐方式
   */
  setAlignment(align = 'left') {
    const alignments = {
      left: [0x1b, 0x61, 0x00],    // ESC a 0
      center: [0x1b, 0x61, 0x01],  // ESC a 1
      right: [0x1b, 0x61, 0x02]    // ESC a 2
    };
    
    return this.write(alignments[align] || alignments.left);
  }

  /**
   * 设置字体大小
   */
  setFontSize(width = 1, height = 1) {
    if (width < 1) width = 1;
    if (width > 8) width = 8;
    if (height < 1) height = 1;
    if (height > 8) height = 8;
    
    const size = ((width - 1) << 4) | (height - 1);
    return this.write([0x1d, 0x21, size]); // GS !
  }

  /**
   * 设置粗体
   */
  setBold(enabled = true) {
    return this.write([0x1b, 0x45, enabled ? 0x01 : 0x00]); // ESC E
  }

  /**
   * 打印文本
   */
  printText(text, encoding = 'GBK') {
    let buffer;
    if (encoding === 'GBK') {
      buffer = iconv.encode(text, 'GBK');
    } else {
      buffer = Buffer.from(text, 'ascii');
    }
    return this.write(buffer);
  }

  /**
   * 打印一行文本
   */
  printLine(text, encoding = 'GBK') {
    return this.printText(text + '\n', encoding);
  }

  /**
   * 换行
   */
  lineFeed(lines = 1) {
    const commands = [];
    for (let i = 0; i < lines; i++) {
      commands.push(0x0a); // LF
    }
    return this.write(commands);
  }

  /**
   * 切纸
   */
  cutPaper(mode = 0) {
    if (mode === 0) {
      return this.write([0x1d, 0x56, 0x00]); // GS V 0 (全切)
    } else {
      return this.write([0x1d, 0x56, 0x01]); // GS V 1 (半切)
    }
  }

  /**
   * 开钱箱
   */
  openCashDrawer(pin = 2) {
    if (pin === 2) {
      return this.write([0x1b, 0x70, 0x00, 0x40, 0x40]); // ESC p 0 64 64
    } else {
      return this.write([0x1b, 0x70, 0x01, 0x40, 0x40]); // ESC p 1 64 64
    }
  }

  /**
   * 打印收据
   */
  async printReceipt(data) {
    try {
      // 查找并连接打印机
      const printers = this.findPrinters();
      if (printers.length === 0) {
        throw new Error('未找到USB打印机');
      }
      
      await this.connect(printers[0].device);
      
      // 初始化打印机
      await this.initialize();
      
      // 设置GBK字符集
      await this.setCharset('GBK');
      
      // 打印标题
      await this.setAlignment('center');
      await this.setBold(true);
      await this.setFontSize(2, 2);
      await this.printLine('=== 销售小票 ===');
      
      // 重置格式
      await this.setAlignment('left');
      await this.setBold(false);
      await this.setFontSize(1, 1);
      
      // 打印订单信息
      await this.printLine(`单号: ${data.orderNo}`);
      await this.printLine(`时间: ${new Date().toLocaleString()}`);
      await this.printLine(`收银员: ${data.cashier || '系统'}`);
      await this.printLine('--------------------------------');
      
      // 打印商品列表
      for (const item of data.items) {
        const name = this.truncateText(item.name, 16);
        const qty = `x${item.quantity}`.padStart(6, ' ');
        const price = `￥${item.price}`.padStart(8, ' ');
        const total = `￥${(item.price * item.quantity).toFixed(2)}`.padStart(10, ' ');
        
        await this.printLine(`${name}${qty}${price}${total}`);
      }
      
      // 打印金额信息
      await this.printLine('--------------------------------');
      await this.printLine(`小计: ￥${data.subtotal}`);
      
      if (data.discount > 0) {
        await this.printLine(`折扣: -￥${data.discount}`);
      }
      
      await this.setBold(true);
      await this.printLine(`合计: ￥${data.total}`);
      await this.setBold(false);
      
      await this.printLine(`实收: ￥${data.paid}`);
      await this.printLine(`找零: ￥${data.change}`);
      await this.lineFeed(2);
      
      // 打印底部信息
      await this.setAlignment('center');
      await this.printLine('谢谢惠顾！');
      await this.printLine(data.footer || '');
      await this.lineFeed(3);
      
      // 切纸
      await this.cutPaper();
      
      // 断开连接
      this.disconnect();
      
      return { success: true, message: 'USB打印完成' };
    } catch (error) {
      this.disconnect();
      throw error;
    }
  }

  /**
   * 截断文本以适应宽度
   */
  truncateText(text, maxWidth) {
    if (text.length <= maxWidth) {
      return text;
    }
    
    // 简单截断（实际应根据字符宽度调整）
    return text.substring(0, maxWidth - 1) + '…';
  }

  /**
   * 打印测试页
   */
  async printTestPage() {
    const testData = {
      orderNo: 'TEST' + Date.now().toString().slice(-6),
      cashier: '测试用户',
      items: [
        { name: '测试商品A', quantity: 1, price: '10.00' },
        { name: '测试商品B', quantity: 2, price: '15.50' }
      ],
      subtotal: '41.00',
      discount: '1.00',
      total: '40.00',
      paid: '50.00',
      change: '10.00',
      footer: '这是测试小票，用于检查打印机状态'
    };
    
    return await this.printReceipt(testData);
  }
}

export default UsbPrinter;