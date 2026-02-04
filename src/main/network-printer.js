/**
 * 网络打印机管理器 - 简化版
 */

import net from 'net';

class NetworkPrinter {
  constructor(host, port = 9100) {
    this.host = host;
    this.port = port;
    this.socket = null;
  }

  /**
   * 连接到打印机
   */
  connect() {
    return new Promise((resolve, reject) => {
      this.socket = new net.Socket();
      
      this.socket.on('connect', () => {
        resolve(true);
      });
      
      this.socket.on('error', (error) => {
        reject(error);
      });
      
      this.socket.on('timeout', () => {
        this.socket.destroy();
        reject(new Error('连接超时'));
      });
      
      this.socket.setTimeout(3000);
      this.socket.connect(this.port, this.host);
    });
  }

  /**
   * 发送数据
   */
  send(data) {
    return new Promise((resolve, reject) => {
      if (!this.socket || this.socket.destroyed) {
        reject(new Error('打印机未连接'));
        return;
      }
      
      this.socket.write(data, (error) => {
        if (error) {
          reject(error);
        } else {
          resolve(true);
        }
      });
    });
  }

  /**
   * 断开连接
   */
  disconnect() {
    if (this.socket) {
      this.socket.destroy();
      this.socket = null;
    }
  }

  /**
   * 打印收据
   */
  async printReceipt(data) {
    try {
      await this.connect();
      
      // 生成简单的收据数据
      const receiptText = this.generateReceiptText(data);
      
      // 发送到打印机
      await this.send(receiptText);
      
      this.disconnect();
      
      return { success: true, message: '网络打印完成' };
    } catch (error) {
      this.disconnect();
      throw error;
    }
  }

  /**
   * 生成收据文本
   */
  generateReceiptText(data) {
    let text = '\x1b@'; // 初始化打印机
    
    // 标题
    text += '\x1ba\x01'; // 居中对齐
    text += '\x1b!\x30'; // 字体大小
    text += '=== 销售小票 ===\n';
    text += '\x1b!\x00'; // 恢复字体
    text += '\x1ba\x00'; // 左对齐
    
    // 订单信息
    text += `单号: ${data.orderNo}\n`;
    text += `时间: ${new Date().toLocaleString()}\n`;
    text += '----------------\n';
    
    // 商品列表
    data.items.forEach(item => {
      const name = item.name.length > 16 ? item.name.substring(0, 16) : item.name;
      text += `${name} x${item.quantity} ￥${item.price}\n`;
    });
    
    // 金额信息
    text += '----------------\n';
    text += `小计: ￥${data.subtotal}\n`;
    if (data.discount > 0) {
      text += `折扣: -￥${data.discount}\n`;
    }
    text += `合计: ￥${data.total}\n`;
    text += `实收: ￥${data.paid}\n`;
    text += `找零: ￥${data.change}\n\n`;
    
    // 底部信息
    text += '\x1ba\x01'; // 居中对齐
    text += '谢谢惠顾！\n';
    text += data.footer || '';
    text += '\n\n\n\n';
    
    // 切纸
    text += '\x1dV\x00';
    
    return text;
  }

  /**
   * 批量检测网络打印机
   */
  static async detectPrinters() {
    const printers = [];
    const subnet = '192.168.1';
    const port = 9100;
    
    // 检测常见IP段
    for (let i = 100; i <= 120; i++) {
      const ip = `${subnet}.${i}`;
      
      try {
        const isOnline = await this.testConnection(ip, port);
        if (isOnline) {
          printers.push({
            ip,
            port,
            type: 'network',
            status: 'online',
            name: `网络打印机 ${ip}:${port}`
          });
        }
      } catch (error) {
        // 忽略单个IP的检测错误
      }
    }
    
    return printers;
  }

  /**
   * 测试连接
   */
  static testConnection(ip, port) {
    return new Promise((resolve) => {
      const socket = new net.Socket();
      socket.setTimeout(1000);
      
      socket.on('connect', () => {
        socket.destroy();
        resolve(true);
      });
      
      socket.on('timeout', () => {
        socket.destroy();
        resolve(false);
      });
      
      socket.on('error', () => {
        socket.destroy();
        resolve(false);
      });
      
      socket.connect(port, ip);
    });
  }
}

export default NetworkPrinter;