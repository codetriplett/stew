import { fibers } from '../state/fiber';
import * as view from '../view';
import stew from '..';

stew.isServer = false;
const { populateChildren } = view;
let rootFiber, rootView, prevRootFiber, prevRootView;

jest.spyOn(view, 'populateChildren').mockImplementation((...params) => {
	if (!rootFiber) rootFiber = fibers[0];
	if (!rootView) rootView = params[2];
	populateChildren(...params);
});

export function cloneStructure (structure) {
	return [structure, ...structure.slice(1).map(cloneStructure)];
}

export function compareStructure (structure, prevStructure) {
	const shortStructure = structure.length < prevStructure.length ? structure : prevStructure;
	const longStructure = structure.length < prevStructure.length ? prevStructure : structure;

	return [
		structure[0] === prevStructure[0],
		...shortStructure.slice(1).map((subStructure, i) => compareStructure(subStructure, longStructure[i + 1])),
		...Array(longStructure.length - shortStructure.length).fill([]),
	];
}

export default function testStructure (expectedFiberStructure, expectedViewStructure) {
	const nextRootFiber = cloneStructure(rootFiber);
	const nextRootView = cloneStructure(rootView);
	if (expectedFiberStructure) expect(compareStructure(nextRootFiber, prevRootFiber)).toEqual(expectedFiberStructure);
	if (expectedViewStructure) expect(compareStructure(nextRootView, prevRootView)).toEqual(expectedViewStructure);
	prevRootFiber = nextRootFiber;
	prevRootView = nextRootView;
}

beforeEach(() => {
	rootFiber = undefined;
	rootView = undefined;
});
