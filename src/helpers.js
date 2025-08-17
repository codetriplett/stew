export function resizeTextarea (ref) {
	const { scrollX, scrollY } = window;
	const [textarea] = ref[0];
	textarea.style.height = '0px';
	const { scrollHeight } = textarea;
	textarea.style.height = `${scrollHeight}px`;
	window.scrollTo(scrollX, scrollY);
}
