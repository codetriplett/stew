export default function ({ page }, ...children) {
	return ['', {},
		['nav', {}, page],
		...children,
	];
}
