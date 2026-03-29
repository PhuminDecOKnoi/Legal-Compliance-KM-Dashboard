const { localizeCategory, localizeNote } = require('../utils/i18n');

function buildExecutiveNarrative(appData, locale) {
  const { kpis, backlog, dataQuality } = appData;
  const topBacklog = backlog[0];
  const topCategory = localizeCategory(kpis.topExposureCategory, locale);
  const backlogNote = topBacklog ? localizeNote(topBacklog.notes, locale) : '';

  if (locale === 'th') {
    return `ทะเบียนกฎหมายมีทั้งหมด ${kpis.totalLegalRequirements} รายการ โดย ${kpis.activeLaws} รายการยังมีผลบังคับใช้ และดำเนินการแล้ว ${kpis.implementedPercent}% ของทั้งหมด หมวดที่ควรจับตาสูงสุดคือ ${topCategory} ขณะนี้มีรายการ Active ที่ยังค้าง ${kpis.activePending} รายการ และพบประเด็นคุณภาพข้อมูล ${dataQuality.totalIssues} จุด ควรเร่งปิดประเด็น ${backlogNote || 'ติดตามเร่งด่วน'} ก่อนการรายงานรอบถัดไป`;
  }

  return `The register contains ${kpis.totalLegalRequirements} requirements, with ${kpis.activeLaws} still active and ${kpis.implementedPercent}% already implemented. The leading exposure is in ${topCategory}. There are ${kpis.activePending} active items still pending, and ${dataQuality.totalIssues} data-quality watch points should be cleaned up before the next management review.`;
}

function buildRecommendations(appData, locale) {
  const activePending = appData.records.filter((record) => record.isPendingActive).slice(0, 3);
  const recommendationsEn = [
    'Close ownership and evidence confirmation for active items not yet marked Implemented.',
    'Review inactive legal items and decide whether to archive or retain them for reference.',
    'Fix missing references, future dates, and incomplete statuses before month-end reporting.'
  ];
  const recommendationsTh = [
    'เร่งยืนยันผู้รับผิดชอบและหลักฐานการดำเนินการสำหรับรายการที่ยังไม่ปิดงาน',
    'ทบทวนรายการที่ไม่มีผลบังคับใช้เพื่อกำหนดการจัดเก็บเป็นเอกสารอ้างอิง',
    'แก้ไขข้อมูลเลขอ้างอิง วันที่ และสถานะที่ไม่สมบูรณ์ก่อนสรุปรายงานปลายเดือน'
  ];

  return {
    executive: locale === 'th' ? recommendationsTh : recommendationsEn,
    operational: activePending.map((record) => `${record.legalTitle}: ${record.requiredAction}`)
  };
}

module.exports = {
  buildExecutiveNarrative,
  buildRecommendations
};
