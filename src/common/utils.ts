import fs from "fs";
import * as vscode from "vscode";
import path from "path";
import { capitalize } from "./augmentation";

export function toWordCapitalized(str: string): string {
    if (str.length <= 0) {return str;}
    let separator = " ";
    if (str.includes("_")) {
        separator = "_";
    }
    let res = str.trim();
    let tokens = res.split(separator);
    let buf: string = "";
    for (let i = 0; i < tokens.length; i++) {
        var element = tokens[i];
        if (element.replaceAll(separator, "").length <= 0) {continue;}
        buf += capitalize(element);
        if (i < tokens.length - 1) {
            buf += " ";
        }
    }

    return buf;
}
export function sourceRootGuard(): string | undefined {
    let config = vscode.workspace.getConfiguration("atera");
    let root = config.get("sourceRoot") as string | undefined;
    if (root === undefined || !fs.existsSync(root)) {
        return undefined;
    }
    return root;
}
export function dataRootGuard(): string | undefined {
    let config = vscode.workspace.getConfiguration("atera");
    let root = config.get("dataRoot") as string | undefined;
    if (root === undefined || !fs.existsSync(root)) {
        return undefined;
    }
    return root;
}

export async function readDefinitions(): Promise<any | undefined> {
    let root = dataRootGuard();
    if (root === undefined) {return undefined;}
    if (!fs.existsSync(`${root}/common/definitions.json`)) {
        return undefined;
    }
    let model = JSON.parse(fs.readFileSync(`${root}/common/definitions.json`, "utf-8"));
    return model;
}

export async function calculateLocations(): Promise<any | undefined> {
    let root = dataRootGuard();
    if (root === undefined) {return undefined;}
    if (!fs.existsSync(`${root}/activities`)) {
        return undefined;
    }

    let locations: any = {};

    elementsInPath(`${root}/activities`)
        .filter((e) => fs.lstatSync(e).isDirectory())
        .forEach((f) => {
            let elements = elementsInPath(f);
            let modelPath = elements.find((e) => e.split(".").pop() == "json");
            let model = JSON.parse(fs.readFileSync(modelPath!, "utf-8"));
            let country = model.location.country;
            let region = model.location.region;
            let province = model.location.province;
            let zone = model.location.zone;
            if (country != undefined) {
                locations[country] ??= {};
                locations[country]["regions"] ??= {};
                if (region != undefined) {
                    locations[country]["regions"][region] ??= {};
                    if (province != undefined) {
                        locations[country]["regions"][region][province] = true;
                    }
                }
                if (zone != undefined) {
                    locations[country]["zones"] ??= {};
                    locations[country]["zones"][zone] = true;
                }
            }
        });

    return locations;
}
/**Get all elements in the provided path */
export function elementsInPath(
    src: string,
    { recursive = false, filesOnly = false }: { recursive?: boolean; filesOnly?: boolean } = {}
): string[] {
    function _traverseDir(
        dir: string,
        items: string[],
        { recursive = false, filesOnly = false }: { recursive?: boolean; filesOnly?: boolean } = {}
    ) {
        fs.readdirSync(dir).forEach((file) => {
            let fullPath = path.join(dir, file);
            if (fs.lstatSync(fullPath).isDirectory()) {
                if (!filesOnly) {
                    items.push(fullPath);
                }
                if (recursive) {
                    _traverseDir(fullPath, items, { recursive: recursive, filesOnly: filesOnly });
                }
            } else {
                items.push(fullPath);
            }
        });
    }
    let items: string[] = [];
    _traverseDir(src, items, { recursive: recursive, filesOnly: filesOnly });
    return items;
}
export async function readAvailableActivities(): Promise<[string, any][]> {
    let root = dataRootGuard();
    if (root === undefined) {return [];}
    if (!fs.existsSync(`${root}/activities`)) {
        return [];
    }
    let elements = elementsInPath(`${root}/activities`, { recursive: true });
    let jsons = elements.filter((e) => e.split(".").pop() == "json");
    let availableActivities: [string, any][] = [];
    jsons.forEach((element) => {
        let model = JSON.parse(fs.readFileSync(element, "utf-8"));
        if (model.id !== undefined) {
            availableActivities.push([model.id, model]);
        }
    });
    return availableActivities;
}
