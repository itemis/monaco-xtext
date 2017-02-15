'use strict'

import {LanguageClient} from "vscode-languageclient"
import {} from "vscode"

declare var require: {
    <T>(path: string): T;
    (paths: string[], callback: (...modules: any[]) => void): void;
    ensure: (paths: string[], callback: (require: <T>(path: string) => T) => void) => void;
};
declare var require2: <T>(moduleId: [string], callback: (module: T) => void) => void;


window.onload = function(){
    var path = "/Users/schill/dev/itemisrepos/xtext-languageserver-example/demo/foo.mydsl";
    var uri = monaco.Uri.file(path);
    var model = monaco.editor.createModel('Hello foo !', "mydsl", uri);
    var editor = monaco.editor.create(document.getElementById('container'), {
        model: model
    });

}

interface ILang extends monaco.languages.ILanguageExtensionPoint {
    module: string;
}

interface ILangImpl {
    conf: monaco.languages.LanguageConfiguration;
    language: monaco.languages.IMonarchLanguage;
}

let languageDefinitions:{[languageId:string]:ILang} = {};

function _loadLanguage(languageId:string): monaco.Promise<void> {
    LanguageClient
    let module = languageDefinitions[languageId].module;
    return new monaco.Promise<void>((c, e, p) => {
        require2<ILangImpl>([module], (mod) => {
            monaco.languages.setMonarchTokensProvider(languageId, mod.language);
            monaco.languages.setLanguageConfiguration(languageId, mod.conf);
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
    monaco.languages.register(def);
    monaco.languages.onLanguage(languageId, () => {
        loadLanguage(languageId);
    });
}
registerLanguage({
    id: 'mydsl',
    extensions: [ '.mydsl'],
    aliases: [ 'Mydsl', 'mydsl' ],
    module: './mydsl'
});