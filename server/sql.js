/*
Consultas SQL seguras con template strings:

  sql`SELECT * FROM movements WHERE user_id = ${userId} AND date >= ${from}`

Cada ${valor} se manda como parametro ($1, $2...), nunca pegado en el texto,
asi no hay inyeccion SQL. Un fragmento sql`...` puede ir dentro de otro
(los parametros se renumeran solos) y raw() inserta texto fijo del codigo
(por ejemplo, el nombre de una columna elegido de una lista cerrada).
*/

class Sql {
  constructor(strings, values) {
    this.strings = strings;
    this.values = values;
  }

  // Devuelve { text, values } con los parametros numerados.
  toQuery() {
    const values = [];
    const text = this.#build(values);
    return { text, values };
  }

  #build(values) {
    let text = this.strings[0];
    this.values.forEach((value, index) => {
      if (value instanceof Sql) {
        text += value.#build(values);
      } else if (value instanceof Raw) {
        text += value.text;
      } else {
        values.push(value === undefined ? null : value);
        text += `$${values.length}`;
      }
      text += this.strings[index + 1];
    });
    return text;
  }
}

class Raw {
  constructor(text) {
    this.text = text;
  }
}

export function sql(strings, ...values) {
  return new Sql(strings, values);
}

export function raw(text) {
  return new Raw(text);
}

// Une fragmentos con un separador: join([sql`a = ${1}`, sql`b = ${2}`], " AND ").
export function join(fragments, separator) {
  if (!fragments.length) return sql``;
  const strings = ["", ...Array(fragments.length - 1).fill(separator), ""];
  return new Sql(strings, fragments);
}

export const empty = sql``;
