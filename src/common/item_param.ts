import * as vscode from "vscode";

export class ItemParams {
    readonly collapsibleState?: vscode.TreeItemCollapsibleState;
    readonly icon?: vscode.ThemeIcon;
    readonly command?: string;
    readonly description?: string;
    readonly tooltip?: string;
    readonly itemModel?: any;
}

export class Item extends vscode.TreeItem {
    public readonly itemModel?: any;
    public readonly label: string;
    constructor(
        label: string,
        contextValue: string,
        { collapsibleState, icon, command, description, itemModel, tooltip }: ItemParams
    ) {
        super(label, collapsibleState);
        this.label = label;
        this.description = description;
        this.tooltip = tooltip ?? description;
        this.itemModel = itemModel;
        this.command = command !== undefined ? ({ command: command, arguments: [this] } as vscode.Command) : undefined;
        this.iconPath = icon;
        this.contextValue = contextValue;
    }
}
