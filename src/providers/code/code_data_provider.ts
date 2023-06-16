import * as vscode from "vscode";
import { CodeBaseAnalysis, analyzeCodeBase } from "./code_analyzer";
import { Item } from "src/common/item_param";

export class CodeDataProvider implements vscode.TreeDataProvider<Item> {
    static id: string = "code-provider";
    private analysis: CodeBaseAnalysis | undefined = undefined;
    private _onDidChangeTreeData: vscode.EventEmitter<Item | undefined | null | void> = new vscode.EventEmitter<
        Item | undefined | null | void
    >();
    readonly onDidChangeTreeData: vscode.Event<Item | undefined | null | void> = this._onDidChangeTreeData.event;

    async refresh(): Promise<void> {
        this.analysis = await analyzeCodeBase();
    }

    constructor() {
        vscode.window.onDidChangeActiveTextEditor((event) => {
            this.refresh();
        });

        this.refresh();
    }

    getTreeItem(element: Item): vscode.TreeItem | Thenable<vscode.TreeItem> {
        return element;
    }
    registerComands() {
        vscode.commands.registerCommand("code-provider.refresh", () => this.refresh());
    }
    getChildren(element?: Item | undefined): vscode.ProviderResult<Item[]> {
        if (!element) {
            return [
                new Item("Info", "info", {
                    collapsibleState: vscode.TreeItemCollapsibleState.Expanded,
                    icon: new vscode.ThemeIcon("info"),
                }),
                new Item("Warnings", "warnings", {
                    collapsibleState: vscode.TreeItemCollapsibleState.Expanded,
                    icon: new vscode.ThemeIcon("warning"),
                }),
                new Item("Errors", "errors", {
                    collapsibleState: vscode.TreeItemCollapsibleState.Expanded,
                    icon: new vscode.ThemeIcon("error"),
                }),
            ];
        }
        if (this.analysis === undefined) {return Promise.resolve([]);}
        if (element.contextValue === "info") {
            return Promise.resolve(
                this.analysis.info.map(
                    (t) =>
                        new Item(t[0], t[0], {
                            description: t[1].description,
                            tooltip: t[1].source ?? t[1].description,
                        })
                )
            );
        } else if (element.contextValue === "warnings") {
            return Promise.resolve(
                this.analysis.warnings.map(
                    (t) =>
                        new Item(t[0], t[0], {
                            description: t[1].description,
                            tooltip: t[1].source ?? t[1].description,
                        })
                )
            );
        } else if (element.contextValue === "errors") {
            return Promise.resolve(
                this.analysis.errors.map(
                    (t) =>
                        new Item(t[0], t[0], {
                            description: t[1].description,
                            tooltip: t[1].source ?? t[1].description,
                        })
                )
            );
        }
        return [];
    }
}
