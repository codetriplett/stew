```export
{
    name: 'Name // Quest name',
    exp: 'EXP /0..50.. Experience points',
    complete: 'Complete',
    focus: ['Focus / Home (organize)',
        'Body (exercise) / body',
        'Mind (visualize) / mind',
        'Soul (socialize) / soul',
    ],
    deadline: 'Deadline /2025-01-01..',
}
.quest-card {
    max-width: 600px;
    margin: 0 auto 8px;
    padding: 16px;
    border: 1px solid gray;
    border-radius: 12px;
    background: var(--paper-background);

    h2 { margin: 0; text-align: center; }
    p { margin: 16px 0 0; }
    .detail {
        display: flex;
        justify-content: space-between;
        width: 100%;
        margin-top: 8px;
        font-weight: bold;
    }
    .exp-goal {
        background: var(--page-background);
        border: 1px solid gray;
        border-radius: 4px;
        padding: 4px 8px;
        margin: -4px 0;
    }
    .exp-complete.exp-home { background: #b933; }
    .exp-complete.exp-mind { background: #33b3; }
    .exp-complete.exp-body { background: #b333; }
    .exp-complete.exp-soul { background: #3b33; }
}
```

# Quest

```export
const [props, content] = arguments;
const { name, exp, complete, focus = 'home', deadline } = props;

if (!content) {
    return ['p', null,
        'Notes can embed code to fully customize their layouts, and wrap the layouts of their immediate children. ',
        'They can also define fields for their children to set additional data to be used alongside their main content. ',
        'Get started by adding a name to the end of the current URL to create a new note, e.g. ', ['a', { href: '/quest/clean-bedroom' }, '/quest/clean-bedroom'], '. ',
        'Click edit on that page to write a description of your quest, and expand the left nav to fill in the additional fields. ',
        'Once you save, the page will refresh to show it rendered as a custom card. ',
        'You can modify the code and styles by removing the slash on the URL for this page, then click edit like any other note. ',
        'Refer to the ', ['a', { href: '/stew' }, 'Stew guide'], ' for instructions on how to structure your code and defined the fields. ',
    ];
}

return ['div', { className: 'quest-card' },
    [2, null, name],
    ['div', { className: 'detail' },
        ['span', null, deadline],
        exp && ['span', { className: `exp-goal exp-${focus} ${complete ? 'exp-complete' : '' }` }, `+${exp}`],
    ],
    content,
];
```
