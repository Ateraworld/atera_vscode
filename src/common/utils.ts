import fs from "fs";
import path from "path";

export function elementsInPath(path: string, recursive: boolean = false): string[] {
    let items: string[] = [];
    _traverseDir(path, items, recursive);
    return items;
}
function _traverseDir(dir: string, items: string[], recursive: boolean = false) {
    fs.readdirSync(dir).forEach((file) => {
        let fullPath = path.join(dir, file);
        if (fs.lstatSync(fullPath).isDirectory() && recursive) {
            items.push(fullPath);
            _traverseDir(fullPath, items);
        } else {
            items.push(fullPath);
        }
    });
}
