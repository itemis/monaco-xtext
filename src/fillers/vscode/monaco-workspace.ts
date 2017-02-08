import Emitter = monaco.Emitter;
import IEvent = monaco.IEvent;
import Uri = monaco.Uri;
import IRange = monaco.IRange;
import * as _ from 'lodash';

import {
	DocumentSelector, DocumentFilter,
	DidOpenTextDocumentParams,
} from 'vscode-languageclient';
import {
	TextDocumentItem, Position, TextDocument, Range
} from 'vscode-languageserver-types';

import {
	TextLine,
	TextDocumentContentChangeEvent, TextDocumentChangeEvent,MonacoTextDocument, MonacoRange
} from './monaco-text-document';
import * as vscodeToMonaco from './vscode-to-monaco-utils';

export class MonacoWorkspaceConfig {
	private _id: string = 'langserver-antha';
	private _sections: {};

	constructor(id: string = 'langserver-antha') {
		this._id = id;
		this.parseSections();
	}

	private parseSections() {
		const STORAGE_KEY = 'monaco.workspace.langserver-antha';
		const TRACE_DEFAULT = 'messages';

		let trace = TRACE_DEFAULT;

		let langserverStr = localStorage.getItem(STORAGE_KEY);
		if (langserverStr) {
			let langserverJson = JSON.parse(langserverStr);
			trace = _.get(langserverJson, 'trace.server', TRACE_DEFAULT);
		}

		this._sections = {
			'trace.server': trace
		};
	}

	get id() {
		return this._id;
	}

	get(section, defaultValue) {
		try {
			let value = this._sections[section];

			if (value) {
				return value;
			} else {
				return defaultValue;
			}
		} catch (err) {
			return defaultValue;
		}
	}
}

export class MonacoWorkspace {
	public static ROOT_PATH: string = '/Users/schill/dev/itemisrepos/xtext-languageserver-example/demo';

	private _workspaceConfigs: MonacoWorkspaceConfig[];
	private _textDocuments: TextDocument[] = [];
	private _onDidOpenTextDocument = new Emitter<TextDocument>();
	private _onDidChangeTextDocument = new Emitter<TextDocumentChangeEvent>();
	private _onDidSaveTextDocument = new Emitter<TextDocument>(); // noop
	private _onDidCloseTextDocument = new Emitter<TextDocument>();
	public rootPath: string;

	private constructor(rootPath: string = MonacoWorkspace.ROOT_PATH, workspaceConfigs = [new MonacoWorkspaceConfig()]) {
		this.rootPath = rootPath;
		this._workspaceConfigs = workspaceConfigs;

		monaco.editor.onDidCreateModel(this._onModelAdd.bind(this));
		monaco.editor.onWillDisposeModel(this._onModelRemove.bind(this));
		monaco.editor.getModels().forEach(this._onModelAdd, this);

		// todo
		// this._disposables.push()
	}

	static create(): MonacoWorkspace {
		// const STORAGE_KEY = 'monaco.workspace';

		// let monacoWorkspace = new MonacoWorkspace();

		// let workspaceStr = localStorage.getItem(STORAGE_KEY);
		// if (workspaceStr) {
		// 	try {
		// 		let workspace = JSON.parse(workspaceStr);
		// 		let rootPath = workspace.rootPath ? workspace.rootPath : MonacoWorkspace.ROOT_PATH;

		// 		monacoWorkspace = new MonacoWorkspace(rootPath);
		// 	} catch (err) {
		// 		console.error('MonacoWorkspace.create: ', err);
		// 	}
		// } else {
		// 	let workspace = JSON.stringify({
		// 		rootPath: monacoWorkspace.rootPath
		// 	});
		// 	localStorage.setItem(STORAGE_KEY, workspace);
		// }

		let monacoWorkspace = new MonacoWorkspace(MonacoWorkspace.ROOT_PATH);
		return monacoWorkspace;
	}

	// private static setRootPath(monacoWorkspace: MonacoWorkspace) {
	// 	let workspaceStr = localStorage.getItem(STORAGE_KEY);
	// 	if (workspaceStr) {
	// 		try {
	// 			let workspace = JSON.parse(workspaceStr);
	// 			let rootPath = workspace.rootPath ? workspace.rootPath : MonacoWorkspace.ROOT_PATH;

	// 			monacoWorkspace = new MonacoWorkspace(rootPath);
	// 		} catch (err) {
	// 			console.error('MonacoWorkspace.create: ', err);
	// 		}
	// 	} else {
	// 		let workspace = JSON.stringify({
	// 			rootPath: monacoWorkspace.rootPath
	// 		});
	// 		localStorage.setItem(STORAGE_KEY, workspace);
	// 	}
	// }

	get onDidOpenTextDocument(): IEvent<TextDocument> {
		return this._onDidOpenTextDocument.event;
	}

	get onDidChangeTextDocument(): IEvent<TextDocumentChangeEvent> {
		return this._onDidChangeTextDocument.event;
	}

	get onDidSaveTextDocument(): IEvent<TextDocument> {
		return this._onDidSaveTextDocument.event;
	}

	get onDidCloseTextDocument(): IEvent<TextDocument> {
		return this._onDidCloseTextDocument.event;
	}

	private _onModelAdd(model: monaco.editor.IModel): void {
		let textDocument = new MonacoTextDocument(model);

		this._textDocuments.push(textDocument);
		this._onDidOpenTextDocument.fire(textDocument);

		model.onDidChangeContent((e: monaco.editor.IModelContentChangedEvent2) => {
			let textDocumentChangeEvent = this._toTextDocumentContentChangeEvent(e);

			let document = textDocument;
			let contentChanges: TextDocumentContentChangeEvent[] = [
				textDocumentChangeEvent
			];

			let event: TextDocumentChangeEvent = {
				document,
				contentChanges,
			};
			this._onDidChangeTextDocument.fire(event);
		});
	}

	private _onModelRemove(model: monaco.editor.IModel): void {
		let textDocument = new MonacoTextDocument(model);
		this._onDidCloseTextDocument.fire(textDocument);
	}

	get textDocuments() {
		return this._textDocuments;
	}

	getConfiguration(id: string): MonacoWorkspaceConfig | undefined {
		return this._workspaceConfigs.find((config: MonacoWorkspaceConfig) => {
			return config.id === id;
		});
	}

	private _toTextDocumentContentChangeEvent(e: monaco.editor.IModelContentChangedEvent2): TextDocumentContentChangeEvent {
		let rangex = monaco.Range.lift(e.range);
		let rangeLength = e.rangeLength;
		let text = e.text;

		let start : Position = {
			line : rangex.startLineNumber - 1,
			character : rangex.startColumn - 1
		};

		let end : Position = {
				line : rangex.endLineNumber - 1,
				character : rangex.endColumn - 1
		}

		
			return {
				range : new MonacoRange(start, end),
				rangeLength : rangeLength,
				text : text
			};
		

		
	}
}