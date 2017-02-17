'use strict'


import * as mydsl from "./mydsl"
import Emitter = monaco.Emitter;
import IEvent = monaco.IEvent;
import MonacoPromise = monaco.Promise;
import Uri = monaco.Uri;
import IDisposable = monaco.IDisposable;
import { LanguageClient } from 'vscode-languageclient';
import {
    MonacoLanguageClient
} from './language-client/monaco-language-client';
const vscode =  require("vscode");

declare var require: {
    <T>(path: string): T;
    (paths: string[], callback: (...modules: any[]) => void): void;
    ensure: (paths: string[], callback: (require: <T>(path: string) => T) => void) => void;
};

export interface UIHooks {
    onRequestStart: (details: any) => void;
    onRequestEnd: (details: any) => void;
    extra: any;
}

window.onload = function(){
    registerLanguage({
        id: 'mydsl',
        extensions: [ '.mydsl'],
        aliases: [ 'Mydsl', 'mydsl' ],
        module: './mydsl'
    });

    var path = "/Users/schill/dev/itemisrepos/xtext-languageserver-example/demo/foo.mydsl";
    var uri = monaco.Uri.file(path);
    var model = monaco.editor.createModel('Hello foo !', "mydsl", uri);
    var editor = monaco.editor.create(document.getElementById('container'), {
        model: model
    });


}
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

export interface ILangImpl {
    conf: monaco.languages.LanguageConfiguration;
    language: monaco.languages.IMonarchLanguage;
}
export interface ILang extends monaco.languages.ILanguageExtensionPoint {
    module: string;
}

let languageDefinitions:{[languageId:string]:ILang} = {};

export function regsiterLanguage(languageId:string): void {
    var language = languageDefinitions[languageId];
    monaco.languages.setMonarchTokensProvider(languageId, mydsl.language);
    monaco.languages.setLanguageConfiguration(languageId, mydsl.conf);
    let disposables: IDisposable[] = [];

    let languageClient: LanguageClient = MonacoLanguageClient.create(uIHooksDefaults);
    disposables.push(languageClient.start());
}

function registerLanguage(def:ILang): void {
    let languageId = def.id;

    languageDefinitions[languageId] = def;
    monaco.languages.register(def);
    monaco.languages.onLanguage(languageId, () => {
       regsiterLanguage(languageId);
    });
}

