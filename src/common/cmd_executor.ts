import path from "path";
import * as vscode from "vscode";

export async function interpretAndExecuteCmd(commandModel: any): Promise<void> {
    try {
        let cmdStr = commandModel.cmd as string;
        let sdkRoot = vscode.workspace.getConfiguration("atera").get("sdkRoot") as string | undefined;
        let dataRoot = vscode.workspace.getConfiguration("atera").get("dataRoot") as string | undefined;
        if (RegExp(/\${[A-Za-z_]*}/g).test(cmdStr)) {
            const editor = vscode.window.activeTextEditor;
            if (!editor) {
                vscode.window.showWarningMessage("Editor not valid");
                return;
            }
            let documentModel = JSON.parse(editor.document.getText());
            if (cmdStr.includes("${activity}")) {
                cmdStr = cmdStr.replaceAll("${activity}", path.parse(editor.document.fileName).name);
            }
            if (cmdStr.includes("${activity_id}")) {
                cmdStr = cmdStr.replaceAll("${activity_id}", documentModel.id);
            }
            let storagePath = `${editor.document.fileName}/../storage`;
            if (cmdStr.includes("${storage}")) {
                cmdStr = cmdStr.replaceAll("${storage}", path.resolve(storagePath));
            }
            let rootPath = `${editor.document.fileName}/../`;
            if (cmdStr.includes("${folder}")) {
                cmdStr = cmdStr.replaceAll("${folder}", path.resolve(rootPath));
            }

            if (cmdStr.includes("${sdk}")) {
                cmdStr = cmdStr.replaceAll("${sdk}", sdkRoot != undefined ? path.resolve(sdkRoot) : "");
            }
            if (cmdStr.includes("${data}")) {
                cmdStr = cmdStr.replaceAll("${data}", dataRoot != undefined ? path.resolve(dataRoot) : "");
            }
        }
        let terminal = vscode.window.terminals.find((t) => t.name == "atera-editor-cmd");
        terminal ??= vscode.window.createTerminal("atera-editor-cmd");
        if (sdkRoot !== undefined && (commandModel.requires_sdk ?? true)) {
            cmdStr = `cd ${sdkRoot} && ${cmdStr}`;
        }
        terminal.show();
        terminal.sendText(cmdStr);
    } catch (_) {}
}
