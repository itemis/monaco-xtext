'use strict';
import * as mode from './xtextMode';

import Emitter = monaco.Emitter;
import IEvent = monaco.IEvent;


declare var require: <T>(moduleId: [string], callback: (module: T) => void) => void;

// Allow for running under nodejs/requirejs in tests
var _monaco: typeof monaco = (typeof monaco === 'undefined' ? (<any>self).monaco : monaco);
// --- CSS configuration and defaults ---------

export class LanguageServiceDefaultsImpl implements monaco.languages.xtext.LanguageServiceDefaults {

	private _onDidChange = new Emitter<monaco.languages.xtext.LanguageServiceDefaults>();
	private _diagnosticsOptions: monaco.languages.xtext.DiagnosticsOptions;
	private _languageId: string;

	constructor(languageId: string, diagnosticsOptions: monaco.languages.xtext.DiagnosticsOptions) {
		this._languageId = languageId;
		this.setDiagnosticsOptions(diagnosticsOptions);
	}

	get onDidChange(): IEvent<monaco.languages.xtext.LanguageServiceDefaults> {
		return this._onDidChange.event;
	}

	get languageId(): string {
		return this._languageId;
	}

	get diagnosticsOptions(): monaco.languages.xtext.DiagnosticsOptions {
		return this._diagnosticsOptions;
	}

	setDiagnosticsOptions(options: monaco.languages.xtext.DiagnosticsOptions): void {
		this._diagnosticsOptions = options || Object.create(null);
		this._onDidChange.fire(this);
	}
}

const diagnosticDefault: monaco.languages.xtext.DiagnosticsOptions = {
	validate: true,
	lint: {
		compatibleVendorPrefixes: 'ignore',
		vendorPrefix: 'warning',
		duplicateProperties: 'warning',
		emptyRules: 'warning',
		importStatement: 'ignore',
		boxModel: 'ignore',
		universalSelector: 'ignore',
		zeroUnits: 'ignore',
		fontFaceProperties: 'warning',
		hexColorLength: 'error',
		argumentsInColorFunction: 'error',
		unknownProperties: 'warning',
		ieHack: 'ignore',
		unknownVendorSpecificProperties: 'ignore',
		propertyIgnoredDueToDisplay: 'warning',
		important: 'ignore',
		float: 'ignore',
		idSelector: 'ignore'
	}
};

export const xtextDefaults = new LanguageServiceDefaultsImpl('mydsl', diagnosticDefault);


// Export API
function createAPI(): typeof monaco.languages.xtext {
	return {
		xtext: xtextDefaults
	};
}
monaco.languages.xtext = createAPI();

// --- Registration to monaco editor ---

export interface UIHooks {
	onRequestStart: (details: any) => void;
	onRequestEnd: (details: any) => void;
	extra: any;
}

const uIHooksDefaults: UIHooks = {
	onRequestStart: (details: any) => {
	},
	onRequestEnd: (details: any) => {
	},
	extra: {},
};

 function withMode(callback: (module: typeof mode) => void): void {
 	require<typeof mode>(['vs/language/mydsl/xtextMode'], callback);
 }

monaco.languages.onLanguage('mydsl', () => {
 	withMode(mode => mode.setupMode(xtextDefaults, uIHooksDefaults));
});

interface ILang extends monaco.languages.ILanguageExtensionPoint {
	module: string;
}

interface ILangImpl {
	conf: monaco.languages.LanguageConfiguration;
	language: monaco.languages.IMonarchLanguage;
}

let languageDefinitions:{[languageId:string]:ILang} = {};

function _loadLanguage(languageId:string): monaco.Promise<void> {
	let module = languageDefinitions[languageId].module;
	return new _monaco.Promise<void>((c, e, p) => {
		require<ILangImpl>([module], (mod) => {
			_monaco.languages.setMonarchTokensProvider(languageId, mod.language);
			_monaco.languages.setLanguageConfiguration(languageId, mod.conf);
			c(void 0);
		});
	});
}

let languagePromises:{[languageId:string]: monaco.Promise<void>} = {};

export function loadLanguage(languageId:string): monaco.Promise<void> {
	if (!languagePromises[languageId]) {
		languagePromises[languageId] = _loadLanguage(languageId);
	}
	return languagePromises[languageId];
}

function registerLanguage(def:ILang): void {
	let languageId = def.id;

	languageDefinitions[languageId] = def;
	_monaco.languages.register(def);
	_monaco.languages.onLanguage(languageId, () => {
		loadLanguage(languageId);
	});
}
registerLanguage({
	id: 'mydsl',
	extensions: [ '.mydsl'],
	aliases: [ 'Mydsl', 'mydsl' ],
	module: './mydsl'
});