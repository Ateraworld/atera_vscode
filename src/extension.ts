import * as vscode from "vscode";
import { RelationEditorDataProvider } from "./providers/relation/relation_data_provider";
import { cli } from "atera_admin_sdk/api/atera";

export function activate(context: vscode.ExtensionContext) {
    const provider = new RelationEditorDataProvider();
    provider.registerComands();
    vscode.window.registerTreeDataProvider(RelationEditorDataProvider.id, provider);
    cli.logger.enabled = false;
}

export function deactivate() {}
