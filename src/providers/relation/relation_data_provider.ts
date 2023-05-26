import * as vscode from "vscode";
import fs from "fs";
import { computeAnalysis, insertTextAtCursor, overrideCurrentRelationModel } from "./editor";
import { capitalize } from "../../common/augmentation";
import { compileMark } from "./marked_text_editor";
import { calculateLocations, readAvailableActivities, toWordCapitalized } from "../../common/utils";
import { DescriptedQuickPickItem } from "../../common/descripted_quick_pick_item";
import path from "path";
import * as atera from "atera_admin_sdk/api/atera";
import { Item } from "../../common/item_param";

export class RelationDataProvider implements vscode.TreeDataProvider<Item> {
    static id: string = "relation-provider";

    private analysisProblems: [string, any][] = [];

    private _onDidChangeTreeData: vscode.EventEmitter<Item | undefined | null | void> = new vscode.EventEmitter<
        Item | undefined | null | void
    >();
    readonly onDidChangeTreeData: vscode.Event<Item | undefined | null | void> = this._onDidChangeTreeData.event;

    constructor() {
        vscode.workspace.onDidChangeTextDocument((event) => {
            if (event.contentChanges.length > 0) {
                this.refresh();
            }
        });
        vscode.window.onDidChangeActiveTextEditor((event) => {
            this.refresh();
        });
        this.refresh();
    }

    refresh(): void {
        const editor = vscode.window.activeTextEditor;
        if (editor) {
            try {
                this.analysisProblems = computeAnalysis(editor.document);
                this._onDidChangeTreeData.fire();
            } catch (error) {
                console.log(error);
            }
        }
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
                let images = atera.path_ext
                    .elementsInPath(storagePath)
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

    async addMark(item: Item | undefined): Promise<void> {
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
        vscode.commands.registerCommand("relation-provider.refresh", () => this.refresh());
        vscode.commands.registerCommand("relation-provider.addPoint", () => this.addPoint());
        vscode.commands.registerCommand("relation-provider.addSection", () => this.addSection());
        vscode.commands.registerCommand("relation-provider.addImage", () => this.addImage());
        vscode.commands.registerCommand("relation-provider.setParams", () => this.setParams());
        vscode.commands.registerCommand("relation-provider.addLocation", (item: Item) => this.addLocation(item));
        vscode.commands.registerCommand("relation-provider.addMark", (item: Item | undefined) => this.addMark(item));
        vscode.commands.registerCommand("relation-provider.sanitizeRelation", () => this.sanitizeRelation());
        vscode.commands.registerCommand("relation-provider.addSymbol", () => this.addSymbol());
        vscode.commands.registerCommand("relation-provider.uploadRelation", () => this.uploadRelation());
        vscode.commands.registerCommand("relation-provider.removeRelationItem", (item: Item) =>
            this.removeRelationItem(item)
        );
    }

    async uploadRelation(): Promise<any> {
        const editor = vscode.window.activeTextEditor;
        if (!editor) return;
        try {
            let terminal: vscode.Terminal | undefined = vscode.window.activeTerminal;
            terminal ??= vscode.window.createTerminal("upload");
            terminal?.sendText("atera activity upload " + path.basename(path.dirname(editor.document.fileName)), false);
            terminal?.show();
        } catch (error) {
            vscode.window.showWarningMessage(error!.toString());
        }
    }

    async setParams(): Promise<any> {
        const editor = vscode.window.activeTextEditor;
        if (!editor) return;
        try {
            let terminal: vscode.Terminal | undefined = vscode.window.activeTerminal;
            terminal ??= vscode.window.createTerminal("params");
            terminal?.sendText(
                "atera activity set_params " +
                    path.basename(path.dirname(editor.document.fileName)) +
                    " --adjust-metrics"
            );
            terminal?.show();
        } catch (error) {
            vscode.window.showWarningMessage(error!.toString());
        }
    }

    async addLocation(item: Item): Promise<void> {
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

    async removeRelationItem(item: Item): Promise<void> {
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
        }
    }

    async sanitizeRelation(): Promise<void> {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showWarningMessage("Editor not valid");
            return;
        }
        await editor.document.save();
        try {
            let terminal: vscode.Terminal | undefined = vscode.window.activeTerminal;
            terminal ??= vscode.window.createTerminal("sanitize");
            terminal?.sendText("atera activity sanitize " + path.basename(path.dirname(editor.document.fileName)));
            terminal?.show();

            // let model = JSON.parse(editor.document.getText());
            // let results = atera.activity.sanitizeActivityModel(model, { fix: true });
            // await overrideCurrentRelationModel(model);
            // if (results[0].length <= 0) {
            //     vscode.window.showInformationMessage(
            //         "Activity sanitized" + (results[1].length > 0 ? " with warnings" : "")
            //     );
            // } else {
            //     vscode.window.showErrorMessage("Activity is not sanitized\n● " + results[0].join(" ● "));
            // }
        } catch (error) {
            vscode.window.showWarningMessage(error!.toString());
        }
    }

    getTreeItem(element: Item): vscode.TreeItem | Thenable<vscode.TreeItem> {
        return element;
    }

    getChildren(element?: Item | undefined): vscode.ProviderResult<Item[]> {
        const editor = vscode.window.activeTextEditor;
        if (!editor) return;

        let items: Item[] = [];
        try {
            let documentModel = JSON.parse(editor.document.getText());
            if (!element) {
                return [
                    new Item("Analysis", "analysis", {
                        collapsibleState: vscode.TreeItemCollapsibleState.Expanded,
                        icon: new vscode.ThemeIcon("search"),
                    }),
                    new Item("Editor", "editor", {
                        collapsibleState: vscode.TreeItemCollapsibleState.Expanded,
                        icon: new vscode.ThemeIcon("edit"),
                    }),
                    new Item("Overview", "overview", {
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
                            new Item(t[0], t[0], {
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
                    new Item("Tokens", "tokens", {
                        description: documentModel.attestation?.tokens?.toString(),
                        collapsibleState: vscode.TreeItemCollapsibleState.None,
                        icon: new vscode.ThemeIcon("circle-large"),
                    }),
                    new Item("Rank", "rank", {
                        collapsibleState: vscode.TreeItemCollapsibleState.None,
                        description: documentModel.attestation?.rank?.toString(),
                        icon: new vscode.ThemeIcon("star-full"),
                    }),
                    new Item("Location", "location", {
                        collapsibleState: vscode.TreeItemCollapsibleState.Expanded,
                        icon: new vscode.ThemeIcon("map"),
                    }),
                    new Item("Images", "images", {
                        collapsibleState: vscode.TreeItemCollapsibleState.Expanded,
                        icon: new vscode.ThemeIcon("device-camera"),
                    }),
                    new Item("Sections", "sections", {
                        collapsibleState: vscode.TreeItemCollapsibleState.Expanded,
                        icon: new vscode.ThemeIcon("bookmark"),
                    }),
                ]);
            } else if (element.contextValue === "points") {
                let entries = Object.entries(documentModel.location.points);
                items.push(
                    ...entries.map(
                        (e) =>
                            new Item(e[0], "point-instance", {
                                collapsibleState: vscode.TreeItemCollapsibleState.None,
                                itemModel: e[1] as any,
                                description: (e[1] as any).description,
                                command: "relation-provider.addMark",
                            })
                    )
                );
                return Promise.resolve(items);
            } else if (element.contextValue === "images") {
                let entries = Object.entries(documentModel.images);
                items.push(
                    ...entries.map(
                        (e) =>
                            new Item(e[0], "image-instance", {
                                collapsibleState: vscode.TreeItemCollapsibleState.None,
                                description: (e[1] as any).title,
                                tooltip: (e[1] as any).url,
                                itemModel: e[1] as any,
                                command: "relation-provider.addMark",
                            })
                    )
                );
                return Promise.resolve(items);
            } else if (element.contextValue === "sections") {
                let entries = Object.entries(documentModel.relation.sections);
                items.push(
                    ...entries.map(
                        (e) =>
                            new Item((e[1] as any).title, "section-instance", {
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
                            new Item(e[0], e[0] !== "points" ? "location-instance" : e[0], {
                                collapsibleState:
                                    typeof e[1] === "object"
                                        ? vscode.TreeItemCollapsibleState.Expanded
                                        : vscode.TreeItemCollapsibleState.None,
                                itemModel: { id: e[0] },
                                description: e[0] !== "points" ? (e[1] as string) : undefined,
                                command: e[0] !== "points" ? "relation-provider.addLocation" : undefined,
                            })
                    )
                );
                return Promise.resolve(items);
            } else if (element.contextValue === "editor") {
                items.push(
                    ...[
                        new Item("Bold", "editor-bold", {
                            collapsibleState: vscode.TreeItemCollapsibleState.None,
                            icon: new vscode.ThemeIcon("bold"),
                            command: "relation-provider.addMark",
                        }),
                        new Item("Italic", "editor-italic", {
                            collapsibleState: vscode.TreeItemCollapsibleState.None,
                            icon: new vscode.ThemeIcon("italic"),
                            command: "relation-provider.addMark",
                        }),
                        new Item("Activity Reference", "editor-act-ref", {
                            collapsibleState: vscode.TreeItemCollapsibleState.None,
                            icon: new vscode.ThemeIcon("link"),
                            command: "relation-provider.addMark",
                        }),
                        new Item("Symbol", "editor-symbol", {
                            collapsibleState: vscode.TreeItemCollapsibleState.None,
                            icon: new vscode.ThemeIcon("symbol-parameter"),
                            command: "relation-provider.addSymbol",
                        }),
                    ]
                );
                return Promise.resolve(items);
            }
        } catch (error) {
            return Promise.resolve([
                ...items,
                new Item("Relation document has errors", "editor-relation-error", {
                    description: error?.toString(),
                    tooltip: error?.toString(),
                    collapsibleState: vscode.TreeItemCollapsibleState.None,
                    icon: new vscode.ThemeIcon("error"),
                }),
            ]);
        }
    }
}
