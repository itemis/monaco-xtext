/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { LocalizeInfo, LocalizeFunc, Options, LoadFunc } from 'vscode-nls';

export { LocalizeInfo, LocalizeFunc, Options, LoadFunc };

function format(message: string, args: any[]): string {
	let result: string;

	if (args.length === 0) {
		result = message;
	} else {
		result = message.replace(/\{(\d+)\}/g, (match, rest) => {
			let index = rest[0];
			return typeof args[index] !== 'undefined' ? args[index] : match;
		});
	}
	return result;
}

function localize(key: string | LocalizeInfo, message: string, ...args: any[]): string {
	if (key) { }

	return format(message, args);
}

export function loadMessageBundle(file?: string): LocalizeFunc {
	if (file) { }

	return localize;
}

export function config(opt?: Options | string): LoadFunc {
	if (opt) { }

	return loadMessageBundle;
}