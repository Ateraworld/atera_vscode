/**Suggest parameters values based on metrics */
export function suggestActivityParams(model: any, apply: boolean = false) {
    let category = model.category;

    switch (category) {
        case "0":
            model = ferrataSuggestion(model, apply);
            break;
        case "1":
            model = trekkingSuggestion(model, apply);
            break;
    }
}
function ferrataSuggestion(model: any, apply: boolean = false) {
    let diff: number = +model.metrics.difficoltà ?? 10;
    let esp: number = +model.metrics.esposizione ?? 10;
    let tec: number = +model.metrics.tecnica ?? 10;
    let fis: number = +model.metrics["impegno fisico"] ?? 10;

    let wavg = (diff * 25.0 + esp * 15.0 + tec * 25.0 + fis * 35.0) / 100.0;
    let tokens = Math.floor(Math.floor((wavg * wavg) / 25) / 10) * 10;
    let rank = Math.floor(tokens / 10);
    console.log("\ttokens:\t" + tokens);
    console.log("\trank:\t" + rank);

    if (apply) {
        model.attestation.tokens = tokens;
        model.attestation.rank = rank;
    }
    return model;
}
function trekkingSuggestion(model: any, apply: boolean = false): any {
    let diff: number = +model.metrics.difficoltà ?? 10;
    let lun: number = +model.metrics.lunghezza ?? 10;
    let fis: number = +model.metrics["impegno fisico"] ?? 10;

    let wavg = (diff * 25.0 + lun * 35.0 + fis * 40.0) / 100.0;
    let tokens = Math.floor((0.8 * Math.floor((wavg * wavg) / 25)) / 10) * 10;
    let rank = Math.floor(tokens / 10);

    if (apply) {
        model.attestation.tokens = tokens;
        model.attestation.rank = rank;
    }
    return model;
}
