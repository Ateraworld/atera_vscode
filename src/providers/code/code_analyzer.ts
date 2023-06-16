import fs from "fs";
import path from "path";
import { elementsInPath, sourceRootGuard } from "src/common/utils";

export class CodeBaseAnalysis {
    info: [string, any][] = [];
    warnings: [string, any][] = [];
    errors: [string, any][] = [];
    constructor(info: [string, any][] = [], warnings: [string, any][] = [], errors: [string, any][] = []) {
        this.info = info;
        this.warnings = warnings;
        this.errors = errors;
    }
}

export async function analyzeCodeBase(): Promise<CodeBaseAnalysis> {
    let root = sourceRootGuard();
    if (root === undefined) {return new CodeBaseAnalysis();}
    let errors: [string, any][] = [];
    let warnings: [string, any][] = [];
    let info: [string, any][] = [];
    const sourceFiles = elementsInPath(path.join(root, "lib"), { recursive: true, filesOnly: true });

    for (const elem of sourceFiles) {
        if (fs.lstatSync(elem).isFile()) {
            if (elem.match(/config.dart$/)) {
                console.log(elem);
                const content = fs.readFileSync(elem, "utf-8");
                let match = content.match(/_enforceEmulators[ ]*=[ ]*true;/);
                if (match != null) {
                    errors.push(["emulators", { description: "emulators are enforced to true", source: elem }]);
                }
                match = content.match(/_enforceLogs[ ]*=[ ]*true;/);
                if (match != null) {
                    warnings.push([
                        "logging",
                        { description: "logging is enforced to true in production code", source: elem },
                    ]);
                }

                match = content.match(/forceVersionUpdate[ ]*=>[ ]*true;/);
                if (match != null) {
                    warnings.push([
                        "force version update",
                        { description: "force version update is enabled", source: elem },
                    ]);
                }
            }
        }
    }

    const androidFiles = elementsInPath(path.join(root, "android", "app"), {
        recursive: true,
        filesOnly: true,
    });
    for (const elem of androidFiles) {
        const content = fs.readFileSync(elem, "utf-8");
        if (elem.match(/build.gradle$/)) {
            // let match = content.match(/signingConfig[ ]*signingConfigs.(?<config>[A-Za-z]+)/);
            // if (match === null || match.groups === undefined || match.groups["config"] != "release") {
            //     errors.push("application is not signed with the release key > " + elem);
            // }
            let minSdkVer = undefined;
            let compSdkVer = undefined;
            let match = content.match(/minSdkVersion[ ]+(?<version>[0-9]{2})/);
            if (match == null) {
                errors.push(["missing minSdkVersion", { description: "unable to find minSdkVersion", source: elem }]);
            } else {
                minSdkVer = match.groups!["version"];
                info.push(["minSdkVersion ", { description: match.groups!["version"] }]);
            }

            match = content.match(/compileSdkVersion[ ]+(?<version>[0-9]{2})/);
            if (match == null) {
                errors.push([
                    "missing compileSdkVersion",
                    { description: "unable to find compileSdkVersion", source: elem },
                ]);
            } else {
                compSdkVer = match.groups!["version"];
                info.push(["compileSdkVersion", { description: match.groups!["version"] }]);
            }
            if (minSdkVer !== undefined && compSdkVer !== undefined && minSdkVer >= compSdkVer) {
                errors.push([
                    "wrong sdk version configuration",
                    {
                        description: "minSdkVersion " + minSdkVer + " is greater than compileSdkVersion " + compSdkVer,
                        source: elem,
                    },
                ]);
            }

            match = content.match(/ndkVersion[ ]+(?<version>\"[0-9]{2}[0-9.]+\")/);
            if (match == null) {
                errors.push(["missing ndkVersion", { description: "unable to find ndkVersion", source: elem }]);
            } else {
                info.push(["ndkVersion", { description: match.groups!["version"] }]);
            }

            match = content.match(/minifyEnabled[ ]*(?<config>true|false)/);
            if (match === null || match.groups === undefined || match.groups["config"] != "true") {
                errors.push([
                    "resource not minified",
                    { description: "application does not have minify enabled", source: elem },
                ]);
            }

            match = content.match(/shrinkResources[ ]*(?<config>true|false)/);
            if (match === null || match.groups === undefined || match.groups["config"] != "true") {
                errors.push([
                    "resources not shrinked",
                    { description: "application does not have shrink resources enabled", source: elem },
                ]);
            }
        }
    }

    return new CodeBaseAnalysis(info, warnings, errors);
}
