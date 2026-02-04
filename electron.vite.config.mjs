import { defineConfig, externalizeDepsPlugin } from 'electron-vite';
import { resolve } from 'path';
import vue from '@vitejs/plugin-vue';
import AutoImport from 'unplugin-auto-import/vite';
import Components from 'unplugin-vue-components/vite';
import { AntDesignVueResolver } from 'unplugin-vue-components/resolvers';

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    build: {
      rollupOptions: {
        external: ['usb', 'escpos', 'escpos-usb']
      }
    }
  },
  preload: {
    plugins: [externalizeDepsPlugin()]
  },
  renderer: {
    plugins: [
      vue(),
      AutoImport({
        imports: [
          'vue',
          'vue-router',
          {
            'ant-design-vue': [
              'message',
              'notification',
              'Modal'
            ]
          }
        ],
        dts: true,
        vueTemplate: true
      }),
      Components({
        resolvers: [
          AntDesignVueResolver({
            importStyle: false
          })
        ]
      })
    ],
    resolve: {
      alias: {
        '@': resolve('src/renderer')
      }
    },
    css: {
      preprocessorOptions: {
        less: {
          javascriptEnabled: true,
          modifyVars: {
            'primary-color': '#1890ff',
            'border-radius-base': '4px'
          }
        }
      }
    },
    server: {
      port: 3000
    }
  }
});