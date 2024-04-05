/*
    Copyright © 2020, 2021 Aleksandr Mezin

    This file is part of ddterm GNOME Shell extension.

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

'use strict';

const GObject = imports.gi.GObject;
const Gio = imports.gi.Gio;
const Gtk = imports.gi.Gtk;

const Me = imports.misc.extensionUtils.getCurrentExtension();
const { AnimationWidget } = Me.imports.ddterm.pref.animation;
const { BehaviorWidget } = Me.imports.ddterm.pref.behavior;
const { ColorsWidget } = Me.imports.ddterm.pref.colors;
const { CommandWidget } = Me.imports.ddterm.pref.command;
const { CompatibilityWidget } = Me.imports.ddterm.pref.compatibility;
const { PanelIconWidget } = Me.imports.ddterm.pref.panelicon;
const { PositionSizeWidget } = Me.imports.ddterm.pref.positionsize;
const { ScrollingWidget } = Me.imports.ddterm.pref.scrolling;
const { ShortcutsWidget } = Me.imports.ddterm.pref.shortcuts;
const { TabsWidget } = Me.imports.ddterm.pref.tabs;
const { TextWidget } = Me.imports.ddterm.pref.text;

var PrefsWidget = GObject.registerClass({
    Properties: {
        'settings': GObject.ParamSpec.object(
            'settings',
            '',
            '',
            GObject.ParamFlags.READWRITE | GObject.ParamFlags.CONSTRUCT_ONLY,
            Gio.Settings
        ),
        'gettext-context': GObject.ParamSpec.jsobject(
            'gettext-context',
            '',
            '',
            GObject.ParamFlags.READWRITE | GObject.ParamFlags.CONSTRUCT_ONLY
        ),
    },
}, class PrefsWidget extends Gtk.Box {
    _init(params) {
        super._init(params);

        this.hexpand = true;
        this.vexpand = true;
        this.visible = true;

        this.stack = new Gtk.Stack({
            visible: true,
            vhomogeneous: false,
            'transition-type': Gtk.StackTransitionType.SLIDE_UP_DOWN,
        });

        const stack_sidebar = new Gtk.StackSidebar({
            visible: true,
            stack: this.stack,
        });

        if (this.append)
            this.append(stack_sidebar);
        else
            this.pack_start(stack_sidebar, false, true, 0);

        const scrolled_window = new Gtk.ScrolledWindow({
            visible: true,
            'hscrollbar-policy': Gtk.PolicyType.NEVER,
            'propagate-natural-width': true,
            'propagate-natural-height': true,
        });

        const viewport = new Gtk.Viewport({
            visible: true,
        });

        if (viewport.set_child)
            viewport.set_child(this.stack);
        else
            viewport.add(this.stack);

        if (scrolled_window.set_child)
            scrolled_window.set_child(viewport);
        else
            scrolled_window.add(viewport);

        if (this.append)
            this.append(scrolled_window);
        else
            this.pack_end(scrolled_window, true, true, 0);

        this.add_page('position-size', PositionSizeWidget);
        this.add_page('behavior', BehaviorWidget);
        this.add_page('animation', AnimationWidget);
        this.add_page('tabs', TabsWidget);
        this.add_page('text', TextWidget);
        this.add_page('colors', ColorsWidget);
        this.add_page('command', CommandWidget);
        this.add_page('scrolling', ScrollingWidget);
        this.add_page('compatibility', CompatibilityWidget);
        this.add_page('shortcuts', ShortcutsWidget);
        this.add_page('panel-icon', PanelIconWidget);
    }

    add_page(name, widget_type) {
        const widget = new widget_type({
            settings: this.settings,
            gettext_context: this.gettext_context,
        });

        this.stack.add_titled(widget, name, widget.title);
    }
});

/* exported PrefsWidget */
