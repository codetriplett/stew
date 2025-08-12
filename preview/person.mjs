export function person () {
	const [props] = arguments;
	console.log(props);
}

export default [person, {
    '': 'Person',
    name: 'Name // Enter name',
    age: 'Age /.. Enter age',
    friends: ['Friends /.. Add friend...',
        'Person /person// name',
    ],
}];
