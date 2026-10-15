export interface RelConta {
  id: string;
  nome: string;
}
export interface RelLinha {
  contaId: string;
  data: string;
  descricao: string;
  tipo: string;
  bruto: number;
  imposto: number | null;
  deducoes: number | null;
  liquido: number | null;
  efeito: number;
}

const fmtData = (d: string) => (d ? d.split("-").reverse().join("/") : "");

export async function exportarExcel(contas: RelConta[], linhas: RelLinha[], arquivo: string) {
  const XLSX = await import("xlsx");
  const wb = XLSX.utils.book_new();
  const resumo: (string | number)[][] = [["Conta", "Saldo final (R$)"]];
  for (const c of contas) {
    const ls = linhas
      .filter((l) => l.contaId === c.id)
      .sort((a, b) => a.data.localeCompare(b.data));
    const rows: (string | number | null)[][] = [
      [`Conta corrente: ${c.nome}`],
      [],
      ["Data", "Descrição", "Tipo", "Bruto", "Imposto", "Deduções", "Líquido", "Na conta", "Saldo"],
    ];
    let saldo = 0;
    for (const l of ls) {
      saldo += l.efeito;
      rows.push([
        fmtData(l.data),
        l.descricao,
        l.tipo,
        l.bruto,
        l.imposto,
        l.deducoes,
        l.liquido,
        l.efeito,
        Math.round(saldo * 100) / 100,
      ]);
    }
    rows.push([], ["", "", "", "", "", "", "", "Saldo final", Math.round(saldo * 100) / 100]);
    resumo.push([c.nome, Math.round(saldo * 100) / 100]);
    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws["!cols"] = [12, 32, 18, 14, 14, 14, 14, 14, 14].map((wch) => ({ wch }));
    const fmt = "#,##0.00;-#,##0.00";
    for (const key of Object.keys(ws)) {
      const cell = ws[key];
      if (key[0] !== "!" && typeof cell?.v === "number") cell.z = fmt;
    }
    const nomeAba = c.nome.replace(/[\\/?*[\]:]/g, "").slice(0, 31) || "Conta";
    let n = nomeAba;
    let i = 2;
    while (wb.SheetNames.includes(n)) n = `${nomeAba.slice(0, 28)} ${i++}`;
    XLSX.utils.book_append_sheet(wb, ws, n);
  }
  if (contas.length > 1) {
    const ws = XLSX.utils.aoa_to_sheet(resumo);
    ws["!cols"] = [{ wch: 32 }, { wch: 18 }];
    XLSX.utils.book_append_sheet(wb, ws, "Resumo");
  }
  XLSX.writeFile(wb, arquivo);
}

export function baixarJSON(dados: unknown, arquivo: string) {
  const blob = new Blob([JSON.stringify(dados, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = arquivo;
  a.click();
  URL.revokeObjectURL(url);
}
