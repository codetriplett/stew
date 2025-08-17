export function person () {
	const [props] = arguments;
	console.log(props);
}

export default [person, {
    '': 'Person',
    name: 'Name // Enter name',
    age: 'Age /.. Enter age',
    quest: 'Quest /index// Choose a quest...',
    friends: ['Friends /.. Add friend',
        'Person /person// Choose a person...',
    ],
}];
