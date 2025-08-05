export function person () {
	const [props] = arguments;
	console.log(props);
}

export default [person, {
    '': {
        '': 'Person',
    },
    name: 'Enter name // Name',
    age: 'Enter age /.. Age',
    friends: ['Choose type... /.. Friends', '/person// Person'],
}];
