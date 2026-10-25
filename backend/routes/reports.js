const express = require('express');
const PDFDocument = require('pdfkit');
const Complaint = require('../models/Complaint');
const { protect, adminOnly } = require('../middleware/auth');

const router = express.Router();
router.use(protect, adminOnly);

function dateFilter(month) {
  const match = /^(\d{4})-(\d{2})$/.exec(month || '');
  if (!match) return {};
  const start = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, 1));
  const end = new Date(Date.UTC(Number(match[1]), Number(match[2]), 1));
  return { createdAt: { $gte: start, $lt: end } };
}

async function metrics(month) {
  const complaints = await Complaint.find(dateFilter(month)).select('status category priority createdAt resolvedAt');
  const statuses = { Pending: 0, 'In Progress': 0, Resolved: 0, Rejected: 0 };
  const categories = {};
  complaints.forEach((complaint) => {
    statuses[complaint.status] = (statuses[complaint.status] || 0) + 1;
    categories[complaint.category] = (categories[complaint.category] || 0) + 1;
  });
  return { month, total: complaints.length, statuses, categories };
}

router.get('/complaints.csv', async (req, res, next) => {
  try {
    const report = await metrics(req.query.month);
    const rows = [['Month', 'Total', 'Pending', 'In Progress', 'Resolved', 'Rejected'],
      [report.month || 'All', report.total, report.statuses.Pending, report.statuses['In Progress'], report.statuses.Resolved, report.statuses.Rejected]];
    Object.entries(report.categories).forEach(([category, count]) => rows.push([`Category: ${category}`, count, '', '', '', '']));
    const csv = rows.map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(',')).join('\n');
    res.attachment(`complaint-report-${report.month || 'all'}.csv`).type('text/csv').send(csv);
  } catch (err) {
    next(err);
  }
});

router.get('/complaints.pdf', async (req, res, next) => {
  try {
    const report = await metrics(req.query.month);
    res.attachment(`complaint-report-${report.month || 'all'}.pdf`);
    const doc = new PDFDocument({ margin: 50 });
    doc.pipe(res);
    doc.fontSize(18).text('Smart Campus Complaint Report');
    doc.moveDown().fontSize(11).text(`Month: ${report.month || 'All'}`);
    doc.text(`Total complaints: ${report.total}`);
    Object.entries(report.statuses).forEach(([status, count]) => doc.text(`${status}: ${count}`));
    doc.moveDown().text('By category');
    Object.entries(report.categories).forEach(([category, count]) => doc.text(`${category}: ${count}`));
    doc.end();
  } catch (err) {
    next(err);
  }
});

module.exports = router;
