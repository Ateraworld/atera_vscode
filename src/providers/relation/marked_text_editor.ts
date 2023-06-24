import * as vscode from "vscode";
import { insertTextAtCursor } from "./editor";
import { DescriptedQuickPickItem } from "src/common/descripted_quick_pick_item";
import { readExistingActivities } from "src/common/utils";

export interface MarkParameters {
    type?: string | undefined;
    text?: string | undefined;
    payload?: string | undefined;
    preloadedElements?: [string, any][] | undefined;
}
export async function compileMark({
    type = undefined,
    text = undefined,
    payload = undefined,
    preloadedElements = [],
}: MarkParameters) {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        vscode.window.showWarningMessage("Editor not valid");
        return;
    }
    type ??= await vscode.window.showQuickPick(["b", "i", "act", "pos", "ph"], {
        title: "Select the token",
        placeHolder: "type of the marker",
    });

    let documentModel: any;
    try {
        documentModel = JSON.parse(editor.document.getText());
    } catch (_) {}
    if (type === "act") {
        preloadedElements = await readExistingActivities();
    }
    if (preloadedElements !== undefined && preloadedElements.length > 0) {
        let actId = await vscode.window.showQuickPick(
            preloadedElements.map((e) => new DescriptedQuickPickItem(e[1].name ?? "", e[0])),
            { title: "Elements", placeHolder: "select an existing element" }
        );
        payload = actId?.description;
        text = actId?.label;
    }
    const selectedText = editor.document.getText(editor.selection);
    text =
        selectedText.length <= 0
            ? await vscode.window.showInputBox({
                  title: "Text",
                  placeHolder: "text to display",
                  value: text ?? "",
                  ignoreFocusOut: true,
              })
            : selectedText;
    if (text === undefined) {
        return;
    }
    if (payload === undefined) {
        if (type === "pos") {
            let points = Object.entries(documentModel?.location.points);
            if (points.length > 0) {
                let pointName = await vscode.window.showQuickPick(
                    points.map((e) => new DescriptedQuickPickItem(e[0], (e[1] as any).description ?? "")),
                    { title: "Points", placeHolder: "select an existing point" }
                );
                if (pointName === undefined) {
                    return;
                }
                payload = pointName?.label;
            }
        } else if (type === "ph") {
            let photos = Object.entries(documentModel?.images);
            if (photos.length > 0) {
                let photoName = await vscode.window.showQuickPick(
                    photos.map((e) => new DescriptedQuickPickItem(e[0], (e[1] as any).title ?? "")),
                    { title: "Image", placeHolder: "select an existing image" }
                );
                payload = photoName?.label;
            }
        }
    }
    payload ??=
        (await vscode.window.showInputBox({
            title: "Payload",
            placeHolder: "payload of the marker",
            value: "",
            ignoreFocusOut: true,
        })) ?? "";
    await insertTextAtCursor("${[" + text + "]" + type + "(" + payload + ")}");
}
