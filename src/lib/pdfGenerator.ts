import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

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

export const generateReceipt = (data: ReceiptData) => {
  const doc = new jsPDF();

  // Header
  doc.setFontSize(22);
  doc.setTextColor(30, 58, 138); // Blue
  doc.text('REÇU DE PAIEMENT', 105, 20, { align: 'center' });

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
  const finalY = (doc as any).lastAutoTable.finalY || 120;
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
  doc.save(`Recu_${data.receiptNumber}_${data.clientName.replace(/\s+/g, '_')}.pdf`);
};
