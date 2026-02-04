/**
 * ESC/POS 编码器 - 完全自主实现
 * 支持热敏打印机指令
 */

class EscPosEncoder {
    constructor() {
      this.buffer = [];
    }
  
    // ========== 基础指令 ==========
    
    /**
     * 初始化打印机
     */
    initialize() {
      this.write([0x1b, 0x40]); // ESC @
      return this;
    }
  
    /**
     * 换行
     * @param {number} lines - 行数
     */
    newline(lines = 1) {
      for (let i = 0; i < lines; i++) {
        this.write([0x0a]); // LF
      }
      return this;
    }
  
    /**
     * 走纸 n 行
     * @param {number} n - 行数
     */
    feed(n = 1) {
      this.write([0x1b, 0x64, n]); // ESC d n
      return this;
    }
  
    // ========== 对齐指令 ==========
    
    /**
     * 左对齐
     */
    alignLeft() {
      this.write([0x1b, 0x61, 0x00]); // ESC a 0
      return this;
    }
  
    /**
     * 居中对齐
     */
    alignCenter() {
      this.write([0x1b, 0x61, 0x01]); // ESC a 1
      return this;
    }
  
    /**
     * 右对齐
     */
    alignRight() {
      this.write([0x1b, 0x61, 0x02]); // ESC a 2
      return this;
    }
  
    // ========== 字体样式指令 ==========
    
    /**
     * 设置字体大小
     * @param {number} width - 宽度倍数 (1-8)
     * @param {number} height - 高度倍数 (1-8)
     */
    size(width = 1, height = 1) {
      if (width < 1) width = 1;
      if (width > 8) width = 8;
      if (height < 1) height = 1;
      if (height > 8) height = 8;
      
      const size = ((width - 1) << 4) | (height - 1);
      this.write([0x1d, 0x21, size]); // GS !
      return this;
    }
  
    /**
     * 粗体开/关
     * @param {boolean} enable - 是否启用
     */
    bold(enable = true) {
      this.write([0x1b, 0x45, enable ? 0x01 : 0x00]); // ESC E
      return this;
    }
  
    /**
     * 下划线
     * @param {number} type - 0=关闭, 1=单线, 2=双线
     */
    underline(type = 0) {
      if (type < 0 || type > 2) type = 0;
      this.write([0x1b, 0x2d, type]); // ESC -
      return this;
    }
  
    /**
     * 黑白反显
     * @param {boolean} enable - 是否启用
     */
    invert(enable = true) {
      this.write([0x1d, 0x42, enable ? 0x01 : 0x00]); // GS B
      return this;
    }
  
    // ========== 字符设置 ==========
    
    /**
     * 设置字符集
     * @param {string} charset - 字符集编码
     */
    charset(charset = 'GBK') {
      switch (charset.toUpperCase()) {
        case 'GBK':
          this.write([0x1c, 0x21]); // FS !
          break;
        case 'UTF8':
          this.write([0x1b, 0x74, 0x10]); // ESC t 16
          break;
        default:
          this.write([0x1b, 0x74, 0x00]); // ESC t 0 (PC437)
      }
      return this;
    }
  
    // ========== 打印控制 ==========
    
    /**
     * 切纸
     * @param {number} mode - 切纸模式 (0=全切, 1=半切)
     */
    cut(mode = 0) {
      if (mode === 0) {
        this.write([0x1d, 0x56, 0x00]); // GS V 0 (全切)
      } else {
        this.write([0x1d, 0x56, 0x01]); // GS V 1 (半切)
      }
      return this;
    }
  
    /**
     * 开钱箱
     */
    cashdraw(pin = 2) {
      if (pin === 2) {
        this.write([0x1b, 0x70, 0x00, 0x40, 0x40]); // ESC p 0 64 64
      } else {
        this.write([0x1b, 0x70, 0x01, 0x40, 0x40]); // ESC p 1 64 64
      }
      return this;
    }
  
    /**
     * 蜂鸣器
     * @param {number} n - 次数
     * @param {number} t - 时长 (1-9)
     */
    beep(n = 1, t = 1) {
      if (n < 1) n = 1;
      if (t < 1) t = 1;
      if (t > 9) t = 9;
      
      this.write([0x1b, 0x42, n, t]); // ESC B n t
      return this;
    }
  
    // ========== 文本打印 ==========
    
    /**
     * 打印文本
     * @param {string} text - 文本内容
     */
    text(text) {
      if (!text) return this;
      
      // 转换文本为Buffer
      const buffer = this.encodeText(text);
      this.write(buffer);
      return this;
    }
  
    /**
     * 打印一行文本
     * @param {string} text - 文本内容
     */
    line(text) {
      return this.text(text).newline();
    }
  
    /**
     * 打印分隔线
     * @param {string} char - 分隔字符
     * @param {number} length - 长度
     */
    divider(char = '-', length = 32) {
      const line = char.repeat(length);
      return this.line(line);
    }
  
    // ========== 表格打印 ==========
    
    /**
     * 打印表格行
     * @param {Array} columns - 列数据 [{text, width, align}]
     */
    table(columns, totalWidth = 32) {
      let line = '';
      let usedWidth = 0;
      
      // 处理每一列
      for (let i = 0; i < columns.length; i++) {
        const col = columns[i];
        const width = col.width || Math.floor((totalWidth - usedWidth) / (columns.length - i));
        
        let text = col.text || '';
        if (text.length > width) {
          text = text.substring(0, width);
        }
        
        switch (col.align) {
          case 'right':
            line += text.padStart(width, ' ');
            break;
          case 'center':
            const padding = Math.floor((width - text.length) / 2);
            line += ' '.repeat(padding) + text + ' '.repeat(width - text.length - padding);
            break;
          default: // left
            line += text.padEnd(width, ' ');
        }
        
        usedWidth += width;
      }
      
      // 补全剩余宽度
      if (usedWidth < totalWidth) {
        line += ' '.repeat(totalWidth - usedWidth);
      }
      
      return this.line(line);
    }
  
    // ========== 二维码和条码 ==========
    
    /**
     * 打印二维码
     * @param {string} data - 二维码数据
     * @param {number} size - 大小 (1-16)
     */
    qrcode(data, size = 6) {
      if (!data) return this;
      
      // 选择二维码模型
      this.write([0x1d, 0x28, 0x6b, 0x04, 0x00, 0x31, 0x41, 0x32, 0x00]); // GS ( k
      
      // 设置大小
      if (size < 1) size = 1;
      if (size > 16) size = 16;
      this.write([0x1d, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x43, size]); // GS ( k
      
      // 设置纠错等级
      this.write([0x1d, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x45, 0x31]); // GS ( k
      
      // 存储数据
      const len = data.length + 3;
      this.write([0x1d, 0x28, 0x6b, len % 256, len >> 8, 0x31, 0x50, 0x30]); // GS ( k
      this.text(data);
      
      // 打印二维码
      this.write([0x1d, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x51, 0x30]); // GS ( k
      
      return this;
    }
  
    /**
     * 打印条码
     * @param {string} data - 条码数据
     * @param {string} type - 条码类型
     */
    barcode(data, type = 'CODE39') {
      if (!data) return this;
      
      // 选择条码类型
      let typeCode;
      switch (type.toUpperCase()) {
        case 'UPC-A':
          typeCode = 0x41;
          break;
        case 'UPC-E':
          typeCode = 0x42;
          break;
        case 'EAN13':
          typeCode = 0x43;
          break;
        case 'EAN8':
          typeCode = 0x44;
          break;
        case 'CODE39':
          typeCode = 0x45;
          break;
        case 'ITF':
          typeCode = 0x46;
          break;
        case 'CODABAR':
          typeCode = 0x47;
          break;
        case 'CODE93':
          typeCode = 0x48;
          break;
        case 'CODE128':
          typeCode = 0x49;
          break;
        default:
          typeCode = 0x45; // CODE39
      }
      
      // 设置条码
      this.write([0x1d, 0x6b, typeCode, data.length]); // GS k
      this.text(data);
      
      // 打印条码
      this.write([0x0a]); // LF
      
      return this;
    }
  
    // ========== 工具方法 ==========
    
    /**
     * 写入数据到缓冲区
     * @param {Array|Buffer|string} data - 数据
     */
    write(data) {
      if (Array.isArray(data)) {
        this.buffer.push(...data);
      } else if (Buffer.isBuffer(data)) {
        this.buffer.push(...data);
      } else if (typeof data === 'string') {
        const buffer = this.encodeText(data);
        this.buffer.push(...buffer);
      }
      return this;
    }
  
    /**
     * 编码文本为GBK
     * @param {string} text - 文本
     */
    encodeText(text) {
      // 简单的GBK编码（实际项目应使用iconv-lite等库）
      const buffer = [];
      for (let i = 0; i < text.length; i++) {
        const charCode = text.charCodeAt(i);
        if (charCode <= 0x7f) {
          buffer.push(charCode);
        } else {
          // 中文字符，使用简单映射（实际应使用完整GBK编码表）
          buffer.push(0xa1, 0xa1); // 占位符
        }
      }
      return buffer;
    }
  
    /**
     * 获取编码后的Buffer
     */
    encode() {
      return Buffer.from(this.buffer);
    }
  
    /**
     * 重置缓冲区
     */
    reset() {
      this.buffer = [];
      return this;
    }
  
    /**
     * 生成收据的ESC/POS指令
     * @param {Object} data - 收据数据
     */
    generateReceipt(data) {
      this.reset();
      
      // 初始化
      this.initialize();
      
      // 设置GBK字符集
      this.charset('GBK');
      
      // 标题
      this.alignCenter()
          .bold(true)
          .size(2, 2)
          .text('=== 销售小票 ===')
          .newline()
          .resetFormat();
      
      // 订单信息
      this.alignLeft()
          .text(`单号: ${data.orderNo}`)
          .newline()
          .text(`时间: ${new Date().toLocaleString()}`)
          .newline()
          .text(`收银员: ${data.cashier || '系统'}`)
          .newline()
          .divider('-', 32);
      
      // 商品列表
      data.items.forEach(item => {
        const name = this.truncateText(item.name, 16);
        const qty = `x${item.quantity}`.padStart(6, ' ');
        const price = `￥${item.price}`.padStart(8, ' ');
        const total = `￥${(item.price * item.quantity).toFixed(2)}`.padStart(10, ' ');
        
        this.text(`${name}${qty}${price}${total}`).newline();
      });
      
      // 金额信息
      this.divider('-', 32)
          .text(`小计: ￥${data.subtotal}`)
          .newline();
      
      if (data.discount > 0) {
        this.text(`折扣: -￥${data.discount}`).newline();
      }
      
      this.bold(true)
          .text(`合计: ￥${data.total}`)
          .newline()
          .bold(false);
      
      this.text(`实收: ￥${data.paid}`)
          .newline()
          .text(`找零: ￥${data.change}`)
          .newline(2);
      
      // 底部信息
      this.alignCenter()
          .text('谢谢惠顾！')
          .newline()
          .text(data.footer || '')
          .newline(3);
      
      // 切纸
      this.cut();
      
      return this.encode();
    }
  
    /**
     * 截断文本
     * @param {string} text - 文本
     * @param {number} maxLength - 最大长度
     */
    truncateText(text, maxLength) {
      if (text.length <= maxLength) {
        return text;
      }
      
      // 计算中文字符（占2个位置）
      let length = 0;
      let result = '';
      
      for (let i = 0; i < text.length; i++) {
        const char = text[i];
        const charCode = text.charCodeAt(i);
        
        if (charCode > 0x7f) {
          // 中文字符
          if (length + 2 > maxLength) {
            break;
          }
          length += 2;
        } else {
          // 英文字符
          if (length + 1 > maxLength) {
            break;
          }
          length += 1;
        }
        
        result += char;
      }
      
      return result;
    }
  
    /**
     * 重置所有格式
     */
    resetFormat() {
      this.initialize(); // ESC @ 会重置大多数格式
      this.alignLeft()
          .bold(false)
          .underline(0)
          .size(1, 1);
      return this;
    }
  }
  
  export default EscPosEncoder;