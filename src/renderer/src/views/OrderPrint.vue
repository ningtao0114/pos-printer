<template>
  <div class="order-print">
    <a-card title="订单打印">
      <order-form />
    </a-card>
  </div>
</template>

<script setup>
import OrderForm from '../components/OrderForm.vue';
</script>

<style scoped>
.order-print {
  width: 100%;
}
</style>
