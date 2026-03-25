<template>
  <div class="app">
    <header class="app-header">
      <h1>{{ mode === "review" ? "Svör" : "STIGULL POB QUIZS" }}</h1>
      <div class="progress" v-if="!isFinal">
        {{ currentIndex + 1 }}&thinsp;/&thinsp;{{ questions.length }}
      </div>
    </header>

    <main v-if="questions.length" class="stage">
      <FinalSlide v-if="isFinal" @restart="restart" @review="startReview" />

      <template v-else>
        <QuestionPage
          :page="questions[currentIndex]"
          :reviewMode="mode === 'review'"
          :key="`${mode}-${currentIndex}`"
        />
        <div class="dots">
          <span
            v-for="(_, i) in questions"
            :key="i"
            class="dot"
            :class="{ active: i === currentIndex }"
            @click="currentIndex = i"
          />
        </div>
      </template>
    </main>

    <div v-else class="loading">Loading…</div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from "vue";
import QuestionPage from "./components/QuestionPage.vue";
import FinalSlide from "./components/FinalSlide.vue";

const questions = ref([]);
const currentIndex = ref(0);
const mode = ref("quiz");

const isFinal = computed(() => currentIndex.value >= questions.value.length);

onMounted(async () => {
  const res = await fetch("/questions.json");
  questions.value = await res.json();
});

function prev() {
  if (currentIndex.value > 0) currentIndex.value--;
}
function next() {
  if (currentIndex.value <= questions.value.length - 1) currentIndex.value++;
}
function restart() {
  mode.value = "quiz";
  currentIndex.value = 0;
}
function startReview() {
  mode.value = "review";
  currentIndex.value = 0;
}

function onKey(e) {
  if (e.key === "ArrowRight" || e.key === "ArrowDown") next();
  if (e.key === "ArrowLeft" || e.key === "ArrowUp") prev();
}

onMounted(() => window.addEventListener("keydown", onKey));
onUnmounted(() => window.removeEventListener("keydown", onKey));
</script>

<style>
*,
*::before,
*::after {
  box-sizing: border-box;
}

body {
  margin: 0;
  font-family: "Segoe UI", system-ui, sans-serif;
  background: linear-gradient(
      138.66deg,
      #6eabc0 5.5%,
      rgba(255, 241, 215, 0.2) 46.5%,
      #f1511e 94.66%
    )
    fixed;
  background-color: #6eabc0;
  color: #1a1a1a;
  min-height: 100vh;
}

.app {
  display: flex;
  flex-direction: column;
  justify-content: center;
  min-height: 100vh;
}

.app-header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  padding: 0.75rem 2rem;
  border-bottom: 1px solid rgba(0, 0, 0, 0.12);
  flex-shrink: 0;
}

.app-header h1 {
  margin: 0;
  font-size: 0.8rem;
  font-weight: 700;
  color: black;
  letter-spacing: 0.15em;
  text-transform: uppercase;
}

.progress {
  font-size: 0.8rem;
  color: black;
  font-variant-numeric: tabular-nums;
}

.stage {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem 2rem 2rem;
  gap: 2.5rem;
  max-width: 1200px;
  width: 100%;
  margin: 0 auto;
}

.dots {
  display: flex;
  gap: 5px;
  margin-top: auto;
  padding-top: 1rem;
}

.dot {
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.2);
  cursor: pointer;
  transition: background 0.2s;
}

.dot.active {
  background: #f1511e;
}

.loading {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(0, 0, 0, 0.35);
}

.btn {
  padding: 0.55rem 1.4rem;
  border: 1px solid transparent;
  border-radius: 4px;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.15s;
  letter-spacing: 0.03em;
}

.btn-primary {
  background: #f1511e;
  color: #fff;
}

.btn-primary:hover {
  opacity: 0.85;
}

.btn-secondary {
  background: transparent;
  color: #1a1a1a;
  border-color: rgba(0, 0, 0, 0.2);
}

.btn-secondary:hover {
  border-color: rgba(0, 0, 0, 0.5);
}
</style>
