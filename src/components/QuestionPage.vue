<template>
  <div class="question-page">
    <!-- Single question -->
    <template v-if="page.type === 'single'">
      <p class="question-text">{{ page.title || page.question }}</p>
      <ol v-if="page.title" class="question-list">
        <li>
          <span class="q-text" :class="{ 'q-text-large': !page.image }">{{
            page.question
          }}</span>
          <span v-if="reviewMode && page.answer" class="answer-inline">{{
            page.answer
          }}</span>
        </li>
      </ol>
      <div v-if="!page.title && reviewMode && page.answer" class="answer-block">
        {{ page.answer }}
      </div>
      <div v-if="page.image" class="image-wrap">
        <img :src="page.image" :alt="page.title || page.question" />
      </div>
    </template>

    <!-- Multi question -->
    <template v-else-if="page.type === 'multi'">
      <h2 v-if="page.title" class="page-title">{{ page.title }}</h2>
      <ol class="question-list">
        <li v-for="(q, i) in page.questions" :key="i">
          <span class="q-text" :class="{ 'q-text-large': !page.image }">{{
            typeof q === "string" ? q : q.text
          }}</span>
          <span v-if="reviewMode && page.answers?.[i]" class="answer-inline">
            {{ page.answers[i] }}
          </span>
        </li>
      </ol>
      <div v-if="page.image" class="image-wrap">
        <img :src="page.image" :alt="page.title" />
      </div>
    </template>
  </div>
</template>

<script setup>
defineProps({
  page: { type: Object, required: true },
  reviewMode: { type: Boolean, default: false },
});
</script>

<style scoped>
.question-page {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.question-text {
  margin: 0;
  font-size: clamp(2.2rem, 5vw, 3.5rem);
  font-weight: 700;
  line-height: 1.2;
}

.page-title {
  margin: 0;
  font-size: clamp(2.2rem, 5vw, 3.5rem);
  font-weight: 700;
  line-height: 1.2;
}

.image-wrap {
  aspect-ratio: 1;
  width: 90%;
  overflow: hidden;
  border-radius: 4px;
  object-fit: cover;
}

.image-wrap img {
  width: 100%;
  display: block;
}

.question-list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  counter-reset: q-counter;
}

.question-list li {
  counter-increment: q-counter;
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  padding: 1rem 0;
  border-bottom: 1px solid rgba(0, 0, 0, 0.12);
  font-size: clamp(1.2rem, 2.5vw, 1.6rem);
  line-height: 1.4;
  position: relative;
  padding-left: 2.5rem;
}

.question-list li:first-child {
  border-top: 1px solid rgba(0, 0, 0, 0.12);
}

.question-list li::before {
  content: counter(q-counter);
  position: absolute;
  left: 0;
  top: 1rem;
  color: #f1511e;
  font-weight: 700;
  font-size: 0.85em;
}

.q-text {
  display: block;
}

.q-text-large {
  font-size: 7rem;
}

.answer-inline {
  color: #f1511e;
  font-weight: 600;
  font-size: 1.5em;
}

.answer-block {
  font-size: clamp(1.8rem, 4vw, 2.8rem);
  font-weight: 700;
  color: #f1511e;
}
</style>
