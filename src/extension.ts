import * as vscode from "vscode";
import { RelationDataProvider } from "./providers/relation/relation_data_provider";
import { CodeDataProvider } from "./providers/code/code_data_provider";
import fs from "fs";
export function activate(context: vscode.ExtensionContext) {
    const relationProvider = new RelationDataProvider();
    relationProvider.registerComands();
    vscode.window.registerTreeDataProvider(RelationDataProvider.id, relationProvider);

    const codeProvider = new CodeDataProvider();
    codeProvider.registerComands();
    vscode.window.registerTreeDataProvider(CodeDataProvider.id, codeProvider);

    let config = vscode.workspace.getConfiguration("atera");
    let root = config.get("dataRoot") as string | undefined;
    if (root === undefined || !fs.existsSync(root)) {
        vscode.window.showWarningMessage("Unable to fetch data: dataRoot folder is not correctly set in settings");
    }
}

export function deactivate() {}
