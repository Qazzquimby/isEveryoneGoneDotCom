<script setup lang="ts">

const sites = ref<SiteStatus[]>([])

const updatePercent = computed(() => {
  if (sites.value.length === 0) {
    return 0
  }

  let numSitesUpdated = 0;
  let totalSitesRead = 0;
  for (const site of sites.value) {
    if (site.lastChecked !== site.lastSuccessfulRead) {
      continue
    }

    if (site.lastChecked === site.lastUpdated) {
      numSitesUpdated += 1
    }
    totalSitesRead += 1
  }

  return (numSitesUpdated / totalSitesRead) * 100
})


const title = useTitle()
watch(updatePercent, (newValue) => {
  if (newValue >= 25) {
    title.value = 'They\'re still here.'
  } else {
    title.value = 'They\'re gone.'
  }
})

const worldMode = computed(() => {
  if (sites.value.length === 0) {
    return 'gray'
  } else {
    return 'green'
  }
})

async function readFirebase() {
  const response = await fetch('https://is-everyone-gone-default-rtdb.firebaseio.com/.json')
  return response.json()
}

onMounted(async () => {
  const response = await readFirebase()

  const sitesFromResponse = Object.keys(response).map((key) => {
    return {
      name: key,
      lastChecked: response[key].lastChecked,
      lastSuccessfulRead: response[key].lastSuccessfulRead,
      lastUpdated: response[key].lastUpdated,
      value: response[key].value,
    }
  })

  sites.value = sitesFromResponse as SiteStatus[]
})

</script>

<template>
  <div w-70vw max-w-50rem mx-auto>

    <!-- Try a big block letters ISEVERYONEGONE textfit to be one line -->

    <world-status :mode="worldMode">
      <div v-if="sites.length === 0">
        <h3>
          Loading...
        </h3>
      </div>
      <div v-else-if="updatePercent >= 25">
        <h3>
          They're still here.
        </h3>
        <p>
          {{ updatePercent }} percent of scanned sites updated in the last 30 minutes.
        </p>
      </div>
      <div v-else>
        <h3>
          They're gone. Or more likely, this site is broken.
        </h3>
        <p>
          {{ updatePercent }} percent of scanned sites updated in the last 30 minutes.
        </p>
        </div>

    </world-status>

    <site-status v-for="site in sites" key="site.name" :site="site" />
  </div>
</template>
