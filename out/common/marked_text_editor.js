"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.compileMarkedToken = void 0;
const vscode = require("vscode");
class DescriptedQuickPickItem {
    constructor(label, description) {
        this.label = label;
        this.description = description;
    }
}
async function compileMarkedToken(tokenId) {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        vscode.window.showWarningMessage("Editor not valid X(");
        return;
    }
    tokenId ?? (tokenId = await vscode.window.showQuickPick(["b", "i", "act", "pos", "ph"], { title: "Select the token" }));
    const selectedText = editor.document.getText(editor.selection);
    const tokenText = selectedText.length <= 0 ? await vscode.window.showInputBox({ prompt: "Text", value: "" }) : selectedText;
    if (tokenText === undefined)
        return;
    let payloadText = undefined;
    let documentModel;
    try {
        documentModel = JSON.parse(editor.document.getText());
    }
    catch (_) { }
    if (tokenId == "pos") {
        let points = Object.entries(documentModel?.location.points);
        if (points.length > 0) {
            let pointName = await vscode.window.showQuickPick(points.map((e) => new DescriptedQuickPickItem(e[0], e[1].description ?? "")), { title: "Points" });
            if (pointName === undefined)
                return;
            payloadText = pointName?.label;
        }
    }
    if (tokenId == "ph") {
        let photos = Object.entries(documentModel?.images);
        if (photos.length > 0) {
            let photoName = await vscode.window.showQuickPick(photos.map((e) => new DescriptedQuickPickItem(e[0], e[1].title ?? "")), { title: "Photos" });
            payloadText = photoName?.label;
        }
    }
    payloadText ?? (payloadText = (await vscode.window.showInputBox({ prompt: "Payload", value: "" })) ?? "");
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
exports.compileMarkedToken = compileMarkedToken;
//# sourceMappingURL=marked_text_editor.js.map