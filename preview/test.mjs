function Test (data) {
	console.log(data);
}

/*

/ Boolean

/.. Any Number
/0.. Any Positive Number
/..0 Any Negative Number
/0..5 Number Between 0 and 5

// Any String
/\w+/ Any String with pattern
//0..5 Any String with minlength and maxlength
/\w+/0..5 Any String with pattern, minlength, and maxlength

/path/\w+/ Reference (saves as { '': '/path/name', ...overrides })

path/path/\w+/

*/

export default ['Test', {
	boolean: '/ Boolean',
	number: '/.. Number',
	string: '// String',
	date: 'date/2000-01-01..2020-12-31 Date',
	object: {
		'': 'Object',
		boolean: '/ Boolean',
		number: '/.. Number',
		string: '// String',
		date: 'date/2000-01-01..2020-12-31 Date',
	},
}, Test, ['style', null, ``]];
