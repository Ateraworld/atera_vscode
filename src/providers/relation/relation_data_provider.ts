import * as vscode from "vscode";
import fs from "fs";
import { overrideCurrentRelationModel } from "../../common/editor";
import { capitalize } from "../../common/augmentation";
import { compileMark } from "../../common/marked_text_editor";
import { elementsInPath } from "../../common/utils";
import { RelationEditorItem } from "./relation_item";
import { sanitizeActivityModel } from "./sanitize/sanitize";

export class RelationEditorDataProvider implements vscode.TreeDataProvider<RelationEditorItem> {
    static id: string = "relation-editor";

    private _onDidChangeTreeData: vscode.EventEmitter<RelationEditorItem | undefined | null | void> =
        new vscode.EventEmitter<RelationEditorItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<RelationEditorItem | undefined | null | void> =
        this._onDidChangeTreeData.event;

    constructor() {
        vscode.workspace.onDidChangeTextDocument((event) => {
            if (event.contentChanges.length > 0) {
                this.refresh();
            }
        });
        vscode.window.onDidChangeActiveTextEditor((event) => {
            this.refresh();
        });
    }

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    async addImage(): Promise<void> {
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

        let name = await vscode.window.showInputBox({ title: "Name" });
        if (name === undefined || name.length <= 0) return;
        let type = await vscode.window.showQuickPick(["storage", "web", "local"], { title: "Select the type" });
        if (type === undefined) return;

        let title = (await vscode.window.showInputBox({ title: "Title", value: "" })) ?? "";
        let url = await vscode.window.showInputBox({
            title: "Url",
            prompt: type === "storage" ? "insert only the name of the asset" : undefined,
        });
        if (url === undefined) return;
        if (type === "storage") {
            if (documentModel.id === undefined) return;
            url = `activities/${documentModel.id}/${url}`;
        }

        documentModel.images[name] = { title: title, url: url, type: type };
        overrideCurrentRelationModel(documentModel);
    }
    async addSection(): Promise<void> {
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
            validateInput: (val) => {
                let n = parseInt(val);
                if (isNaN(n)) return "an integer is required";
                if (n < 0) return "index must be greater than 0";
            },
        });
        let indexVal = res !== undefined ? parseInt(res) : sections.length;

        let title = await vscode.window.showInputBox({
            title: "Title",
            validateInput: (val) => {
                if (val.length <= 0) return "field is required";
            },
        });
        if (title === undefined) return;
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
    async addPoint(): Promise<void> {
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

        let name = await vscode.window.showInputBox({ title: "Name" });
        if (name === undefined || name.length <= 0) return;
        let res = await vscode.window.showInputBox({
            title: "Latitude",
            value: "",
            validateInput: (val) => {
                if (isNaN(parseFloat(val))) return "a number is required";
            },
        });
        if (res === undefined || isNaN(parseFloat(res))) return;
        let lat = parseFloat(res.replaceAll(",", "."));

        res = await vscode.window.showInputBox({
            title: "Longitude",
            value: "",
            validateInput: (val) => {
                if (isNaN(parseFloat(val))) return "a number is required";
            },
        });
        if (res === undefined || isNaN(parseFloat(res))) return;
        let long = parseFloat(res.replaceAll(",", "."));

        let description = (await vscode.window.showInputBox({ title: "Description", value: "" })) ?? "";
        let mapLink = (await vscode.window.showQuickPick(["false", "true"], { title: "Add a map link" })) ?? "";

        documentModel.location.points[name] = {
            latitude: lat,
            longitude: long,
        };
        console.log(documentModel.location.points[name]);
        if (description.length > 0) documentModel.location.points[name].description = description;
        if (mapLink === "true") documentModel.location.points[name].map_link = true;
        overrideCurrentRelationModel(documentModel);
    }
    async addMark(item: RelationEditorItem): Promise<void> {
        if (item.context == "point-instance") {
            await compileMark("pos", item.label);
        } else if (item.context == "image-instance") {
            await compileMark("ph", item.label);
        } else if (item.context == "editor-bold") {
            await compileMark("b");
        } else if (item.context == "editor-italic") {
            await compileMark("i");
        } else if (item.context == "editor-act-ref") {
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
                if (folder === undefined) return;

                await config.update("dataRoot", folder.at(0)?.fsPath, vscode.ConfigurationTarget.Global);
                vscode.window.showInformationMessage("dataRoot set to " + folder);

                await compileMark("act");
            } else {
                if (!fs.existsSync(`${root}/activities`)) {
                    await compileMark("act");
                    return;
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

                await compileMark("act", undefined, availableActivities);
            }
        }
    }

    registerComands() {
        vscode.commands.registerCommand("relation-editor.refresh", () => this.refresh());
        vscode.commands.registerCommand("relation-editor.addPoint", () => this.addPoint());
        vscode.commands.registerCommand("relation-editor.addSection", () => this.addSection());
        vscode.commands.registerCommand("relation-editor.addImage", () => this.addImage());
        vscode.commands.registerCommand("relation-editor.addMark", (item: RelationEditorItem) => this.addMark(item));
        vscode.commands.registerCommand("relation-editor.sanitizeRelation", () => this.sanitizeRelation());
        vscode.commands.registerCommand("relation-editor.removeRelationItem", (item: RelationEditorItem) =>
            this.removeRelationItem(item)
        );
    }
    async removeRelationItem(item: RelationEditorItem): Promise<void> {
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
        if (item.context == "point-instance") {
            delete documentModel.location.points[item.label];
            overrideCurrentRelationModel(documentModel);
        } else if (item.context == "image-instance") {
            delete documentModel.images[item.label];
            overrideCurrentRelationModel(documentModel);
        } else if (item.context === "section-instance") {
            console.log(item);
            delete documentModel.relation.sections[item.itemModel?.id];
            overrideCurrentRelationModel(documentModel);
        }
    }

    async sanitizeRelation(): Promise<void> {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showWarningMessage("Editor not valid");
            return;
        }
        await editor.document.save();
        let warnings = sanitizeActivityModel(editor.document.fileName);
        console.log(warnings);
        if (warnings.length <= 0) {
            vscode.window.showInformationMessage("Activity sanitized");
        } else {
            vscode.window.showErrorMessage("Activity is not sanitized\n● " + warnings.join("● "));
        }
    }

    getTreeItem(element: RelationEditorItem): vscode.TreeItem | Thenable<vscode.TreeItem> {
        return element;
    }

    getChildren(element?: RelationEditorItem | undefined): vscode.ProviderResult<RelationEditorItem[]> {
        const editor = vscode.window.activeTextEditor;
        if (!editor) return;

        if (!element) {
            return [
                new RelationEditorItem(
                    "Overview",
                    "overview",
                    vscode.TreeItemCollapsibleState.Expanded,
                    new vscode.ThemeIcon("symbol-structure")
                ),
                new RelationEditorItem(
                    "Editor",
                    "editor",
                    vscode.TreeItemCollapsibleState.Collapsed,
                    new vscode.ThemeIcon("edit")
                ),
            ];
        } else {
            let items: RelationEditorItem[] = [];
            let documentModel = JSON.parse(editor.document.getText());
            if (element.context === "overview") {
                return Promise.resolve([
                    new RelationEditorItem(
                        "Points",
                        "points",
                        vscode.TreeItemCollapsibleState.Collapsed,
                        new vscode.ThemeIcon("location")
                    ),
                    new RelationEditorItem(
                        "Images",
                        "images",
                        vscode.TreeItemCollapsibleState.Collapsed,
                        new vscode.ThemeIcon("device-camera")
                    ),
                    new RelationEditorItem(
                        "Sections",
                        "sections",
                        vscode.TreeItemCollapsibleState.Collapsed,
                        new vscode.ThemeIcon("bookmark")
                    ),
                ]);
            } else if (element.context === "points") {
                let entries = Object.entries(documentModel.location.points);
                items.push(
                    ...entries.map(
                        (e) =>
                            new RelationEditorItem(
                                e[0],
                                "point-instance",
                                vscode.TreeItemCollapsibleState.None,
                                undefined,
                                e[1] as any
                            )
                    )
                );
                return Promise.resolve(items);
            } else if (element.context === "images") {
                let entries = Object.entries(documentModel.images);
                items.push(
                    ...entries.map(
                        (e) =>
                            new RelationEditorItem(
                                e[0],
                                "image-instance",
                                vscode.TreeItemCollapsibleState.None,
                                undefined,
                                e[1] as any
                            )
                    )
                );
                return Promise.resolve(items);
            } else if (element.context === "sections") {
                let entries = Object.entries(documentModel.relation.sections);
                items.push(
                    ...entries.map(
                        (e) =>
                            new RelationEditorItem(
                                (e[1] as any).title,
                                "section-instance",
                                vscode.TreeItemCollapsibleState.None,
                                undefined,
                                { id: e[0], model: (e[1] as any).content }
                            )
                    )
                );
                return Promise.resolve(items);
            } else if (element.context === "editor") {
                items.push(
                    ...[
                        new RelationEditorItem(
                            "Bold",
                            "editor-bold",
                            vscode.TreeItemCollapsibleState.None,
                            new vscode.ThemeIcon("bold")
                        ),
                        new RelationEditorItem(
                            "Italic",
                            "editor-italic",
                            vscode.TreeItemCollapsibleState.None,
                            new vscode.ThemeIcon("italic")
                        ),
                        new RelationEditorItem(
                            "Activity Reference",
                            "editor-act-ref",
                            vscode.TreeItemCollapsibleState.None,
                            new vscode.ThemeIcon("link")
                        ),
                    ]
                );
                return Promise.resolve(items);
            }
        }
    }
}
