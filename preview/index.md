```export
{
	smile: '🙂',
}
```

# Calendar

```export
const [props, name] = arguments;

if (props) {
    if (name !== undefined) {
        return ['p', null, 'Render specific card to be included in other notes when the convert or default format is set.'];
    } else {
        return ['p', null, 'Render component (not tied to cards). This is used in all stew layouts when an object exists.'];
    }
}

const folder = `${window.location.pathname.replace(/\/+$/, '')}/`;

// localStorage
// - store main headings of pages you visit under '/' key, with settings under '' key of that

const cards = stew(async url => {
    const res = await fetch(url);
    const notes = new Set(await res.json());
    const cards = {};
    const draws = [];
    const promises = [];

    for (const name in localStorage) {
        if (!name.startsWith(folder) || !name.endsWith('.md') || name.lastIndexOf('/') > folder.length - 1) {
            continue;
        }
        
        let settings;

        try {
            settings = JSON.parse(localStorage.getItem('/'))[1];
        } catch (err) {
            settings = {};
        }

        // index/yyyymmdd notes will store their headings to setting object under their yyyymmdd key
        const note = name.slice(folder.length, -3);
        const quest = settings[note];
        // const card = localStorage.getItem(note.slice(1));
        notes.add(note);

        console.log(note, quest);

        // TODO: check which card the note belongs to (what week of year), and add quest to it
        // if (card) {
        //     cards[note] = card;
        // } else {
        //     draws.push(note);
        // }
    }

    // console.log(notes);

    await Promise.all(promises);
    cards[''] = draws;
    return cards;
}, [`${folder}/`], null);

if (!cards) {
    return;
}

// console.log(cards);

// TODO: render webGL card UI
// - render one season quadrant at a time
// - have empty space next to JQK be a toggle to cycle between current, next, and previous seasons
// - in next season, set goals. in prevous season, see reflections.
return ['p', null, 'Show all cards. This is a good place to test the ability to check for all notes that exist in a folder. Eventually this will be where the user can customize the visualization of all references between their notes. It\'s better if this is left up to the user instead of locking them to a set version of this.'];
```

## Custom

```export
const [flags, code] = arguments;
return `CUSTOM\n${code}`;
```
