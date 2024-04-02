<script lang="ts">
	import Pdf417Scanner from '$lib/components/PDF417Scanner.svelte';
	import { PUBLIC_UPLOAD_URL } from '$env/static/public';

	type LicenseFace = 'front' | 'back' | 'none';
	type LicenseImage = {
		front: File;
		back: File;
	};

	let cameraOpen = true;
	let licenseImage = {} as LicenseImage;
	let whichFace: LicenseFace = 'front';

	const toggleCamera = () => {
		cameraOpen = !cameraOpen;
	};

	function onImageCapture(image: ImageData) {
		//
		let buf = Buffer.from(image.data.buffer);
		let blob = new Blob([buf]);
		if (whichFace === 'front') {
			let file = new File([blob], 'front.jpg', { type: 'image/jpeg' });
			licenseImage.front = file;
			whichFace = 'back';
		} else {
			let file = new File([blob], 'front.jpg', { type: 'image/jpeg' });
			licenseImage.back = file;
			whichFace = 'none';
			uploadLicense();
		}
	}

	function uploadLicense() {
		// this is where you set the upload logic to the server
		console.log('Uploading license to', PUBLIC_UPLOAD_URL);
		setTimeout(function () {
			console.log('Uploaded license', licenseImage);
		}, 1000);
	}
</script>

<!-- <pre><code>{JSON.stringify(licenseImage, null, 2)}</code></pre> -->

<!-- <Fullscreen let:onRequest let:onExit on:fullscreen={handleMessage}> -->
{#if !cameraOpen}
	<h3>Let's get you started</h3>
	<p>In order to open an account with Herring, we need just one quick action from you.</p>
	<p>Please scan your license, front and back</p>
	<button on:click={toggleCamera}>Let's get started</button>
{/if}
{#if cameraOpen}
	<button on:click={toggleCamera}>Close</button>
	{#if whichFace === 'none'}
		<h3>Uploading...</h3>
	{:else if whichFace === 'front'}
		<h3>Scan the front of your license</h3>
		<Pdf417Scanner {onImageCapture} />
	{:else}
		<h3>Scan the back of your license</h3>
		<Pdf417Scanner {onImageCapture} />
	{/if}
{/if}

<!-- </Fullscreen> -->

<style lang="scss">
	button {
		border: 0;
		background-color: transparent;
	}
</style>
