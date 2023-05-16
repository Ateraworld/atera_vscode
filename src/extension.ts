import * as vscode from "vscode";
import { RelationDataProvider } from "./providers/relation/relation_data_provider";
import { cli } from "atera_admin_sdk/api/atera";
import { CodeDataProvider } from "./providers/code/code_data_provider";

export function activate(context: vscode.ExtensionContext) {
    const relationProvider = new RelationDataProvider();
    relationProvider.registerComands();
    vscode.window.registerTreeDataProvider(RelationDataProvider.id, relationProvider);

    const codeProvider = new CodeDataProvider();
    codeProvider.registerComands();
    vscode.window.registerTreeDataProvider(CodeDataProvider.id, codeProvider);

    cli.logger.enabled = false;
}

export function deactivate() {}
