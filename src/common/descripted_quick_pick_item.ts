import * as vscode from "vscode";

export class DescriptedQuickPickItem implements vscode.QuickPickItem {
    label: string;
    kind?: vscode.QuickPickItemKind | undefined;
    description?: string | undefined;
    detail?: string | undefined;
    picked?: boolean | undefined;
    alwaysShow?: boolean | undefined;
    buttons?: readonly vscode.QuickInputButton[] | undefined;
    payload?: any | undefined;
    constructor(
        label: string,
        description: string,
        detail: string | undefined = undefined,
        payload: any | undefined = undefined
    ) {
        this.label = label;
        this.description = description;
        this.payload = payload;
        this.detail = detail;
    }
}
