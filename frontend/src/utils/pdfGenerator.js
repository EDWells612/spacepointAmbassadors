import { jsPDF } from "jspdf";

export const generateImpactReport = (ambassadorName, stats) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  
  // Set Background
  doc.setFillColor(15, 15, 17); // SpacePoint Dark Background (neutral)
  doc.rect(0, 0, pageWidth, doc.internal.pageSize.getHeight(), 'F');
  
  // Header Logo (Text for now)
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(28);
  doc.text("SpacePoint", 20, 30);
  
  // Subheader
  doc.setTextColor(215, 169, 253); // Primary-60 (Violet)
  doc.setFontSize(16);
  doc.text("AMBASSADOR IMPACT REPORT", 20, 45);
  
  // Decorative line
  doc.setDrawColor(215, 169, 253);
  doc.setLineWidth(0.5);
  doc.line(20, 50, pageWidth - 20, 50);
  
  // Ambassador Details
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont("helvetica", "normal");
  doc.text(`Ambassador: ${ambassadorName}`, 20, 65);
  doc.text(`Date Generated: ${new Date().toLocaleDateString()}`, 20, 75);
  
  // Stats Block
  doc.setFillColor(31, 31, 35); // Surface color
  doc.roundedRect(20, 90, pageWidth - 40, 100, 3, 3, 'F');
  
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("Performance Metrics", 30, 105);
  
  doc.setFontSize(14);
  doc.setFont("helvetica", "normal");
  
  const yStart = 125;
  const lineSpacing = 15;
  
  // Column 1
  doc.text(`Leads Submitted:`, 30, yStart);
  doc.text(`${stats.total_leads}`, 110, yStart);
  
  doc.text(`Tasks Completed:`, 30, yStart + lineSpacing);
  doc.text(`${stats.completed_tasks}`, 110, yStart + lineSpacing);
  
  doc.text(`Teachers Recruited:`, 30, yStart + lineSpacing * 2);
  doc.text(`${stats.active_teachers}`, 110, yStart + lineSpacing * 2);
  
  doc.text(`Instructors Recruited:`, 30, yStart + lineSpacing * 3);
  doc.text(`${stats.active_instructors}`, 110, yStart + lineSpacing * 3);
  
  // Wallet Info
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(215, 169, 253);
  doc.text(`Total Points Balance: ${stats.points_balance}`, 30, yStart + lineSpacing * 4 + 10);
  
  // Footer
  doc.setTextColor(150, 150, 150);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("SpacePoint Global Ambassador Program", pageWidth / 2, 280, { align: "center" });
  
  // Save the PDF
  doc.save(`${ambassadorName.replace(/\s+/g, '_')}_Impact_Report.pdf`);
};
