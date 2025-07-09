export function test () {
const [data] = arguments;
console.log(data);
}

export default [test, {
    '': 'Test',
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
}];
