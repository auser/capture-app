import { MatVector, type Mat, type Rect, type RotatedRect, Size } from '@techstark/opencv-js';
import cv, { boundingRect } from '@techstark/opencv-js';

const CARD_MAX_AREA = 20000;
const CARD_MIN_AREA = 800;

onmessage = async function (e: MessageEvent) {
	switch (e.data.msg) {
		case 'processImage':
			processImage(e.data)
				.then(() => {
					postMessage({ msg: 'done' });
				})
				.catch((e) => {
					postMessage({ msg: 'error', error: e });
				});
			break;
		case 'load':
			this.postMessage({ msg: e.data.msg });
			break;
		default:
			console.log('got an unhandled message: ', e.data.msg);
			break;
	}
};

async function processImage({ msg, data }: any) {
	const img = cv.matFromImageData(data.data);
	let { image: workingImage, size } = resizeImage(img, 200);
	workingImage = preprocessImage(workingImage);
	// postMessage({ msg: 'debug', imageData: imageDataFromMat(workingImage) });
	const result = findCard(workingImage, size, CARD_MIN_AREA, CARD_MAX_AREA);
	// postMessage({ msg: 'debug', imageData: imageDataFromMat(workingImage) });
	if (result.fourPoints !== null) {
		postMessage({ msg, found: true });
		result.threshImgColor?.delete();
		result.fourPoints.delete();
	} else {
		postMessage({ msg, found: false });
	}

	workingImage.delete();
	img.delete();
}

function preprocessImage(src: Mat) {
	let gray = new cv.Mat();
	let blur = new cv.Mat();
	let edges = new cv.Mat();
	let dilate = new cv.Mat();
	let closing = new cv.Mat();
	let kernel = cv.Mat.ones(5, 5, cv.CV_8U);

	// Enhance details
	let enhanced = enhanceDetails(src);

	// Convert to grayscale
	cv.cvtColor(enhanced, gray, cv.COLOR_BGR2GRAY);

	// Apply Gaussian Blur
	cv.GaussianBlur(gray, blur, new cv.Size(5, 5), 0, 0, cv.BORDER_DEFAULT);

	// Detect edges
	cv.Canny(blur, edges, 75, 200);

	// Dilate
	cv.dilate(
		edges,
		dilate,
		kernel,
		new cv.Point(-1, -1),
		1,
		cv.BORDER_CONSTANT,
		cv.morphologyDefaultBorderValue()
	);

	// Apply Morphological Closing
	cv.morphologyEx(dilate, closing, cv.MORPH_CLOSE, kernel);

	// Clean up intermediate Mats to free memory
	enhanced.delete(); // Clean up
	gray.delete(); // Clean up
	blur.delete(); // Clean up
	edges.delete(); // Clean up
	dilate.delete(); // Clean up
	kernel.delete(); // Clean up

	return closing;
}

function enhanceDetails(src: Mat) {
	let blurred = new cv.Mat();
	let sharpened = new cv.Mat();
	let alpha = 1.5; // Coefficient for the original image, controls sharpness
	let beta = -0.5; // Coefficient for the blurred image
	let gamma = 0; // Scalar added to each sum

	// Apply Gaussian Blur
	cv.GaussianBlur(src, blurred, new cv.Size(0, 0), 3);

	// Add weighted (original - alpha, blurred - beta, gamma)
	cv.addWeighted(src, alpha, blurred, beta, gamma, sharpened);

	blurred.delete(); // Clean up

	return sharpened;
}

interface FindCardResult {
	fourPoints: cv.Mat | null;
	threshImgColor: cv.Mat | null;
}

function findCard(
	threshImg: cv.Mat,
	size: cv.Size,
	CARD_MIN_AREA: number,
	CARD_MAX_AREA: number
): FindCardResult {
	let contours = new cv.MatVector();
	let hierarchy = new cv.Mat();

	// Find contours
	cv.findContours(threshImg, contours, hierarchy, cv.RETR_LIST, cv.CHAIN_APPROX_SIMPLE);

	if (contours.size() === 0) {
		return { fourPoints: null, threshImgColor: null };
	}

	// Sort contours by area in descending order
	let indexSort = Array.from(Array(contours.size()).keys()).sort(
		(a, b) => cv.contourArea(contours.get(b)) - cv.contourArea(contours.get(a))
	);

	let fourPoints: cv.Mat | null = null;
	let threshImgColor = new cv.Mat();
	cv.cvtColor(threshImg, threshImgColor, cv.COLOR_GRAY2BGR);

	for (let i = 0; i < indexSort.length; i++) {
		let cnt = contours.get(indexSort[i]);
		let contourArea = cv.contourArea(cnt);
		let peri = cv.arcLength(cnt, true);
		let approx = new cv.Mat();
		cv.approxPolyDP(cnt, approx, 0.02 * peri, true); // Adjusted approximation factor for better accuracy

		if (
			contourArea > CARD_MIN_AREA &&
			contourArea < CARD_MAX_AREA &&
			approx.rows === 4 &&
			hierarchy.data32S[indexSort[i] * 4 + 3] === -1
		) {
			fourPoints = approx;
			cv.drawContours(threshImgColor, contours, indexSort[i], new cv.Scalar(255, 0, 0), 8);
			postMessage({ msg: 'debug', imageData: imageDataFromMat(threshImgColor) });
			break; // Assuming you're looking for the first matching contour that fits the card criteria
		}
		approx.delete(); // Clean up
	}

	contours.delete(); // Clean up
	hierarchy.delete(); // Clean up

	return { fourPoints, threshImgColor };
}

function resizeImage(src: Mat, width = 500) {
	// Assuming 'src' is an already loaded cv.Mat image
	let dst = new cv.Mat();
	let size = new cv.Size(width, Math.round((src.rows * width) / src.cols));

	// Resize the image
	cv.resize(src, dst, size, 0, 0, cv.INTER_LINEAR);

	return { image: dst, size: size };
}

export function imageDataFromMat(mat: Mat) {
	// converts the mat type to cv.CV_8U
	const img = new cv.Mat();
	const depth = mat.type() % 8;
	const scale = depth <= cv.CV_8S ? 1.0 : depth <= cv.CV_32S ? 1.0 / 256.0 : 255.0;
	const shift = depth === cv.CV_8S || depth === cv.CV_16S ? 128.0 : 0.0;
	mat.convertTo(img, cv.CV_8U, scale, shift);

	// converts the img type to cv.CV_8UC4
	switch (img.type()) {
		case cv.CV_8UC1:
			cv.cvtColor(img, img, cv.COLOR_GRAY2RGBA);
			break;
		case cv.CV_8UC3:
			cv.cvtColor(img, img, cv.COLOR_RGB2RGBA);
			break;
		case cv.CV_8UC4:
			break;
		default:
			console.log('Bad number of channels (Source image must have 1, 3 or 4 channels)');
			throw new Error('Bad number of channels (Source image must have 1, 3 or 4 channels)');
	}
	const clampedArray = new ImageData(new Uint8ClampedArray(img.data), img.cols, img.rows);
	return clampedArray;
}
