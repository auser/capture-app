<script context="module" lang="ts">
	import { onMount } from 'svelte';
	import { writable } from 'svelte/store';
	const selectedCamera = writable<MediaDeviceInfo | null>(null);
</script>

<script lang="ts">
	let stream: MediaStream | null;
	let devices: MediaDeviceInfo[] = [];
	$: cameras = devices.filter((d) => d.kind === 'videoinput');

	onMount(async () => {
		try {
			// Request the stream
			stream = await requestStream();
			devices = await navigator.mediaDevices.enumerateDevices();
		} catch (e: any) {
			console.error(e);
		}
	});

	function requestStream() {
		const constraints: MediaStreamConstraints = {
			audio: false,
			video: {
				deviceId: $selectedCamera ? $selectedCamera.deviceId : undefined,
				facingMode: 'environment'
			}
		};

		const stream = navigator.mediaDevices.getUserMedia(constraints);
		return stream;
	}
</script>

<div class="cam-wrapper">
	<canvas />
	<video src={stream} />
</div>
