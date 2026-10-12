import assert from "node:assert/strict";
import {parseEnaDate,sourceDate,inspectEnaRows} from "./ena-date-compatibility.mjs";
const day="2026-10-13", now=Date.parse("2026-10-13T18:00:00Z");
const accepted=[
  "13/10/2026 06:44:15","10/13/2026 6:44:15 AM",
  "13-10-2026, 6:44 a. m.","2026-10-13 06:44:15",
  "2026-10-13T06:44:15-05:00","2026-10-13T11:44:15Z",
  "2026/10/13 06:44",Date.parse("2026-10-13T11:44:15Z"),
  Math.floor(Date.parse("2026-10-13T11:44:15Z")/1000),
  "13.10.2026 6:44 p. m."
];
const rejected=[
 "12/10/2026 06:44:15","10/12/2026 06:44:15",
 "2026-10-12T11:44:15Z","2026-10-13 25:00",
 "2026-10-13 20:00","not a date",null,"",
 "2026-10-13T23:45:00Z"
];
for(const v of accepted){
 const q=parseEnaDate(v,day,now);
 assert.equal(q.ok,true,JSON.stringify({v,q}));
}
for(const v of rejected){
 const q=parseEnaDate(v,day,now);
 assert.equal(q.ok,false,JSON.stringify({v,q}));
}
assert.equal(sourceDate({"Fecha Actualizacion":"13/10/2026 6:44:15"}).key,"Fecha Actualizacion");
const inspected=inspectEnaRows([
 {"Fecha Actualizacion":"13/10/2026 6:44:15"},
 {updated_at:"2026-10-13 06:44:15"},
 {fecha:"12/10/2026 06:44:15"},
 {unrecognized_date:"13/10/2026 06:44:15"},
],day,now);
assert.deepEqual([inspected.accepted,inspected.rejected],[2,2]);
assert.equal(inspected.reasons.MISSING_DATE_FIELD,1);
console.log("ENA date adapter: format tests passed; stale/future timestamps rejected");
