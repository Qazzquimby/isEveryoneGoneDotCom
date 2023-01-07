<script setup lang="ts">
defineOptions({
  name: 'IndexPage',
})
</script>

<template>
  <div>

    <world-status mode="yellow" text="loading..." />

    <div i-carbon-campsite text-4xl inline-block />
    <p>
      <a rel="noreferrer" href="https://github.com/antfu/vitesse-lite" target="_blank">
        Vitesse Lite
      </a>
    </p>
    <p>
      <em text-sm op75>Opinionated Vite Starter Template</em>
    </p>

  </div>
</template>
