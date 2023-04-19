import * as vscode from "vscode";

class DescriptedQuickPickItem implements vscode.QuickPickItem {
    label: string;
    kind?: vscode.QuickPickItemKind | undefined;
    description?: string | undefined;
    detail?: string | undefined;
    picked?: boolean | undefined;
    alwaysShow?: boolean | undefined;
    buttons?: readonly vscode.QuickInputButton[] | undefined;
    constructor(label: string, description: string) {
        this.label = label;
        this.description = description;
    }
}

export async function compileMarkedToken(tokenId?: string) {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        vscode.window.showWarningMessage("Editor not valid X(");
        return;
    }
    tokenId ??= await vscode.window.showQuickPick(["b", "i", "act", "pos", "ph"], { title: "Select the token" });
    const selectedText = editor.document.getText(editor.selection);
    const tokenText =
        selectedText.length <= 0 ? await vscode.window.showInputBox({ prompt: "Text", value: "" }) : selectedText;
    if (tokenText === undefined) return;
    let payloadText: string | undefined = undefined;
    let documentModel: any;
    try {
        documentModel = JSON.parse(editor.document.getText());
    } catch (_) {}
    if (tokenId == "pos") {
        let points = Object.entries(documentModel?.location.points);
        if (points.length > 0) {
            let pointName = await vscode.window.showQuickPick(
                points.map((e) => new DescriptedQuickPickItem(e[0], (e[1] as any).description ?? "")),
                { title: "Points" }
            );
            if (pointName === undefined) return;
            payloadText = pointName?.label;
        }
    }
    if (tokenId == "ph") {
        let photos = Object.entries(documentModel?.images);
        if (photos.length > 0) {
            let photoName = await vscode.window.showQuickPick(
                photos.map((e) => new DescriptedQuickPickItem(e[0], (e[1] as any).title ?? "")),
                { title: "Photos" }
            );
            payloadText = photoName?.label;
        }
    }
    payloadText ??= (await vscode.window.showInputBox({ prompt: "Payload", value: "" })) ?? "";
    editor
        .edit((editBuilder) => {
            let text = "${[" + tokenText + "]" + tokenId + "(" + payloadText + ")}";
            editBuilder.replace(editor.selection, text);
        })
        .then((_) => {
            var postion = editor.selection.end;
            editor.selection = new vscode.Selection(postion, postion);
        });
}
