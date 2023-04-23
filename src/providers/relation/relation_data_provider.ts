import * as vscode from "vscode";
import fs from "fs";
import { computeAnalysis, insertTextAtCursor, overrideCurrentRelationModel } from "../../common/editor";
import { capitalize } from "../../common/augmentation";
import { compileMark } from "../../common/marked_text_editor";
import { calculateLocations, elementsInPath, readAvailableActivities, toWordCapitalized } from "../../common/utils";
import { RelationEditorItem } from "./relation_item";
import { DescriptedQuickPickItem } from "../../common/descripted_quick_pick_item";
import path from "path";
import atera from "atera_admin_sdk/api/atera";

export class RelationEditorDataProvider implements vscode.TreeDataProvider<RelationEditorItem> {
    static id: string = "relation-editor";

    private analysisProblems: [string, any][] = [];

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
        const editor = vscode.window.activeTextEditor;
        if (editor) {
            try {
                let model = JSON.parse(editor.document.getText());
                this.analysisProblems = computeAnalysis(model);
            } catch (_) {}
        }
    }

    refresh(): void {
        const editor = vscode.window.activeTextEditor;
        if (editor) {
            try {
                let model = JSON.parse(editor.document.getText());
                this.analysisProblems = computeAnalysis(model);
            } catch (_) {}
        }
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

        let name = await vscode.window.showInputBox({
            title: "Name",
            ignoreFocusOut: true,
            placeHolder: "identifier of the image",
            validateInput: (val) => (val.length <= 0 ? "required" : undefined),
        });
        if (name === undefined || name.length <= 0) return;
        let type = await vscode.window.showQuickPick(["storage", "web", "local"], {
            title: "Select the type",
            placeHolder: "type of the marker",
        });
        if (type === undefined) return;

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
            placeHolder: "index of the section",
            validateInput: (val) => {
                let n = parseInt(val);
                if (isNaN(n)) return "an integer is required";
                if (n < 0) return "index must be greater than 0";
            },
            ignoreFocusOut: true,
        });
        let indexVal = res !== undefined ? parseInt(res) : sections.length;

        let title = await vscode.window.showInputBox({
            title: "Title",
            placeHolder: "title of the section",
            validateInput: (val) => {
                if (val.length <= 0) return "field is required";
            },
            ignoreFocusOut: true,
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

        let name = await vscode.window.showInputBox({
            title: "Name",
            placeHolder: "identifier of the point",
            ignoreFocusOut: true,
        });
        if (name === undefined || name.length <= 0) return;
        let res = await vscode.window.showInputBox({
            title: "Latitude",
            placeHolder: "latitude in degrees",
            value: "",
            validateInput: (val) => {
                if (isNaN(parseFloat(val))) return "a number is required";
            },
            ignoreFocusOut: true,
        });
        if (res === undefined || isNaN(parseFloat(res))) return;
        let lat = parseFloat(res.replaceAll(",", "."));

        res = await vscode.window.showInputBox({
            title: "Longitude",
            placeHolder: "longitude in degrees",
            value: "",
            validateInput: (val) => {
                if (isNaN(parseFloat(val))) return "a number is required";
            },
            ignoreFocusOut: true,
        });
        if (res === undefined || isNaN(parseFloat(res))) return;
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
        if (description.length > 0) documentModel.location.points[name].description = description;
        if (mapLink === "true") documentModel.location.points[name].map_link = true;
        overrideCurrentRelationModel(documentModel);
    }

    async addMark(item: RelationEditorItem | undefined): Promise<void> {
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
                let availableActivities = await readAvailableActivities();
                await compileMark({ type: "act", preloadedElements: availableActivities });
                break;
            default:
                break;
        }
    }

    registerComands() {
        vscode.commands.registerCommand("relation-editor.refresh", () => this.refresh());
        vscode.commands.registerCommand("relation-editor.addPoint", () => this.addPoint());
        vscode.commands.registerCommand("relation-editor.addSection", () => this.addSection());
        vscode.commands.registerCommand("relation-editor.addImage", () => this.addImage());
        vscode.commands.registerCommand("relation-editor.setParams", () => this.setParams());
        vscode.commands.registerCommand("relation-editor.addLocation", (item: RelationEditorItem) =>
            this.addLocation(item)
        );
        vscode.commands.registerCommand("relation-editor.addMark", (item: RelationEditorItem | undefined) =>
            this.addMark(item)
        );
        vscode.commands.registerCommand("relation-editor.sanitizeRelation", () => this.sanitizeRelation());
        vscode.commands.registerCommand("relation-editor.addSymbol", () => this.addSymbol());
        vscode.commands.registerCommand("relation-editor.removeRelationItem", (item: RelationEditorItem) =>
            this.removeRelationItem(item)
        );
    }

    async setParams(): Promise<any> {
        const editor = vscode.window.activeTextEditor;
        if (!editor) return;
        try {
            let documentModel = JSON.parse(editor.document.getText());
            atera.activity.computeActivityModelParams(documentModel, { apply: true });
            overrideCurrentRelationModel(documentModel);
            vscode.window.showInformationMessage("Parameters adjusted");
            //* Terminal example
            // let terminal: vscode.Terminal | undefined = vscode.window.activeTerminal;
            // terminal ??= vscode.window.createTerminal("upload");
            // terminal?.sendText("atera activity sanitize " + path.basename(path.dirname(editor.document.fileName)));
            // terminal?.show();
        } catch (_) {
            return;
        }
    }

    async addLocation(item: RelationEditorItem): Promise<void> {
        const editor = vscode.window.activeTextEditor;
        if (!editor) return;
        let documentModel: any | undefined = undefined;
        try {
            documentModel = JSON.parse(editor.document.getText());
            let originalModel = JSON.parse(JSON.stringify(documentModel));
            let locations = await calculateLocations();
            console.log(locations);
            if (locations === undefined) return;
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
        } catch (_) {
            return;
        }
    }

    async addSymbol(): Promise<void> {
        let symbol = await vscode.window.showQuickPick([new DescriptedQuickPickItem("● ", "bullet point")], {
            ignoreFocusOut: true,
            title: "Symbol",
        });
        if (symbol !== undefined) {
            await insertTextAtCursor(symbol.label);
        }
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
        if (item.contextValue == "point-instance") {
            delete documentModel.location.points[item.label];
            overrideCurrentRelationModel(documentModel);
        } else if (item.contextValue == "image-instance") {
            delete documentModel.images[item.label];
            overrideCurrentRelationModel(documentModel);
        } else if (item.contextValue === "section-instance") {
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
        }
    }

    async sanitizeRelation(): Promise<void> {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showWarningMessage("Editor not valid");
            return;
        }
        await editor.document.save();
        let warnings = atera.activity.sanitizeActivityModel(editor.document.fileName);
        if (warnings.length <= 0) {
            vscode.window.showInformationMessage("Activity sanitized");
        } else {
            vscode.window.showErrorMessage("Activity is not sanitized\n● " + warnings.join(" ● "));
        }
    }

    getTreeItem(element: RelationEditorItem): vscode.TreeItem | Thenable<vscode.TreeItem> {
        return element;
    }

    getChildren(element?: RelationEditorItem | undefined): vscode.ProviderResult<RelationEditorItem[]> {
        const editor = vscode.window.activeTextEditor;
        if (!editor) return;

        let items: RelationEditorItem[] = [];
        try {
            let documentModel = JSON.parse(editor.document.getText());
            if (!element) {
                return [
                    new RelationEditorItem("Analysis", "analysis", {
                        collapsibleState: vscode.TreeItemCollapsibleState.Expanded,
                        icon: new vscode.ThemeIcon("search"),
                    }),
                    new RelationEditorItem("Editor", "editor", {
                        collapsibleState: vscode.TreeItemCollapsibleState.Expanded,
                        icon: new vscode.ThemeIcon("edit"),
                    }),
                    new RelationEditorItem("Overview", "overview", {
                        collapsibleState: vscode.TreeItemCollapsibleState.Expanded,
                        icon: new vscode.ThemeIcon("symbol-structure"),
                    }),
                ];
            }
            if (element.contextValue === "analysis") {
                // let tips = computeAnalysis(documentModel);
                items.push(
                    ...this.analysisProblems.map(
                        (t) =>
                            new RelationEditorItem(t[0], t[0], {
                                description: t[1].description,
                                itemModel: t[1],
                                tooltip: t[1].description,
                                icon: new vscode.ThemeIcon(t[1].icon),
                            })
                    )
                );
                return Promise.resolve(items);
            } else if (element.contextValue === "overview") {
                return Promise.resolve([
                    new RelationEditorItem("Location", "location", {
                        collapsibleState: vscode.TreeItemCollapsibleState.Expanded,
                        icon: new vscode.ThemeIcon("map"),
                    }),
                    new RelationEditorItem("Images", "images", {
                        collapsibleState: vscode.TreeItemCollapsibleState.Expanded,
                        icon: new vscode.ThemeIcon("device-camera"),
                    }),
                    new RelationEditorItem("Sections", "sections", {
                        collapsibleState: vscode.TreeItemCollapsibleState.Expanded,
                        icon: new vscode.ThemeIcon("bookmark"),
                    }),
                ]);
            } else if (element.contextValue === "points") {
                let entries = Object.entries(documentModel.location.points);
                items.push(
                    ...entries.map(
                        (e) =>
                            new RelationEditorItem(e[0], "point-instance", {
                                collapsibleState: vscode.TreeItemCollapsibleState.None,
                                itemModel: e[1] as any,
                                description: (e[1] as any).description,
                                command: "relation-editor.addMark",
                            })
                    )
                );
                return Promise.resolve(items);
            } else if (element.contextValue === "images") {
                let entries = Object.entries(documentModel.images);
                items.push(
                    ...entries.map(
                        (e) =>
                            new RelationEditorItem(e[0], "image-instance", {
                                collapsibleState: vscode.TreeItemCollapsibleState.None,
                                description: (e[1] as any).title,
                                tooltip: (e[1] as any).url,
                                itemModel: e[1] as any,
                                command: "relation-editor.addMark",
                            })
                    )
                );
                return Promise.resolve(items);
            } else if (element.contextValue === "sections") {
                let entries = Object.entries(documentModel.relation.sections);
                items.push(
                    ...entries.map(
                        (e) =>
                            new RelationEditorItem((e[1] as any).title, "section-instance", {
                                collapsibleState: vscode.TreeItemCollapsibleState.None,
                                description: e[0],
                                itemModel: { id: e[0], model: (e[1] as any).content },
                            })
                    )
                );
                return Promise.resolve(items);
            } else if (element.contextValue === "location") {
                let entries = Object.entries(documentModel.location);
                items.push(
                    ...entries.map(
                        (e) =>
                            new RelationEditorItem(e[0], e[0] !== "points" ? "location-instance" : e[0], {
                                collapsibleState:
                                    typeof e[1] === "object"
                                        ? vscode.TreeItemCollapsibleState.Expanded
                                        : vscode.TreeItemCollapsibleState.None,
                                itemModel: { id: e[0] },
                                description: e[0] !== "points" ? (e[1] as string) : undefined,
                                command: e[0] !== "points" ? "relation-editor.addLocation" : undefined,
                            })
                    )
                );
                return Promise.resolve(items);
            } else if (element.contextValue === "editor") {
                items.push(
                    ...[
                        new RelationEditorItem("Bold", "editor-bold", {
                            collapsibleState: vscode.TreeItemCollapsibleState.None,
                            icon: new vscode.ThemeIcon("bold"),
                            command: "relation-editor.addMark",
                        }),
                        new RelationEditorItem("Italic", "editor-italic", {
                            collapsibleState: vscode.TreeItemCollapsibleState.None,
                            icon: new vscode.ThemeIcon("italic"),
                            command: "relation-editor.addMark",
                        }),
                        new RelationEditorItem("Activity Reference", "editor-act-ref", {
                            collapsibleState: vscode.TreeItemCollapsibleState.None,
                            icon: new vscode.ThemeIcon("link"),
                            command: "relation-editor.addMark",
                        }),
                        new RelationEditorItem("Symbol", "editor-symbol", {
                            collapsibleState: vscode.TreeItemCollapsibleState.None,
                            icon: new vscode.ThemeIcon("symbol-parameter"),
                            command: "relation-editor.addSymbol",
                        }),
                    ]
                );
                return Promise.resolve(items);
            }
        } catch (error) {
            return Promise.resolve([
                ...items,
                new RelationEditorItem("Relation document has errors", "editor-relation-error", {
                    description: error?.toString(),
                    tooltip: error?.toString(),
                    collapsibleState: vscode.TreeItemCollapsibleState.None,
                    icon: new vscode.ThemeIcon("error"),
                }),
            ]);
        }
    }
}
