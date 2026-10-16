/* Detail layout only. All values and comparisons come from the existing RYM sources. */
(function(w){
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function fold(key,title,body){
    return body?'<details class="uva-detail-group" data-uva-group="'+esc(key)+'"><summary>'+esc(title)+'</summary><div class="uva-group-body">'+body+'</div></details>':'';
  }
  function comparison(fields){
    const groups={match:[],diff:[],missing:[]};
    for(const [label,left,right] of fields){
      const status=w.RYM_VALIDATOR_PRESENTATION.compare(left,right);
      const state={match:'COINCIDE',diff:'NO COINCIDE',missing:'SIN DATOS PARA COMPARAR'}[status];
      const present=value=>w.RYM_VALIDATOR_PRESENTATION.compare(value,value)==='missing'?'Sin dato':value;
      groups[status].push('<div class="uva-identity-check '+status+'"><strong>'+esc(label)+' · '+state+'</strong><div><small>RYM</small><span>'+esc(present(left))+'</span></div><div><small>eCarCheck</small><span>'+esc(present(right))+'</span></div></div>');
    }
    const counts='<div class="uva-comparison-counts" aria-label="Resumen de comparación"><span class="match" data-uva-count="match">'+groups.match.length+' coincidencias</span><span class="diff'+(groups.diff.length?'':' empty')+'" data-uva-count="diff">'+groups.diff.length+' diferencias</span><span class="missing" data-uva-count="missing">'+groups.missing.length+' sin información</span></div>';
    const diffs=groups.diff.length?'<div class="uva-comparison-differences">'+groups.diff.join('')+'</div>':'<p class="uva-comparison-empty">Sin diferencias entre los campos comparables.</p>';
    const vin=fields.find(([name])=>name==='VIN'),chassis=fields.find(([name])=>name==='Chasis');
    const linked=vin&&chassis&&!vin[1]&&w.RYM_VALIDATOR_PRESENTATION.compare(chassis[1],vin[2])==='match';
    const note=linked?'<p class="uva-source-note">El chasis RYM coincide con el VIN oficial. RYM no entrega un campo VIN independiente; la comparación VIN permanece sin datos.</p>':vin&&!vin[1]&&vin[2]?'<p class="uva-source-note">VIN interno no disponible. El VIN oficial se conserva sin sustituirlo por el chasis RYM.</p>':'';
    return '<section class="uva-detail-section uva-comparison"><h4>COMPARACIÓN RYM / ECARCHECK</h4>'+counts+note+diffs+fold('identity-match','Revisar coincidencias ('+groups.match.length+')',groups.match.join(''))+fold('identity-missing','Campos sin información ('+groups.missing.length+')',groups.missing.join(''))+'</section>';
  }
  w.RYM_VALIDATOR_DETAILS=Object.freeze({fold,comparison});
})(window);
