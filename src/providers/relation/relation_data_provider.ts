import path from "path";
import { computeActivitiesProxy } from "src/common/activity";
import { Item } from "src/common/item_param";
import { readDefinitions } from "src/common/utils";
import * as vscode from "vscode";
import { computeAnalysis } from "./editor";
import {
    addImage,
    addLink,
    addLocation,
    addMark,
    addPoint,
    addSection,
    addStorageImages,
    addSymbol,
    addTag,
    listActivities,
    removeRelationItem,
} from "./relation_commands";

export class RelationDataProvider implements vscode.TreeDataProvider<Item> {
    static id: string = "relation-provider";

    private analysisProblems: [string, any][] = [];
    private definitionsModel: any;
    private activitiesProxy: any;
    private _onDidChangeTreeData: vscode.EventEmitter<Item | undefined | null | void> = new vscode.EventEmitter<
        Item | undefined | null | void
    >();
    readonly onDidChangeTreeData: vscode.Event<Item | undefined | null | void> = this._onDidChangeTreeData.event;

    constructor() {
        vscode.workspace.onDidChangeTextDocument((event) => {
            this.refresh();
        });
        vscode.window.onDidChangeActiveTextEditor((event) => {
            this.refresh();
        });
        this.refresh();
    }

    refresh(): void {
        readDefinitions().then((r) => (this.definitionsModel = r));
        const editor = vscode.window.activeTextEditor;
        if (editor) {
            if (path.extname(editor.document.fileName) === ".json") {
                try {
                    this.analysisProblems = computeAnalysis(editor.document);
                } catch (error) {
                    console.log(error);
                }
            }
            this._onDidChangeTreeData.fire();
        }
        computeActivitiesProxy().then((proxy) => (this.activitiesProxy = proxy));
    }

    registerComands() {
        vscode.commands.registerCommand("relation-provider.refresh", () => this.refresh());
        vscode.commands.registerCommand("relation-provider.addPoint", () => addPoint());
        vscode.commands.registerCommand("relation-provider.addSection", () => addSection());
        vscode.commands.registerCommand("relation-provider.addImage", () => addImage());
        vscode.commands.registerCommand("relation-provider.addTag", () => addTag());
        vscode.commands.registerCommand("relation-provider.addLocation", (item: Item) => addLocation(item));
        vscode.commands.registerCommand("relation-provider.listActivities", () => listActivities());
        vscode.commands.registerCommand("relation-provider.addStorageImages", () => addStorageImages());
        vscode.commands.registerCommand("relation-provider.addMark", (item: Item | undefined) => addMark(item));
        vscode.commands.registerCommand("relation-provider.addSymbol", () => addSymbol());
        vscode.commands.registerCommand("relation-provider.addLink", (item: Item | undefined) => addLink());
        vscode.commands.registerCommand("relation-provider.removeRelationItem", (item: Item) =>
            removeRelationItem(item)
        );
    }

    getTreeItem(element: Item): vscode.TreeItem | Thenable<vscode.TreeItem> {
        return element;
    }

    getChildren(element?: Item | undefined): vscode.ProviderResult<Item[]> {
        const editor = vscode.window.activeTextEditor;
        if (!editor || path.extname(editor.document.fileName) !== ".json") {
            return Promise.resolve([]);
        }
        let items: Item[] = [];
        try {
            let documentModel = JSON.parse(editor.document.getText());

            if (!element) {
                return [
                    new Item("Analysis", "analysis", {
                        collapsibleState: vscode.TreeItemCollapsibleState.Expanded,
                        icon: new vscode.ThemeIcon("search", new vscode.ThemeColor("charts.blue")),
                    }),
                    new Item("Editor", "editor", {
                        collapsibleState: vscode.TreeItemCollapsibleState.Expanded,
                        icon: new vscode.ThemeIcon("edit", new vscode.ThemeColor("charts.blue")),
                    }),
                    new Item("Overview", "overview", {
                        collapsibleState: vscode.TreeItemCollapsibleState.Expanded,
                        icon: new vscode.ThemeIcon("preview", new vscode.ThemeColor("charts.blue")),
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
                                icon: new vscode.ThemeIcon(t[1].icon, new vscode.ThemeColor(t[1].color)),
                            })
                    )
                );
            } else if (element.contextValue === "overview") {
                items.push(
                    new Item(this.definitionsModel.categories[documentModel.category].name, "category", {
                        description: documentModel.category,
                        collapsibleState: vscode.TreeItemCollapsibleState.None,
                    })
                );

                if (documentModel.attestation != null && (documentModel.attestation.enabled ?? true)) {
                    items.push(
                        ...[
                            new Item("Tokens", "tokens", {
                                description: documentModel.attestation?.tokens?.toString(),
                                collapsibleState: vscode.TreeItemCollapsibleState.None,
                                icon: new vscode.ThemeIcon("circle-large", new vscode.ThemeColor("atera.blue")),
                            }),
                            new Item("Rank", "rank", {
                                collapsibleState: vscode.TreeItemCollapsibleState.None,
                                description: documentModel.attestation?.rank?.toString(),
                                icon: new vscode.ThemeIcon("star-full", new vscode.ThemeColor("atera.red")),
                            }),
                        ]
                    );
                }
                items.push(
                    ...[
                        new Item("Location", "location", {
                            collapsibleState: vscode.TreeItemCollapsibleState.Expanded,
                            icon: new vscode.ThemeIcon("map"),
                        }),
                        new Item("Images", "images", {
                            collapsibleState: vscode.TreeItemCollapsibleState.Expanded,
                            icon: new vscode.ThemeIcon("device-camera"),
                        }),
                        new Item("Links", "links", {
                            collapsibleState: vscode.TreeItemCollapsibleState.Expanded,
                            icon: new vscode.ThemeIcon("link"),
                        }),
                    ]
                );

                if (documentModel?.relation?.sections != null) {
                    items.push(
                        ...[
                            new Item("Sections", "sections", {
                                collapsibleState: vscode.TreeItemCollapsibleState.Expanded,
                                icon: new vscode.ThemeIcon("bookmark"),
                            }),
                        ]
                    );
                }
                if (documentModel.tags != null) {
                    items.push(
                        ...[
                            new Item("Tags", "tags", {
                                collapsibleState: vscode.TreeItemCollapsibleState.Expanded,
                                icon: new vscode.ThemeIcon("tag"),
                            }),
                        ]
                    );
                }
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
            } else if (element.contextValue === "links") {
                if (this.activitiesProxy === null) return [];
                let entries = Object.entries(documentModel.activities_links ?? []) ?? {};
                items.push(
                    ...entries.map((e) => {
                        let m = this.activitiesProxy[e[0]];
                        return new Item(m.name, "link-instance", {
                            collapsibleState: vscode.TreeItemCollapsibleState.None,
                            description: e[0],
                            itemModel: { id: e[0], model: m },
                        });
                    })
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
            } else if (element.contextValue === "tags") {
                let tags = Object.entries(this.definitionsModel.tags);
                let entries = Object.entries(documentModel.tags);
                items.push(
                    ...entries.map((e) => {
                        let match = tags.find((t) => t[0] === e[0]);
                        let name = match !== undefined ? (match[1] as any).name : e[0];
                        let model = match !== undefined ? (match[1] as any) : {};
                        return new Item(e[0], "tag-instance", {
                            collapsibleState: vscode.TreeItemCollapsibleState.None,
                            itemModel: model,
                            tooltip: model?.description,
                            description: name,
                        });
                    })
                );
            } else if (element.contextValue === "editor") {
                items.push(
                    ...[
                        new Item("Bold", "editor-bold", {
                            collapsibleState: vscode.TreeItemCollapsibleState.None,
                            icon: new vscode.ThemeIcon("bold", new vscode.ThemeColor("charts.lines")),
                            command: "relation-provider.addMark",
                        }),
                        new Item("Italic", "editor-italic", {
                            collapsibleState: vscode.TreeItemCollapsibleState.None,
                            icon: new vscode.ThemeIcon("italic", new vscode.ThemeColor("charts.lines")),
                            command: "relation-provider.addMark",
                        }),
                        new Item("Activity Reference", "editor-act-ref", {
                            collapsibleState: vscode.TreeItemCollapsibleState.None,
                            icon: new vscode.ThemeIcon("link", new vscode.ThemeColor("charts.lines")),
                            command: "relation-provider.addMark",
                        }),
                        new Item("Symbol", "editor-symbol", {
                            collapsibleState: vscode.TreeItemCollapsibleState.None,
                            icon: new vscode.ThemeIcon("symbol-parameter", new vscode.ThemeColor("charts.lines")),
                            command: "relation-provider.addSymbol",
                        }),
                    ]
                );
            }
            return Promise.resolve(items);
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
