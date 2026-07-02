import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { save } from '@tauri-apps/plugin-dialog';
import { writeFile } from '@tauri-apps/plugin-fs';

interface ReceiptData {
  receiptNumber: string;
  paymentDate: string;
  amount: number;
  method: string;
  clientName: string;
  companyName?: string;
  serviceName: string;
  accountantName: string;
  businessName?: string;
  accountantEmail?: string;
  accountantPhone?: string;
}
export const getLogoBase64 = async (): Promise<string | null> => {
  try {
    const response = await fetch('/logo.png');
    if (!response.ok) return null;
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (e) {
    console.error('Error loading logo:', e);
    return null;
  }
};

export const generateReceipt = async (data: ReceiptData) => {
  console.log('STEP 2 - Enter generateReceipt()');
  const doc = new jsPDF();

  // Header
  doc.setFontSize(22);
  doc.setTextColor(30, 58, 138); // Blue
  doc.text('REÇU DE PAIEMENT', 105, 20, { align: 'center' });

  // Add Logo
  const logoBase64 = await getLogoBase64();
  if (logoBase64) {
    // 35x35 mm at top right (page width is 210, so 210 - 35 - 15 margin = 160)
    doc.addImage(logoBase64, 'PNG', 160, 10, 35, 35);
  }

  // Accountant / Business Info
  doc.setFontSize(12);
  doc.setTextColor(51, 65, 85);
  doc.setFont('helvetica', 'bold');
  doc.text(data.businessName || data.accountantName, 20, 40);
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  let currentY = 45;
  if (data.businessName && data.businessName !== data.accountantName) {
    doc.text(data.accountantName, 20, currentY);
    currentY += 5;
  }
  if (data.accountantEmail) {
    doc.text(`Email: ${data.accountantEmail}`, 20, currentY);
    currentY += 5;
  }
  if (data.accountantPhone) {
    doc.text(`Tél: ${data.accountantPhone}`, 20, currentY);
  }
  
  // Receipt Details
  doc.setFontSize(10);
  doc.text(`N° Reçu: ${data.receiptNumber}`, 140, 40);
  doc.text(`Date: ${new Date(data.paymentDate).toLocaleDateString('fr-FR')}`, 140, 47);

  // Client Info
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Reçu de :', 20, 70);
  doc.setFont('helvetica', 'normal');
  doc.text(data.clientName, 20, 77);
  if (data.companyName) {
    doc.text(data.companyName, 20, 84);
  }

  // Payment Details Table
  autoTable(doc, {
    startY: 100,
    head: [['Description', 'Méthode de paiement', 'Montant']],
    body: [
      [
        `Paiement pour le service : ${data.serviceName}`,
        data.method === 'virement' ? 'Virement bancaire' : data.method === 'espece' ? 'Espèces' : 'Chèque',
        `${data.amount.toLocaleString()} MAD`
      ]
    ],
    theme: 'striped',
    headStyles: { fillColor: [30, 58, 138] },
    margin: { top: 10 }
  });

  // Total
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const finalY = (doc as any).lastAutoTable?.finalY || 120;
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Montant Total Payé:', 120, finalY + 15);
  doc.setTextColor(16, 185, 129); // Emerald
  doc.text(`${data.amount.toLocaleString()} MAD`, 170, finalY + 15);

  // --- FOOTER SECTION ---
  const footY = finalY + 30;
  
  // Line separator
  doc.setDrawColor(200, 200, 200);
  doc.line(20, footY, 190, footY);

  // Left side: Signature & Cachet
  doc.setTextColor(51, 65, 85);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Signature & Cachet', 20, footY + 10);
  
  // Empty box for signature/cachet
  doc.setDrawColor(200, 200, 200);
  doc.rect(20, footY + 15, 50, 25);

  // Right side: Thank you note
  doc.setTextColor(100, 116, 139);
  doc.setFont('helvetica', 'italic');
  doc.text('Merci pour votre paiement et votre confiance.', 190, footY + 10, { align: 'right' });

  // Save the PDF
  const filename = `Recu_${data.receiptNumber}_${data.clientName.replace(/\s+/g, '_')}.pdf`;
  
  // @ts-expect-error - Tauri internal API
  const isTauriEnv = !!window.__TAURI_INTERNALS__;
  console.log(`STEP 3 - isTauri() = ${isTauriEnv}`);
  
  if (isTauriEnv) {
    try {
      console.log('STEP 4 - Opening Save Dialog');
      const filePath = await save({
        filters: [{
          name: 'PDF',
          extensions: ['pdf']
        }],
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
