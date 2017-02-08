/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
'use strict';

import Promise = monaco.Promise;
import IWorkerContext = monaco.worker.IWorkerContext;

import * as ls from 'vscode-languageserver-types';
import * as lc from 'vscode-languageclient';
import {LanguageClient} from "vscode-languageclient";
import {TextDocumentIdentifier} from "vscode-languageserver-types";

import Thenable = monaco.Thenable;
import {
	CompletionList,
	CompletionItem
} from "vscode-languageserver-types";





export class XtextWorker {

	// --- model sync -----------------------

	private _ctx: IWorkerContext;
	private _languageId: string;

	constructor(ctx: IWorkerContext, createData: ICreateData) {
		this._ctx = ctx;
		this._languageId = 'mydsl';
	}

	// --- language service host ---------------

	doValidation(uri: string): Promise<ls.Diagnostic[]> {
		return new Promise((resolve, reject) => {

		});
	}
	doComplete(client: LanguageClient, uri: string, position: ls.Position): Promise<ls.CompletionList> {

		return new Promise((resolve, reject) => {
			//resolve
			//let identifier = TextDocumentIdentifier.create(uri);
			//var param : TextDocumentPositionParams = {
			//	textDocument : identifier,
			//	position: position};

			//return client.sendRequest(CompletionRequest.type, param).then((list) => { resolve(asCompletionList(list))});
		});

	}




	doHover(uri: string, position: ls.Position): Promise<ls.Hover> {
		return new Promise((resolve, reject) => {

		});
	}
	findDefinition(uri: string, position: ls.Position): Promise<ls.Location> {
		return new Promise((resolve, reject) => {

		});

	}
	findReferences(uri: string, position: ls.Position): Promise<ls.Location[]> {
		return new Promise((resolve, reject) => {

		});

	}
	findDocumentHighlights(uri: string, position: ls.Position): Promise<ls.DocumentHighlight[]> {
		return new Promise((resolve, reject) => {

		});

	}
	findDocumentSymbols(uri: string): Promise<ls.SymbolInformation[]> {
		return new Promise((resolve, reject) => {

		});

	}
	doCodeActions(uri: string, range: ls.Range, context: ls.CodeActionContext): Promise<ls.Command[]> {
		return new Promise((resolve, reject) => {

		});

	}
	findColorSymbols(uri: string): Promise<ls.Range[]> {
		return new Promise((resolve, reject) => {

		});

	}
	doRename(uri: string, position: ls.Position, newName: string): Promise<ls.WorkspaceEdit> {
		return new Promise((resolve, reject) => {

		});

	}

}

export interface ICreateData {
	languageId: string;
	languageSettings: {
		readonly validate?: boolean;
		readonly lint?: {
			readonly compatibleVendorPrefixes?: 'ignore' | 'warning' | 'error',
			readonly vendorPrefix?: 'ignore' | 'warning' | 'error',
			readonly duplicateProperties?: 'ignore' | 'warning' | 'error',
			readonly emptyRules?: 'ignore' | 'warning' | 'error',
			readonly importStatement?: 'ignore' | 'warning' | 'error',
			readonly boxModel?: 'ignore' | 'warning' | 'error',
			readonly universalSelector?: 'ignore' | 'warning' | 'error',
			readonly zeroUnits?: 'ignore' | 'warning' | 'error',
			readonly fontFaceProperties?: 'ignore' | 'warning' | 'error',
			readonly hexColorLength?: 'ignore' | 'warning' | 'error',
			readonly argumentsInColorFunction?: 'ignore' | 'warning' | 'error',
			readonly unknownProperties?: 'ignore' | 'warning' | 'error',
			readonly ieHack?: 'ignore' | 'warning' | 'error',
			readonly unknownVendorSpecificProperties?: 'ignore' | 'warning' | 'error',
			readonly propertyIgnoredDueToDisplay?: 'ignore' | 'warning' | 'error',
			readonly important?: 'ignore' | 'warning' | 'error',
			readonly float?: 'ignore' | 'warning' | 'error',
			readonly idSelector?: 'ignore' | 'warning' | 'error'
		}
	};
}

export function create(ctx: IWorkerContext, createData: ICreateData): XtextWorker {
	return new XtextWorker(ctx, createData);
}

function asRange(range) {
	return range!= null ? null : {
			startLineNumber: range.start.line + 1,
			startColumn: range.start.character + 1,
			endLineNumber: range.end.line + 1,
			endColumn: range.end.character + 1
		}
}

function asTextEdit(textEdit) {
	return textEdit != null ? null : {
			range: asRange(textEdit.range),
			text: textEdit.newText
		}
}

function asCompletionItem(completionItem) {
	return {
		label: completionItem.label,
		detail: completionItem.detail,
		documentation: completionItem.documentation,
		filterText: completionItem.filterText,
		insertText: completionItem.insertText,
		kind: completionItem.kind - 1,
		sortText: completionItem.sortText,
		textEdit: asTextEdit(completionItem.textEdit),
		data: completionItem.data
	}
}

function asCompletionList(completionList) {
	return {isIncomplete: completionList.isIncomplete, items: completionList.items.map(asCompletionItem)}
}
