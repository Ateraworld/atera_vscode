import * as vscode from "vscode";
import { compileMarkedToken } from "./common/marked_text_editor";

export function activate(context: vscode.ExtensionContext) {
    let disposables: vscode.Disposable[] = [];
    disposables.push(
        vscode.commands.registerCommand("atera-vscode.reports.bold", async () => {
            await compileMarkedToken("b");
        })
    );
    disposables.push(
        vscode.commands.registerCommand("atera-vscode.reports.italic", async () => {
            await compileMarkedToken("i");
        })
    );
    disposables.push(
        vscode.commands.registerCommand("atera-vscode.reports.activity", async () => {
            await compileMarkedToken("act");
        })
    );
    disposables.push(
        vscode.commands.registerCommand("atera-vscode.reports.position", async () => {
            await compileMarkedToken("pos");
        })
    );
    disposables.push(
        vscode.commands.registerCommand("atera-vscode.reports.photo", async () => {
            await compileMarkedToken("ph");
        })
    );

    disposables.forEach((element) => {
        context.subscriptions.push(element);
    });
}

export function deactivate() {}
