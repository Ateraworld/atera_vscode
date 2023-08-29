import path from "path";
import { DescriptedQuickPickItem } from "src/common/descripted_quick_pick_item";
import { Item } from "src/common/item_param";
import * as vscode from "vscode";

export class CommandsDataProvider implements vscode.TreeDataProvider<Item> {
    static id: string = "commands-provider";

    constructor() {}
    private _onDidChangeTreeData: vscode.EventEmitter<Item | undefined | null | void> = new vscode.EventEmitter<
        Item | undefined | null | void
    >();
    readonly onDidChangeTreeData: vscode.Event<Item | undefined | null | void> = this._onDidChangeTreeData.event;
    getTreeItem(element: Item): vscode.TreeItem | Thenable<vscode.TreeItem> {
        return element;
    }

    refresh(): void {
        const editor = vscode.window.activeTextEditor;
        if (editor) {
            this._onDidChangeTreeData.fire();
        }
    }
    registerComands() {
        vscode.commands.registerCommand("commands-provider.refresh", () => this.refresh());
        vscode.commands.registerCommand("commands-provider.executeCustomCmd", (item: Item | undefined) =>
            this.executeCustomCmd(item)
        );
    }
    async executeCustomCmd(item: Item | undefined): Promise<void> {
        if (item !== undefined) {
            await this.interpretAndExecuteCmd(item.itemModel);
        } else {
            let config = vscode.workspace.getConfiguration("atera");
            let commands = config.get("commands") as any[];
            let cmd = await vscode.window.showQuickPick(
                commands.map((e) => new DescriptedQuickPickItem(e.name ?? "", e.description, e.cmd, e)),
                { title: "Commands", placeHolder: "select a custom command to execute" }
            );
            if (cmd === undefined) return;
            await this.interpretAndExecuteCmd(cmd.payload);
        }
    }
    async interpretAndExecuteCmd(commandModel: any): Promise<void> {
        try {
            let cmdStr = commandModel.cmd as string;
            let sdkRoot = vscode.workspace.getConfiguration("atera").get("sdkRoot") as string | undefined;
            let dataRoot = vscode.workspace.getConfiguration("atera").get("dataRoot") as string | undefined;

            let requireEditorWildcards = ["${activity}", "${activity_id}", "${storage}", "${folder}"];

            if (requireEditorWildcards.find((w) => cmdStr.includes(w))) {
                const editor = vscode.window.activeTextEditor;
                if (!editor) {
                    vscode.window.showWarningMessage("Editor not valid");
                    return;
                }
                let documentModel = JSON.parse(editor.document.getText());
                cmdStr = cmdStr.replaceAll("${activity}", path.parse(editor.document.fileName).name);
                cmdStr = cmdStr.replaceAll("${activity_id}", documentModel.id);
                let storagePath = `${editor.document.fileName}/../storage`;
                let rootPath = `${editor.document.fileName}/../`;
                cmdStr = cmdStr.replaceAll("${storage}", path.resolve(storagePath));
                cmdStr = cmdStr.replaceAll("${folder}", path.resolve(rootPath));
            }
            cmdStr = cmdStr.replaceAll("${sdk}", sdkRoot != undefined ? path.resolve(sdkRoot) : "");
            cmdStr = cmdStr.replaceAll("${data}", dataRoot != undefined ? path.resolve(dataRoot) : "");

            let terminal = vscode.window.terminals.find((t) => t.name == "atera-editor-cmd");
            terminal ??= vscode.window.createTerminal("atera-editor-cmd");
            if (sdkRoot !== undefined && (commandModel.requires_sdk ?? true)) {
                cmdStr = `cd ${sdkRoot} && ${cmdStr}`;
            }
            terminal.show();
            terminal.sendText(cmdStr);
        } catch (_) {}
    }

    getChildren(element?: Item | undefined): vscode.ProviderResult<Item[]> {
        let items: Item[] = [];
        try {
            let config = vscode.workspace.getConfiguration("atera");
            let commands = config.get("commands") as any;
            if (!element) {
                console.log(commands);
                if (commands.length <= 0) {
                    items.push(
                        new Item("Custom commands", "info", {
                            description: "Add custom commands in settings",
                            tooltip: "To add custom commands, go into settings, under the Atera's extension settings",
                            collapsibleState: vscode.TreeItemCollapsibleState.None,
                        })
                    );
                }
                for (const cmd of commands) {
                    items.push(
                        new Item(cmd.name, "custom-cmd", {
                            itemModel: cmd,
                            tooltip: cmd.cmd,
                            icon: cmd.icon !== undefined ? new vscode.ThemeIcon(cmd.icon) : undefined,
                            collapsibleState: vscode.TreeItemCollapsibleState.Expanded,
                        })
                    );
                }
            } else {
                for (const cmd of commands) {
                    if (element.label == cmd.name) {
                        items.push(
                            new Item(cmd.description, cmd.name, {
                                itemModel: cmd,
                                description: cmd.cmd,
                                tooltip: cmd.cmd,
                                collapsibleState: vscode.TreeItemCollapsibleState.None,
                            })
                        );
                    }
                }
            }
            return Promise.resolve(items);
        } catch (error) {
            console.error(error);
            return Promise.resolve(items);
        }
    }
}
