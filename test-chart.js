const fromDate = new Date('2026-01-01');
const toDate = new Date('2026-06-20');
const diffTime = Math.abs(toDate.getTime() - fromDate.getTime());
const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

const payments = [
  { amount: 1500, payment_date: '2026-01-20' },
  { amount: 800, payment_date: '2026-01-20' },
  { amount: 750, payment_date: '2026-02-20' },
  { amount: 750, payment_date: '2026-03-20' },
  { amount: 3500, payment_date: '2026-03-20' }
];

if (diffDays <= 30) {
  console.log("Days <= 30");
} else {
  const grouped = {};
  const monthNames = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];
  
  const startMonth = new Date(fromDate.getFullYear(), fromDate.getMonth(), 1);
  const endMonth = new Date(toDate.getFullYear(), toDate.getMonth(), 1);
  
  for (let d = new Date(startMonth); d <= endMonth; d.setMonth(d.getMonth() + 1)) {
    const monthStr = `${monthNames[d.getMonth()]} ${d.getFullYear() !== new Date().getFullYear() ? d.getFullYear() : ''}`.trim();
    grouped[monthStr] = 0;
  }
  
  payments.forEach(p => {
    const pd = new Date(p.payment_date);
    const monthStr = `${monthNames[pd.getMonth()]} ${pd.getFullYear() !== new Date().getFullYear() ? pd.getFullYear() : ''}`.trim();
    if (grouped[monthStr] !== undefined) {
      grouped[monthStr] += Number(p.amount) || 0;
    } else {
      grouped[monthStr] = Number(p.amount) || 0;
    }
  });
  
  console.log("Chart Data:", Object.entries(grouped).map(([name, revenue]) => ({ name, revenue })));
}
