import fs from "fs";
import path from "path";
import { elementsInPath, getDataRoot } from "./utils";

export const attestationPeriodRegExp = new RegExp(
    "^(?<startd>0?[1-9]|[12][0-9]|3[01])-(?<startm>0?[1-9]|1[0-2])/(?<endd>0?[1-9]|[12][0-9]|3[01])-(?<endm>0?[1-9]|1[0-2])$"
);
export const markedTextRegExp = new RegExp(/\$\{\[(?<text>.+?(?=]))\](?<id>[a-zA-z0-9]+)\((?<payload>.*?(?=\)))\)\}/g);

/**Controls whether the activity folder is valid */
export function isActivityFolderValid(folder: string): string | undefined {
    if (!fs.existsSync(folder)) {
        return "activity folder does not exist";
    }
    if (!fs.lstatSync(folder).isDirectory()) {
        return "activity folder is not a directory";
    }
    let elements = elementsInPath(folder);
    let jsons = elements.filter((e) => e.split(".").pop() == "json");
    if (jsons.length <= 0) {
        return "no json files found in the folder, aborting";
    }
    if (jsons.length > 1) {
        return "multiple json files found in the folder, aborting";
    }
    try {
        JSON.parse(fs.readFileSync(jsons[0]).toString());
        return undefined;
    } catch (error) {
        return "model is not a json";
    }
}
export function readExistingActivitiesInPath(path: string): [string, any][] {
    if (path === undefined || !fs.existsSync(path)) {
        return [];
    }
    let results: [string, any][] = [];
    let res = elementsInPath(path, { recursive: false, filesOnly: false }).filter(
        (e) => isActivityFolderValid(e) === undefined
    );
    for (const e of res) {
        let elements = elementsInPath(e);
        let jsons = elements.filter((e) => e.split(".").pop() == "json");
        let model = JSON.parse(fs.readFileSync(jsons[0]).toString());
        results.push([e, model]);
    }
    return results;
}

export function sanitizeActivityModel(model: any, { fix = false }: { fix?: boolean } = {}): [string[], string[]] {
    try {
        let dataRoot = getDataRoot();
        if (dataRoot === undefined) {
            return [[], []];
        }
        // * format description
        let logs: string[] = [];
        let problems: string[] = [];
        let warnings: string[] = [];
        model.description = formatActivityModelString(model.description, { fix: fix, logs: logs });

        // * format relation sections
        let sanitizedSections = new Map<String, any>(Object.entries(model.relation?.sections ?? {}));
        let images: [string, any][] = Object.entries(model.images ?? {});
        let points = Object.entries(model.location.points ?? {});
        let tags = Object.entries(model.tags ?? {});
        let existingActivities =
            dataRoot !== undefined
                ? readExistingActivitiesInPath(path.join(dataRoot, "activities")).map((e) => e[1].id)
                : undefined;
        for (var [key, value] of sanitizedSections.entries()) {
            // space format
            value.content = formatActivityModelString(value.content, { fix: fix, logs: logs });
            sanitizedSections.set(key, value);
            let matches = (value.content as String).matchAll(markedTextRegExp);
            if (matches == null) {
                continue;
            }
            for (const m of matches) {
                let id = m.groups?.id;
                let payload = m.groups?.payload;
                if (id == "ph") {
                    let hit = images.find((e) => e[0] == payload);
                    if (hit === undefined) {
                        problems.push("referenced image " + payload + " does not exist");
                    }
                }
                if (id == "pos") {
                    if (points.find((e) => e[0] == payload) === undefined) {
                        problems.push("referenced point " + payload + " does not exist");
                    }
                }
                if (id == "act" && existingActivities !== undefined && !existingActivities.includes(payload)) {
                    if (points.find((e) => e[0] == payload) === undefined) {
                        problems.push("referenced activity " + payload + " does not exist");
                    }
                }
            }
            let nCount = value.content.split(/\n/g)?.length ?? 0;
            if (nCount < value.content.split(" ").length / 25) {
                warnings.push(value.title + ": maybe you have few breaklines");
            }
            if (value.content.length <= 0) {
                warnings.push(value.title + ": empty section");
            }
        }
        if (model.relation != null) {
            model.relation.sections = Object.fromEntries(sanitizedSections);
        }

        if (model.location.country == null || model.location.country.length <= 0) {
            problems.push("location.country is not compiled");
        }
        if (model.location.region == null || model.location.region.length <= 0) {
            problems.push("location.region is not compiled");
        }
        if (model.location.province == null || model.location.province.length <= 0) {
            problems.push("location.province is not compiled");
        }
        if (model.location.zone == null || model.location.zone.length <= 0) {
            problems.push("location.zone is not compiled");
        }
        for (let [k, v] of points) {
            let val = v as any;
            if (val.longitude == null || val.longitude === 0 || val.latitude == null || val.latitude === 0) {
                problems.push(k + " coodinates are not set");
            }
        }
        if (model.attestation != null) {
            let attestation = model.attestation as any;
            if (
                attestation.longitude == null ||
                attestation.longitude === 0 ||
                attestation.latitude == null ||
                attestation.latitude === 0
            ) {
                problems.push("attestation coodinates are not set");
            }
            if (attestation.enabled ?? true) {
                if (
                    !(
                        attestation.period == null ||
                        attestation.period === "" ||
                        attestationPeriodRegExp.test(attestation.period)
                    )
                ) {
                    problems.push("attestation period not formatted");
                }

                if (attestation.tokens == null || attestation.tokens <= 0) {
                    warnings.push("tokens: value is missing");
                }
                if (attestation.rank == null || attestation.rank <= 0) {
                    warnings.push("rank: value is missing");
                }
            }
        }

        if (!points.find((p) => p[0].includes("parcheggio")) && model.category !== "2") {
            warnings.push("parking: point is missing");
        }
        if (model.category === "0") {
            if (!points.find((p) => p[0].includes("attacco"))) {
                warnings.push("attacco: point is missing");
            }
            if (!points.find((p) => p[0].includes("stacco"))) {
                warnings.push("stacco: point is missing");
            }
        }
        let definitions = JSON.parse(fs.readFileSync(path.join(dataRoot, "common", "definitions.json")).toString());
        let categories = Object.entries(definitions.categories);
        if (!categories.find((c) => c[0] == model.category)) {
            problems.push(model.category + " invalid category id");
        }
        let storedTags = Object.entries(definitions.tags);
        for (let [k, v] of tags) {
            if (storedTags.find((t) => t[0] === k) === undefined) {
                problems.push(k + " tag does not exist");
            }
        }

        return [problems, warnings];
    } catch (ex) {
        return [["exception in sanitarization: " + ex?.toString()], []];
    }
}

/**Sanitize and format the string representation of an activity model
 *
 * @returns a tuple: `[hasEncounteredErrors, formattedModelString]`
 */
function formatActivityModelString(
    str: string | undefined,
    { fix = false, logs = [] }: { fix?: boolean; logs?: string[] } = {}
): string | undefined {
    if (str == undefined) return undefined;
    let reg = new RegExp("[ ]+\\n[ ]+|\\n[ ]+|[ ]+\\n", "g");
    if (fix) {
        str = str.replace(reg, "\n");
        str = str.replace(/[ ]{2,}/g, " ");
        //upper case
        str = str.replace(/A'/g, "À");
        str = str.replace(/E'/g, "È");
        str = str.replace(/I'/g, "Ì");
        str = str.replace(/O'/g, "Ò");
        str = str.replace(/U'/g, "Ù");

        str = str.replace(/\bcai\b/gi, "CAI");
        str = str.replace(/\bsat\b/gi, "SAT");
    }
    let n = str.match(reg)?.length ?? 0;

    logs.push(`\tbreak lines: ${n}`);

    n = str.match(/A'/g)?.length ?? 0;
    n += str.match(/E'/g)?.length ?? 0;
    n += str.match(/I'/g)?.length ?? 0;
    n += str.match(/O'/g)?.length ?? 0;
    n += str.match(/U'/g)?.length ?? 0;
    logs.push(`\taccents: ${n}`);

    n = 0;
    let map = str.match(/\bcai\b/gi);
    if (map != null) {
        for (let x of map!) {
            if (x !== "CAI") {
                n++;
            }
        }
    }
    map = str.match(/\bsat\b/gi);
    if (map != null) {
        for (let x of map!) {
            if (x !== "SAT") {
                n++;
            }
        }
    }

    logs.push(`\tCAI-SAT uppercase: ${n}`);

    n = str.match(/[ ]{2,}/g)?.length ?? 0;
    logs.push(`\tspaces: ${n}`);

    return str;
}
