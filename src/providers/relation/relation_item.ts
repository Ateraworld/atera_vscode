import * as vscode from "vscode";
export class RelationEditorItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly context: string,
        collapsibleState?: vscode.TreeItemCollapsibleState,
        iconPath?: vscode.ThemeIcon,
        public readonly itemModel?: {}
    ) {
        super(label, collapsibleState);
        this.iconPath = iconPath;
        this.contextValue = context;
    }
}
