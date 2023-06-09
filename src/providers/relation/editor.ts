import { sanitizeActivityModel } from "src/common/activity";
import * as vscode from "vscode";

export function computeAnalysis(document: vscode.TextDocument): [string, any][] {
    let problems: [string, any][] = [];
    let model = JSON.parse(document.getText());
    let results = sanitizeActivityModel(model, {
        fix: false,
    });
    for (const p of results[0]) {
        problems.push([p, { description: p, icon: "error", color: "charts.red" }]);
    }
    for (const p of results[1]) {
        problems.push([p, { description: p, icon: "warning", color: "charts.yellow" }]);
    }
    problems.sort((a, b) => {
        let priorities: any = {
            error: 0,
            warning: 1,
            info: 2,
        };
        return priorities[a[1].icon] - priorities[b[1].icon];
    });
    return problems;
}

export async function overrideCurrentRelationModel(newModel: any): Promise<void> {
    const editor = vscode.window.activeTextEditor;
    if (editor == null) {
        return;
    }
    let cursorPosition = editor.selection.end;
    await editor.edit((editBuilder) => {
        editBuilder.replace(
            new vscode.Range(
                editor.document.lineAt(0).range.start,
                editor.document.lineAt(editor.document.lineCount - 1).range.end
            ),
            JSON.stringify(newModel, undefined, "\t")
        );
    });
    editor.selection = new vscode.Selection(cursorPosition, cursorPosition);
    await vscode.window.showTextDocument(editor.document.uri, {
        preview: false,
        viewColumn: editor.viewColumn,
    });
    console.log(editor.document.uri);
}

export async function insertTextAtCursor(text: string): Promise<void> {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        vscode.window.showWarningMessage("Editor not valid");
        return;
    }
    await editor
        .edit((editBuilder) => {
            editBuilder.replace(editor.selection, text);
        })
        .then(async (_) => {
            var postion = editor.selection.end;
            editor.selection = new vscode.Selection(postion, postion);
            await vscode.window.showTextDocument(editor.document.uri, {
                preview: false,
                viewColumn: editor.viewColumn,
            });
        });
}
