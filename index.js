const { server } = require('./lib/stew');

server(8080, `${__dirname}/examples`, ({
	'user-agent': userAgent,
	cookie: { view }
}) => ({
	view: view || /mobile/i.test(userAgent) ? 's' : 'l',
	category: ({ sku }) => Promise.resolve('appliance') // allows calls to hierarchy service if needed
}), {
	'?view=s': 'home-page-s', // { view: 's' }
	'?view=l': 'home-page-l', // { view: 'l' }
	'products/{sku}?category=appliance&view=s': 'appliance-s', // { view: 's', name: 'lettuce' }
	'products/{sku}?category=entertainment&view=l': 'entertainment-l' // { view: 'l', name: 'lettuce' }
});
