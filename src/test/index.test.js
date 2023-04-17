import { cloneStructure, compareStructure } from '.';

it('clones structure', () => {
	const structure = [123, [456, [789]], [987, [654], [321]]];
	const actual = cloneStructure(structure);

	expect(actual).toEqual([structure,
		[structure[1],
			[structure[1][1]],
		],
		[structure[2],
			[structure[2][1]],
			[structure[2][2]],
		],
	]);
});

it('compares identical structure', () => {
	const structure = [123, [456, [789]], [987, [654], [321]]];
	const prevStructure = cloneStructure(structure);
	const nextStructure = cloneStructure(structure);
	const actual = compareStructure(nextStructure, prevStructure);
	expect(actual).toEqual([true, [true, [true]], [true, [true], [true]]]);
});

it('compares different structure', () => {
	const structure = [123, [456, [789]], [987, [654], [321]]];
	const prevStructure = cloneStructure(structure);
	structure[1] = [...structure[1]];
	structure[2][1] = [...structure[2][1]];
	const nextStructure = cloneStructure(structure);
	const actual = compareStructure(nextStructure, prevStructure);
	expect(actual).toEqual([true, [false, [true]], [true, [false], [true]]]);
});
