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

export async function compileMark(tokenId?: string, payload?: string, availableActivities?: [string, any][]) {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        vscode.window.showWarningMessage("Editor not valid");
        return;
    }
    tokenId ??= await vscode.window.showQuickPick(["b", "i", "act", "pos", "ph"], {
        title: "Select the token",
        placeHolder: "type of the marker",
    });

    let documentModel: any;
    try {
        documentModel = JSON.parse(editor.document.getText());
    } catch (_) {}
    let tokenText: string | undefined = undefined;
    if (tokenId === "act" && availableActivities !== undefined && availableActivities.length > 0) {
        let actId = await vscode.window.showQuickPick(
            availableActivities.map((e) => new DescriptedQuickPickItem(e[1].name ?? "", e[0])),
            { title: "Activities" }
        );
        payload = actId?.description;
        tokenText = actId?.label;
    }
    const selectedText = editor.document.getText(editor.selection);
    tokenText ??=
        selectedText.length <= 0
            ? await vscode.window.showInputBox({ title: "Text", placeHolder: "text to display", value: "" })
            : selectedText;
    if (tokenText === undefined) return;
    if (payload === undefined) {
        if (tokenId === "pos") {
            let points = Object.entries(documentModel?.location.points);
            if (points.length > 0) {
                let pointName = await vscode.window.showQuickPick(
                    points.map((e) => new DescriptedQuickPickItem(e[0], (e[1] as any).description ?? "")),
                    { title: "Points" }
                );
                if (pointName === undefined) return;
                payload = pointName?.label;
            }
        } else if (tokenId === "ph") {
            let photos = Object.entries(documentModel?.images);
            if (photos.length > 0) {
                let photoName = await vscode.window.showQuickPick(
                    photos.map((e) => new DescriptedQuickPickItem(e[0], (e[1] as any).title ?? "")),
                    { title: "Photos" }
                );
                payload = photoName?.label;
            }
        }
    }
    payload ??=
        (await vscode.window.showInputBox({ title: "Payload", placeHolder: "payload of the marker", value: "" })) ?? "";
    editor
        .edit((editBuilder) => {
            let text = "${[" + tokenText + "]" + tokenId + "(" + payload + ")}";
            editBuilder.replace(editor.selection, text);
        })
        .then((_) => {
            var postion = editor.selection.end;
            editor.selection = new vscode.Selection(postion, postion);
        });
}
