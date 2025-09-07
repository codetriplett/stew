export function quest () {
	const [props, content, navigation] = arguments;
    const { name, exp, complete, focus, deadline } = props;
	console.log(props);
	// TODO: render quest info
	// - have journal code call this with props to place info above the week card in nav

    
}

export default [quest, {
    '': 'Quest',
    name: 'Name // Quest name',
    exp: 'EXP /0..50.. Experience points',
    complete: 'Complete',
    focus: ['Focus / Home (organize)',
        'Mind (visualize) / mind',
        'Body (exercise) / body',
        'Soul (socialize) / soul',
    ],
    deadline: 'Deadline /2025-01-01',
}];
