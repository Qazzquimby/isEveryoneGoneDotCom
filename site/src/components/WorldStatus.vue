<script setup lang="ts">

const props = defineProps<{
  mode: 'green' | 'yellow' | 'red' | 'gray'
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

const grayMode = {
  bgColor: 'bg-gray-100',
  borderColor: 'b-gray-800',
  textColor: 'c-gray-800',
}

const display = computed(() => {
  switch (props.mode) {
    case 'green':
      return greenMode
    case 'yellow':
      return yellowMode
    case 'red':
      return redMode
    case 'gray':
      return grayMode
  }
})

const displayClasses = computed(() => {
  return Object.values(display.value)
})

</script>

<template>
  <div>

    <div p-3rem my-1rem
      b="4px rd-5"
      :class="displayClasses"
      >
      <slot />
    </div>

  </div>
</template>
