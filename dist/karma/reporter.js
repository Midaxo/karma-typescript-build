"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Reporter = void 0;
var istanbulCoverage = require("istanbul-lib-coverage");
var istanbulReport = require("istanbul-lib-report");
var istanbulSourceMaps = require("istanbul-lib-source-maps");
var istanbulReports = require("istanbul-reports");
var lodash = require("lodash");
var path = require("path");
var reporterName = "karma-typescript";
var Reporter = /** @class */ (function () {
    function Reporter(config, threshold) {
        var that = this;
        // tslint:disable-next-line:only-arrow-functions
        this.create = function (baseReporterDecorator, logger) {
            var _this = this;
            baseReporterDecorator(this);
            that.log = logger.create("reporter." + reporterName);
            this.onRunStart = function () {
                that.coverageMap = new WeakMap();
            };
            this.onBrowserStart = function () { };
            this.specFailure = function () { };
            this.onBrowserComplete = function (browser, result) {
                if (result && result.coverage) {
                    that.coverageMap.set(browser, result.coverage);
                }
            };
            this.onRunComplete = function (browsers, results) {
                browsers.forEach(function (browser) { return __awaiter(_this, void 0, void 0, function () {
                    var coverage, coverageMap, sourceMapStore, remappedCoverageMap;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0:
                                coverage = that.coverageMap.get(browser);
                                coverageMap = istanbulCoverage.createCoverageMap();
                                coverageMap.merge(coverage);
                                sourceMapStore = istanbulSourceMaps.createSourceMapStore();
                                return [4 /*yield*/, sourceMapStore.transformCoverage(coverageMap)];
                            case 1:
                                remappedCoverageMap = _a.sent();
                                if (results && config.hasCoverageThreshold && !threshold.check(browser, remappedCoverageMap)) {
                                    results.exitCode = 1;
                                }
                                Object.keys(config.reports).forEach(function (reportType) {
                                    var reportConfig = config.reports[reportType];
                                    var directory = that.getReportDestination(browser, reportConfig, reportType);
                                    if (directory) {
                                        that.log.debug("Writing coverage to %s", directory);
                                    }
                                    var context = istanbulReport.createContext({
                                        // @ts-ignore
                                        coverageMap: remappedCoverageMap,
                                        dir: directory,
                                        // @ts-ignore
                                        sourceFinder: sourceMapStore.sourceFinder
                                    });
                                    istanbulReports
                                        .create(reportType, { file: reportConfig ? reportConfig.filename : undefined })
                                        // @ts-ignore
                                        .execute(context);
                                });
                                return [2 /*return*/];
                        }
                    });
                }); });
            };
        };
        Object.assign(this.create, { $inject: ["baseReporterDecorator", "logger", "config"] });
    }
    Reporter.prototype.getReportDestination = function (browser, reportConfig, reportType) {
        if (lodash.isPlainObject(reportConfig)) {
            var subdirectory = reportConfig.subdirectory || browser.name;
            if (typeof subdirectory === "function") {
                subdirectory = subdirectory(browser);
            }
            return path.join(reportConfig.directory || "coverage", subdirectory);
        }
        if (lodash.isString(reportConfig) && reportConfig.length > 0) {
            return path.join(reportConfig, browser.name, reportType);
        }
        return null;
    };
    return Reporter;
}());
exports.Reporter = Reporter;
//# sourceMappingURL=reporter.js.map