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
  doc.text(data.businessName || data.accountantName, 20, 40);
  
  // Receipt Details
  doc.setFontSize(10);
  doc.text(`N° Reçu: ${data.receiptNumber}`, 140, 40);
  doc.text(`Date: ${new Date(data.paymentDate).toLocaleDateString('fr-FR')}`, 140, 47);

  // Client Info
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Reçu de :', 20, 60);
  doc.setFont('helvetica', 'normal');
  doc.text(data.clientName, 20, 67);
  if (data.companyName) {
    doc.text(data.companyName, 20, 74);
  }

  // Payment Details Table
  autoTable(doc, {
    startY: 90,
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

  // Footer Message
  doc.setTextColor(100, 116, 139);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'italic');
  doc.text('Merci pour votre paiement et votre confiance.', 105, finalY + 40, { align: 'center' });

  // Save the PDF
  doc.save(`Recu_${data.receiptNumber}_${data.clientName.replace(/\s+/g, '_')}.pdf`);
};
