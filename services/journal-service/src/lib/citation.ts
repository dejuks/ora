export interface CiteInput {
  title: string;
  authors: { name: string }[];
  journal: string;
  volume: number;
  issue: number;
  pages?: string | null;
  year: number;
  doi: string;
  issn?: string | null;
}

function split(name: string) {
  const parts = name.trim().split(/\s+/);
  const last = parts.pop() ?? name;
  return { first: parts.join(" "), last };
}
const initials = (first: string) =>
  first.split(/\s+/).filter(Boolean).map((p) => p[0].toUpperCase() + ".").join(" ");

export type CiteStyle = "apa" | "mla" | "chicago" | "harvard" | "ris" | "bibtex";

export function cite(a: CiteInput, style: CiteStyle): string {
  const link = `https://doi.org/${a.doi}`;
  const p = a.authors.map((x) => split(x.name));
  const pages = a.pages ? a.pages : "";
  switch (style) {
    case "apa": {
      const names = p.map((x) => `${x.last}, ${initials(x.first)}`.trim());
      const list = names.length > 1 ? `${names.slice(0, -1).join(", ")}, & ${names.at(-1)}` : names[0] ?? "";
      return `${list} (${a.year}). ${a.title}. ${a.journal}, ${a.volume}(${a.issue})${pages ? ", " + pages : ""}. ${link}`;
    }
    case "mla": {
      const first = p[0] ? `${p[0].last}, ${p[0].first}` : "";
      const list = p.length > 2 ? `${first}, et al` : p.length === 2 ? `${first}, and ${p[1].first} ${p[1].last}` : first;
      return `${list}. "${a.title}." ${a.journal}, vol. ${a.volume}, no. ${a.issue}, ${a.year}${pages ? ", pp. " + pages : ""}, ${link}.`;
    }
    case "chicago": {
      const names = p.map((x, i) => (i === 0 ? `${x.last}, ${x.first}` : `${x.first} ${x.last}`));
      const list = names.length > 1 ? `${names.slice(0, -1).join(", ")}, and ${names.at(-1)}` : names[0] ?? "";
      return `${list}. "${a.title}." ${a.journal} ${a.volume}, no. ${a.issue} (${a.year})${pages ? ": " + pages : ""}. ${link}.`;
    }
    case "harvard": {
      const names = p.map((x) => `${x.last}, ${initials(x.first)}`.trim());
      const list = names.length > 1 ? `${names.slice(0, -1).join(", ")} and ${names.at(-1)}` : names[0] ?? "";
      return `${list} (${a.year}) '${a.title}', ${a.journal}, ${a.volume}(${a.issue})${pages ? ", pp. " + pages : ""}. Available at: ${link}.`;
    }
    case "ris": {
      const lines = ["TY  - JOUR", ...a.authors.map((x) => `AU  - ${split(x.name).last}, ${split(x.name).first}`),
        `TI  - ${a.title}`, `JO  - ${a.journal}`, `PY  - ${a.year}`, `VL  - ${a.volume}`, `IS  - ${a.issue}`];
      if (pages) {
        const [sp, ep] = pages.split(/[-–]/);
        lines.push(`SP  - ${sp}`);
        if (ep) lines.push(`EP  - ${ep}`);
      }
      if (a.issn) lines.push(`SN  - ${a.issn}`);
      lines.push(`DO  - ${a.doi}`, `UR  - ${link}`, "ER  - ");
      return lines.join("\r\n");
    }
    case "bibtex": {
      const key = `${(p[0]?.last ?? "ora").toLowerCase().replace(/[^a-z]/g, "")}${a.year}`;
      const au = p.map((x) => `${x.last}, ${x.first}`).join(" and ");
      return [`@article{${key},`, `  author = {${au}},`, `  title = {${a.title}},`, `  journal = {${a.journal}},`,
        `  year = {${a.year}},`, `  volume = {${a.volume}},`, `  number = {${a.issue}},`,
        pages ? `  pages = {${pages.replace("-", "--")}},` : "", a.issn ? `  issn = {${a.issn}},` : "",
        `  doi = {${a.doi}}`, "}"].filter(Boolean).join("\n");
    }
  }
}
