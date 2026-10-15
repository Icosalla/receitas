import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { exportarExcel, baixarJSON } from "@/lib/relatorio";
import {
  Download,
  Upload,
  FileSpreadsheet,
  Pencil,
  Plus,
  Trash2,
  Wallet,
  Percent,
  Banknote,
  Split,
  Receipt,
  ArrowDownWideNarrow,
  ArrowUpNarrowWide,
} from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Gestão de Contas Correntes — Modelos de Rateio e Lançamentos" },
      {
        name: "description",
        content:
          "Gerencie modelos de rateio e lançamentos com alíquota de imposto, deduções fixas e percentual de distribuição sobre o saldo líquido.",
      },
      {
        property: "og:title",
        content: "Gestão de Contas Correntes — Modelos de Rateio e Lançamentos",
      },
      {
        property: "og:description",
        content:
          "Gerencie modelos de rateio e lançamentos com alíquota de imposto, deduções fixas e percentual de distribuição sobre o saldo líquido.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Index,
});

interface ModeloRateio {
  id: string;
  nome: string;
  aliquotaImposto: number; // % sobre bruto
  deducoesFixas: number; // R$
  percentualDistribuicao: number; // % sobre saldo líquido
}

interface Conta {
  id: string;
  nome: string;
}

type TipoLancamento = "rateio" | "fixo";
type Natureza = "credito" | "debito";

interface Lancamento {
  id: string;
  contaId: string;
  data: string; // YYYY-MM-DD
  tipo: TipoLancamento;
  natureza: Natureza; // usado em "fixo"
  modeloId: string;
  modeloNome: string;
  descricao: string;
  valorBruto: number;
  aliquotaImposto: number;
  deducoesFixas: number;
  percentualDistribuicao: number;
}

const MODELOS_KEY = "contas-correntes:modelos-rateio";
const LANCAMENTOS_KEY = "contas-correntes:lancamentos";
const CONTAS_KEY = "contas-correntes:contas";

const CONTA_PADRAO: Conta = { id: "conta-principal", nome: "Conta Principal" };

const MODELO_EXEMPLO: ModeloRateio = {
  id: "exemplo-aluguel-mam",
  nome: "Aluguel MAM",
  aliquotaImposto: 14.99,
  deducoesFixas: 4000,
  percentualDistribuicao: 80,
};

function carregarModelos(): ModeloRateio[] {
  try {
    const raw = localStorage.getItem(MODELOS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as ModeloRateio[];
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {
    // ignore
  }
  return [MODELO_EXEMPLO];
}

function carregarContas(): Conta[] {
  try {
    const raw = localStorage.getItem(CONTAS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Conta[];
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {
    // ignore
  }
  return [CONTA_PADRAO];
}

function carregarLancamentos(contaPadraoId: string): Lancamento[] {
  try {
    const raw = localStorage.getItem(LANCAMENTOS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<Lancamento>[];
      if (Array.isArray(parsed))
        return parsed.map((l) => ({
          modeloId: "",
          modeloNome: "",
          descricao: "",
          valorBruto: 0,
          aliquotaImposto: 0,
          deducoesFixas: 0,
          percentualDistribuicao: 0,
          ...l,
          id: l.id ?? crypto.randomUUID(),
          contaId: l.contaId ?? contaPadraoId,
          data: l.data ?? "",
          tipo: l.tipo ?? "rateio",
          natureza: l.natureza ?? "credito",
        }));
    }
  } catch {
    // ignore
  }
  return [];
}

const formatBRL = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const formatPct = (v: number) =>
  `${v.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%`;

const formatData = (d: string) => {
  if (!d) return "—";
  const [y, m, dd] = d.split("-");
  return `${dd}/${m}/${y}`;
};

const hoje = () => new Date().toISOString().slice(0, 10);

function parseNum(s: string): number {
  return Number(s.replace(/\./g, "").replace(",", ".")) || 0;
}

const numToStr = (v: number) => moneyToStr(v);

// Percentual: as duas últimas casas digitadas são decimais (ex.: 1499 → 14,99)
function maskPct(input: string): string {
  const digits = input.replace(/\D/g, "").replace(/^0+(?=\d)/, "").slice(0, 5);
  if (!digits) return "";
  return moneyToStr(Math.min(Number(digits), 10000) / 100);
}

// Valor monetário: as duas últimas casas digitadas são centavos
const moneyToStr = (v: number) =>
  v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function maskMoney(input: string): string {
  const digits = input.replace(/\D/g, "").replace(/^0+(?=\d)/, "").slice(0, 13);
  if (!digits) return "";
  return moneyToStr(Number(digits) / 100);
}

interface ModeloForm {
  nome: string;
  aliquotaImposto: string;
  deducoesFixas: string;
  percentualDistribuicao: string;
}

const emptyModeloForm: ModeloForm = {
  nome: "",
  aliquotaImposto: "",
  deducoesFixas: "",
  percentualDistribuicao: "",
};

interface LancamentoForm {
  data: string;
  tipo: TipoLancamento;
  natureza: Natureza;
  modeloId: string;
  descricao: string;
  valorBruto: string;
  aliquotaImposto: string;
  deducoesFixas: string;
  percentualDistribuicao: string;
}

const emptyLancamentoForm: LancamentoForm = {
  data: "",
  tipo: "rateio",
  natureza: "credito",
  modeloId: "",
  descricao: "",
  valorBruto: "",
  aliquotaImposto: "",
  deducoesFixas: "",
  percentualDistribuicao: "",
};

// Efeito no saldo da conta corrente: rateio credita o repasse; fixo credita/debita o valor
function efeitoNaConta(l: Lancamento): number {
  if (l.tipo === "fixo") return l.natureza === "debito" ? -l.valorBruto : l.valorBruto;
  return calcular(l).repasse;
}

function calcular(l: {
  valorBruto: number;
  aliquotaImposto: number;
  deducoesFixas: number;
  percentualDistribuicao: number;
}) {
  const imposto = l.valorBruto * (l.aliquotaImposto / 100);
  const liquido = l.valorBruto - imposto - l.deducoesFixas;
  const repasse = Math.max(liquido, 0) * (l.percentualDistribuicao / 100);
  const retido = Math.max(liquido, 0) - repasse;
  return { imposto, liquido, repasse, retido };
}

const inputClass =
  "w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring";
const labelClass = "mb-1.5 block text-sm font-medium text-card-foreground";

function Index() {
  const [modelos, setModelos] = useState<ModeloRateio[]>([]);
  const [lancamentos, setLancamentos] = useState<Lancamento[]>([]);
  const [contas, setContas] = useState<Conta[]>([]);
  const [contaAtivaId, setContaAtivaId] = useState<string>("");
  const [relContaId, setRelContaId] = useState<string>("todas");
  const [backupMsg, setBackupMsg] = useState("");
  const [ordemDesc, setOrdemDesc] = useState(true);
  const [hydrated, setHydrated] = useState(false);

  // Conta dialog
  const [contaDialogOpen, setContaDialogOpen] = useState(false);
  const [editingContaId, setEditingContaId] = useState<string | null>(null);
  const [contaNome, setContaNome] = useState("");
  const [contaErro, setContaErro] = useState("");
  const [confirmDeleteContaId, setConfirmDeleteContaId] = useState<string | null>(null);

  // Modelo dialog
  const [modeloDialogOpen, setModeloDialogOpen] = useState(false);
  const [editingModeloId, setEditingModeloId] = useState<string | null>(null);
  const [modeloForm, setModeloForm] = useState<ModeloForm>(emptyModeloForm);
  const [modeloErrors, setModeloErrors] = useState<Partial<Record<keyof ModeloForm, string>>>({});
  const [confirmDeleteModeloId, setConfirmDeleteModeloId] = useState<string | null>(null);

  // Lançamento dialog
  const [lancDialogOpen, setLancDialogOpen] = useState(false);
  const [editingLancId, setEditingLancId] = useState<string | null>(null);
  const [lancForm, setLancForm] = useState<LancamentoForm>(emptyLancamentoForm);
  const [lancErrors, setLancErrors] = useState<Partial<Record<keyof LancamentoForm, string>>>({});
  const [confirmDeleteLancId, setConfirmDeleteLancId] = useState<string | null>(null);

  useEffect(() => {
    const cs = carregarContas();
    setContas(cs);
    const primeiraId = cs[0]?.id ?? CONTA_PADRAO.id;
    setContaAtivaId(primeiraId);
    setModelos(carregarModelos());
    setLancamentos(carregarLancamentos(primeiraId));
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) localStorage.setItem(MODELOS_KEY, JSON.stringify(modelos));
  }, [modelos, hydrated]);

  useEffect(() => {
    if (hydrated) localStorage.setItem(LANCAMENTOS_KEY, JSON.stringify(lancamentos));
  }, [lancamentos, hydrated]);

  useEffect(() => {
    if (hydrated) localStorage.setItem(CONTAS_KEY, JSON.stringify(contas));
  }, [contas, hydrated]);

  // ---- Contas ----
  const abrirNovaConta = () => {
    setEditingContaId(null);
    setContaNome("");
    setContaErro("");
    setContaDialogOpen(true);
  };
  const abrirEdicaoConta = (c: Conta) => {
    setEditingContaId(c.id);
    setContaNome(c.nome);
    setContaErro("");
    setContaDialogOpen(true);
  };
  const salvarConta = () => {
    const nome = contaNome.trim();
    if (!nome) return setContaErro("Informe o nome da pessoa/conta.");
    if (nome.length > 100) return setContaErro("Máximo de 100 caracteres.");
    if (editingContaId) {
      setContas((cs) => cs.map((c) => (c.id === editingContaId ? { ...c, nome } : c)));
    } else {
      const nova = { id: crypto.randomUUID(), nome };
      setContas((cs) => [...cs, nova]);
      setContaAtivaId(nova.id);
    }
    setContaDialogOpen(false);
  };
  const excluirConta = (id: string) => {
    const restantes = contas.filter((c) => c.id !== id);
    setContas(restantes);
    setLancamentos((ls) => ls.filter((l) => l.contaId !== id));
    if (contaAtivaId === id) setContaAtivaId(restantes[0]?.id ?? "");
    setConfirmDeleteContaId(null);
  };
  const contaAtiva = contas.find((c) => c.id === contaAtivaId);
  const contaExcluindo = contas.find((c) => c.id === confirmDeleteContaId);
  const saldoDaConta = (id: string) =>
    lancamentos.filter((l) => l.contaId === id).reduce((s, l) => s + efeitoNaConta(l), 0);
  const lancamentosDaConta = (() => {
    const cronologicos = lancamentos
      .filter((l) => l.contaId === contaAtivaId)
      .sort((a, b) => (a.data || "").localeCompare(b.data || ""));
    let acum = 0;
    const saldos = new Map<string, number>();
    for (const l of cronologicos) {
      acum += efeitoNaConta(l);
      saldos.set(l.id, acum);
    }
    return {
      lista: ordemDesc ? [...cronologicos].reverse() : cronologicos,
      saldos,
    };
  })();

  // ---- Modelos ----

  const abrirNovoModelo = () => {
    setEditingModeloId(null);
    setModeloForm(emptyModeloForm);
    setModeloErrors({});
    setModeloDialogOpen(true);
  };

  const abrirEdicaoModelo = (m: ModeloRateio) => {
    setEditingModeloId(m.id);
    setModeloForm({
      nome: m.nome,
      aliquotaImposto: numToStr(m.aliquotaImposto),
      deducoesFixas: moneyToStr(m.deducoesFixas),
      percentualDistribuicao: numToStr(m.percentualDistribuicao),
    });
    setModeloErrors({});
    setModeloDialogOpen(true);
  };

  const validarModelo = (): boolean => {
    const e: Partial<Record<keyof ModeloForm, string>> = {};
    if (!modeloForm.nome.trim()) e.nome = "Informe o nome do modelo.";
    if (modeloForm.nome.trim().length > 100) e.nome = "Máximo de 100 caracteres.";
    const aliq = parseNum(modeloForm.aliquotaImposto);
    if (modeloForm.aliquotaImposto.trim() === "" || aliq < 0 || aliq > 100)
      e.aliquotaImposto = "Informe uma alíquota entre 0 e 100.";
    const ded = parseNum(modeloForm.deducoesFixas);
    if (modeloForm.deducoesFixas.trim() === "" || ded < 0)
      e.deducoesFixas = "Informe um valor válido (≥ 0).";
    const dist = parseNum(modeloForm.percentualDistribuicao);
    if (modeloForm.percentualDistribuicao.trim() === "" || dist < 0 || dist > 100)
      e.percentualDistribuicao = "Informe um percentual entre 0 e 100.";
    setModeloErrors(e);
    return Object.keys(e).length === 0;
  };

  const salvarModelo = () => {
    if (!validarModelo()) return;
    const dados = {
      nome: modeloForm.nome.trim(),
      aliquotaImposto: parseNum(modeloForm.aliquotaImposto),
      deducoesFixas: parseNum(modeloForm.deducoesFixas),
      percentualDistribuicao: parseNum(modeloForm.percentualDistribuicao),
    };
    if (editingModeloId) {
      setModelos((ms) => ms.map((m) => (m.id === editingModeloId ? { ...m, ...dados } : m)));
    } else {
      setModelos((ms) => [...ms, { id: crypto.randomUUID(), ...dados }]);
    }
    setModeloDialogOpen(false);
  };

  const excluirModelo = (id: string) => {
    setModelos((ms) => ms.filter((m) => m.id !== id));
    setConfirmDeleteModeloId(null);
  };

  const modeloExcluindo = modelos.find((m) => m.id === confirmDeleteModeloId);

  // ---- Lançamentos ----

  const abrirNovoLancamento = (tipo: TipoLancamento) => {
    setEditingLancId(null);
    const primeiro = modelos[0];
    setLancForm({
      ...emptyLancamentoForm,
      data: hoje(),
      tipo,
      ...(tipo === "rateio" && primeiro
        ? {
            modeloId: primeiro.id,
            aliquotaImposto: numToStr(primeiro.aliquotaImposto),
            deducoesFixas: moneyToStr(primeiro.deducoesFixas),
            percentualDistribuicao: numToStr(primeiro.percentualDistribuicao),
          }
        : {}),
    });
    setLancErrors({});
    setLancDialogOpen(true);
  };

  const abrirEdicaoLancamento = (l: Lancamento) => {
    setEditingLancId(l.id);
    setLancForm({
      data: l.data,
      tipo: l.tipo,
      natureza: l.natureza,
      modeloId: l.modeloId,
      descricao: l.descricao,
      valorBruto: moneyToStr(l.valorBruto),
      aliquotaImposto: numToStr(l.aliquotaImposto),
      deducoesFixas: moneyToStr(l.deducoesFixas),
      percentualDistribuicao: numToStr(l.percentualDistribuicao),
    });
    setLancErrors({});
    setLancDialogOpen(true);
  };

  const aoTrocarModelo = (modeloId: string) => {
    const m = modelos.find((mo) => mo.id === modeloId);
    setLancForm((f) => ({
      ...f,
      modeloId,
      ...(m
        ? {
            aliquotaImposto: numToStr(m.aliquotaImposto),
            deducoesFixas: moneyToStr(m.deducoesFixas),
            percentualDistribuicao: numToStr(m.percentualDistribuicao),
          }
        : {}),
    }));
  };

  const aoTrocarTipo = (tipo: TipoLancamento) => {
    if (tipo === "rateio" && !lancForm.modeloId && modelos[0]) {
      setLancForm((f) => ({ ...f, tipo }));
      aoTrocarModelo(modelos[0].id);
    } else {
      setLancForm((f) => ({ ...f, tipo }));
    }
  };

  const validarLancamento = (): boolean => {
    const e: Partial<Record<keyof LancamentoForm, string>> = {};
    if (!/^\d{4}-\d{2}-\d{2}$/.test(lancForm.data)) e.data = "Informe a data.";
    if (lancForm.descricao.trim().length > 200) e.descricao = "Máximo de 200 caracteres.";
    const bruto = parseNum(lancForm.valorBruto);
    if (lancForm.valorBruto.trim() === "" || bruto <= 0)
      e.valorBruto = "Informe um valor maior que zero.";
    if (lancForm.tipo === "rateio") {
      if (!lancForm.modeloId) e.modeloId = "Selecione um modelo de rateio.";
      const aliq = parseNum(lancForm.aliquotaImposto);
      if (lancForm.aliquotaImposto.trim() === "" || aliq < 0 || aliq > 100)
        e.aliquotaImposto = "Entre 0 e 100.";
      const ded = parseNum(lancForm.deducoesFixas);
      if (ded < 0) e.deducoesFixas = "Valor inválido.";
      const dist = parseNum(lancForm.percentualDistribuicao);
      if (lancForm.percentualDistribuicao.trim() === "" || dist < 0 || dist > 100)
        e.percentualDistribuicao = "Entre 0 e 100.";
    }
    setLancErrors(e);
    return Object.keys(e).length === 0;
  };

  const salvarLancamento = () => {
    if (!validarLancamento()) return;
    const rateio = lancForm.tipo === "rateio";
    const modelo = modelos.find((m) => m.id === lancForm.modeloId);
    const dados = {
      contaId: contaAtivaId,
      data: lancForm.data,
      tipo: lancForm.tipo,
      natureza: lancForm.natureza,
      modeloId: rateio ? lancForm.modeloId : "",
      modeloNome: rateio ? (modelo?.nome ?? "Modelo removido") : "",
      descricao: lancForm.descricao.trim(),
      valorBruto: parseNum(lancForm.valorBruto),
      aliquotaImposto: rateio ? parseNum(lancForm.aliquotaImposto) : 0,
      deducoesFixas: rateio ? parseNum(lancForm.deducoesFixas) : 0,
      percentualDistribuicao: rateio ? parseNum(lancForm.percentualDistribuicao) : 0,
    };
    if (editingLancId) {
      setLancamentos((ls) =>
        ls.map((l) =>
          l.id === editingLancId ? { ...l, ...dados, contaId: l.contaId } : l,
        ),
      );
    } else {
      setLancamentos((ls) => [...ls, { id: crypto.randomUUID(), ...dados }]);
    }
    setLancDialogOpen(false);
  };

  const excluirLancamento = (id: string) => {
    setLancamentos((ls) => ls.filter((l) => l.id !== id));
    setConfirmDeleteLancId(null);
  };

  const lancExcluindo = lancamentos.find((l) => l.id === confirmDeleteLancId);

  // ---- Relatório e backup ----
  const gerarRelatorio = async () => {
    const sel = relContaId === "todas" ? contas : contas.filter((c) => c.id === relContaId);
    const linhas = lancamentos.map((l) => {
      const c = calcular(l);
      const rateio = l.tipo === "rateio";
      return {
        contaId: l.contaId,
        data: l.data,
        descricao: l.descricao,
        tipo: rateio ? `Rateio: ${l.modeloNome}` : l.natureza === "debito" ? "Débito" : "Crédito",
        bruto: l.valorBruto,
        imposto: rateio ? c.imposto : null,
        deducoes: rateio ? l.deducoesFixas : null,
        liquido: rateio ? c.liquido : null,
        efeito: efeitoNaConta(l),
      };
    });
    const nome = relContaId === "todas" ? "todas-as-contas" : (sel[0]?.nome ?? "conta");
    await exportarExcel(sel, linhas, `relatorio-${nome.replace(/\s+/g, "-")}-${hoje()}.xlsx`);
  };

  const exportarBackup = () => {
    baixarJSON(
      { app: "contas-correntes", versao: 1, geradoEm: new Date().toISOString(), contas, modelos, lancamentos },
      `backup-contas-correntes-${hoje()}.json`,
    );
    setBackupMsg("Backup exportado.");
  };

  const importarBackup = async (file: File) => {
    try {
      if (file.size > 10_000_000) throw new Error();
      const d = JSON.parse(await file.text());
      if (!Array.isArray(d?.contas) || !Array.isArray(d?.lancamentos) || !Array.isArray(d?.modelos))
        throw new Error();
      const cs: Conta[] = d.contas
        .filter((c: Conta) => typeof c?.id === "string" && typeof c?.nome === "string")
        .map((c: Conta) => ({ id: c.id, nome: c.nome.slice(0, 100) }));
      if (cs.length === 0) throw new Error();
      if (!window.confirm("Importar o backup vai substituir todos os dados atuais. Continuar?")) return;
      localStorage.setItem(LANCAMENTOS_KEY, JSON.stringify(d.lancamentos));
      setContas(cs);
      setModelos(d.modelos);
      const primeira = cs[0]?.id ?? CONTA_PADRAO.id;
      setLancamentos(carregarLancamentos(primeira));
      setContaAtivaId(primeira);
      setBackupMsg(`Backup importado: ${cs.length} conta(s), ${d.lancamentos.length} lançamento(s).`);
    } catch {
      setBackupMsg("Arquivo inválido. Use um backup exportado por este app.");
    }
  };

  const preview = calcular({
    valorBruto: parseNum(lancForm.valorBruto),
    aliquotaImposto: parseNum(lancForm.aliquotaImposto),
    deducoesFixas: parseNum(lancForm.deducoesFixas),
    percentualDistribuicao: parseNum(lancForm.percentualDistribuicao),
  });

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-6 py-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Wallet className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-lg font-semibold tracking-tight text-foreground">
             Contas Correntes
            </h1>
            <p className="text-sm text-muted-foreground">Modelos de rateio e lançamentos</p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-12 px-6 py-8">
        {/* ---- Modelos de rateio ---- */}
        <section>
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-foreground">Modelos de Rateio</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Defina alíquota de imposto, deduções fixas e percentual de distribuição sobre o
                saldo líquido.
              </p>
            </div>
            <button
              onClick={abrirNovoModelo}
              className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              <Plus className="h-4 w-4" />
              Novo modelo
            </button>
          </div>

          {modelos.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border bg-card p-12 text-center">
              <Split className="mx-auto h-8 w-8 text-muted-foreground" />
              <p className="mt-3 text-sm font-medium text-foreground">
                Nenhum modelo cadastrado
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Clique em "Novo modelo" para criar o primeiro.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {modelos.map((m) => (
                <div
                  key={m.id}
                  className="rounded-lg border border-border bg-card p-5 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold text-card-foreground">{m.nome}</h3>
                    <div className="flex gap-1">
                      <button
                        onClick={() => abrirEdicaoModelo(m)}
                        aria-label={`Editar ${m.nome}`}
                        className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setConfirmDeleteModeloId(m.id)}
                        aria-label={`Excluir ${m.nome}`}
                        className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  <dl className="mt-4 space-y-2.5 text-sm">
                    <div className="flex items-center justify-between">
                      <dt className="flex items-center gap-2 text-muted-foreground">
                        <Percent className="h-3.5 w-3.5" /> Imposto (s/ bruto)
                      </dt>
                      <dd className="font-medium text-card-foreground">
                        {formatPct(m.aliquotaImposto)}
                      </dd>
                    </div>
                    <div className="flex items-center justify-between">
                      <dt className="flex items-center gap-2 text-muted-foreground">
                        <Banknote className="h-3.5 w-3.5" /> Deduções fixas
                      </dt>
                      <dd className="font-medium text-card-foreground">
                        {formatBRL(m.deducoesFixas)}
                      </dd>
                    </div>
                    <div className="flex items-center justify-between">
                      <dt className="flex items-center gap-2 text-muted-foreground">
                        <Split className="h-3.5 w-3.5" /> Distribuição (s/ líquido)
                      </dt>
                      <dd className="font-medium text-card-foreground">
                        {formatPct(m.percentualDistribuicao)}
                      </dd>
                    </div>
                  </dl>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ---- Contas correntes ---- */}
        <section>
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-foreground">Contas Correntes</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Uma conta por pessoa. Selecione a conta para ver e lançar movimentos.
              </p>
            </div>
            <button
              onClick={abrirNovaConta}
              className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              <Plus className="h-4 w-4" />
              Nova conta
            </button>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {contas.map((c) => {
              const saldo = saldoDaConta(c.id);
              const ativa = c.id === contaAtivaId;
              return (
                <div
                  key={c.id}
                  onClick={() => setContaAtivaId(c.id)}
                  className={`cursor-pointer rounded-lg border bg-card p-4 shadow-sm transition-colors ${
                    ativa ? "border-primary ring-2 ring-primary/30" : "border-border hover:bg-accent/40"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold text-card-foreground">{c.nome}</h3>
                    <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => abrirEdicaoConta(c)}
                        aria-label={`Editar ${c.nome}`}
                        className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => setConfirmDeleteContaId(c.id)}
                        aria-label={`Excluir ${c.nome}`}
                        className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">Saldo</p>
                  <p
                    className={`text-lg font-semibold ${saldo < 0 ? "text-destructive" : "text-card-foreground"}`}
                  >
                    {formatBRL(saldo)}
                  </p>
                </div>
              );
            })}
          </div>
        </section>

        {/* ---- Relatórios e backup ---- */}
        <section className="rounded-lg border border-border bg-card p-5 shadow-sm">
          <h2 className="text-base font-semibold text-card-foreground">Relatório e backup</h2>
          <div className="mt-4 flex flex-wrap items-end gap-3">
            <div>
              <label htmlFor="rel-conta" className={labelClass}>
                Conta do relatório
              </label>
              <select
                id="rel-conta"
                value={relContaId}
                onChange={(e) => setRelContaId(e.target.value)}
                className={inputClass}
              >
                <option value="todas">Todas as contas</option>
                {contas.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome}
                  </option>
                ))}
              </select>
            </div>
            <button
              onClick={gerarRelatorio}
              className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              <FileSpreadsheet className="h-4 w-4" />
              Baixar relatório Excel
            </button>
            <div className="ml-auto flex gap-2">
              <button
                onClick={exportarBackup}
                className="inline-flex items-center gap-2 rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-accent"
              >
                <Download className="h-4 w-4" />
                Exportar backup
              </button>
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-accent">
                <Upload className="h-4 w-4" />
                Importar backup
                <input
                  type="file"
                  accept="application/json,.json"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) importarBackup(f);
                    e.target.value = "";
                  }}
                />
              </label>
            </div>
          </div>
          {backupMsg && <p className="mt-3 text-sm text-muted-foreground">{backupMsg}</p>}
        </section>

        {/* ---- Lançamentos ---- */}
        <section>
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold text-foreground">
                Lançamentos {contaAtiva ? `— ${contaAtiva.nome}` : ""}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Use um modelo de rateio ou lance um valor fixo a débito ou crédito.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => abrirNovoLancamento("fixo")}
                disabled={!contaAtiva}
                className="inline-flex items-center gap-2 rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent disabled:opacity-50"
              >
                <Plus className="h-4 w-4" />
                Débito / Crédito
              </button>
              <button
                onClick={() => abrirNovoLancamento("rateio")}
                disabled={!contaAtiva || modelos.length === 0}
                className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Plus className="h-4 w-4" />
                Lançamento com rateio
              </button>
            </div>
          </div>

          <div className="flex items-center justify-end">
            <button
              onClick={() => setOrdemDesc((v) => !v)}
              aria-label="Alternar ordem dos lançamentos"
              className="inline-flex items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
            >
              {ordemDesc ? (
                <ArrowDownWideNarrow className="h-4 w-4" />
              ) : (
                <ArrowUpNarrowWide className="h-4 w-4" />
              )}
              {ordemDesc ? "Mais recentes primeiro" : "Mais antigos primeiro"}
            </button>
          </div>

          {lancamentosDaConta.lista.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border bg-card p-12 text-center">
              <Receipt className="mx-auto h-8 w-8 text-muted-foreground" />
              <p className="mt-3 text-sm font-medium text-foreground">
                Nenhum lançamento nesta conta
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-border bg-card shadow-sm">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-muted-foreground">
                    <th className="px-4 py-3 font-medium">Data</th>
                    <th className="px-4 py-3 font-medium">Descrição</th>
                    <th className="px-4 py-3 font-medium">Tipo</th>
                    <th className="px-4 py-3 text-right font-medium">Bruto</th>
                    <th className="px-4 py-3 text-right font-medium">Imposto</th>
                    <th className="px-4 py-3 text-right font-medium">Deduções</th>
                    <th className="px-4 py-3 text-right font-medium">Líquido</th>
                    <th className="px-4 py-3 text-right font-medium">Na conta</th>
                    <th className="px-4 py-3 text-right font-medium">Saldo</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    return lancamentosDaConta.lista.map((l) => {
                      const c = calcular(l);
                      const efeito = efeitoNaConta(l);
                      const acumulado = lancamentosDaConta.saldos.get(l.id) ?? 0;
                      const rateio = l.tipo === "rateio";
                      return (
                        <tr key={l.id} className="border-b border-border last:border-0">
                          <td className="whitespace-nowrap px-4 py-3 text-card-foreground">
                            {formatData(l.data)}
                          </td>
                          <td className="px-4 py-3 text-card-foreground">{l.descricao || "—"}</td>
                          <td className="px-4 py-3 text-muted-foreground">
                            {rateio ? l.modeloNome : l.natureza === "debito" ? "Débito" : "Crédito"}
                          </td>
                          <td className="px-4 py-3 text-right text-card-foreground">
                            {formatBRL(l.valorBruto)}
                          </td>
                          <td className="px-4 py-3 text-right text-muted-foreground">
                            {rateio ? formatBRL(c.imposto) : "—"}
                          </td>
                          <td className="px-4 py-3 text-right text-muted-foreground">
                            {rateio ? formatBRL(l.deducoesFixas) : "—"}
                          </td>
                          <td className="px-4 py-3 text-right text-muted-foreground">
                            {rateio ? formatBRL(c.liquido) : "—"}
                          </td>
                          <td
                            className={`px-4 py-3 text-right font-medium ${efeito < 0 ? "text-destructive" : "text-card-foreground"}`}
                          >
                            {formatBRL(efeito)}
                          </td>
                          <td className="px-4 py-3 text-right font-semibold text-card-foreground">
                            {formatBRL(acumulado)}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex justify-end gap-1">
                              <button
                                onClick={() => abrirEdicaoLancamento(l)}
                                aria-label="Editar lançamento"
                                className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                              >
                                <Pencil className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => setConfirmDeleteLancId(l.id)}
                                aria-label="Excluir lançamento"
                                className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    });
                  })()}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>

      {/* ---- Dialog: conta ---- */}
      {contaDialogOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4"
          onClick={() => setContaDialogOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            className="w-full max-w-sm rounded-lg border border-border bg-card p-6 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-card-foreground">
              {editingContaId ? "Editar conta" : "Nova conta corrente"}
            </h3>
            <div className="mt-5">
              <label htmlFor="conta-nome" className={labelClass}>
                Nome da pessoa
              </label>
              <input
                id="conta-nome"
                value={contaNome}
                onChange={(e) => setContaNome(e.target.value)}
                maxLength={100}
                placeholder="Ex.: João Silva"
                className={inputClass}
              />
              {contaErro && <p className="mt-1 text-xs text-destructive">{contaErro}</p>}
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => setContaDialogOpen(false)}
                className="rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-accent"
              >
                Cancelar
              </button>
              <button
                onClick={salvarConta}
                className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmDeleteContaId && contaExcluindo && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4"
          onClick={() => setConfirmDeleteContaId(null)}
        >
          <div
            role="alertdialog"
            aria-modal="true"
            className="w-full max-w-sm rounded-lg border border-border bg-card p-6 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-card-foreground">Excluir conta</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Excluir "{contaExcluindo.nome}" e todos os seus lançamentos? Esta ação não pode ser
              desfeita.
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => setConfirmDeleteContaId(null)}
                className="rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-accent"
              >
                Cancelar
              </button>
              <button
                onClick={() => excluirConta(confirmDeleteContaId)}
                className="rounded-md bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground hover:bg-destructive/90"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---- Dialog: modelo ---- */}
      {modeloDialogOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4"
          onClick={() => setModeloDialogOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            className="w-full max-w-md rounded-lg border border-border bg-card p-6 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-card-foreground">
              {editingModeloId ? "Editar modelo" : "Novo modelo de rateio"}
            </h3>
            <div className="mt-5 space-y-4">
              <div>
                <label htmlFor="nome" className={labelClass}>
                  Nome do modelo
                </label>
                <input
                  id="nome"
                  value={modeloForm.nome}
                  onChange={(e) => setModeloForm({ ...modeloForm, nome: e.target.value })}
                  placeholder="Ex.: Aluguel MAM"
                  maxLength={100}
                  className={inputClass}
                />
                {modeloErrors.nome && (
                  <p className="mt-1 text-xs text-destructive">{modeloErrors.nome}</p>
                )}
              </div>
              <div>
                <label htmlFor="aliquota" className={labelClass}>
                  Alíquota de imposto (% sobre o bruto)
                </label>
                <input
                  id="aliquota"
                  inputMode="decimal"
                  value={modeloForm.aliquotaImposto}
                  onChange={(e) =>
                    setModeloForm({ ...modeloForm, aliquotaImposto: maskPct(e.target.value) })
                  }
                  placeholder="Ex.: 14,99"
                  className={inputClass}
                />
                {modeloErrors.aliquotaImposto && (
                  <p className="mt-1 text-xs text-destructive">{modeloErrors.aliquotaImposto}</p>
                )}
              </div>
              <div>
                <label htmlFor="deducoes" className={labelClass}>
                  Deduções fixas sugeridas (R$)
                </label>
                <input
                  id="deducoes"
                  inputMode="decimal"
                  value={modeloForm.deducoesFixas}
                  onChange={(e) =>
                    setModeloForm({ ...modeloForm, deducoesFixas: maskMoney(e.target.value) })
                  }
                  placeholder="0,00"
                  className={inputClass}
                />
                {modeloErrors.deducoesFixas && (
                  <p className="mt-1 text-xs text-destructive">{modeloErrors.deducoesFixas}</p>
                )}
              </div>
              <div>
                <label htmlFor="distribuicao" className={labelClass}>
                  Percentual de distribuição (% sobre o saldo líquido)
                </label>
                <input
                  id="distribuicao"
                  inputMode="decimal"
                  value={modeloForm.percentualDistribuicao}
                  onChange={(e) =>
                    setModeloForm({ ...modeloForm, percentualDistribuicao: maskPct(e.target.value) })
                  }
                  placeholder="Ex.: 80"
                  className={inputClass}
                />
                {modeloErrors.percentualDistribuicao && (
                  <p className="mt-1 text-xs text-destructive">
                    {modeloErrors.percentualDistribuicao}
                  </p>
                )}
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => setModeloDialogOpen(false)}
                className="rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
              >
                Cancelar
              </button>
              <button
                onClick={salvarModelo}
                className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
              >
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---- Dialog: lançamento ---- */}
      {lancDialogOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4"
          onClick={() => setLancDialogOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-lg border border-border bg-card p-6 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-card-foreground">
              {editingLancId ? "Editar lançamento" : "Novo lançamento"}
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">Conta: {contaAtiva?.nome}</p>
            <div className="mt-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="lanc-data" className={labelClass}>
                    Data
                  </label>
                  <input
                    id="lanc-data"
                    type="date"
                    value={lancForm.data}
                    onChange={(e) => setLancForm({ ...lancForm, data: e.target.value })}
                    className={inputClass}
                  />
                  {lancErrors.data && (
                    <p className="mt-1 text-xs text-destructive">{lancErrors.data}</p>
                  )}
                </div>
                <div>
                  <label htmlFor="lanc-tipo" className={labelClass}>
                    Tipo
                  </label>
                  <select
                    id="lanc-tipo"
                    value={lancForm.tipo}
                    onChange={(e) => aoTrocarTipo(e.target.value as TipoLancamento)}
                    className={inputClass}
                  >
                    <option value="rateio">Com modelo de rateio</option>
                    <option value="fixo">Valor fixo (débito/crédito)</option>
                  </select>
                </div>
              </div>

              {lancForm.tipo === "fixo" ? (
                <div className="grid grid-cols-2 gap-2">
                  {(["credito", "debito"] as const).map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setLancForm({ ...lancForm, natureza: n })}
                      className={`rounded-md border px-3 py-2 text-sm font-medium transition-colors ${
                        lancForm.natureza === n
                          ? n === "credito"
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-destructive bg-destructive text-destructive-foreground"
                          : "border-input bg-background text-foreground hover:bg-accent"
                      }`}
                    >
                      {n === "credito" ? "Crédito (+)" : "Débito (−)"}
                    </button>
                  ))}
                </div>
              ) : (
                <div>
                  <label htmlFor="lanc-modelo" className={labelClass}>
                    Modelo de rateio
                  </label>
                  <select
                    id="lanc-modelo"
                    value={lancForm.modeloId}
                    onChange={(e) => aoTrocarModelo(e.target.value)}
                    className={inputClass}
                  >
                    {modelos.length === 0 && <option value="">Nenhum modelo cadastrado</option>}
                    {modelos.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.nome}
                      </option>
                    ))}
                  </select>
                  {lancErrors.modeloId && (
                    <p className="mt-1 text-xs text-destructive">{lancErrors.modeloId}</p>
                  )}
                </div>
              )}

              <div>
                <label htmlFor="lanc-descricao" className={labelClass}>
                  Descrição (opcional)
                </label>
                <input
                  id="lanc-descricao"
                  value={lancForm.descricao}
                  onChange={(e) => setLancForm({ ...lancForm, descricao: e.target.value })}
                  placeholder="Ex.: Aluguel outubro/2026"
                  maxLength={200}
                  className={inputClass}
                />
                {lancErrors.descricao && (
                  <p className="mt-1 text-xs text-destructive">{lancErrors.descricao}</p>
                )}
              </div>
              <div>
                <label htmlFor="lanc-bruto" className={labelClass}>
                  {lancForm.tipo === "fixo" ? "Valor (R$)" : "Valor bruto (R$)"}
                </label>
                <input
                  id="lanc-bruto"
                  inputMode="numeric"
                  value={lancForm.valorBruto}
                  onChange={(e) =>
                    setLancForm({ ...lancForm, valorBruto: maskMoney(e.target.value) })
                  }
                  placeholder="0,00"
                  className={inputClass}
                />
                {lancErrors.valorBruto && (
                  <p className="mt-1 text-xs text-destructive">{lancErrors.valorBruto}</p>
                )}
              </div>
              {lancForm.tipo === "rateio" && (
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label htmlFor="lanc-aliquota" className={labelClass}>
                      Imposto (%)
                    </label>
                    <input
                      id="lanc-aliquota"
                      inputMode="decimal"
                      value={lancForm.aliquotaImposto}
                      onChange={(e) =>
                        setLancForm({ ...lancForm, aliquotaImposto: maskPct(e.target.value) })
                      }
                      className={inputClass}
                    />
                    {lancErrors.aliquotaImposto && (
                      <p className="mt-1 text-xs text-destructive">{lancErrors.aliquotaImposto}</p>
                    )}
                  </div>
                  <div>
                    <label htmlFor="lanc-deducoes" className={labelClass}>
                      Deduções (R$)
                    </label>
                    <input
                      id="lanc-deducoes"
                      inputMode="numeric"
                      value={lancForm.deducoesFixas}
                      onChange={(e) =>
                        setLancForm({ ...lancForm, deducoesFixas: maskMoney(e.target.value) })
                      }
                      placeholder="0,00"
                      className={inputClass}
                    />
                    {lancErrors.deducoesFixas && (
                      <p className="mt-1 text-xs text-destructive">{lancErrors.deducoesFixas}</p>
                    )}
                  </div>
                  <div>
                    <label htmlFor="lanc-distribuicao" className={labelClass}>
                      Distribuição (%)
                    </label>
                    <input
                      id="lanc-distribuicao"
                      inputMode="decimal"
                      value={lancForm.percentualDistribuicao}
                      onChange={(e) =>
                        setLancForm({ ...lancForm, percentualDistribuicao: maskPct(e.target.value) })
                      }
                      className={inputClass}
                    />
                    {lancErrors.percentualDistribuicao && (
                      <p className="mt-1 text-xs text-destructive">
                        {lancErrors.percentualDistribuicao}
                      </p>
                    )}
                  </div>
                </div>
              )}

              <div
                className={lancForm.tipo === "rateio" ? "rounded-md bg-muted p-4 text-sm" : "hidden"}
              >
                <p className="mb-2 font-medium text-foreground">Prévia do rateio</p>
                <dl className="space-y-1.5">
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Imposto</dt>
                    <dd className="text-foreground">{formatBRL(preview.imposto)}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Saldo líquido</dt>
                    <dd className="text-foreground">{formatBRL(preview.liquido)}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Repasse (distribuição)</dt>
                    <dd className="font-medium text-foreground">{formatBRL(preview.repasse)}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Retido em conta</dt>
                    <dd className="text-foreground">{formatBRL(preview.retido)}</dd>
                  </div>
                </dl>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => setLancDialogOpen(false)}
                className="rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
              >
                Cancelar
              </button>
              <button
                onClick={salvarLancamento}
                className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
              >
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---- Confirmações de exclusão ---- */}
      {confirmDeleteModeloId && modeloExcluindo && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4"
          onClick={() => setConfirmDeleteModeloId(null)}
        >
          <div
            role="alertdialog"
            aria-modal="true"
            className="w-full max-w-sm rounded-lg border border-border bg-card p-6 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-card-foreground">Excluir modelo</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Tem certeza que deseja excluir "{modeloExcluindo.nome}"? Esta ação não pode ser
              desfeita.
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => setConfirmDeleteModeloId(null)}
                className="rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
              >
                Cancelar
              </button>
              <button
                onClick={() => excluirModelo(confirmDeleteModeloId)}
                className="rounded-md bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground transition-colors hover:bg-destructive/90"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmDeleteLancId && lancExcluindo && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4"
          onClick={() => setConfirmDeleteLancId(null)}
        >
          <div
            role="alertdialog"
            aria-modal="true"
            className="w-full max-w-sm rounded-lg border border-border bg-card p-6 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-card-foreground">Excluir lançamento</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Tem certeza que deseja excluir este lançamento de{" "}
              {formatBRL(lancExcluindo.valorBruto)}? Esta ação não pode ser desfeita.
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => setConfirmDeleteLancId(null)}
                className="rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
              >
                Cancelar
              </button>
              <button
                onClick={() => excluirLancamento(confirmDeleteLancId)}
                className="rounded-md bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground transition-colors hover:bg-destructive/90"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
