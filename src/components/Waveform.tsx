import { useEffect, useRef } from "react";

/** Live input level drawn as a row of bars, like a pen tracing the voice across the line. */
export default function Waveform({ stream }: { stream: MediaStream }) {
	const canvasRef = useRef<HTMLCanvasElement>(null);

	useEffect(() => {
		const canvas = canvasRef.current;
		const ctx = canvas?.getContext("2d");
		if (!canvas || !ctx) return;

		const audio = new AudioContext();
		const analyser = audio.createAnalyser();
		analyser.fftSize = 1024;
		audio.createMediaStreamSource(stream).connect(analyser);

		const samples = new Uint8Array(analyser.fftSize);
		const bars = 48;
		const history: number[] = Array(bars).fill(0);
		const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
		let frame = 0;
		let tick = 0;

		const draw = () => {
			frame = requestAnimationFrame(draw);
			// Sample every few frames so bars scroll at a readable pace.
			if (tick++ % 3 !== 0) return;

			analyser.getByteTimeDomainData(samples);
			let peak = 0;
			for (const s of samples) peak = Math.max(peak, Math.abs(s - 128) / 128);
			history.shift();
			history.push(Math.min(1, peak * 1.8));

			const dpr = window.devicePixelRatio || 1;
			const { clientWidth: w, clientHeight: h } = canvas;
			if (canvas.width !== w * dpr) {
				canvas.width = w * dpr;
				canvas.height = h * dpr;
			}
			ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
			ctx.clearRect(0, 0, w, h);
			ctx.fillStyle = getComputedStyle(canvas).color;

			const slot = w / bars;
			const values = reducedMotion ? [history[bars - 1]] : history;
			values.forEach((v, i) => {
				const barH = Math.max(2, v * h);
				const x = reducedMotion ? 0 : i * slot;
				const barW = reducedMotion ? w * v : slot * 0.55;
				// With reduced motion, show a steady level meter instead of scrolling bars.
				const y = reducedMotion ? h / 2 - 2 : (h - barH) / 2;
				ctx.beginPath();
				ctx.roundRect(x, y, Math.max(2, barW), reducedMotion ? 4 : barH, 1);
				ctx.fill();
			});
		};
		draw();

		return () => {
			cancelAnimationFrame(frame);
			void audio.close();
		};
	}, [stream]);

	return <canvas ref={canvasRef} aria-hidden className='h-10 w-full text-pen' />;
}
