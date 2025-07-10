export function custom () {
const [flags, code] = arguments;
return `CUSTOM\n${code}`;
}

export function convert () {
const [props, name] = arguments;

if (props) {
    if (name !== undefined) {
        return ['p', null, 'Render specific card to be included in other notes when the convert or default format is set.'];
    } else {
        return ['p', null, 'Render component (not tied to cards). This is used in all stew layouts when an object exists.'];
    }
}

const folder = `${window.location.pathname.replace(/\/+$/, '')}/`;

const notes = stew(async url => {
    const res = await fetch(url);
    const notes = await res.json();

    for (const name in localStorage) {
        if (name.startsWith(folder) && name.endsWith('.md') && name.lastIndexOf('/') <= folder.length - 1) {
            notes.push(name.slice(folder.length, -3));
        }
    }

    return notes;
}, [`${folder}/`], null);

if (!notes) {
    return;
}

// TODO: render webGL card UI
// - check which weeks have notes set, but haven't drawn a card from the ones available, and play animation when doing so
// - H1s of the weeks notes will make up the line items of the cards
// - loop will be to use link on home page to set notes, then click the Index link in the breadcrumb to update card game
// - add link to UI for active cards in the week format yyyyww to create a space for reflections through the week
// - create some kind of gameplay, where active cards can be played to boost something on your virtual form
// - winter cards: hearth (fireplace)
// - spring cards: plants (garden)
// - summer cards: social
// - autumn cards: stone and lumber (structure)
return ['p', null, 'Show all cards. This is a good place to test the ability to check for all notes that exist in a folder. Eventually this will be where the user can customize the visualization of all references between their notes. It\'s better if this is left up to the user instead of locking them to a set version of this.'];
}

export default [convert, {
    '': 'Convert',
    smile: '🙂',
}];
