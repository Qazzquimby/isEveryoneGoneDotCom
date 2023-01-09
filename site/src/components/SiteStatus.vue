<script setup lang="ts">
import TimeAgo from 'javascript-time-ago'
import en from 'javascript-time-ago/locale/en'

TimeAgo.addDefaultLocale(en)
const timeAgo = new TimeAgo('en-US')


const props = defineProps<{
  site: SiteStatus
}>()

interface display {
  borderColor: string;
  textColor: string
}

const greenMode = {
  borderColor: 'b-green-800',
  textColor: 'c-green-800',
}

const yellowMode = {
  borderColor: 'b-yellow-800',
  textColor: 'c-yellow-800',
}

const redMode = {
  borderColor: 'b-red-800',
  textColor: 'c-red-800',
}

const grayMode = {
  borderColor: 'b-gray-800',
  textColor: 'c-gray-800',
}

const mode = computed(() => {
  if (props.site.lastChecked !== props.site.lastSuccessfulRead) {
    return "gray"
  }
  if (props.site.lastChecked === props.site.lastUpdated) {
    return "green"
  }
  if (props.site.lastSuccessfulRead > props.site.lastUpdated) {
    return "red"
  }
  console.log("not sure how to label site", props.site)
  return "yellow"
})

const display = computed(() => {
  if (mode.value === "gray") {
    return grayMode
  }
  if (mode.value === "green") {
    return greenMode
  }
  if (mode.value === "red") {
    return redMode
  }
  return yellowMode
})

const displayClasses = computed(() => {
  return Object.values(display.value)
})

const lastUpdatedString = computed(() => {
  const timestamp = parseInt(props.site.lastUpdated) // unix timestamp
  const time = new Date(timestamp * 1000)
  console.log(props.site.lastUpdated, time)
  return timeAgo.format(time)
})

</script>

<template>
  <div>

    <div p-1rem my-1rem bg-hex-f0f0f0 b="4px rd-5" flex :class="displayClasses">
      <span w-5rem>{{ site.name.toUpperCase() }}</span>

      <p v-if="mode === 'green'" i-carbon-checkmark-outline />
      <p v-else-if="mode === 'yellow'" i-carbon-unknown />
      <p v-else-if="mode === 'red'" i-carbon-close-outline />

      <p mx-2rem>
        Last update seen {{ lastUpdatedString }}
        <span class="popover__wrapper">
          <p i-carbon-information />
          <div class="popover__content">
            <p>Previous value: {{ site.value }}</p>
          </div>
        </span>
      </p>


    </div>

  </div>
</template>

<style local>
.popover__wrapper {
  position: relative;
  display: inline-block;
}

.popover__content {
  opacity: 0;
  visibility: hidden;
  position: absolute;
  z-index: -1;
  left: -150px;
  transform: translate(0, 10px);
  background-color: #cfcfcf;
  padding: 1rem;
  box-shadow: 0 2px 5px 0 rgba(0, 0, 0, 0.26);
  width: 25rem;
}

.popover__wrapper:hover .popover__content {
  opacity: 1;
  z-index: 10;
  visibility: visible;
  transform: translate(0, -20px);
  transition: all 0.5s cubic-bezier(0.75, -0.02, 0.2, 0.97);
}
</style>
