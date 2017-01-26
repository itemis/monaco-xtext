/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

var gulp = require('gulp');
var ts = require('gulp-typescript');
var assign = require('object-assign');
var fs = require('fs');
var path = require('path');
var merge = require('merge-stream');
var rjs = require('gulp-requirejs');
var uglify = require('gulp-uglify');
var rimraf = require('rimraf');
var es = require('event-stream');

gulp.task('clean-release', function (cb) { rimraf('release', { maxBusyTries: 1 }, cb); });
gulp.task('release', ['clean-release', 'compile'], function () {

	var sha1 = getGitVersion(__dirname);
	var semver = require('./package.json').version;
	var headerVersion = semver + '(' + sha1 + ')';

	var BUNDLED_FILE_HEADER = [
		'/*!-----------------------------------------------------------------------------',
		' * Copyright (c) Microsoft Corporation. All rights reserved.',
		' * monaco-go version: ' + headerVersion,
		' * Released under the MIT license',
		' * https://github.com/mbana/monaco-go/blob/master/LICENSE.md',
		' *-----------------------------------------------------------------------------*/',
		''
	].join('\n');

	var jsonrpcLocation = __dirname + '/node_modules/vscode-jsonrpc/lib';
	if (!fs.existsSync(jsonrpcLocation)) {
		var oldLocation = __dirname + '/node_modules/vscode-languageclient/node_modules/vscode-jsonrpc/lib';
		if (!fs.existsSync(oldLocation)) {
			console.error('Unable to find vscode-languageclient node module at ' + jsonrpcLocation + ' or ' + oldLocation);
			return;
		}
		jsonrpcLocation = oldLocation;
	}

	function bundleOne(moduleId, exclude) {

		console.log(__dirname);
		return rjs({
			baseUrl: '/out/',
			name: 'vs/language/xtext/' + moduleId,
			out: moduleId + '.js',
			exclude: exclude,
			paths: {
				'vs/language/xtext': __dirname + '/out'
			},
			packages: [{
				name: 'vscode-languageserver-types',
				location: __dirname + '/node_modules/vscode-languageserver-types/lib'
			}, {
				name: 'vscode-jsonrpc',
				location: jsonrpcLocation
			}, {
				name: 'vscode-languageclient',
				location: __dirname + '/node_modules/vscode-languageclient/lib'
			}, {
				name: 'vscode-nls',
				location: __dirname + '/out/fillers',
				main: 'vscode-nls'
			}, {
				name: 'vscode',
				location: __dirname + '/out/fillers',
				main: 'vscode'
			}, {
				name: 'child_process',
				location: __dirname + '/out/fillers',
				main: 'child_process'
			}, {
				name: 'net',
				location: __dirname + '/out/fillers',
				main: 'net'
			}, {
				name: 'path',
				location: __dirname + '/out/fillers',
				main: 'path'
			}, {
				name: 'os',
				location: __dirname + '/out/fillers',
				main: 'os'
			},{
				name: 'lodash',
				location: __dirname + '/node_modules/lodash',
				main: 'lodash'
			}]
		})
	}

	return merge(
		merge(
			bundleOne('monaco.contribution', ['vs/language/xtext/xtextMode']),
			bundleOne('xtextMode', ['vscode-languageclient', 'vscode-languageserver-types','vscode-jsonrpc', 'vscode-languageserver-types','vscode-nls','vscode','child_process','net','path','os','lodash']),
			bundleOne('xtextWorker', ['vscode-languageclient', 'vscode-languageserver-types','vscode-jsonrpc', 'vscode-languageserver-types','vscode-nls','vscode','child_process','net','path','os','lodash'])
		)
			.pipe(es.through(function (data) {
				data.contents = new Buffer(
					BUNDLED_FILE_HEADER
					+ data.contents.toString()
				);
				this.emit('data', data);
			}))
			.pipe(gulp.dest('./release/dev'))
			.pipe(uglify({
				preserveComments: 'some'
			}))
			.pipe(gulp.dest('./release/min')),
		gulp.src('src/monaco.d.ts').pipe(gulp.dest('./release/min'))
	);
});

var tsProject = ts.createProject('./tsconfig.json');
function compileTask() {
    var tsResult = tsProject.src()
        .pipe(tsProject());

    return tsResult.js.pipe(gulp.dest('out'));
}

gulp.task('clean-out', function (cb) { rimraf('out', { maxBusyTries: 1 }, cb); });
gulp.task('compile', ['clean-out'], compileTask);
gulp.task('compile-without-clean', compileTask);
gulp.task('watch', ['compile'], function () {
	gulp.watch(tsSources, ['compile-without-clean']);
});


/**
 * Escape text such that it can be used in a javascript string enclosed by double quotes (")
 */
function escapeText(text) {
	// http://www.javascriptkit.com/jsref/escapesequence.shtml
	// \b	Backspace.
	// \f	Form feed.
	// \n	Newline.
	// \O	Nul character.
	// \r	Carriage return.
	// \t	Horizontal tab.
	// \v	Vertical tab.
	// \'	Single quote or apostrophe.
	// \"	Double quote.
	// \\	Backslash.
	// \ddd	The Latin-1 character specified by the three octal digits between 0 and 377. ie, copyright symbol is \251.
	// \xdd	The Latin-1 character specified by the two hexadecimal digits dd between 00 and FF.  ie, copyright symbol is \xA9.
	// \udddd	The Unicode character specified by the four hexadecimal digits dddd. ie, copyright symbol is \u00A9.
	var _backspace = '\b'.charCodeAt(0);
	var _formFeed = '\f'.charCodeAt(0);
	var _newLine = '\n'.charCodeAt(0);
	var _nullChar = 0;
	var _carriageReturn = '\r'.charCodeAt(0);
	var _tab = '\t'.charCodeAt(0);
	var _verticalTab = '\v'.charCodeAt(0);
	var _backslash = '\\'.charCodeAt(0);
	var _doubleQuote = '"'.charCodeAt(0);

	var startPos = 0, chrCode, replaceWith = null, resultPieces = [];

	for (var i = 0, len = text.length; i < len; i++) {
		chrCode = text.charCodeAt(i);
		switch (chrCode) {
			case _backspace:
				replaceWith = '\\b';
				break;
			case _formFeed:
				replaceWith = '\\f';
				break;
			case _newLine:
				replaceWith = '\\n';
				break;
			case _nullChar:
				replaceWith = '\\0';
				break;
			case _carriageReturn:
				replaceWith = '\\r';
				break;
			case _tab:
				replaceWith = '\\t';
				break;
			case _verticalTab:
				replaceWith = '\\v';
				break;
			case _backslash:
				replaceWith = '\\\\';
				break;
			case _doubleQuote:
				replaceWith = '\\"';
				break;
		}
		if (replaceWith !== null) {
			resultPieces.push(text.substring(startPos, i));
			resultPieces.push(replaceWith);
			startPos = i + 1;
			replaceWith = null;
		}
	}
	resultPieces.push(text.substring(startPos, len));
	return resultPieces.join('');
}

function getGitVersion(repo) {
	var git = path.join(repo, '.git');
	var headPath = path.join(git, 'HEAD');
	var head;

	try {
		head = fs.readFileSync(headPath, 'utf8').trim();
	} catch (e) {
		return void 0;
	}

	if (/^[0-9a-f]{40}$/i.test(head)) {
		return head;
	}

	var refMatch = /^ref: (.*)$/.exec(head);

	if (!refMatch) {
		return void 0;
	}

	var ref = refMatch[1];
	var refPath = path.join(git, ref);

	try {
		return fs.readFileSync(refPath, 'utf8').trim();
	} catch (e) {
		// noop
	}

	var packedRefsPath = path.join(git, 'packed-refs');
	var refsRaw;

	try {
		refsRaw = fs.readFileSync(packedRefsPath, 'utf8').trim();
	} catch (e) {
		return void 0;
	}

	var refsRegex = /^([0-9a-f]{40})\s+(.+)$/gm;
	var refsMatch;
	var refs = {};

	while (refsMatch = refsRegex.exec(refsRaw)) {
		refs[refsMatch[2]] = refsMatch[1];
	}

	return refs[ref];
}