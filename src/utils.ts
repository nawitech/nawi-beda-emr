import { compileAsFirst } from "@beda.software/emr/dist/utils/fhirpath";
import { Identifier } from "fhir/r4b";

const getAbsentReason = compileAsFirst<Identifier | undefined, string>(
    "extension('http://hl7.org/fhir/StructureDefinition/data-absent-reason').value")

export function renderIdentifier(identifier: Identifier|undefined){
    const absent = getAbsentReason(identifier);
    if(absent) {
        return `Absent: ${absent}`;
    }
    const type = identifier?.type?.text
        ?? identifier?.type?.coding?.[0].display
        ?? identifier?.type?.coding?.[0].code
        ?? identifier?.system;

    let result = '';
    if(type){
        result = `${type}: `
    }

    result += identifier?.value;
    return result;
}
