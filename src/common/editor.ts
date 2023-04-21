import * as vscode from "vscode";

export function computeAnalysis(model: any): [string, any][] {
    let sections = Object.entries(model.relation.sections);
    let problems: [string, any][] = [];
    for (let [k, v] of sections) {
        let val = v as any;
        let contentStr = val.content as string;
        let nCount = contentStr.split(/\n/g)?.length ?? 0;
        if (nCount < contentStr.split(" ").length / 25) {
            problems.push([
                "Break lines",
                { description: val.title + ": maybe you have few breaklines", icon: "info" },
            ]);
        }

        if (contentStr.length <= 0) {
            problems.push(["Empty section", { description: val.title + ": empty section", icon: "warning" }]);
        }
    }
    let points = Object.entries(model.location.points);

    let errors: [string, any][] = points
        .filter((p) => {
            let m = p[1] as any;
            if (m.longitude == null || m.longitude <= 0) {
                return true;
            }
            if (m.latitude == null || m.latitude <= 0) {
                return true;
            }
            return false;
        })
        .map((p) => ["Missing coords", { description: p[0] + ": coords are missing", icon: "error" }]);

    problems.push(...errors);

    if (!points.find((p) => p[0].includes("parcheggio"))) {
        problems.push(["Missing parking", { description: "Parking: point is missing", icon: "warning" }]);
    }
    if (model.category === "0") {
        if (!points.find((p) => p[0].includes("attacco"))) {
            problems.push(["Missing attacco", { description: "Attaco: point is missing", icon: "warning" }]);
        }
        if (!points.find((p) => p[0].includes("stacco"))) {
            problems.push(["Missing stacco", { description: "Stacco: point is missing", icon: "warning" }]);
        }
    }

    if (model.location.country == null || model.location.country.length <= 0) {
        problems.push(["Missing country", { description: "Location country: value is missing", icon: "error" }]);
    }
    if (model.location.region == null || model.location.region.length <= 0) {
        problems.push(["Missing region", { description: "Location region: value is missing", icon: "error" }]);
    }
    if (model.location.province == null || model.location.province.length <= 0) {
        problems.push(["Missing province", { description: "Location province: value is missing", icon: "error" }]);
    }
    if (model.location.zone == null || model.location.zone.length <= 0) {
        problems.push(["Missing zone", { description: "Location zone: value is missing", icon: "error" }]);
    }

    if (model.attestation.tokens == null || model.attestation.tokens <= 0) {
        problems.push(["Missing tokens", { description: "Tokens: value is missing", icon: "warning" }]);
    }
    if (model.attestation.rank == null || model.attestation.rank <= 0) {
        problems.push(["Missing rank", { description: "Rank: value is missing", icon: "warning" }]);
    }
    if (model.attestation.latitude == null || model.attestation.latitude <= 0) {
        problems.push([
            "Missing attestation latitude",
            { description: "Attestation latitude: value is missing", icon: "error" },
        ]);
    }
    if (model.attestation.longitude == null || model.attestation.longitude <= 0) {
        problems.push([
            "Missing attestation longitude",
            { description: "Attestation longitude: value is missing", icon: "error" },
        ]);
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
    if (editor == null) return;
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
