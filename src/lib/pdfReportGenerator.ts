import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { save } from '@tauri-apps/plugin-dialog';
import { writeFile } from '@tauri-apps/plugin-fs';

export interface ReportData {
  periodLabel: string;
  totalIncome: number;
  pendingIncome: number;
  payments: Array<{
    date: string;
    clientName: string;
    serviceName: string;
    amount: number;
    method: string;
  }>;
}

export const generateIncomeReport = async (data: ReportData) => {
  console.log('STEP 2 - Enter generateIncomeReport()');
  const doc = new jsPDF();
  
  // Header
  doc.setFontSize(22);
  doc.setTextColor(37, 99, 235); // Blue-600
  doc.text('Rapport de Revenus', 14, 20);
  
  // Summary Info
  doc.setFontSize(12);
  doc.setTextColor(0, 0, 0);
  doc.text(`Période : ${data.periodLabel}`, 14, 30);
  doc.text(`Total perçu : ${data.totalIncome.toLocaleString()} MAD`, 14, 40);
  doc.text(`En attente : ${data.pendingIncome.toLocaleString()} MAD`, 14, 50);
  
  const tableData = data.payments.map(p => [
    new Date(p.date).toLocaleDateString('fr-FR'),
    p.clientName,
    p.serviceName,
    p.amount.toLocaleString() + ' MAD',
    p.method.charAt(0).toUpperCase() + p.method.slice(1)
  ]);
  
  autoTable(doc, {
    startY: 60,
    head: [['Date', 'Client', 'Service', 'Montant', 'Méthode']],
    body: tableData,
    theme: 'grid',
    headStyles: { fillColor: [37, 99, 235] },
    styles: { fontSize: 10 }
  });
  
  const safeLabel = data.periodLabel.replace(/[\s/]/g, '_').replace(/[^a-zA-Z0-9_]/g, '');
  const filename = `Rapport_Revenus_${safeLabel}.pdf`;
  
  // @ts-expect-error - Tauri internal API
  const isTauriEnv = !!window.__TAURI_INTERNALS__;
  console.log(`STEP 3 - isTauri() = ${isTauriEnv}`);
  
  if (isTauriEnv) {
    try {
      console.log('STEP 4 - Opening Save Dialog');
      const filePath = await save({
        filters: [{ name: 'PDF', extensions: ['pdf'] }],
        defaultPath: filename
      });
      if (filePath) {
        console.log(`STEP 5 - Selected Path = ${filePath}`);
        const pdfBytes = doc.output('arraybuffer');
        console.log(`STEP 6 - PDF ArrayBuffer Size = ${pdfBytes.byteLength}`);
        console.log('STEP 7 - Calling writeFile()');
        await writeFile(filePath, new Uint8Array(pdfBytes));
        console.log('STEP 8 - writeFile returned successfully');
      }
    } catch (e: any) {
      console.error('STEP FAILED - full exception:', e);
      if (e instanceof Error) {
        console.error('Stack trace:', e.stack);
      }
    }
  } else {
    doc.save(filename);
  }
};
