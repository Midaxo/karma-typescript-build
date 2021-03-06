import { EmitOutput } from "../compiler/emit-output";
import { Configuration } from "../shared/configuration";
import { File } from "../shared/file";
import { CoverageCallback } from "./coverage-callback";
export declare class Coverage {
    private config;
    private instrumenter;
    private log;
    constructor(config: Configuration);
    initialize(logger: any): void;
    instrument(file: File, bundled: string, emitOutput: EmitOutput, callback: CoverageCallback): void;
    private hasNoOutput;
    private isExcluded;
}
