/*
    Copyright © 2023 Aleksandr Mezin

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

import GLib from 'gi://GLib';
import Gio from 'gi://Gio';

import System from 'system';

import { get_resource_text } from './resources.js';

export class HeapDumper {
    constructor() {
        this.dbus = Gio.DBusExportedObject.wrapJSObject(
            get_resource_text('../com.github.amezin.ddterm.HeapDump.xml'),
            this
        );
    }

    GC() {
        System.gc();
    }

    Dump(path) {
        if (!path) {
            path = GLib.build_filenamev([
                GLib.get_user_state_dir(),
                this.application_id,
            ]);
            GLib.mkdir_with_parents(path, 0o700);
        }

        if (GLib.file_test(path, GLib.FileTest.IS_DIR)) {
            path = GLib.build_filenamev([
                path,
                `${this.application_id}-${new Date().toISOString().replace(/:/g, '-')}.heap`,
            ]);
        }

        printerr(`Dumping heap to ${path}`);
        System.dumpHeap(path);
        printerr(`Dumped heap to ${path}`);

        return path;
    }
}
