import fs from "fs";

const attestationPeriodRegex = new RegExp(
    "^(?<startd>0?[1-9]|[12][0-9]|3[01])-(?<startm>0?[1-9]|1[0-2])/(?<endd>0?[1-9]|[12][0-9]|3[01])-(?<endm>0?[1-9]|1[0-2])$"
);

export function sanitizeActivityModel(modelPath: string): string[] {
    let status = false;
    let model = JSON.parse(fs.readFileSync(modelPath).toString());
    // * format description
    let logs: string[] = [];
    [status, model.description] = formatActivityModelString(model.description, true, logs);

    // * format relation sections
    let relation = new Map<String, any>(Object.entries(model.relation.sections));
    let partialStatus: boolean;
    for (var [key, value] of relation.entries()) {
        // space format
        [partialStatus, value.content] = formatActivityModelString(value.content, true, logs);
        status = status || partialStatus;
        relation.set(key, value);
    }
    model.relation.sections = Object.fromEntries(relation);

    if (
        !(
            model.attestation.period == null ||
            model.attestation.period === null ||
            model.attestation.period === "" ||
            attestationPeriodRegex.test(model.attestation.period)
        )
    ) {
        logs.push("attestation period not formatted");
        status = true;
    }

    if (model.location.country == null || model.location.country.length <= 0) {
        logs.push("location.country is not compiled");
    }
    if (model.location.region == null || model.location.region.length <= 0) {
        logs.push("location.region is not compiled");
    }
    if (model.location.province == null || model.location.province.length <= 0) {
        logs.push("location.province is not compiled");
    }
    if (model.location.zone == null || model.location.zone.length <= 0) {
        logs.push("location.zone is not compiled");
    }

    let points = Object.entries(model.location.points);
    for (let [k, v] of points) {
        let val = v as any;
        if (val.longitude == null || val.longitude === 0 || val.latitude == null || val.latitude === 0) {
            logs.push(k + " coodinates are not set");
        }
    }
    if (model.attestation == null) {
        logs.push("attestation coodinates are not set");
    } else {
        let val = model.attestation as any;
        if (val.longitude == null || val.longitude === 0 || val.latitude == null || val.latitude === 0) {
            logs.push("attestation coodinates are not set");
        }
    }

    fs.writeFileSync(modelPath, JSON.stringify(model, null, "\t"));
    return logs;
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

    if (n > 0) {
        status = true;
    }

    n = str.match(/A'/g)?.length ?? 0;
    n += str.match(/E'/g)?.length ?? 0;
    n += str.match(/I'/g)?.length ?? 0;
    n += str.match(/O'/g)?.length ?? 0;
    n += str.match(/U'/g)?.length ?? 0;
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

    if (n > 0) {
        status = true;
    }

    n = str.match(/[ ]{2,}/g)?.length ?? 0;
    if (n > 0) {
        status = true;
    }
    return [status, str];
}
