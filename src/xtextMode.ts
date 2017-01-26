/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
'use strict';

import { WorkerManager } from './workerManager';
import { XtextWorker } from './xtextWorker';
import { LanguageServiceDefaultsImpl, UIHooks } from './monaco.contribution';
import * as languageFeatures from './languageFeatures';
import { LanguageClient } from 'vscode-languageclient';
import {
	MonacoLanguageClient
} from './language-client/monaco-language-client';

import MonacoPromise = monaco.Promise;
import Uri = monaco.Uri;
import IDisposable = monaco.IDisposable;

export function setupMode(defaults: LanguageServiceDefaultsImpl, uiHooks: UIHooks): IDisposable[] {
	let disposables: IDisposable[] = [];

	let languageClient: LanguageClient = MonacoLanguageClient.create(uiHooks);
	disposables.push(languageClient.start());

	const client = new WorkerManager(defaults);
	disposables.push(client);

	const worker = (first: Uri, ...more: Uri[]): MonacoPromise<XtextWorker> => {
		return client.getLanguageServiceWorker(...[first].concat(more));
	};

	let languageId = defaults.languageId;
	return disposables;
}
