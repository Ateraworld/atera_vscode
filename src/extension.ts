import * as vscode from "vscode";
import { RelationEditorDataProvider } from "./providers/relation/relation_data_provider";

export function activate(context: vscode.ExtensionContext) {
    const provider = new RelationEditorDataProvider();
    provider.registerComands();
    vscode.window.registerTreeDataProvider(RelationEditorDataProvider.id, provider);
}

export function deactivate() {}
