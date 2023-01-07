<script setup lang="ts">
defineOptions({
  name: 'IndexPage',
})

const data = ref<object>({})

const worldText = computed(() => {
  if (data.value === {}) {
    return 'loading...'
  } else {
    return JSON.stringify(data.value)
  }
})

async function readFirebase() {
  const response = await fetch('https://is-everyone-gone-default-rtdb.firebaseio.com/.json')
  return response.json()
}

onMounted(async () => {
  const response = await readFirebase()
  data.value = response
})

</script>

<template>
  <div>

    <!-- Try a big block letters ISEVERYONEGONE textfit to be one line -->

    <world-status mode="yellow" :text="worldText" />

    {{ data }}

  </div>
</template>
