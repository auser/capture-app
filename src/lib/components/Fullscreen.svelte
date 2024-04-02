<script lang="ts">
	import { createEventDispatcher, onDestroy, onMount } from 'svelte';
	import screenfull from 'screenfull';

	let component: HTMLElement;
	const dispatch = createEventDispatcher();

	const onFullscreen = () => {
		dispatch('fullscreen', {
			text: screenfull.isEnabled ? 'enter' : 'exit',
			isFullscreen: screenfull.isFullscreen
		});
	};

	const onError = () => {
		console.log('error');
		dispatch('fullscreen', {
			text: Error('Failed to enable fullscreen')
		});
	};

	onMount(() => {
		if (screenfull.isEnabled) {
			screenfull.on('change', onFullscreen);
			screenfull.on('error', onError);
		}
	});

	const onToggle = () => {
		if (screenfull.isEnabled && component?.nextElementSibling) {
			screenfull.toggle(component.nextElementSibling);
		}
	};

	const onRequest = () => {
		if (screenfull.isEnabled && component?.nextElementSibling) {
			screenfull.request(component.nextElementSibling, { navigationUI: 'hide' });
		}
	};

	const onExit = () => {
		if (screenfull.isEnabled && component?.nextElementSibling) {
			screenfull.exit();
		}
	};

	onDestroy(() => {
		if (screenfull.isEnabled) {
			console.log('destroy');
			screenfull.off('change', onFullscreen);
			screenfull.off('error', onError);
		}
	});
</script>

<div style="width:0; height:0" bind:this={component} />
<slot {onRequest} {onExit} {onToggle} />
