import fs from "fs";
import path from "path";
import { sanitizeActivityModel } from "src/common/activity";
import { capitalize } from "src/common/augmentation";
import { interpretAndExecuteCmd } from "src/common/cmd_executor";
import { DescriptedQuickPickItem } from "src/common/descripted_quick_pick_item";
import { Item } from "src/common/item_param";
import {
    computeLocations,
    elementsInPath,
    readDefinitions,
    readExistingActivities,
    toWordCapitalized,
} from "src/common/utils";
import * as vscode from "vscode";
import { insertTextAtCursor, overrideCurrentRelationModel } from "./editor";
import { compileMark } from "./marked_text_editor";

export async function addTag(): Promise<any> {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        return;
    }
    let documentModel: any;
    let tags: [string, any][];
    try {
        let definitions = await readDefinitions();
        tags = Object.entries(definitions.tags);
        documentModel = JSON.parse(editor.document.getText());
    } catch (_) {
        return;
    }
    if (tags.length > 0) {
        let tag = await vscode.window.showQuickPick(
            tags
                .filter((t) => documentModel.tags[t[0]] === undefined || documentModel.tags[t[0]] == false)
                .map((t) => new DescriptedQuickPickItem(t[0], t[1].name ?? "")),
            {
                ignoreFocusOut: true,
                title: "Select a tag",
            }
        );
        if (tag !== undefined) {
            documentModel.tags[tag!.label] = true;
            overrideCurrentRelationModel(documentModel);
        }
    }
}
export async function addSection(): Promise<void> {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        vscode.window.showWarningMessage("Editor not valid");
        return;
    }
    let documentModel: any;
    try {
        documentModel = JSON.parse(editor.document.getText());
    } catch (_) {
        return;
    }
    let sections = Object.entries(documentModel.relation.sections);

    let res = await vscode.window.showInputBox({
        title: "Index",
        placeHolder: "index of the section",
        validateInput: (val) => {
            let n = parseInt(val);
            if (isNaN(n)) {
                return "an integer is required";
            }
            if (n < 0) {
                return "index must be greater than 0";
            }
        },
        ignoreFocusOut: true,
    });
    let indexVal = res !== undefined ? parseInt(res) : sections.length;

    let title = await vscode.window.showInputBox({
        title: "Title",
        placeHolder: "title of the section",
        validateInput: (val) => {
            if (val.length <= 0) {
                return "field is required";
            }
        },
        ignoreFocusOut: true,
    });
    if (title === undefined) {
        return;
    }
    title = capitalize(title);
    let sectionModel = { title: title, content: "" };

    sections.push([indexVal.toString(), sectionModel]);
    sections.sort((a, b) => {
        let an = parseInt(a[0]);
        let bn = parseInt(b[0]);
        if (an === bn) {
            return an === indexVal ? -1 : bn === indexVal ? 1 : 0;
        }
        return an - bn;
    });

    let newSection: any = {};
    for (let i = 0; i < sections.length; i++) {
        newSection[i.toString()] = sections[i][1] as any;
    }

    documentModel.relation.sections = newSection;
    overrideCurrentRelationModel(documentModel);
}

export async function addPoint(): Promise<void> {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        vscode.window.showWarningMessage("Editor not valid");
        return;
    }
    let documentModel: any;
    try {
        documentModel = JSON.parse(editor.document.getText());
    } catch (_) {
        return;
    }

    let name = await vscode.window.showInputBox({
        title: "Name",
        placeHolder: "identifier of the point",
        ignoreFocusOut: true,
    });
    if (name === undefined || name.length <= 0) {
        return;
    }
    let res = await vscode.window.showInputBox({
        title: "Latitude",
        placeHolder: "latitude in degrees",
        value: "",
        validateInput: (val) => {
            if (isNaN(parseFloat(val))) {
                return "a number is required";
            }
        },
        ignoreFocusOut: true,
    });
    if (res === undefined || isNaN(parseFloat(res))) {
        return;
    }
    let lat = parseFloat(res.replaceAll(",", "."));

    res = await vscode.window.showInputBox({
        title: "Longitude",
        placeHolder: "longitude in degrees",
        value: "",
        validateInput: (val) => {
            if (isNaN(parseFloat(val))) {
                return "a number is required";
            }
        },
        ignoreFocusOut: true,
    });
    if (res === undefined || isNaN(parseFloat(res))) {
        return;
    }
    let long = parseFloat(res.replaceAll(",", "."));

    let description =
        (await vscode.window.showInputBox({
            title: "Description",
            placeHolder: "description of the point",
            value: "",
            ignoreFocusOut: true,
        })) ?? "";
    let mapLink =
        (await vscode.window.showQuickPick(["false", "true"], {
            title: "Add a map link",
            placeHolder: "whether the point should be openable with maps",
        })) ?? "";

    documentModel.location.points[name] = {
        latitude: lat,
        longitude: long,
    };
    console.log(documentModel.location.points[name]);
    if (description.length > 0) {
        documentModel.location.points[name].description = description;
    }
    if (mapLink === "true") {
        documentModel.location.points[name].map_link = true;
    }
    overrideCurrentRelationModel(documentModel);
}

export async function addImage(): Promise<void> {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        vscode.window.showWarningMessage("Editor not valid");
        return;
    }
    let documentModel: any;
    try {
        documentModel = JSON.parse(editor.document.getText());
    } catch (_) {
        return;
    }

    let name = await vscode.window.showInputBox({
        title: "Name",
        ignoreFocusOut: true,
        placeHolder: "identifier of the image",
        validateInput: (val) => (val.length <= 0 ? "required" : undefined),
    });
    if (name === undefined || name.length <= 0) {
        return;
    }
    let type = await vscode.window.showQuickPick(["storage", "web", "local"], {
        title: "Select the type",
        placeHolder: "type of the marker",
    });
    if (type === undefined) {
        return;
    }

    let title =
        (await vscode.window.showInputBox({
            title: "Title",
            placeHolder: "title of the image",
            value: "",
            ignoreFocusOut: true,
        })) ?? "";
    let url: string | undefined = undefined;

    if (type === "storage") {
        let storagePath = `${editor.document.fileName}/../storage`;
        console.log(storagePath);
        if (storagePath !== undefined && fs.existsSync(storagePath)) {
            let images = elementsInPath(storagePath)
                .filter((e) => e.endsWith(".webp"))
                .map((e) => path.parse(e).base);

            if (images.length > 0) {
                let img = await vscode.window.showQuickPick(images, {
                    ignoreFocusOut: true,
                    title: "Select existing image",
                });
                url = img;
            }
        }
    }
    url ??= await vscode.window.showInputBox({
        title: "Url",
        placeHolder: type === "storage" ? "insert only the name of the asset" : undefined,
        ignoreFocusOut: true,
    });
    if (url === undefined) {
        return;
    }
    if (type === "storage") {
        if (documentModel.id === undefined) {
            return;
        }
        url = `activities/${documentModel.id}/${url}`;
    }

    documentModel.images[name] = { title: title, url: url, type: type };
    overrideCurrentRelationModel(documentModel);
}

export async function addStorageImages(): Promise<void> {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        vscode.window.showWarningMessage("Editor not valid");
        return;
    }
    let documentModel: any;
    try {
        documentModel = JSON.parse(editor.document.getText());
    } catch (_) {
        return;
    }
    let storagePath = `${editor.document.fileName}/../storage`;
    if (!fs.existsSync(storagePath)) {
        vscode.window.showWarningMessage("Storage folder non existing");
        return;
    }
    let images = elementsInPath(storagePath)
        .filter((e) => e.endsWith(".webp"))
        .map((e) => path.parse(e).base);
    for (const i of images) {
        let p = path.parse(i);
        let id = p.name.toLowerCase().replaceAll(" ", "_");
        if (documentModel.images[id] !== undefined) continue;
        documentModel.images[id] = { url: `activities/${documentModel.id}/${id}.webp`, type: "storage", title: "" };
    }
    await overrideCurrentRelationModel(documentModel);
}

export async function listActivities(): Promise<void> {
    var acts = await readExistingActivities();
    let actId = await vscode.window.showQuickPick(
        acts.map((e) => new DescriptedQuickPickItem(e[1].name ?? "", e[0])),
        { title: "Activities", placeHolder: "select an existing activity" }
    );
    if (actId === undefined || actId.description === undefined) return;
    await insertTextAtCursor(actId.description);
}

export async function addLocation(item: Item): Promise<void> {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        return;
    }
    let documentModel: any | undefined = undefined;
    try {
        documentModel = JSON.parse(editor.document.getText());
        let originalModel = JSON.parse(editor.document.getText());
        let locations = await computeLocations();
        console.log(locations);
        if (locations === undefined) {
            return;
        }
        let res: string | undefined = undefined;
        let currentId: string | undefined = item?.label;

        while (currentId !== undefined) {
            if (currentId === "country") {
                let countries = Object.entries(locations);
                res = await vscode.window.showQuickPick(
                    countries.map((e) => e[0]),
                    { ignoreFocusOut: true, title: "Country" }
                );
                if (res === undefined) {
                    documentModel = originalModel;
                    break;
                }
                documentModel.location.country = res;
                currentId = "region";
            } else if (currentId === "region") {
                let regions = Object.entries(locations[documentModel.location.country].regions);
                res = await vscode.window.showQuickPick(
                    regions.map((e) => e[0]),
                    { ignoreFocusOut: true, title: "Region" }
                );
                if (res === undefined) {
                    documentModel = originalModel;
                    break;
                }
                documentModel.location.region = res;
                currentId = "province";
            } else if (currentId === "province") {
                let provinces = Object.entries(
                    locations[documentModel.location.country].regions[documentModel.location.region]
                );
                res = await vscode.window.showQuickPick(
                    provinces.map((e) => e[0]),
                    { ignoreFocusOut: true, title: "Province" }
                );
                if (res === undefined) {
                    documentModel = originalModel;
                    break;
                }
                documentModel.location.province = res;
                currentId = "zone";
            } else if (currentId === "zone") {
                let zones = Object.entries(locations[documentModel.location.country].zones);
                res = await vscode.window.showQuickPick(
                    zones.map((e) => e[0]),
                    { ignoreFocusOut: true, title: "Zone" }
                );
                if (res === undefined) {
                    documentModel.location.zone = originalModel.location.zone;
                    break;
                }
                documentModel.location.zone = res;
                currentId = undefined;
            }
        }
        overrideCurrentRelationModel(documentModel);
    } catch (error) {
        console.log(error);
        return;
    }
}

export async function addSymbol(): Promise<void> {
    let symbol = await vscode.window.showQuickPick([new DescriptedQuickPickItem("● ", "bullet point")], {
        ignoreFocusOut: true,
        title: "Symbol",
    });
    if (symbol !== undefined) {
        await insertTextAtCursor(symbol.label);
    }
}
export async function executeCustomCmd(item: Item | undefined): Promise<void> {
    if (item !== undefined) {
        await interpretAndExecuteCmd(item.itemModel);
    } else {
        let config = vscode.workspace.getConfiguration("atera");
        let commands = config.get("commands") as any[];
        let cmd = await vscode.window.showQuickPick(
            commands.map((e) => new DescriptedQuickPickItem(e.name ?? "", e.description, e.cmd, e)),
            { title: "Commands", placeHolder: "select a custom command to execute" }
        );
        if (cmd === undefined) return;
        await interpretAndExecuteCmd(cmd.payload);
    }
}
export async function removeRelationItem(item: Item): Promise<void> {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        vscode.window.showWarningMessage("Editor not valid");
        return;
    }
    let documentModel: any;
    try {
        documentModel = JSON.parse(editor.document.getText());
    } catch (_) {
        return;
    }
    if (item.contextValue == "point-instance") {
        delete documentModel.location.points[item.label];
        overrideCurrentRelationModel(documentModel);
    } else if (item.contextValue == "image-instance") {
        delete documentModel.images[item.label];
        overrideCurrentRelationModel(documentModel);
    } else if (item.contextValue == "section-instance") {
        console.log(item);
        delete documentModel.relation.sections[item.itemModel?.id];

        let sections = Object.entries(documentModel.relation.sections);
        sections.sort((a, b) => {
            let an = parseInt(a[0]);
            let bn = parseInt(b[0]);
            return an - bn;
        });

        let newSection: any = {};
        for (let i = 0; i < sections.length; i++) {
            newSection[i.toString()] = sections[i][1] as any;
        }

        documentModel.relation.sections = newSection;
        overrideCurrentRelationModel(documentModel);
    } else if (item.contextValue == "tag-instance") {
        delete documentModel.tags[item.label];
        overrideCurrentRelationModel(documentModel);
    }
}

export async function addMark(item: Item | undefined): Promise<void> {
    console.log("addmark");
    if (item === undefined) {
        await compileMark({});
        return;
    }
    switch (item.contextValue) {
        case "point-instance":
            await compileMark({ type: "pos", text: toWordCapitalized(item.label), payload: item.label });
            break;
        case "image-instance":
            await compileMark({ type: "ph", text: toWordCapitalized(item.label), payload: item.label });
            break;
        case "editor-bold":
            await compileMark({ type: "b" });
            break;
        case "editor-italic":
            await compileMark({ type: "i" });
            break;
        case "editor-act-ref":
            let availableActivities = await readExistingActivities();
            await compileMark({ type: "act", preloadedElements: availableActivities });
            break;
        default:
            break;
    }
}
