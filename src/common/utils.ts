import fs from "fs";
import path from "path";
import { capitalize } from "./augmentation";
import * as vscode from "vscode";

export function elementsInPath(path: string, recursive: boolean = false): string[] {
    let items: string[] = [];
    _traverseDir(path, items, recursive);
    return items;
}

function _traverseDir(dir: string, items: string[], recursive: boolean = false) {
    fs.readdirSync(dir).forEach((file) => {
        let fullPath = path.join(dir, file);
        if (fs.lstatSync(fullPath).isDirectory() && recursive) {
            items.push(fullPath);
            _traverseDir(fullPath, items);
        } else {
            items.push(fullPath);
        }
    });
}

export function toWordCapitalized(str: string): string {
    if (str.length <= 0) return str;
    let separator = " ";
    if (str.includes("_")) {
        separator = "_";
    }
    let res = str.trim();
    let tokens = res.split(separator);
    let buf: string = "";
    for (let i = 0; i < tokens.length; i++) {
        var element = tokens[i];
        if (element.replaceAll(separator, "").length <= 0) continue;
        buf += capitalize(element);
        if (i < tokens.length - 1) {
            buf += " ";
        }
    }

    return buf;
}

export async function rootGuard(): Promise<string | undefined> {
    let config = vscode.workspace.getConfiguration("atera");
    let root = config.get("dataRoot") as string | undefined;
    if (root === undefined || !fs.existsSync(root)) {
        let res = await vscode.window.showWarningMessage(
            "Unable to fetch activities: dataRoot is not correctly set in settings",
            "Pick root folder"
        );
        let folder = await vscode.window.showOpenDialog({
            canSelectMany: false,
            openLabel: "Select dataRoot",
            canSelectFiles: false,
            canSelectFolders: true,
        });
        if (folder === undefined) return undefined;
        root = folder.at(0)?.fsPath;
        await config.update("dataRoot", root, vscode.ConfigurationTarget.Global);
        vscode.window.showInformationMessage("dataRoot set to " + folder);
    }
    console.log(root);
    return root;
}

export async function readDefinitions(): Promise<any | undefined> {
    let root = await rootGuard();
    if (root === undefined) return undefined;
    if (!fs.existsSync(`${root}/common/definitions.json`)) {
        return undefined;
    }
    let model = JSON.parse(fs.readFileSync(`${root}/common/definitions.json`, "utf-8"));
    return model;
}

export async function calculateLocations(): Promise<any | undefined> {
    let root = await rootGuard();
    if (root === undefined) return undefined;
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

export async function readAvailableActivities(): Promise<[string, any][]> {
    let root = await rootGuard();
    if (root === undefined) return [];
    if (!fs.existsSync(`${root}/activities`)) {
        return [];
    }
    let elements = elementsInPath(`${root}/activities`, true);
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
