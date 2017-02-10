/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
'use strict';

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

	let languageId = defaults.languageId;
	disposables.push(monaco.languages.registerCompletionItemProvider(languageId, new languageFeatures.CompletionAdapter(languageClient)));
	disposables.push(monaco.languages.registerHoverProvider(languageId, new languageFeatures.HoverAdapter(languageClient)));
	disposables.push(monaco.languages.registerDocumentHighlightProvider(languageId, new languageFeatures.DocumentHighlightAdapter(languageClient)));
	disposables.push(monaco.languages.registerDefinitionProvider(languageId, new languageFeatures.DefinitionAdapter(languageClient)));
	disposables.push(monaco.languages.registerReferenceProvider(languageId, new languageFeatures.ReferenceAdapter(languageClient)));
	disposables.push(monaco.languages.registerDocumentSymbolProvider(languageId, new languageFeatures.DocumentSymbolAdapter(languageClient)));
	disposables.push(monaco.languages.registerRenameProvider(languageId, new languageFeatures.RenameAdapter(languageClient)));
	return disposables;
}
