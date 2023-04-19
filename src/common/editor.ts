import * as vscode from "vscode";

export function overrideCurrentRelationModel(newModel: any) {
    const editor = vscode.window.activeTextEditor;
    if (editor === undefined) return;
    let cursorPosition = editor.selection.end;
    editor
        .edit((editBuilder) => {
            editBuilder.replace(
                new vscode.Range(
                    editor.document.lineAt(0).range.start,
                    editor.document.lineAt(editor.document.lineCount - 1).range.end
                ),
                JSON.stringify(newModel, undefined, "\t")
            );
        })
        .then((_) => {
            editor.selection = new vscode.Selection(cursorPosition, cursorPosition);
        });
}
