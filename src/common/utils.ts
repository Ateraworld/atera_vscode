import fs from "fs";
import { capitalize } from "./augmentation";
import * as vscode from "vscode";
import { elementsInPath } from "atera_admin_sdk/api/src/common/path_ext";

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
export async function sourceRootGuard(): Promise<string | undefined> {
    let config = vscode.workspace.getConfiguration("atera");
    let root = config.get("sourceRoot") as string | undefined;
    if (root === undefined || !fs.existsSync(root)) {
        return undefined;
        // let res = await vscode.window.showWarningMessage(
        //     "Unable to fetch codebase: sourceRoot is not correctly set in settings",
        //     "Pick root folder"
        // );
        // let folder = await vscode.window.showOpenDialog({
        //     canSelectMany: false,
        //     openLabel: "Select sourceRoot",
        //     canSelectFiles: false,
        //     canSelectFolders: true,
        // });
        // if (folder === undefined) return undefined;
        // root = folder.at(0)?.fsPath;
        // await config.update("sourceRoot", root, vscode.ConfigurationTarget.Global);
        // vscode.window.showInformationMessage("sourceRoot set to " + folder);
    }
    return root;
}
export async function dataRootGuard(): Promise<string | undefined> {
    let config = vscode.workspace.getConfiguration("atera");
    let root = config.get("dataRoot") as string | undefined;
    if (root === undefined || !fs.existsSync(root)) {
        let res = await vscode.window.showWarningMessage(
            "Unable to fetch data: dataRoot folder is not correctly set in settings",
            "Pick data root folder"
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
    return root;
}

export async function readDefinitions(): Promise<any | undefined> {
    let root = await dataRootGuard();
    if (root === undefined) return undefined;
    if (!fs.existsSync(`${root}/common/definitions.json`)) {
        return undefined;
    }
    let model = JSON.parse(fs.readFileSync(`${root}/common/definitions.json`, "utf-8"));
    return model;
}

export async function calculateLocations(): Promise<any | undefined> {
    let root = await dataRootGuard();
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
    let root = await dataRootGuard();
    if (root === undefined) return [];
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
