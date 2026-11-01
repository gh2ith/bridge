(() => {
  'use strict';
  function summarize(link,histories,students) {
    const collegeStudents=new Set(students.filter(student=>student.college===link.college).map(student=>student.id));
    const latest=new Map();
    histories.forEach(history=>{if(!latest.has(history.student))latest.set(history.student,history);});
    const related=histories.filter(history=>history.company===link.company&&collegeStudents.has(history.student));
    return {
      active:related.filter(history=>history.status==='Active'&&latest.get(history.student)===history).length,
      completed:related.filter(history=>history.status==='Completed').length,
      ended:related.filter(history=>history.status==='Left').length
    };
  }
  function label(counts) {
    return counts.active+' active '+(counts.active===1?'placement':'placements')+' · '+counts.completed+' completed'+(counts.ended?' · '+counts.ended+' ended early':'');
  }
  window.BridgewayPartnerCounts={summarize,label};
})();
