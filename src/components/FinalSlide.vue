<template>
  <div class="final-slide">
    <h2>Vel gert</h2>
    <p>Skiptið um blað við næsta lið</p>
    <div class="final-actions">
      <button class="btn btn-secondary" @click="$emit('restart')">← Aftur í byrjun</button>
      <button class="btn btn-primary" @click="$emit('review')">Fara yfir →</button>
    </div>
  </div>
</template>

<script setup>
defineEmits(['restart', 'review'])
</script>

<style scoped>
.final-slide {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

h2 {
  margin: 0;
  font-size: clamp(1.8rem, 4vw, 2.8rem);
  font-weight: 700;
  line-height: 1.25;
}

p {
  margin: 0;
  color: rgba(0,0,0,0.35);
  font-size: 1rem;
}

.final-actions {
  display: flex;
  gap: 0.75rem;
  padding-top: 0.5rem;
  flex-wrap: wrap;
}
</style>
