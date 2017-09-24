import * as _ from "lodash";

import { ExpType, ExpGenericType, ExpUnionType, ExpSimpleType, Schema } from "./AST";

/*
    static isGeneric(schema: Schema): boolean {
        return schema.params !== undefined && schema.params.length > 0;
    }
 */
const AtomicTypes: { [name: string]: string } = {
    Any: "any",
    Boolean: "boolean",
    Number: "number",
    Null: "undefined",
    Object: "Object",
    String: "string"
};

/* tslint:disable:no-use-before-declare */
const serialize = (type: ExpType): string => {
    if ((type as ExpGenericType).params) {
        return serializeGenericType(type as ExpGenericType);
    } else if ((type as ExpUnionType).types) {
        return serializeUnionType(type as ExpUnionType);
    } else {
        return serializeSimpleType(type as ExpSimpleType);
    }
};
/* tslint:enable:no-use-before-declare */

const serializeTypeName = (name: string) => AtomicTypes[name] || name;

const serializeSimpleType = (type: ExpSimpleType) => serializeTypeName(type.name);

const serializeUnionType = (type: ExpUnionType) => type.types.map(serialize).join(" | ");

const serializeGenericType = (type: ExpGenericType) =>
    type.name === "Map"
        ?
            `{ [key: string]: ${serialize(type.params[1])} }`
        :
            `${serializeTypeName(type.name)}<${type.params.map(serialize).join(", ")}>`;

const serializeGenericTypeRef = (type: ExpGenericType) =>
    `${serializeTypeName(type.name)}<${type.params.map(serialize).join(", ")}>`;

const serializeRef = (type: ExpType): string => {
    if ((type as ExpGenericType).params) {
        return serializeGenericTypeRef(type as ExpGenericType);
    } else if ((type as ExpUnionType).types) {
        throw new Error();
    } else {
        return (type as ExpSimpleType).name;
    }
};

const derivesFromMap = (type: ExpGenericType): boolean => type.name === "Map";

const derivesFromAtomic = (type: ExpSimpleType): boolean => AtomicTypes[type.name] !== undefined && type.name !== "Object";

const derives = (schema: Schema): string =>  {
    const type = serializeRef(schema.derivedFrom);
    if (type !== "Object") {
        return `extends ${type} `;
    } else {
        return ``;
    }
};

const serializeSchema = (name: string, schema: Schema): string => {
    if (derivesFromMap(schema.derivedFrom as ExpGenericType)) {
        return `type ${name} = ${serializeGenericType(schema.derivedFrom as ExpGenericType)};`
    } else if (!derivesFromAtomic(schema.derivedFrom as ExpSimpleType)) {
        return `export interface ${name} ${derives(schema)}{
${_.map(schema.properties, (property, propertyName) => `    ${propertyName}: ${serialize(property)};`).join("\n")}
}`;
    } else {
        return "";
    }
};

export default function(schemas: { [name: string]: Schema }): string {
        return _.map(schemas, (schema, name) => serializeSchema(name, schema)).join("\n\n");
}
