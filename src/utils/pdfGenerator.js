import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export function generateInvoicePDF(orderData) {
  const {
    billNo = 'N/A',
    customerName = '',
    customerAddress = '',
    totalMrp = 0,
    subtotal = 0,
    discount = 0,
    deliveryFee = 0,
    grandTotal = 0,
    date = new Date().toLocaleDateString('en-IN'),
    items = [],
    buyerDetails = null
  } = orderData || {};

  const doc = new jsPDF();
  
  const write = (text, x, y, size = 10, style = "normal", color = [17, 24, 39], opts = {}) => {
    doc.setFont("helvetica", style);
    doc.setFontSize(size);
    doc.setTextColor(...color);
    doc.text(text, x, y, opts);
  };

  // Header Section
  write("Masala Munchies", 15, 20, 22, "bold", [180, 83, 9]);
  write("Premium Homemade Savory Snacks & Khakhras", 15, 26, 10, "normal", [100, 116, 139]);
  
  write("RETAIL BILL", 195, 20, 13, "bold", [17, 24, 39], { align: "right" });
  write(`Date: ${date}`, 195, 26, 10, "normal", [55, 65, 81], { align: "right" });
  write(`Bill No: ${billNo}`, 195, 32, 10, "normal", [55, 65, 81], { align: "right" });
  
  doc.setDrawColor(229, 231, 235);
  doc.line(15, 43, 195, 43);
  
  // Billing Info Section (Dynamically merges mapped buyer details)
  write("Billed To:", 15, 51, 10, "bold", [17, 24, 39]);
  
  let currentY = 57;
  write(`Name: ${buyerDetails?.name || customerName}`, 15, currentY, 10, "normal", [17, 24, 39]);
  currentY += 6;

  if (buyerDetails) {
    const splitAddress = doc.splitTextToSize(`Address: ${buyerDetails.address || customerAddress}`, 180);
    write(splitAddress, 15, currentY, 10, "normal", [17, 24, 39]);
    currentY += (splitAddress.length * 5) + 1;
    
    if (buyerDetails.pincode) { write(`Pincode: ${buyerDetails.pincode}`, 15, currentY, 10); currentY += 6; }
    if (buyerDetails.mobile) { write(`Mobile: ${buyerDetails.mobile}`, 15, currentY, 10); currentY += 6; }
    if (buyerDetails.gstin) { write(`GSTIN: ${buyerDetails.gstin}`, 15, currentY, 10); currentY += 6; }
    if (buyerDetails.pan) { write(`PAN No.: ${buyerDetails.pan}`, 15, currentY, 10); currentY += 6; }
    if (buyerDetails.stateCode) { write(`State Code: ${buyerDetails.stateCode}`, 15, currentY, 10); currentY += 6; }
  } else {
    const splitAddress = doc.splitTextToSize(`Address: ${customerAddress}`, 180);
    write(splitAddress, 15, currentY, 10, "normal", [17, 24, 39]);
    currentY += (splitAddress.length * 5) + 1;
  }
  
  const tableStartY = currentY + 5;
  const tableColumns = ["Product Description", "Pack Size", "MRP", "Rate", "Qty", "Total"];
  
  const tableRows = items.map(item => {
    // Graceful check mapping plain integers into visual grams without corrupting DB numbers
    const rawWeight = item.weight !== undefined ? item.weight : 'N/A';
    const weightText = String(rawWeight).endsWith('g') || rawWeight === 'N/A' ? String(rawWeight) : `${rawWeight}g`;
    
    return [
      item.name || 'Unknown Product', 
      weightText, 
      `Rs. ${item.mrp || item.price || 0}`, 
      `Rs. ${item.price || 0}`, 
      (item.qty || 0).toString(), 
      `Rs. ${item.total || 0}`
    ];
  });
  
  autoTable(doc, {
    startY: tableStartY,
    head: [tableColumns],
    body: tableRows,
    theme: 'striped',
    headStyles: { fillColor: [5, 150, 105], fontStyle: 'bold' }, 
    styles: { font: 'helvetica', fontSize: 10 },
    columnStyles: { 
      0: { cellWidth: 70, halign: 'left' }, 
      1: { cellWidth: 20, halign: 'left' }, 
      2: { cellWidth: 20, halign: 'right' }, 
      3: { cellWidth: 20, halign: 'right' }, 
      4: { cellWidth: 15, halign: 'center' }, 
      5: { cellWidth: 35, halign: 'right' } 
    },
    didParseCell: function (data) {
      if (data.section === 'head') {
        if ([2, 3, 5].includes(data.column.index)) {
          data.cell.styles.halign = 'right';
        } else if (data.column.index === 4) {
          data.cell.styles.halign = 'center';
        }
      }
    }
  });
  
  const finalY = doc.lastAutoTable?.finalY || (tableStartY + (tableRows.length * 8) + 15);
  currentY = finalY + 10;
  
  const mrpSavings = totalMrp - subtotal;
  const summaryMetrics = [
    { label: "Total MRP:", val: `Rs. ${totalMrp}`, color: [107, 114, 128] },
    ...(mrpSavings > 0 ? [{ label: "MRP Discount:", val: `-Rs. ${mrpSavings}`, color: [5, 150, 105] }] : []),
    { label: "Subtotal (Sale Price):", val: `Rs. ${subtotal}`, color: [55, 65, 81] },
    { label: "Delivery Fee:", val: deliveryFee > 0 ? `Rs. ${deliveryFee}` : "FREE", color: [55, 65, 81] }
  ];

  summaryMetrics.forEach(metric => {
    write(metric.label, 145, currentY, 10, "normal", metric.color, { align: "left" });
    write(metric.val, 195, currentY, 10, "normal", metric.color, { align: "right" });
    currentY += 6;
  });
  
  doc.setDrawColor(209, 213, 219);
  doc.line(145, currentY - 2, 195, currentY - 2);
  currentY += 6; 
  
  write("Grand Total:", 145, currentY, 11, "bold", [17, 24, 39], { align: "left" });
  write(`Rs. ${Math.round(grandTotal)}`, 195, currentY, 11, "bold", [17, 24, 39], { align: "right" });
  
  // Page Boundary Protection Check
  currentY += 20;
  if (currentY > 250) { doc.addPage(); currentY = 20; }
  
  doc.setDrawColor(229, 231, 235);
  doc.line(15, currentY, 195, currentY);
  currentY += 8;
  
  // Footer Declaration Layout
  write("Declaration:", 15, currentY, 10, "bold", [17, 24, 39]);
  const currentYForSignature = currentY; 
  
  currentY += 5;
  const decLines = doc.splitTextToSize("GST is not applicable on this purchase as the seller's annual turnover is below the statutory registration threshold.", 110);
  write(decLines, 15, currentY, 9, "italic", [107, 114, 128]);
  
  currentY += (decLines.length * 4.5) + 6;
  write("Thank you for your order! Homemade with love and utmost hygiene.", 15, currentY, 10, "bold", [5, 150, 105]);
  
  write("For Masala Munchies", 195, currentYForSignature, 10, "bold", [17, 24, 39], { align: "right" });
  doc.setDrawColor(209, 213, 219);
  doc.line(150, currentYForSignature + 14, 195, currentYForSignature + 14); 
  write("Authorized Signatory", 195, currentYForSignature + 19, 9, "normal", [107, 114, 128], { align: "right" });
  
  doc.save(`Invoice_${billNo}.pdf`);
}