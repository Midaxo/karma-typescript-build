"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Resolver = void 0;
var async = require("async");
var browserResolve = require("browser-resolve");
var fs = require("fs");
var os = require("os");
var path = require("path");
var bundle_item_1 = require("../bundle-item");
var PathTool = require("../../shared/path-tool");
var Resolver = /** @class */ (function () {
    function Resolver(config, dependencyWalker, log, sourceReader) {
        this.config = config;
        this.dependencyWalker = dependencyWalker;
        this.log = log;
        this.sourceReader = sourceReader;
        this.bowerPackages = {};
        this.filenameCache = [];
        this.lookupNameCache = {};
    }
    Resolver.prototype.initialize = function () {
        this.shims = this.config.bundlerOptions.addNodeGlobals ?
            require("./shims") : undefined;
        this.log.debug(this.shims);
        this.cacheBowerPackages();
    };
    Resolver.prototype.resolveModule = function (requiringModule, bundleItem, buffer, onModuleResolved) {
        var _this = this;
        if (bundleItem.isTypescriptFile() && !bundleItem.isNpmModule()) {
            process.nextTick(function () {
                onModuleResolved(bundleItem);
            });
            return;
        }
        if (bundleItem.isTypingsFile() && !bundleItem.isNpmModule()) {
            this.tryResolveTypingAsJavascript(bundleItem, onModuleResolved);
            return;
        }
        bundleItem.lookupName = bundleItem.isNpmModule() ?
            bundleItem.moduleName :
            path.join(path.dirname(requiringModule), bundleItem.moduleName);
        if (this.lookupNameCache[bundleItem.lookupName]) {
            bundleItem.filename = this.lookupNameCache[bundleItem.lookupName];
            process.nextTick(function () {
                onModuleResolved(bundleItem);
            });
            return;
        }
        if (this.config.bundlerOptions.exclude.indexOf(bundleItem.moduleName) !== -1) {
            this.log.debug("Excluding module %s from %s", bundleItem.moduleName, requiringModule);
            process.nextTick(function () {
                onModuleResolved(bundleItem);
            });
            return;
        }
        var onFilenameResolved = function () {
            _this.lookupNameCache[bundleItem.lookupName] = bundleItem.filename;
            if (_this.isInFilenameCache(bundleItem) || bundleItem.isTypescriptFile()) {
                process.nextTick(function () {
                    onModuleResolved(bundleItem);
                });
            }
            else {
                _this.filenameCache.push(bundleItem.filename);
                _this.sourceReader.read(bundleItem, function () {
                    _this.resolveDependencies(bundleItem, buffer, onDependenciesResolved);
                });
            }
        };
        var onDependenciesResolved = function () {
            buffer.push(bundleItem);
            return onModuleResolved(bundleItem);
        };
        this.resolveFilename(requiringModule, bundleItem, onFilenameResolved);
    };
    Resolver.prototype.tryResolveTypingAsJavascript = function (bundleItem, onModuleResolved) {
        var _this = this;
        var jsfile = bundleItem.filename.replace(/.d.ts$/i, ".js");
        fs.stat(jsfile, function (error, stats) {
            if (!error && stats) {
                _this.log.debug("Resolving %s to %s", bundleItem.filename, jsfile);
                bundleItem.filename = jsfile;
            }
            onModuleResolved(bundleItem);
        });
    };
    Resolver.prototype.cacheBowerPackages = function () {
        var _this = this;
        try {
            var bower = require("bower");
            bower.commands
                .list({ map: true }, { offline: true })
                .on("end", function (map) {
                Object.keys(map.dependencies).forEach(function (moduleName) {
                    var pkg = map.dependencies[moduleName];
                    var files = ["index.js", moduleName + ".js"];
                    if (pkg.pkgMeta && pkg.pkgMeta.main) {
                        if (Array.isArray(pkg.pkgMeta.main)) {
                            pkg.pkgMeta.main.forEach(function (file) {
                                files.push(file);
                            });
                        }
                        else {
                            files.push(pkg.pkgMeta.main);
                        }
                    }
                    files.forEach(function (file) {
                        try {
                            var main = path.join(pkg.canonicalDir, file);
                            fs.statSync(main);
                            _this.bowerPackages[moduleName] = main;
                        }
                        catch (error) {
                            // noop
                        }
                    });
                });
                _this.log.debug("Cached bower packages: %s %s", os.EOL, JSON.stringify(_this.bowerPackages, null, 2));
            });
        }
        catch (error) {
            this.log.debug("No bower detected, skipping");
        }
    };
    Resolver.prototype.isInFilenameCache = function (bundleItem) {
        return this.filenameCache.indexOf(bundleItem.filename) !== -1;
    };
    Resolver.prototype.resolveCompilerPathModulename = function (bundleItem) {
        var moduleName = bundleItem.moduleName;
        if (bundleItem.isNpmModule() && bundleItem.isTypingsFile() &&
            bundleItem.filename.indexOf(bundleItem.moduleName) === -1) {
            var filename = PathTool.fixWindowsPath(bundleItem.filename);
            var matches = filename.match(/\/node_modules\/(.*)\//);
            if (matches && matches[1]) {
                moduleName = matches[1];
                this.log.debug("Resolved module name [%s] to [%s]", bundleItem.moduleName, moduleName);
            }
        }
        return moduleName;
    };
    Resolver.prototype.resolveFilename = function (requiringModule, bundleItem, onFilenameResolved) {
        var _this = this;
        var moduleName = this.resolveCompilerPathModulename(bundleItem);
        if (this.bowerPackages[moduleName]) {
            bundleItem.filename = this.bowerPackages[moduleName];
            this.log.debug("Resolved [%s] to bower package: %s", moduleName, bundleItem.filename);
            return onFilenameResolved();
        }
        if (this.config.bundlerOptions.resolve.alias[moduleName]) {
            var alias = this.config.bundlerOptions.resolve.alias[moduleName];
            var relativePath = path.relative(this.config.karma.basePath, alias);
            bundleItem.filename = path.join(this.config.karma.basePath, relativePath);
            this.log.debug("Resolved [%s] to alias: %s", moduleName, bundleItem.filename);
            return onFilenameResolved();
        }
        var bopts = {
            extensions: this.config.bundlerOptions.resolve.extensions,
            filename: requiringModule,
            moduleDirectory: this.config.bundlerOptions.resolve.directories,
            modules: this.shims
        };
        browserResolve(moduleName, bopts, function (error, filename) {
            if (!error) {
                bundleItem.filename = fs.realpathSync(filename);
                return onFilenameResolved();
            }
            bopts = {
                basedir: bundleItem.filename ? path.dirname(bundleItem.filename) : _this.config.karma.basePath,
                extensions: _this.config.bundlerOptions.resolve.extensions,
                moduleDirectory: _this.config.bundlerOptions.resolve.directories,
                modules: _this.shims
            };
            browserResolve(moduleName, bopts, function (error2, filename2) {
                if (error2) {
                    if (bundleItem.filename && !bundleItem.isTypingsFile()) {
                        // This is probably a compiler path module (.js)
                        return onFilenameResolved();
                    }
                    throw new Error("Unable to resolve module [" +
                        moduleName + "] from [" + requiringModule + "]" + os.EOL +
                        JSON.stringify(bopts, undefined, 2) + os.EOL +
                        error);
                }
                bundleItem.filename = fs.realpathSync(filename2);
                onFilenameResolved();
            });
        });
    };
    Resolver.prototype.resolveDependencies = function (bundleItem, buffer, onDependenciesResolved) {
        var _this = this;
        if (bundleItem.isScript() && this.dependencyWalker.hasRequire(bundleItem.source)) {
            this.dependencyWalker.collectJavascriptDependencies(bundleItem, function (moduleNames) {
                async.each(moduleNames, function (moduleName, onModuleResolved) {
                    var dependency = new bundle_item_1.BundleItem(moduleName);
                    _this.resolveModule(bundleItem.filename, dependency, buffer, function (resolved) {
                        if (resolved) {
                            bundleItem.dependencies.push(resolved);
                        }
                        onModuleResolved();
                    });
                }, onDependenciesResolved);
            });
        }
        else {
            process.nextTick(function () {
                onDependenciesResolved();
            });
        }
    };
    return Resolver;
}());
exports.Resolver = Resolver;
//# sourceMappingURL=resolver.js.map