<script setup lang="ts">

const props = defineProps<{
  mode: 'green' | 'yellow' | 'red'
  text: string
}>()

interface display {
  bgColor: string;
  borderColor: string;
  textColor: string
}

const greenMode = {
  bgColor: 'bg-green-100',
  borderColor: 'b-green-800',
  textColor: 'c-green-800',
}

const yellowMode = {
  bgColor: 'bg-yellow-100',
  borderColor: 'b-yellow-800',
  textColor: 'c-yellow-800',
}

const redMode = {
  bgColor: 'bg-red-100',
  borderColor: 'b-red-800',
  textColor: 'c-red-800',
}

const display = computed(() => {
  switch (props.mode) {
    case 'green':
      return greenMode
    case 'yellow':
      return yellowMode
    case 'red':
      return redMode
  }
})

const displayClasses = computed(() => {
  return Object.values(display.value)
})

</script>

<template>
  <div>

    <div w-70vw mx-auto p-3rem m-1rem
      b="4px rd-5"
      :class="displayClasses"
      >
      <h3 text-2xl>
        {{text}}
      </h3>

    </div>

  </div>
</template>
