<script context="module" lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import { writable } from 'svelte/store';
	const selectedCamera = writable<MediaDeviceInfo | null>(null);
</script>

<script lang="ts">
	import imageWorker from '$lib/services/imageWorker';

	export let previewWidth = 640;
	export let previewHeight = 480;
	export let previewIntervalTime: number = 500;
	export let onImageCapture: (image: ImageData) => void;

	let stream: MediaStream | null;
	let devices: MediaDeviceInfo[] = [];
	$: cameras = devices.filter((d) => d.kind === 'videoinput');

	let videoRef: HTMLVideoElement;
	let previewCanvas: HTMLCanvasElement;
	let cv: typeof imageWorker;
	let videoFeedInterval: NodeJS.Timeout | null = null;

	let foundPdf417 = false;

	onMount(async () => {
		try {
			// Request the stream
			stream = await requestStream();
			devices = await navigator.mediaDevices.enumerateDevices();
			drawTarget(false);
			cv = await imageWorker;
			await cv.load();
			overrideWorker();
			startWatching();
		} catch (e: any) {
			console.error(e);
		}
	});

	onDestroy(() => {
		stopWatching();
		if (stream) {
			stream.getTracks().forEach((track) => track.stop());
		}
	});

	async function holdStillWhileWeCapture() {
		stopWatching();
		const ctx = previewCanvas && previewCanvas.getContext('2d');
		if (ctx) {
			ctx.fillText('Hold still while we capture', 10, 10);
		}
		setTimeout(() => {
			startWatching();
		}, 1000);
	}

	// Handler for the worker internally
	let imgProcessMessageHandler = async (e: MessageEvent<any>) => {
		if (!e.data) return;
		switch (e.data.msg) {
			case 'debug': {
				// writePreviewFrame(e.data.imageData);
				break;
			}
			case 'processImage': {
				foundPdf417 = e.data.found;
				if (foundPdf417) {
					const image = getVideoImage();
					if (image) {
						await holdStillWhileWeCapture();
						onImageCapture(image);
					}
				}
				break;
			}
			case 'error': {
				if (e.data.reason === 'noLargestBarcode') {
				} else {
					startWatching();
				}
			}
		}
	};

	async function writePreviewFrame(image: ImageData) {
		// if (!previewCanvas || !showOverlay) return;
		const ctx = previewCanvas.getContext('2d', { willReadFrequently: true });
		if (ctx) {
			ctx.putImageData(image, 0, 0);
		}
	}

	// Handlers for the worker
	function overrideWorker() {
		if (cv.worker) cv.worker.onmessage = imgProcessMessageHandler;
	}

	function getVideoImage() {
		const res = _drawImageAndReturnContext();
		if (res) {
			const { context, canvas } = res;
			const image = context.getImageData(0, 0, canvas.width, canvas.height);
			return image;
		}
	}

	function _drawImageAndReturnContext() {
		if (videoRef) {
			const devicePixelRatio = window.devicePixelRatio || 1;
			const canvas = document.createElement('canvas');
			// Adjusting for device pixel ratio for high-resolution displays
			canvas.width = previewWidth * devicePixelRatio;
			canvas.height = previewHeight * devicePixelRatio;

			const ctx = canvas.getContext('2d');
			if (!ctx) return;
			// Scale canvas context to match device pixel ratio
			ctx.scale(devicePixelRatio, devicePixelRatio);

			// Draw the video frame to canvas considering the device pixel ratio
			ctx.drawImage(videoRef, 0, 0, previewWidth, previewHeight);
			return { context: ctx, canvas };
		}
	}

	async function updatePreviewFrame() {
		const image = getVideoImage();
		if (!image) return;
		await cv.processImage(image, { width, height });
	}

	async function startWatching() {
		if (videoFeedInterval) clearInterval(videoFeedInterval);
		videoFeedInterval = setInterval(updatePreviewFrame, previewIntervalTime);
	}

	function stopWatching() {
		if (videoFeedInterval) clearInterval(videoFeedInterval);
	}

	function drawTarget(found: boolean = false) {
		const ctx = previewCanvas && previewCanvas.getContext('2d');
		if (ctx) {
			const padding = 100;
			const effectiveCanvasWidth = width - padding * 4;
			const effectiveCanvasHeight = height - padding * 4;
			let aspect_ratio = 3.625 / 2.375;

			let box_height, box_width: number;

			if (effectiveCanvasWidth / effectiveCanvasHeight > aspect_ratio) {
				box_height = effectiveCanvasHeight - padding * 4;
				box_width = effectiveCanvasWidth * aspect_ratio + padding;
			} else {
				box_width = effectiveCanvasWidth;
				box_height = effectiveCanvasHeight * aspect_ratio + padding * 4;
			}

			let x = (width - box_width) / 2;
			let y = (height - box_height) / 2;

			ctx.beginPath();
			ctx.lineWidth = 6;
			ctx.strokeStyle = found ? 'green' : 'red';
			ctx.roundRect(x, y, box_width, box_height, 20);
			ctx.stroke();
		}
	}

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

	function srcObject(node: HTMLVideoElement, stream: MediaStream) {
		node.srcObject = stream;
		return {
			update(newStream: MediaStream) {
				if (node.srcObject != newStream) node.srcObject = newStream;
			}
		};
	}
	$: width = previewWidth;
	$: height = previewHeight;

	$: {
		drawTarget(foundPdf417);
	}
</script>

<div class="cam-wrapper">
	<div class="preview">
		<canvas bind:this={previewCanvas} {width} {height} />
	</div>
	<div class="video">
		<video
			{width}
			{height}
			use:srcObject={stream}
			playsinline
			autoplay
			muted
			bind:this={videoRef}
		/>
	</div>
</div>

<style>
	.cam-wrapper {
		display: flex;
		flex-direction: column;
		align-items: center;
		position: relative;
	}
	.cam-wrapper .preview {
		width: 100%;
		height: auto;
		z-index: 10;
		position: absolute;
		top: 0;
		left: 0;
	}
	.cam-wrapper .video {
		width: 100%;
		height: auto;
		z-index: 0;
		position: absolute;
		top: 0;
		left: 0;
		bottom: 0;
	}
</style>
