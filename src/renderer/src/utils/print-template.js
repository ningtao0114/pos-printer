/**
 * 打印模板工具类
 * 提供多种小票模板和打印格式
 */

import dayjs from 'dayjs';
import 'dayjs/locale/zh-cn';

dayjs.locale('zh-cn');

class PrintTemplate {
  constructor() {
    this.templates = {
      'simple': this.simpleReceipt.bind(this),
      'detailed': this.detailedReceipt.bind(this),
      'restaurant': this.restaurantReceipt.bind(this),
      'retail': this.retailReceipt.bind(this),
      'custom': this.customReceipt.bind(this)
    };
  }

  /**
   * 生成简单小票模板
   * @param {Object} data - 打印数据
   * @returns {string} HTML内容
   */
  simpleReceipt(data) {
    const {
      orderNo,
      cashier = '系统',
      items = [],
      subtotal,
      discount = 0,
      total,
      paid,
      change,
      footer = '',
      storeInfo = {}
    } = data;

    const currentTime = dayjs().format('YYYY-MM-DD HH:mm:ss');
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>销售小票</title>
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          
          body {
            font-family: 'Microsoft YaHei', 'SimHei', sans-serif;
            width: 80mm;
            margin: 0 auto;
            padding: 5px;
            font-size: 12px;
            line-height: 1.4;
            color: #000;
          }
          
          .receipt {
            width: 100%;
          }
          
          .header {
            text-align: center;
            padding: 5px 0;
            border-bottom: 2px solid #000;
            margin-bottom: 10px;
          }
          
          .store-name {
            font-size: 16px;
            font-weight: bold;
            margin-bottom: 3px;
          }
          
          .store-info {
            font-size: 10px;
            color: #666;
            margin-bottom: 5px;
          }
          
          .order-info {
            margin: 10px 0;
            padding: 5px 0;
            border-bottom: 1px dashed #ccc;
          }
          
          .info-row {
            display: flex;
            justify-content: space-between;
            margin: 3px 0;
          }
          
          .items-table {
            width: 100%;
            margin: 10px 0;
            border-collapse: collapse;
          }
          
          .items-table th {
            text-align: left;
            padding: 5px 0;
            border-bottom: 1px solid #000;
            font-weight: bold;
          }
          
          .items-table td {
            padding: 4px 0;
            border-bottom: 1px dashed #eee;
          }
          
          .item-name {
            width: 50%;
          }
          
          .item-qty {
            width: 15%;
            text-align: center;
          }
          
          .item-price {
            width: 15%;
            text-align: right;
          }
          
          .item-total {
            width: 20%;
            text-align: right;
            font-weight: bold;
          }
          
          .amount-section {
            margin: 15px 0;
            padding: 10px 0;
            border-top: 2px solid #000;
            border-bottom: 2px solid #000;
          }
          
          .amount-row {
            display: flex;
            justify-content: space-between;
            margin: 5px 0;
            font-size: 13px;
          }
          
          .total-row {
            font-weight: bold;
            font-size: 14px;
          }
          
          .payment-row {
            background: #f5f5f5;
            padding: 8px 5px;
            margin: 8px 0;
            border-radius: 3px;
          }
          
          .footer {
            text-align: center;
            padding: 10px 0;
            margin-top: 15px;
            font-size: 11px;
            color: #666;
            border-top: 1px dashed #ccc;
          }
          
          .barcode {
            text-align: center;
            margin: 10px 0;
            font-family: 'Barcode', monospace;
            font-size: 24px;
            letter-spacing: 2px;
          }
          
          .cut-line {
            text-align: center;
            margin: 15px 0;
            color: #999;
            font-size: 10px;
          }
          
          @media print {
            body {
              width: 80mm !important;
            }
          }
        </style>
      </head>
      <body>
        <div class="receipt">
          <!-- 店铺信息 -->
          <div class="header">
            ${storeInfo.name ? `<div class="store-name">${storeInfo.name}</div>` : ''}
            ${storeInfo.address ? `<div class="store-info">${storeInfo.address}</div>` : ''}
            ${storeInfo.phone ? `<div class="store-info">电话: ${storeInfo.phone}</div>` : ''}
          </div>
          
          <!-- 订单信息 -->
          <div class="order-info">
            <div class="info-row">
              <span>单号:</span>
              <span>${orderNo}</span>
            </div>
            <div class="info-row">
              <span>时间:</span>
              <span>${currentTime}</span>
            </div>
            <div class="info-row">
              <span>收银员:</span>
              <span>${cashier}</span>
            </div>
          </div>
          
          <!-- 商品列表 -->
          <table class="items-table">
            <thead>
              <tr>
                <th class="item-name">商品名称</th>
                <th class="item-qty">数量</th>
                <th class="item-price">单价</th>
                <th class="item-total">小计</th>
              </tr>
            </thead>
            <tbody>
              ${items.map(item => `
                <tr>
                  <td class="item-name">${item.name}</td>
                  <td class="item-qty">${item.quantity}</td>
                  <td class="item-price">¥${parseFloat(item.price).toFixed(2)}</td>
                  <td class="item-total">¥${(item.price * item.quantity).toFixed(2)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          
          <!-- 金额统计 -->
          <div class="amount-section">
            <div class="amount-row">
              <span>小计:</span>
              <span>¥${parseFloat(subtotal).toFixed(2)}</span>
            </div>
            ${discount > 0 ? `
            <div class="amount-row">
              <span>折扣:</span>
              <span>-¥${parseFloat(discount).toFixed(2)}</span>
            </div>
            ` : ''}
            <div class="amount-row total-row">
              <span>合计:</span>
              <span>¥${parseFloat(total).toFixed(2)}</span>
            </div>
          </div>
          
          <!-- 支付信息 -->
          <div class="payment-row">
            <div class="info-row">
              <span>实收:</span>
              <span>¥${parseFloat(paid).toFixed(2)}</span>
            </div>
            <div class="info-row">
              <span>找零:</span>
              <span>¥${parseFloat(change).toFixed(2)}</span>
            </div>
          </div>
          
          <!-- 条码 -->
          <div class="barcode">
            *${orderNo}*
          </div>
          
          <!-- 底部信息 -->
          <div class="footer">
            ${footer || '谢谢惠顾，欢迎再次光临！'}
          </div>
          
          <!-- 切纸线 -->
          <div class="cut-line">
            ....................................................................
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * 生成详细小票模板
   * @param {Object} data - 打印数据
   * @returns {string} HTML内容
   */
  detailedReceipt(data) {
    const {
      orderNo,
      cashier = '系统',
      customerName = '',
      customerPhone = '',
      items = [],
      subtotal,
      discount = 0,
      tax = 0,
      serviceCharge = 0,
      total,
      paid,
      change,
      paymentMethod = '现金',
      footer = '',
      storeInfo = {},
      notes = ''
    } = data;

    const currentTime = dayjs().format('YYYY-MM-DD HH:mm:ss');
    const date = dayjs().format('YYYY年MM月DD日 dddd');
    
    // 计算各项明细
    const itemGroups = this.groupItemsByCategory(items);
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>销售明细单</title>
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          
          body {
            font-family: 'Microsoft YaHei', 'SimHei', sans-serif;
            width: 80mm;
            margin: 0 auto;
            padding: 5px;
            font-size: 11px;
            line-height: 1.4;
            color: #000;
          }
          
          .receipt {
            width: 100%;
          }
          
          .header {
            text-align: center;
            padding: 8px 0;
            border-bottom: 3px double #000;
            margin-bottom: 10px;
          }
          
          .store-name {
            font-size: 18px;
            font-weight: bold;
            margin-bottom: 3px;
            letter-spacing: 1px;
          }
          
          .store-slogan {
            font-size: 10px;
            color: #666;
            font-style: italic;
            margin-bottom: 5px;
          }
          
          .date-time {
            font-size: 10px;
            margin: 5px 0;
          }
          
          .customer-info {
            background: #f9f9f9;
            padding: 8px;
            margin: 10px 0;
            border-radius: 4px;
            border: 1px dashed #ccc;
          }
          
          .customer-row {
            display: flex;
            margin: 3px 0;
          }
          
          .section-title {
            font-weight: bold;
            padding: 5px 0;
            border-bottom: 1px solid #000;
            margin: 10px 0 5px 0;
          }
          
          .category-section {
            margin: 8px 0;
          }
          
          .category-title {
            font-weight: bold;
            background: #eee;
            padding: 3px 5px;
            margin: 5px 0;
          }
          
          .items-table {
            width: 100%;
            border-collapse: collapse;
            margin: 5px 0;
          }
          
          .items-table th {
            text-align: left;
            padding: 4px 2px;
            border-bottom: 1px solid #ddd;
            font-weight: bold;
            font-size: 10px;
          }
          
          .items-table td {
            padding: 3px 2px;
            border-bottom: 1px dotted #eee;
          }
          
          .item-code {
            width: 15%;
          }
          
          .item-name {
            width: 40%;
          }
          
          .item-qty {
            width: 10%;
            text-align: center;
          }
          
          .item-unit {
            width: 10%;
            text-align: center;
          }
          
          .item-price {
            width: 15%;
            text-align: right;
          }
          
          .item-amount {
            width: 20%;
            text-align: right;
            font-weight: bold;
          }
          
          .summary-section {
            margin: 15px 0;
            padding: 10px;
            border: 2px solid #000;
            border-radius: 5px;
            background: #fff;
          }
          
          .summary-row {
            display: flex;
            justify-content: space-between;
            margin: 4px 0;
          }
          
          .summary-label {
            font-weight: bold;
          }
          
          .summary-value {
            font-weight: bold;
          }
          
          .total-row {
            font-size: 13px;
            color: #d00;
            margin: 8px 0;
            padding-top: 8px;
            border-top: 2px solid #000;
          }
          
          .payment-info {
            background: #e8f4ff;
            padding: 10px;
            margin: 10px 0;
            border-radius: 4px;
            border: 1px solid #b3d7ff;
          }
          
          .payment-row {
            display: flex;
            justify-content: space-between;
            margin: 5px 0;
            font-weight: bold;
          }
          
          .notes {
            margin: 10px 0;
            padding: 8px;
            background: #fff8e1;
            border: 1px dashed #ffd54f;
            border-radius: 3px;
            font-size: 10px;
          }
          
          .footer {
            text-align: center;
            padding: 12px 0;
            margin-top: 15px;
            font-size: 10px;
            color: #666;
            border-top: 2px dashed #ccc;
          }
          
          .footer-line {
            margin: 3px 0;
          }
          
          .qrcode-area {
            text-align: center;
            margin: 10px 0;
            padding: 10px;
          }
          
          .qrcode-text {
            font-size: 9px;
            margin-top: 5px;
          }
          
          .cut-line {
            text-align: center;
            margin: 20px 0 10px 0;
            color: #999;
            font-size: 10px;
            letter-spacing: 2px;
          }
          
          .thank-you {
            text-align: center;
            font-size: 12px;
            font-weight: bold;
            margin: 10px 0;
            color: #333;
          }
          
          @media print {
            body {
              width: 80mm !important;
            }
            .no-print {
              display: none !important;
            }
          }
        </style>
      </head>
      <body>
        <div class="receipt">
          <!-- 店铺信息 -->
          <div class="header">
            <div class="store-name">${storeInfo.name || '店铺名称'}</div>
            ${storeInfo.slogan ? `<div class="store-slogan">${storeInfo.slogan}</div>` : ''}
            <div class="date-time">${date} ${currentTime}</div>
          </div>
          
          <!-- 订单信息 -->
          <div class="customer-info">
            <div class="customer-row">
              <span style="width: 60px;">订单号:</span>
              <span style="font-weight: bold;">${orderNo}</span>
            </div>
            ${customerName ? `
            <div class="customer-row">
              <span style="width: 60px;">客户:</span>
              <span>${customerName}</span>
            </div>
            ` : ''}
            ${customerPhone ? `
            <div class="customer-row">
              <span style="width: 60px;">电话:</span>
              <span>${customerPhone}</span>
            </div>
            ` : ''}
            <div class="customer-row">
              <span style="width: 60px;">收银员:</span>
              <span>${cashier}</span>
            </div>
          </div>
          
          <!-- 商品明细 -->
          <div class="section-title">商品明细</div>
          
          ${Object.entries(itemGroups).map(([category, items]) => `
            ${category !== 'default' ? `
            <div class="category-section">
              <div class="category-title">${category}</div>
            ` : ''}
            
            <table class="items-table">
              <thead>
                <tr>
                  <th class="item-code">编码</th>
                  <th class="item-name">商品名称</th>
                  <th class="item-qty">数量</th>
                  <th class="item-unit">单位</th>
                  <th class="item-price">单价</th>
                  <th class="item-amount">金额</th>
                </tr>
              </thead>
              <tbody>
                ${items.map(item => `
                  <tr>
                    <td class="item-code">${item.code || ''}</td>
                    <td class="item-name">${item.name}</td>
                    <td class="item-qty">${item.quantity}</td>
                    <td class="item-unit">${item.unit || '件'}</td>
                    <td class="item-price">¥${parseFloat(item.price).toFixed(2)}</td>
                    <td class="item-amount">¥${(item.price * item.quantity).toFixed(2)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
            
            ${category !== 'default' ? `</div>` : ''}
          `).join('')}
          
          <!-- 金额汇总 -->
          <div class="summary-section">
            <div class="section-title">金额汇总</div>
            
            <div class="summary-row">
              <span class="summary-label">商品金额:</span>
              <span class="summary-value">¥${parseFloat(subtotal).toFixed(2)}</span>
            </div>
            
            ${discount > 0 ? `
            <div class="summary-row">
              <span class="summary-label">折扣优惠:</span>
              <span class="summary-value">-¥${parseFloat(discount).toFixed(2)}</span>
            </div>
            ` : ''}
            
            ${tax > 0 ? `
            <div class="summary-row">
              <span class="summary-label">税费:</span>
              <span class="summary-value">¥${parseFloat(tax).toFixed(2)}</span>
            </div>
            ` : ''}
            
            ${serviceCharge > 0 ? `
            <div class="summary-row">
              <span class="summary-label">服务费:</span>
              <span class="summary-value">¥${parseFloat(serviceCharge).toFixed(2)}</span>
            </div>
            ` : ''}
            
            <div class="summary-row total-row">
              <span class="summary-label">应付金额:</span>
              <span class="summary-value">¥${parseFloat(total).toFixed(2)}</span>
            </div>
          </div>
          
          <!-- 支付信息 -->
          <div class="payment-info">
            <div class="section-title">支付信息</div>
            
            <div class="payment-row">
              <span>支付方式:</span>
              <span>${paymentMethod}</span>
            </div>
            
            <div class="payment-row">
              <span>实收金额:</span>
              <span>¥${parseFloat(paid).toFixed(2)}</span>
            </div>
            
            <div class="payment-row">
              <span>找零金额:</span>
              <span>¥${parseFloat(change).toFixed(2)}</span>
            </div>
            
            ${notes ? `
            <div class="payment-row">
              <span>备注:</span>
              <span>${notes}</span>
            </div>
            ` : ''}
          </div>
          
          <!-- 二维码区域 -->
          <div class="qrcode-area">
            <div style="
              width: 100px; 
              height: 100px; 
              margin: 0 auto; 
              background: #f0f0f0; 
              display: flex; 
              align-items: center; 
              justify-content: center;
              border: 1px solid #ddd;
            ">
              <span style="color: #999; font-size: 10px;">[二维码]</span>
            </div>
            <div class="qrcode-text">扫码查看订单详情</div>
          </div>
          
          <!-- 备注 -->
          ${notes ? `
          <div class="notes">
            <strong>备注:</strong> ${notes}
          </div>
          ` : ''}
          
          <!-- 致谢 -->
          <div class="thank-you">
            感谢您的光临！
          </div>
          
          <!-- 底部信息 -->
          <div class="footer">
            ${storeInfo.address ? `<div class="footer-line">${storeInfo.address}</div>` : ''}
            ${storeInfo.phone ? `<div class="footer-line">电话: ${storeInfo.phone}</div>` : ''}
            ${storeInfo.businessHours ? `<div class="footer-line">营业时间: ${storeInfo.businessHours}</div>` : ''}
            <div class="footer-line">${footer || '欢迎再次光临！'}</div>
            <div class="footer-line">本小票作为购物凭证，请妥善保管</div>
          </div>
          
          <!-- 切纸线 -->
          <div class="cut-line">
            ................................................................................
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * 生成餐饮小票模板
   */
  restaurantReceipt(data) {
    const {
      tableNo = '',
      peopleCount = 1,
      waiter = '',
      orderTime = '',
      items = [],
      subtotal,
      serviceCharge = 0,
      discount = 0,
      total,
      paid,
      change,
      footer = ''
    } = data;

    const currentTime = dayjs().format('HH:mm:ss');
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>餐饮账单</title>
        <style>
          body {
            font-family: 'Microsoft YaHei', sans-serif;
            width: 80mm;
            margin: 0 auto;
            padding: 5px;
            font-size: 12px;
          }
          
          .restaurant-header {
            text-align: center;
            padding: 10px 0;
            border-bottom: 3px double #000;
          }
          
          .table-info {
            display: flex;
            justify-content: space-between;
            margin: 10px 0;
            padding: 8px;
            background: #f0f8ff;
            border-radius: 4px;
          }
          
          .order-time {
            text-align: center;
            margin: 10px 0;
            font-size: 11px;
            color: #666;
          }
          
          .restaurant-items {
            margin: 15px 0;
          }
          
          .restaurant-item {
            display: flex;
            margin: 5px 0;
            padding: 3px 0;
            border-bottom: 1px dashed #eee;
          }
          
          .item-name {
            flex: 3;
          }
          
          .item-qty {
            flex: 1;
            text-align: center;
          }
          
          .item-price {
            flex: 1;
            text-align: right;
          }
          
          .item-total {
            flex: 1;
            text-align: right;
            font-weight: bold;
          }
          
          .restaurant-total {
            margin: 20px 0;
            padding: 15px;
            background: #f9f9f9;
            border-radius: 5px;
          }
          
          .total-row {
            display: flex;
            justify-content: space-between;
            margin: 8px 0;
            font-size: 13px;
          }
          
          .grand-total {
            font-size: 16px;
            font-weight: bold;
            color: #d00;
            margin: 10px 0;
            padding-top: 10px;
            border-top: 2px solid #000;
          }
        </style>
      </head>
      <body>
        <div class="restaurant-header">
          <div style="font-size: 18px; font-weight: bold;">餐饮账单</div>
          <div style="font-size: 11px; margin-top: 5px;">${dayjs().format('YYYY年MM月DD日')}</div>
        </div>
        
        <div class="table-info">
          <div>
            <div>桌号: ${tableNo}</div>
            <div>人数: ${peopleCount}位</div>
          </div>
          <div>
            <div>服务员: ${waiter}</div>
            <div>下单: ${orderTime || currentTime}</div>
          </div>
        </div>
        
        <div class="order-time">
          结账时间: ${dayjs().format('YYYY-MM-DD HH:mm:ss')}
        </div>
        
        <div class="restaurant-items">
          ${items.map(item => `
            <div class="restaurant-item">
              <div class="item-name">${item.name}</div>
              <div class="item-qty">x${item.quantity}</div>
              <div class="item-price">¥${item.price}</div>
              <div class="item-total">¥${(item.price * item.quantity).toFixed(2)}</div>
            </div>
          `).join('')}
        </div>
        
        <div class="restaurant-total">
          <div class="total-row">
            <span>消费金额:</span>
            <span>¥${parseFloat(subtotal).toFixed(2)}</span>
          </div>
          
          ${serviceCharge > 0 ? `
          <div class="total-row">
            <span>服务费(10%):</span>
            <span>¥${parseFloat(serviceCharge).toFixed(2)}</span>
          </div>
          ` : ''}
          
          ${discount > 0 ? `
          <div class="total-row">
            <span>优惠折扣:</span>
            <span>-¥${parseFloat(discount).toFixed(2)}</span>
          </div>
          ` : ''}
          
          <div class="total-row grand-total">
            <span>应付金额:</span>
            <span>¥${parseFloat(total).toFixed(2)}</span>
          </div>
          
          <div class="total-row">
            <span>实收金额:</span>
            <span>¥${parseFloat(paid).toFixed(2)}</span>
          </div>
          
          <div class="total-row">
            <span>找零金额:</span>
            <span>¥${parseFloat(change).toFixed(2)}</span>
          </div>
        </div>
        
        <div style="text-align: center; margin: 20px 0; font-size: 11px; color: #666;">
          ${footer || '欢迎再次光临！'}
        </div>
        
        <div style="text-align: center; color: #999; font-size: 10px; margin: 10px 0;">
          ....................................................................
        </div>
      </body>
      </html>
    `;
  }

  /**
   * 生成零售小票模板
   */
  retailReceipt(data) {
    const {
      memberNo = '',
      memberName = '',
      points = 0,
      items = [],
      subtotal,
      discount = 0,
      memberDiscount = 0,
      total,
      paid,
      change,
      footer = '',
      storeInfo = {}
    } = data;

    const currentTime = dayjs().format('YYYY-MM-DD HH:mm:ss');
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>零售小票</title>
        <style>
          body {
            font-family: 'Microsoft YaHei', sans-serif;
            width: 80mm;
            margin: 0 auto;
            padding: 5px;
            font-size: 12px;
          }
          
          .retail-header {
            text-align: center;
            padding: 10px 0;
          }
          
          .member-info {
            background: #fff8e1;
            padding: 8px;
            margin: 10px 0;
            border-radius: 4px;
            font-size: 11px;
          }
          
          .retail-items {
            margin: 15px 0;
          }
          
          .retail-summary {
            background: #f5f5f5;
            padding: 15px;
            margin: 15px 0;
            border-radius: 5px;
          }
          
          .summary-row {
            display: flex;
            justify-content: space-between;
            margin: 5px 0;
          }
          
          .points-info {
            text-align: center;
            margin: 15px 0;
            padding: 10px;
            background: #e3f2fd;
            border-radius: 4px;
            font-size: 11px;
          }
        </style>
      </head>
      <body>
        <div class="retail-header">
          <div style="font-size: 16px; font-weight: bold;">${storeInfo.name || '零售商店'}</div>
          <div style="font-size: 10px; margin: 5px 0;">${currentTime}</div>
        </div>
        
        ${memberNo ? `
        <div class="member-info">
          <div>会员号: ${memberNo}</div>
          ${memberName ? `<div>会员姓名: ${memberName}</div>` : ''}
        </div>
        ` : ''}
        
        <div class="retail-items">
          ${items.map(item => `
            <div style="display: flex; margin: 8px 0; padding: 5px 0; border-bottom: 1px dotted #eee;">
              <div style="flex: 3">${item.name}</div>
              <div style="flex: 1; text-align: center;">x${item.quantity}</div>
              <div style="flex: 1; text-align: right;">¥${item.price}</div>
              <div style="flex: 1; text-align: right; font-weight: bold;">¥${(item.price * item.quantity).toFixed(2)}</div>
            </div>
          `).join('')}
        </div>
        
        <div class="retail-summary">
          <div class="summary-row">
            <span>商品金额:</span>
            <span>¥${parseFloat(subtotal).toFixed(2)}</span>
          </div>
          
          ${discount > 0 ? `
          <div class="summary-row">
            <span>促销折扣:</span>
            <span>-¥${parseFloat(discount).toFixed(2)}</span>
          </div>
          ` : ''}
          
          ${memberDiscount > 0 ? `
          <div class="summary-row">
            <span>会员折扣:</span>
            <span>-¥${parseFloat(memberDiscount).toFixed(2)}</span>
          </div>
          ` : ''}
          
          <div class="summary-row" style="font-weight: bold; font-size: 14px; margin-top: 10px;">
            <span>应付金额:</span>
            <span>¥${parseFloat(total).toFixed(2)}</span>
          </div>
          
          <div class="summary-row">
            <span>实收金额:</span>
            <span>¥${parseFloat(paid).toFixed(2)}</span>
          </div>
          
          <div class="summary-row">
            <span>找零金额:</span>
            <span>¥${parseFloat(change).toFixed(2)}</span>
          </div>
        </div>
        
        ${points > 0 ? `
        <div class="points-info">
          <div>本次消费获得积分: <strong>${points}</strong> 分</div>
          <div>累计积分: <strong>${points + 1000}</strong> 分</div>
        </div>
        ` : ''}
        
        <div style="text-align: center; margin: 20px 0; font-size: 11px; color: #666;">
          ${footer || '谢谢惠顾！'}
        </div>
        
        <div style="text-align: center; color: #999; font-size: 10px; margin: 15px 0;">
          ....................................................................
        </div>
      </body>
      </html>
    `;
  }

  /**
   * 自定义小票模板
   */
  customReceipt(data, templateConfig) {
    const {
      header = {},
      body = {},
      footer = {}
    } = templateConfig;
    
    const currentTime = dayjs().format('YYYY-MM-DD HH:mm:ss');
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>${header.title || '自定义小票'}</title>
        <style>
          body {
            font-family: 'Microsoft YaHei', sans-serif;
            width: ${body.width || '80mm'};
            margin: 0 auto;
            padding: ${body.padding || '5px'};
            font-size: ${body.fontSize || '12px'};
            ${body.customStyles || ''}
          }
          
          .custom-header {
            text-align: ${header.align || 'center'};
            padding: ${header.padding || '10px 0'};
            ${header.styles || ''}
          }
          
          .custom-body {
            margin: ${body.margin || '15px 0'};
            ${body.styles || ''}
          }
          
          .custom-footer {
            text-align: ${footer.align || 'center'};
            margin: ${footer.margin || '20px 0'};
            font-size: ${footer.fontSize || '11px'};
            color: ${footer.color || '#666'};
            ${footer.styles || ''}
          }
        </style>
      </head>
      <body>
        <div class="custom-header">
          ${header.content || `
            <div style="font-size: 16px; font-weight: bold;">自定义小票</div>
            <div style="font-size: 10px; margin: 5px 0;">${currentTime}</div>
          `}
        </div>
        
        <div class="custom-body">
          ${body.content || this.generateDefaultBody(data)}
        </div>
        
        <div class="custom-footer">
          ${footer.content || '谢谢惠顾！'}
        </div>
        
        <div style="text-align: center; color: #999; font-size: 10px; margin: 15px 0;">
          ....................................................................
        </div>
      </body>
      </html>
    `;
  }

  /**
   * 工具方法：按类别分组商品
   */
  groupItemsByCategory(items) {
    const groups = {};
    
    items.forEach(item => {
      const category = item.category || 'default';
      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push(item);
    });
    
    return groups;
  }

  /**
   * 生成默认主体内容
   */
  generateDefaultBody(data) {
    const { items = [], subtotal, total, paid, change } = data;
    
    return `
      <div style="margin: 10px 0;">
        ${items.map(item => `
          <div style="display: flex; justify-content: space-between; margin: 5px 0;">
            <span>${item.name} x${item.quantity}</span>
            <span>¥${(item.price * item.quantity).toFixed(2)}</span>
          </div>
        `).join('')}
      </div>
      
      <div style="margin: 15px 0; padding: 10px; background: #f5f5f5; border-radius: 3px;">
        <div style="display: flex; justify-content: space-between; margin: 5px 0;">
          <span>小计:</span>
          <span>¥${parseFloat(subtotal).toFixed(2)}</span>
        </div>
        <div style="display: flex; justify-content: space-between; margin: 5px 0; font-weight: bold;">
          <span>合计:</span>
          <span>¥${parseFloat(total).toFixed(2)}</span>
        </div>
        <div style="display: flex; justify-content: space-between; margin: 5px 0;">
          <span>实收:</span>
          <span>¥${parseFloat(paid).toFixed(2)}</span>
        </div>
        <div style="display: flex; justify-content: space-between; margin: 5px 0;">
          <span>找零:</span>
          <span>¥${parseFloat(change).toFixed(2)}</span>
        </div>
      </div>
    `;
  }

  /**
   * 生成ESC/POS指令
   */
  generateEscPosCommands(data, printerConfig = {}) {
    const {
      encoding = 'GBK',
      lineWidth = 32,
      cutPaper = true
    } = printerConfig;

    const commands = [];
    
    // 初始化打印机
    commands.push('\x1B\x40'); // 初始化
    
    // 设置字符编码
    if (encoding === 'GBK') {
      commands.push('\x1C\x21'); // 选择GBK字符集
    }
    
    // 标题
    commands.push('\x1B\x61\x01'); // 居中对齐
    commands.push('\x1B\x21\x30'); // 设置字体大小
    commands.push('=== 销售小票 ===\n');
    commands.push('\x1B\x21\x00'); // 恢复字体大小
    
    // 订单信息
    commands.push('\x1B\x61\x00'); // 左对齐
    commands.push(`单号: ${data.orderNo}\n`);
    commands.push(`时间: ${dayjs().format('YYYY-MM-DD HH:mm:ss')}\n`);
    commands.push('----------------\n');
    
    // 商品列表
    data.items.forEach(item => {
      const name = item.name.length > 16 ? item.name.substring(0, 16) : item.name;
      const price = `¥${item.price}`.padStart(8, ' ');
      const qty = `x${item.quantity}`.padStart(6, ' ');
      const total = `¥${(item.price * item.quantity).toFixed(2)}`.padStart(10, ' ');
      
      commands.push(`${name}${qty}${price}${total}\n`);
    });
    
    commands.push('----------------\n');
    
    // 金额信息
    commands.push(`小计: ¥${data.subtotal}\n`);
    if (data.discount > 0) {
      commands.push(`折扣: -¥${data.discount}\n`);
    }
    commands.push(`合计: ¥${data.total}\n`);
    commands.push(`实收: ¥${data.paid}\n`);
    commands.push(`找零: ¥${data.change}\n`);
    
    commands.push('\n');
    
    // 底部信息
    commands.push('\x1B\x61\x01'); // 居中对齐
    commands.push('谢谢惠顾！\n');
    commands.push(data.footer || '\n');
    
    // 切纸
    if (cutPaper) {
      commands.push('\x1D\x56\x00'); // 全切纸
    }
    
    // 走纸
    commands.push('\n\n\n\n');
    
    return commands.join('');
  }

  /**
   * 获取模板列表
   */
  getTemplateList() {
    return [
      { value: 'simple', label: '简洁模板', description: '基础小票模板' },
      { value: 'detailed', label: '详细模板', description: '包含详细信息的模板' },
      { value: 'restaurant', label: '餐饮模板', description: '适合餐饮行业' },
      { value: 'retail', label: '零售模板', description: '适合零售行业' },
      { value: 'custom', label: '自定义模板', description: '自定义模板配置' }
    ];
  }

  /**
   * 根据模板名称生成HTML
   */
  generateHtml(templateName, data, config = {}) {
    const template = this.templates[templateName];
    if (!template) {
      throw new Error(`模板 ${templateName} 不存在`);
    }
    
    return template(data, config);
  }
}

export default new PrintTemplate();