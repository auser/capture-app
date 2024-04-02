<script lang="ts">
	import Fullscreen from '$lib/components/Fullscreen.svelte';
	import Pdf417Scanner from '$lib/components/PDF417Scanner.svelte';

	let cameraOpen = true;

	const toggleCamera = () => {
		cameraOpen = !cameraOpen;
	};
</script>

<!-- <Fullscreen on:message={handleMessage} let:onRequest let:onExit>
	<Pdf417Scanner />
</Fullscreen> -->

<!-- <Fullscreen let:onRequest let:onExit on:fullscreen={handleMessage}> -->
{#if !cameraOpen}
	<h3>Let's get you started</h3>
	<p>In order to open an account with Herring, we need just one quick action from you.</p>
	<p>Please scan your license, front and back</p>
	<button on:click={toggleCamera}>Let's get started</button>
{/if}
{#if cameraOpen}
	<button on:click={toggleCamera}>Close</button>
	<Pdf417Scanner />
{/if}

<!-- </Fullscreen> -->

<style lang="scss">
	button {
		border: 0;
		background-color: transparent;
	}
</style>
