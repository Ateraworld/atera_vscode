"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deactivate = exports.activate = void 0;
const vscode = require("vscode");
const marked_text_editor_1 = require("./common/marked_text_editor");
function activate(context) {
    let disposables = [];
    disposables.push(vscode.commands.registerCommand("atera-vscode.reports.bold", async () => {
        await (0, marked_text_editor_1.compileMarkedToken)("b");
    }));
    disposables.push(vscode.commands.registerCommand("atera-vscode.reports.italic", async () => {
        await (0, marked_text_editor_1.compileMarkedToken)("i");
    }));
    disposables.push(vscode.commands.registerCommand("atera-vscode.reports.activity", async () => {
        await (0, marked_text_editor_1.compileMarkedToken)("act");
    }));
    disposables.push(vscode.commands.registerCommand("atera-vscode.reports.position", async () => {
        await (0, marked_text_editor_1.compileMarkedToken)("pos");
    }));
    disposables.push(vscode.commands.registerCommand("atera-vscode.reports.photo", async () => {
        await (0, marked_text_editor_1.compileMarkedToken)("ph");
    }));
    disposables.forEach((element) => {
        context.subscriptions.push(element);
    });
}
exports.activate = activate;
function deactivate() { }
exports.deactivate = deactivate;
//# sourceMappingURL=extension.js.map