import { formatCurrency, formatDate, formatMonthYear } from "@paca/shared";
import type { TransactionWithCategory } from "@paca/shared";

export async function exportMonthlyReport(
  transactions: TransactionWithCategory[],
  month: string,
  coupleName: string
) {
  const { jsPDF } = await import("jspdf");
  const { default: autoTable } = await import("jspdf-autotable");
  const doc = new jsPDF();

  const income = transactions
    .filter((t) => t.type === "income")
    .reduce((s, t) => s + t.amount, 0);
  const expenses = transactions
    .filter((t) => t.type === "expense")
    .reduce((s, t) => s + t.amount, 0);
  const balance = income - expenses;

  const monthLabel = formatMonthYear(month);

  // Header
  doc.setFontSize(22);
  doc.setTextColor(255, 143, 177); // pink-primary
  doc.text("Paca Finance", 14, 22);

  doc.setFontSize(10);
  doc.setTextColor(150, 150, 150);
  doc.text(`Relatorio Mensal — ${monthLabel}`, 14, 30);
  doc.text(coupleName, 14, 36);

  // Summary boxes
  doc.setFontSize(11);
  doc.setTextColor(50, 50, 50);
  doc.text("Receitas:", 14, 50);
  doc.setTextColor(78, 205, 196);
  doc.text(formatCurrency(income), 50, 50);

  doc.setTextColor(50, 50, 50);
  doc.text("Despesas:", 90, 50);
  doc.setTextColor(255, 107, 107);
  doc.text(formatCurrency(expenses), 126, 50);

  doc.setTextColor(50, 50, 50);
  doc.text("Saldo:", 166, 50);
  doc.setTextColor(balance >= 0 ? 78 : 255, balance >= 0 ? 205 : 107, balance >= 0 ? 196 : 107);
  doc.text(formatCurrency(balance), 186, 50);

  // Line separator
  doc.setDrawColor(230, 230, 230);
  doc.line(14, 55, 196, 55);

  // Table
  const rows = transactions.map((t) => [
    formatDate(t.date),
    t.description,
    t.category?.name ?? "—",
    t.type === "income" ? "Receita" : "Despesa",
    t.paid_by_profile?.display_name ?? "—",
    (t.type === "expense" ? "- " : "+ ") + formatCurrency(t.amount),
  ]);

  autoTable(doc, {
    startY: 60,
    head: [["Data", "Descricao", "Categoria", "Tipo", "Pago por", "Valor"]],
    body: rows,
    styles: {
      fontSize: 9,
      cellPadding: 3,
    },
    headStyles: {
      fillColor: [255, 143, 177],
      textColor: 255,
      fontStyle: "bold",
    },
    alternateRowStyles: {
      fillColor: [252, 248, 250],
    },
    columnStyles: {
      5: { halign: "right" },
    },
  });

  // Category breakdown
  const catMap = new Map<string, number>();
  for (const t of transactions) {
    if (t.type !== "expense") continue;
    const name = t.category?.name ?? "Outros";
    catMap.set(name, (catMap.get(name) ?? 0) + t.amount);
  }

  if (catMap.size > 0) {
    const finalY = (doc as any).lastAutoTable?.finalY ?? 120;
    doc.setFontSize(12);
    doc.setTextColor(50, 50, 50);
    doc.text("Gastos por Categoria", 14, finalY + 15);

    const catRows = Array.from(catMap.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([name, amount]) => [
        name,
        formatCurrency(amount),
        expenses > 0 ? `${Math.round((amount / expenses) * 100)}%` : "0%",
      ]);

    autoTable(doc, {
      startY: finalY + 20,
      head: [["Categoria", "Total", "%"]],
      body: catRows,
      styles: { fontSize: 9, cellPadding: 3 },
      headStyles: {
        fillColor: [255, 143, 177],
        textColor: 255,
        fontStyle: "bold",
      },
      columnStyles: {
        1: { halign: "right" },
        2: { halign: "right" },
      },
    });
  }

  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(180, 180, 180);
    doc.text(
      `Paca Finance — Gerado em ${new Date().toLocaleDateString("pt-BR")}`,
      14,
      doc.internal.pageSize.height - 10
    );
  }

  doc.save(`paca-finance-${month}.pdf`);
}
