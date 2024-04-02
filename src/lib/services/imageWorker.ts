export class CV {
	_status: any = {};
	worker: Worker | null = null;

	constructor() {
		this._status = {};
		this.worker = null;
	}

	_dispatch(event: any) {
		const msg = event.msg;
		this._status[msg] = ['loading'];
		if (!this.worker) {
			throw new Error('Worker not loaded');
		}
		this.worker.postMessage({ ...event });
		return new Promise((res, rej) => {
			const interval = setInterval(() => {
				const status = this._status[msg];
				if (status && status[0] === 'done') {
					clearInterval(interval);
					return res(status[1]);
				}
				if (status && status[0] === 'error') {
					clearInterval(interval);
					return rej(status[1]);
				}
				if (status && status[0] !== 'loading') {
					delete this._status[msg];
					clearInterval(interval);
				}
			}, 50);
		});
	}

	async load() {
		this._status = {};
		const BarcodeWorker = await import('$lib/workers/barcode.worker?worker');
		this.worker = new BarcodeWorker.default();

		this.worker.onmessage = (e) => {
			return (this._status[e.data.msg] = ['done', e]);
		};
		this.worker.onerror = (e) => {
			return (this._status.load = ['error', e]);
		};
		// Dispatch this method
		return this._dispatch({ msg: 'load' }).catch((e) => {
			console.error('Error loading worker', e);
		});
	}

	async processImage(imageData: ImageData, options: any) {
		return this._dispatch({ msg: 'processImage', data: { data: imageData, options } });
	}
}

export default new CV();
