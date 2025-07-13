export function custom () {
    const [flags, code] = arguments;
    return `CUSTOM\n${code}`;
}

export function getDay (name) {
    let date = new Date();
    date.setFullYear(name.slice(0, 4));
    date.setMonth((name.slice(4, 6) || 1) - 1);
    date.setDate(name.slice(6) || 1);
    const offset = date.getTimezoneOffset();
    const day = name.length > 6 ? 0 : date.getDay();
    date -= (offset + (day < 4 ? day : day - 7) * 24 * 60) * 60 * 1000;
    return Math.floor((date - new Date(0)) / (24 * 60 * 60 * 1000)) + 1;
}

export function getQuests (name, count = 7) {
    const allQuests = {};
    const year = name.slice(0, 4);
    const start = getDay(year);
    let index = getDay(name);
    index -= (index - start) % 7;
    let week = Math.floor((index - start) / 7) + 1;

    for (let i = 0; i < count; i += 7) {
        const weekQuests = [];
        allQuests[`${year}${week < 10 ? '0' : ''}${week++}`] = weekQuests;

        for (let j = 0; j < 7; j++) {
            const date = new Date(index * 24 * 60 * 60 * 1000);
            const year = date.getFullYear();
            const month = date.getMonth() + 1;
            const day = date.getDate();
            const name = `${year}${month < 10 ? '0' : ''}${month}${day < 10 ? '0' : ''}${day}`;
            const href = `/index/${name}`;
            const [, quest] = (localStorage.getItem(`${href}.md`) || '').match(/^\s*(.*?)\s*(?=#+\s|\r|\n|$)/);
            const style = { color: quest ? 'var(--paper-font-color)' : 'var(--button-font-color)' };
            weekQuests.push(['a', { href, style }, quest || date.toLocaleDateString()]);
            index++;
        }
    }

    return allQuests;
}

export function convert () {
    const [props, content, navigation] = arguments;
    const date = new Date();
    let sessions, settings;

    try {
        sessions = JSON.parse(localStorage.getItem('/'));
        settings = sessions[1] || {};
    } catch (err) {
        settings = {};
        sessions = [0, settings];
    }

    if (props) {
        // TODO: maybe use 2 Joker cards to represent half a year each
        // - Jokers can also hold the leftover days of the year in their leftover columns
        // - e.g. Fall/Winter rows: JUL AUG SEP OCT NOV DEC DAY_365 (Spring/Summer will hold other months, plus DAY_366 on leap years)
        // - names with length between 4 and 6 will be for months, which will display their joker card

        const name = window.location.pathname.replace(/\/+$/, '').split('/').pop();

        if (navigation && name.length > 6) {
            const quests = stew(getQuests, [name]);
            const weekQuests = Object.values(quests)[0];

            const vertexes = [
                -0.5, -0.5, 0.5, -0.5, 0.5, 0.5,
                0.5, 0.5, -0.5, 0.5, -0.5, -0.5,
            ];
            
            const color = [1, 0.75, 0.75];

            navigation.push(
                ['style', null, `
                    .container {
                        position: relative;
                    }
                    canvas {
                        position: absolute;
                        left: 0;
                        right: 0;
                        top: 0;
                        width: 100%;
                        aspect-ratio: 0.8;
                    }
                `],
                ['div', { className: 'container' },
                    ['canvas', null, stew`
                        ${gl => {
                            gl.clearColor(0.0, 0.0, 0.0, 0.0);
                            gl.clear(gl.COLOR_BUFFER_BIT);
                        }}
                        FLOAT vec2 aVertex ${vertexes}
                        gl_Position = vec4(aVertex, 0.0, 1.0)
                        gl_PointSize = 4.0
                        ${gl => gl.drawArrays(gl.POINTS, 0, 12)}
                        vec3 uColor ${color}
                        gl_FragColor = vec4(uColor, 1.0)
                        ${() => 16}
                    `],
                    ['ul', null,
                        ...weekQuests.map(link => ['li', null, link]),
                    ],
                ],
            );
        }
        
        // TODO: render card for that week with the day of the week highlighted that the note is for
        // - render the markdown note as-is in the main area
        // - figure out how to put the card at the bottom in the left nav, below its heading links
        //   - navigation from arguments should be the shadow dom container inserted below other left nav content
        // - the card is a good way to visualize the week alongside the day
        return content
    }

    const state = stew({
        seasonOffset: 0,
    }, []);

    const { seasonOffset } = state;

    const startName = stew(() => {
        const year = date.getFullYear();
        let month = date.getMonth() + seasonOffset * 3;
        month = month - (month % 3) + 1;
        return `${year}${month < 10 ? '0' : ''}${month}01`;
    }, [seasonOffset]);

    const quests = stew(getQuests, [startName, 91]);

    return ['', null,
        ['button', {
            type: 'button',
            onclick: () => state.seasonOffset -= 1,
        }, 'Prev'],
        ['button', {
            type: 'button',
            onclick: () => state.seasonOffset += 1,
        }, 'Next'],
        Object.values(quests).map(weekQuests => {
            return ['ul', null,
                ...weekQuests.map(link => ['li', null, link]),
            ];
        }),
    ];

    // TODO: render webGL card UI
    // - render one season quadrant at a time, with cards display sequentially 1-K to show the week # of the season.
    // - have empty space next to JQK hold a prev and next button to move to adjacent seasons.
    // - Past and future cards can be clicked to bring them into focus, and then a row can be clicked to open the note for that day.
    // - Focused cards also provide a link to edit the note for that week /index/yyyyww
}

export default [convert, {
    '': 'Convert',
    smile: '🙂',
}];
