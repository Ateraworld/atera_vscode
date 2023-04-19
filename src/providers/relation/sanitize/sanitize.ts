import fs from "fs";

const attestationPeriodRegex = new RegExp(
    "^(?<startd>0?[1-9]|[12][0-9]|3[01])-(?<startm>0?[1-9]|1[0-2])/(?<endd>0?[1-9]|[12][0-9]|3[01])-(?<endm>0?[1-9]|1[0-2])$"
);

export function sanitizeActivityModel(modelPath: string): boolean {
    let status = false;
    let model = JSON.parse(fs.readFileSync(modelPath).toString());
    // * format description
    let logs: string[] = [];
    logs.push("description section:");
    [status, model.description] = formatActivityModelString(model.description, true, logs);

    // * format relation sections
    let relation = new Map<String, any>(Object.entries(model.relation.sections));
    let partialStatus: boolean;
    for (var [key, value] of relation.entries()) {
        logs.push(`section ${key}- ${value.title}:`);
        // space format
        [partialStatus, value.content] = formatActivityModelString(value.content, true, logs);
        status = status || partialStatus;
        relation.set(key, value);
    }
    model.relation.sections = Object.fromEntries(relation);

    if (
        model.attestation.period === undefined ||
        model.attestation.period === null ||
        model.attestation.period === "" ||
        attestationPeriodRegex.test(model.attestation.period)
    ) {
        logs.push("attestation period formatted");
    } else {
        logs.push("attestation period not formatted");
        status = true;
    }

    // console.log("insights section:");
    // [partialStatus, model.relation.sections] = formatInsights(model, fix);
    if (status) {
        for (const l of logs) {
            console.log(l);
        }
    }

    fs.writeFileSync(modelPath, JSON.stringify(model, null, "\t"));
    return status;
}

export function formatActivityModelString(str: string, fix: boolean = false, logs: string[] = []): [boolean, string] {
    let status = false;
    let reg = new RegExp("[ ]+\\n[ ]+|\\n[ ]+|[ ]+\\n", "g");
    if (fix) {
        str = str.replace(reg, "\n");
        str = str.replace(/[ ]{2,}/g, " ");
        //upper case
        str = str.replace(/A'/g, "À");
        str = str.replace(/E'/g, "È");
        str = str.replace(/I'/g, "Ì");
        str = str.replace(/O'/g, "Ò");
        str = str.replace(/U'/g, "Ù");

        str = str.replace(/\bcai\b/gi, "CAI");
        str = str.replace(/\bsat\b/gi, "SAT");
    }
    let n = str.match(reg)?.length ?? 0;

    logs.push(`\tbreak lines: ${n}`);
    if (n > 0) {
        status = true;
    }

    n = str.match(/A'/g)?.length ?? 0;
    n += str.match(/E'/g)?.length ?? 0;
    n += str.match(/I'/g)?.length ?? 0;
    n += str.match(/O'/g)?.length ?? 0;
    n += str.match(/U'/g)?.length ?? 0;
    logs.push(`\taccents: ${n}`);
    if (n > 0) {
        status = true;
    }

    n = 0;
    let map = str.match(/\bcai\b/gi);
    if (map != null) {
        for (let x of map!) {
            if (x !== "CAI") {
                n++;
            }
        }
    }
    map = str.match(/\bsat\b/gi);
    if (map != null) {
        for (let x of map!) {
            if (x !== "SAT") {
                n++;
            }
        }
    }

    logs.push(`\tCAI-SAT uppercase: ${n}`);
    if (n > 0) {
        status = true;
    }

    n = str.match(/[ ]{2,}/g)?.length ?? 0;
    logs.push(`\tspaces: ${n}`);
    if (n > 0) {
        status = true;
    }
    return [status, str];
}
