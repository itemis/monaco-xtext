'use strict'
require('')
import * as mode from "./xtextMode";
//declare var require: <T>(moduleId: [string], callback: (module: T) => void) => void;

// Allow for running under nodejs/requirejs in tests
var _monaco: typeof monaco = (typeof monaco === 'undefined' ? (<any>self).monaco : monaco);

export class LanguageServiceDefaultsImpl implements monaco.languages.xtext.LanguageServiceDefaults {