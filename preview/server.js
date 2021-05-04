function renderPage (title, ...content) {
	return render => `<!doctype html>
<html lang="en">
	<head>
		<title>${title}</title>
	</head>
	<body>
		${content.map(it => render(it)).join('')}
	</body>
</html>`;
}

require('@triplett/steward')(8080, [
	`${__dirname}/stew.min.js#$`,
	'component.js'
], () => {
	return renderPage('Component', {
		'': 'component.js#Component'
	});
});
