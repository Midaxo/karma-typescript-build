"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Compiler = void 0;
var lodash = require("lodash");
var ts = require("typescript");
var benchmark_1 = require("../shared/benchmark");
var project_1 = require("../shared/project");
var Compiler = /** @class */ (function () {
    function Compiler(config, log, project) {
        var _this = this;
        this.config = config;
        this.log = log;
        this.project = project;
        this.compiledFiles = {};
        this.emitQueue = [];
        this.errors = [];
        this.getSourceFile = function (filename, languageVersion, onError) {
            if (_this.cachedProgram && !_this.isQueued(filename)) {
                var sourceFile = _this.cachedProgram.getSourceFile(filename);
                if (sourceFile) {
                    return sourceFile;
                }
            }
            return _this.hostGetSourceFile(filename, languageVersion, onError);
        };
        config.whenReady(function () {
            _this.log.debug("Setting up deferred project compilation");
            _this.compileDeferred = lodash.debounce(function () {
                _this.compileProject();
            }, _this.config.compilerDelay);
        });
    }
    Compiler.prototype.compile = function (file, callback) {
        this.emitQueue.push({
            callback: callback,
            file: file
        });
        this.compileDeferred();
    };
    Compiler.prototype.compileProject = function () {
        this.log.info("Compiling project using Typescript %s", ts.version);
        if (this.project.handleFileEvent() === project_1.EventType.FileSystemChanged) {
            this.setupRecompile();
        }
        var benchmark = new benchmark_1.Benchmark();
        var tsconfig = this.project.getTsconfig();
        this.outputDiagnostics(tsconfig.errors);
        if (+ts.version[0] >= 3) {
            this.program = ts.createProgram({
                host: this.compilerHost,
                options: tsconfig.options,
                projectReferences: tsconfig.projectReferences,
                rootNames: tsconfig.fileNames
            });
        }
        else {
            this.program = ts.createProgram(tsconfig.fileNames, tsconfig.options, this.compilerHost);
        }
        this.cachedProgram = this.program;
        this.runDiagnostics(this.program, this.compilerHost);
        this.program.emit();
        this.log.info("Compiled %s files in %s ms.", tsconfig.fileNames.length, benchmark.elapsed());
        this.onProgramCompiled();
    };
    Compiler.prototype.setupRecompile = function () {
        var _this = this;
        this.cachedProgram = undefined;
        this.compilerHost = ts.createCompilerHost(this.project.getTsconfig().options);
        this.hostGetSourceFile = this.compilerHost.getSourceFile;
        this.compilerHost.getSourceFile = this.getSourceFile;
        this.compilerHost.writeFile = function (filename, text) {
            _this.compiledFiles[filename] = text;
        };
    };
    Compiler.prototype.onProgramCompiled = function () {
        var _this = this;
        this.emitQueue.forEach(function (queued) {
            var sourceFile = _this.program.getSourceFile(queued.file.originalPath);
            if (!sourceFile) {
                throw new Error("No source found for " + queued.file.originalPath + "!\n" +
                    "Is there a mismatch between the Typescript compiler options and the Karma config?");
            }
            var ambientModuleNames = sourceFile.ambientModuleNames;
            queued.callback({
                ambientModuleNames: ambientModuleNames,
                hasError: _this.config.stopOnFailure ? _this.errors.indexOf(queued.file.originalPath) !== -1 : false,
                isAmbientModule: ambientModuleNames && ambientModuleNames.length > 0,
                isDeclarationFile: _this.fileExtensionIs(sourceFile.fileName, ".d.ts"),
                outputText: _this.compiledFiles[queued.file.path],
                sourceFile: sourceFile,
                sourceMapText: _this.compiledFiles[queued.file.path + ".map"]
            });
        });
        this.emitQueue.length = 0;
    };
    Compiler.prototype.isQueued = function (filename) {
        for (var _i = 0, _a = this.emitQueue; _i < _a.length; _i++) {
            var queued = _a[_i];
            if (queued.file.originalPath === filename) {
                return true;
            }
        }
        return false;
    };
    Compiler.prototype.runDiagnostics = function (program, host) {
        this.errors = [];
        var diagnostics = ts.getPreEmitDiagnostics(program);
        this.outputDiagnostics(diagnostics, host);
    };
    Compiler.prototype.outputDiagnostics = function (diagnostics, host) {
        var _this = this;
        if (!diagnostics || diagnostics.length === 0) {
            return;
        }
        diagnostics.forEach(function (diagnostic) {
            if (diagnostic.file) {
                _this.errors.push(diagnostic.file.fileName);
            }
            if (ts.formatDiagnostics && host) { // v1.8+
                _this.log.error(ts.formatDiagnostics([diagnostic], host));
            }
            else { // v1.6, v1.7
                var output = "";
                if (diagnostic.file) {
                    var loc = ts.getLineAndCharacterOfPosition(diagnostic.file, diagnostic.start);
                    output += diagnostic.file.fileName.replace(process.cwd(), "") +
                        "(" + (loc.line + 1) + "," + (loc.character + 1) + "): ";
                }
                var category = ts.DiagnosticCategory[diagnostic.category].toLowerCase();
                output += category + " TS" + diagnostic.code + ": " +
                    ts.flattenDiagnosticMessageText(diagnostic.messageText, ts.sys.newLine) + ts.sys.newLine;
                _this.log.error(output);
            }
        });
        if (this.project.getTsconfig().options.noEmitOnError) {
            ts.sys.exit(ts.ExitStatus.DiagnosticsPresent_OutputsSkipped);
        }
    };
    Compiler.prototype.fileExtensionIs = function (path, extension) {
        return path.length > extension.length && this.endsWith(path, extension);
    };
    Compiler.prototype.endsWith = function (str, suffix) {
        var expectedPos = str.length - suffix.length;
        return expectedPos >= 0 && str.indexOf(suffix, expectedPos) === expectedPos;
    };
    return Compiler;
}());
exports.Compiler = Compiler;
//# sourceMappingURL=compiler.js.map