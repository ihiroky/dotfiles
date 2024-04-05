const St      = imports.gi.St;
const Main    = imports.ui.main;
// const Tweener = imports.ui.tweener;
const GLib    = imports.gi.GLib;

// Globals
let button;
let label;
let timer;
let count = 0;
let mode = 0;
let loadavg = {
    one:  '?',
    five: '?',
    ten:  '?',
    proc: {
        active:'?',
        total: '?'
    }
};

/*
* Change the display mode
*/
function _click() {
    mode = mode == 0?1:0;
    _render();
}


/*
* Pull the loadavg from /proc and return an object
*/
function _getData() {
    let loadString = GLib.file_get_contents('/proc/loadavg')[1].toString();
    let loadArray = loadString.split(' ');
    let proc = loadArray[3].split('/');

    return {
        one:  loadArray[0],
        five: loadArray[1],
        ten:  loadArray[2],
        proc: {
            active: proc[0],
            total:  proc[1]
        }
    };
}

/*
* Sets the current text in the label
*/
function _render() {
    if(mode == 0) {
        label.set_text(loadavg.one + ' ' + loadavg.five + ' ' + loadavg.ten);
        return;
    }
    label.set_text('p:' + loadavg.proc.active + ' t:' + loadavg.proc.total);
}

function init() {
//    button = new St.Bin({ style_class: 'panel-button',
    button = new St.Bin({ style_class: 'loadavg-panel',
                          reactive: true,
                          can_focus: true,
                          x_expand: true,
                          y_expand: true,
                          track_hover: true });

    label = new St.Label({ text: ' ' });

    button.set_child(label);
}


function enable() {
    Main.panel._rightBox.insert_child_at_index(button, 0);
    timer = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 1000, () => {
        loadavg = _getData();
        _render();
        return true; // Repeat
    });

    button.connect('button-press-event', _click);
}

function disable() {
    Main.panel._rightBox.remove_child(button);
    GLib.Source.remove(timer);
    button.disconnect('button-press-event');
}
