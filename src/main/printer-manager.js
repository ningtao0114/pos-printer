import escpos from 'escpos';
import escposUSB from 'escpos-usb';
import escposNetwork from 'escpos-network';
import usb from 'usb';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';

const execAsync = promisify(exec);

escpos.USB = escposUSB;
escpos.Network = escposNetwork;

class PrinterManager {
  constructor() {
    this.availablePrinters = [];
    this.defaultPrinter = null;
    this.usbPrinters = [];
    this.networkPrinters = [];
  }

  // 获取所有可用打印机
  async getAvailablePrinters() {
    try {
      // 获取系统打印机
      const systemPrinters = await this.getSystemPrinters();
      
      // 获取USB打印机
      const usbPrinters = await this.detectUsbPrinters();
      
      // 合并打印机列表
      this.availablePrinters = [
        ...systemPrinters,
        ...usbPrinters
      ];
      
      // 获取默认打印机
      this.defaultPrinter = await this.getDefaultPrinter();
      
      return {
        systemPrinters,
        usbPrinters,
        defaultPrinter: this.defaultPrinter,
        allPrinters: this.availablePrinters
      };
    } catch (error) {
      console.error('获取打印机失败:', error);
      throw error;
    }
  }

  // 获取系统打印机
  async getSystemPrinters() {
    try {
      // Windows 使用 wmic 命令获取打印机信息
      const { stdout } = await execAsync('wmic printer get Name,PortName,DriverName,Default /format:csv');
      
      const printers = [];
      const lines = stdout.trim().split('\n');
      
      if (lines.length > 1) {
        const headers = lines[0].split(',').map(h => h.trim());
        
        for (let i = 1; i < lines.length; i++) {
          const values = lines[i].split(',').map(v => v.trim());
          if (values.length === headers.length) {
            const printer = {};
            headers.forEach((header, index) => {
              printer[header.toLowerCase()] = values[index];
            });
            
            printers.push({
              name: printer.name,
              port: printer.portname,
              driver: printer.drivername,
              isDefault: printer.default === 'TRUE',
              type: 'system',
              status: 'ready'
            });
          }
        }
      }
      
      return printers;
    } catch (error) {
      console.error('获取系统打印机失败:', error);
      return [];
    }
  }

  // 获取默认打印机
  async getDefaultPrinter() {
    try {
      const { stdout } = await execAsync('wmic printer where Default=True get Name');
      const match = stdout.match(/^\s*(.+?)\s*$/m);
      return match ? match[1] : null;
    } catch (error) {
      console.error('获取默认打印机失败:', error);
      return null;
    }
  }

  // 设置默认打印机
  async setDefaultPrinter(printerName) {
    try {
      const command = `RUNDLL32 PRINTUI.DLL,PrintUIEntry /y /n "${printerName}"`;
      await execAsync(command);
      this.defaultPrinter = printerName;
      return { success: true, message: '默认打印机设置成功' };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // 检测USB打印机
  async detectUsbPrinters() {
    try {
      const usbPrinters = [];
      const devices = usb.getDeviceList();
      
      // 常见打印机厂商ID
      const printerVendors = [
        { vendorId: 0x04b8, name: 'Epson' },
        { vendorId: 0x04a9, name: 'Canon' },
        { vendorId: 0x0922, name: 'Xprinter' },
        { vendorId: 0x0483, name: 'Gainscha' },
        { vendorId: 0x0416, name: 'Winpos' },
        { vendorId: 0x0fe6, name: 'Bixolon' }
      ];
      
      for (const device of devices) {
        const vendorInfo = printerVendors.find(v => v.vendorId === device.deviceDescriptor.idVendor);
        
        if (vendorInfo) {
          try {
            device.open();
            
            const printerInfo = {
              vendor: vendorInfo.name,
              vendorId: device.deviceDescriptor.idVendor.toString(16),
              productId: device.deviceDescriptor.idProduct.toString(16),
              serialNumber: device.deviceDescriptor.iSerialNumber,
              type: 'usb',
              status: 'connected',
              driverInstalled: true
            };
            
            usbPrinters.push(printerInfo);
            device.close();
          } catch (error) {
            usbPrinters.push({
              vendor: vendorInfo.name,
              vendorId: device.deviceDescriptor.idVendor.toString(16),
              type: 'usb',
              status: 'no_driver',
              driverInstalled: false,
              error: error.message
            });
          }
        }
      }
      
      this.usbPrinters = usbPrinters;
      return usbPrinters;
    } catch (error) {
      console.error('检测USB打印机失败:', error);
      return [];
    }
  }

  // 检查打印机状态
  async checkPrinterStatus() {
    try {
      const { stdout } = await execAsync('wmic printer get Name,PrinterStatus,WorkOffline /format:csv');
      
      const statusMap = {};
      const lines = stdout.trim().split('\n');
      
      if (lines.length > 1) {
        const headers = lines[0].split(',').map(h => h.trim());
        
        for (let i = 1; i < lines.length; i++) {
          const values = lines[i].split(',').map(v => v.trim());
          if (values.length === headers.length) {
            const printer = {};
            headers.forEach((header, index) => {
              printer[header.toLowerCase()] = values[index];
            });
            
            let status = 'unknown';
            if (printer.workoffline === 'TRUE') {
              status = 'offline';
            } else if (printer.printerstatus === '3') {
              status = 'ready';
            } else if (printer.printerstatus === '4') {
              status = 'printing';
            } else if (printer.printerstatus === '5') {
              status = 'warmup';
            }
            
            statusMap[printer.name] = status;
          }
        }
      }
      
      return statusMap;
    } catch (error) {
      console.error('检查打印机状态失败:', error);
      return {};
    }
  }

  // 打印小票
  async printReceipt(printData) {
    const {
      printerName,
      printerType = 'system',
      useEscPos = false,
      data
    } = printData;

    try {
      if (useEscPos) {
        return await this.printWithEscPos(printerType, printerName, data);
      } else {
        return await this.printWithSystem(printerName, data);
      }
    } catch (error) {
      console.error('打印失败:', error);
      throw error;
    }
  }

  // 使用系统打印
  async printWithSystem(printerName, data) {
    return new Promise((resolve, reject) => {
      // 这里可以使用 Electron 的 webContents.print() 或调用 Windows 打印 API
      // 简化实现：生成 HTML 然后打印
      const htmlContent = this.generateReceiptHtml(data);
      
      // 保存为临时文件然后打印
      const tempPath = path.join(process.env.TEMP, `receipt_${Date.now()}.html`);
      fs.writeFileSync(tempPath, htmlContent);
      
      const command = `start /wait mshta vbscript:Execute("CreateObject('Shell.Application').ShellExecute 'rundll32.exe', 'mshtml.dll,PrintHTML ""${tempPath}""', '', 'open', 1")(window.close)`;
      
      exec(command, (error) => {
        // 清理临时文件
        try { fs.unlinkSync(tempPath); } catch {}
        
        if (error) {
          reject(error);
        } else {
          resolve({ success: true, message: '打印任务已发送' });
        }
      });
    });
  }

  // 使用 ESC/POS 打印
  async printWithEscPos(printerType, config, data) {
    try {
      let device;
      
      if (printerType === 'usb') {
        // USB 打印机
        const devices = escpos.USB.findPrinter();
        if (devices.length === 0) {
          throw new Error('未找到USB打印机');
        }
        device = new escpos.USB(devices[0]);
      } else if (printerType === 'network') {
        // 网络打印机
        device = new escpos.Network(config.address, config.port || 9100);
      } else if (printerType === 'bluetooth') {
        // 蓝牙打印机（Windows 上通常通过虚拟串口或网络）
        // 这里简化处理
        throw new Error('蓝牙打印暂未实现，请使用USB或网络打印机');
      } else {
        throw new Error('不支持的打印机类型');
      }
      
      const printer = new escpos.Printer(device);
      
      return new Promise((resolve, reject) => {
        device.open((error) => {
          if (error) {
            reject(error);
            return;
          }
          
          printer
            .font('a')
            .align('ct')
            .style('b')
            .size(1, 1)
            .text('=== 销售小票 ===')
            .text(`单号: ${data.orderNo}`)
            .text(`时间: ${new Date().toLocaleString()}`)
            .text('----------------');
          
          data.items.forEach(item => {
            printer.text(`${item.name} x${item.quantity} ￥${item.price}`);
          });
          
          printer
            .text('----------------')
            .text(`小计: ￥${data.subtotal}`)
            .text(`折扣: -￥${data.discount || 0}`)
            .text(`合计: ￥${data.total}`)
            .text(`实收: ￥${data.paid}`)
            .text(`找零: ￥${data.change}`)
            .text(' ')
            .text('谢谢惠顾！')
            .text(' ')
            .text(data.footer || '')
            .cut()
            .close((err) => {
              if (err) {
                reject(err);
              } else {
                resolve({ success: true, message: 'ESC/POS打印完成' });
              }
            });
        });
      });
    } catch (error) {
      throw error;
    }
  }

  // 生成收据HTML
  generateReceiptHtml(data) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>销售小票</title>
        <style>
          body { font-family: 'Microsoft YaHei', sans-serif; width: 80mm; margin: 0; padding: 10px; }
          .receipt { line-height: 1.4; }
          .header { text-align: center; font-weight: bold; font-size: 16px; margin-bottom: 10px; }
          .item { display: flex; justify-content: space-between; margin: 5px 0; }
          .divider { border-top: 1px dashed #000; margin: 10px 0; }
          .total { font-weight: bold; font-size: 14px; }
          .footer { text-align: center; margin-top: 15px; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="receipt">
          <div class="header">=== 销售小票 ===</div>
          <div>单号: ${data.orderNo}</div>
          <div>时间: ${new Date().toLocaleString()}</div>
          <div>收银员: ${data.cashier || '系统'}</div>
          <div class="divider"></div>
          
          ${data.items.map(item => `
            <div class="item">
              <span>${item.name} x${item.quantity}</span>
              <span>￥${item.price}</span>
            </div>
          `).join('')}
          
          <div class="divider"></div>
          <div class="item">小计: <span>￥${data.subtotal}</span></div>
          <div class="item">折扣: <span>-￥${data.discount || 0}</span></div>
          <div class="item total">合计: <span>￥${data.total}</span></div>
          <div class="divider"></div>
          <div class="item">实收: <span>￥${data.paid}</span></div>
          <div class="item">找零: <span>￥${data.change}</span></div>
          <div class="divider"></div>
          <div class="footer">谢谢惠顾！</div>
          <div class="footer">${data.footer || ''}</div>
        </div>
      </body>
      </html>
    `;
  }

  // 打印测试页
  async printTestPage(printerName) {
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
    
    return await this.printReceipt({
      printerName,
      data: testData
    });
  }

  // 安装打印机驱动
  async installDriver(driverPath) {
    try {
      if (!fs.existsSync(driverPath)) {
        throw new Error('驱动文件不存在');
      }
      
      // Windows 安装打印机驱动的命令
      const command = `rundll32 printui.dll,PrintUIEntry /ia /c . /m "${driverPath}"`;
      
      const { stdout, stderr } = await execAsync(command);
      
      if (stderr) {
        throw new Error(stderr);
      }
      
      return { success: true, message: '驱动安装成功' };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}

export default PrinterManager;