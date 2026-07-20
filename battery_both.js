(function(){
var U='https://bada43131-ai.github.io/dispatch/battery_michuhol.html';
var b=document.createElement('div');
b.style='position:fixed;top:20px;left:50%;transform:translateX(-50%);background:#4c1d95;color:#fff;padding:13px 24px;border-radius:10px;font-size:13px;font-weight:700;z-index:99999;box-shadow:0 4px 16px rgba(0,0,0,.4);font-family:sans-serif;white-space:nowrap';
b.textContent='⏳ 미추홀+연수 통합 수집 중...';
document.body.appendChild(b);
(async function(){
try{
var store=document.querySelector('#app').__vue_app__.config.globalProperties.$store;
var devices=store.state.devices||[];
var MP=[[126.633053,37.462732],[126.626015,37.449787],[126.652107,37.437521],[126.662922,37.439156],[126.679745,37.43643],[126.687984,37.433977],[126.734161,37.433977],[126.759052,37.43275],[126.763172,37.443927],[126.754589,37.449787],[126.72369,37.460825],[126.703606,37.468046],[126.694336,37.471452],[126.670818,37.467637],[126.66481,37.476084]];
var YP=[[126.668072,37.391846],[126.688671,37.405346],[126.701202,37.424298],[126.699657,37.434113],[126.695881,37.43384],[126.692963,37.431932],[126.696396,37.424298],[126.65863,37.434522],[126.634426,37.433704],[126.639576,37.415164],[126.647129,37.407937],[126.655712,37.401119]];
function ip(poly,x,y){var r=false;for(var i=0,j=poly.length-1;i<poly.length;j=i++){var a=poly[i][0],bb=poly[i][1],c=poly[j][0],d=poly[j][1];if(((bb>y)!=(d>y))&&(x<(c-a)*(y-bb)/(d-bb)+a))r=!r;}return r;}
function gl(d){return d.adjusted_location||d.location;}
function mo(d){var m=(d.code||'').match(/^[a-zA-Z]+/);return m?m[0].toUpperCase():'';}
function C(a,k){return a.filter(function(d){return mo(d)===k;}).length;}
function F(a,t){return a.filter(function(d){var tp=(d.repairTicket||{}).type||'';return t==='F'?tp.indexOf('FIELD')>=0&&tp.indexOf('URGENT')<0:t==='U'?tp.indexOf('URGENT')>=0:tp.indexOf('WAREHOUSE')>=0;}).length;}
var MB=devices.filter(function(d){var l=gl(d);return d.batteryTicket&&l&&ip(MP,l.lng,l.lat);});
var YB=devices.filter(function(d){var l=gl(d);return d.batteryTicket&&l&&ip(YP,l.lng,l.lat);});
var MR=devices.filter(function(d){var l=gl(d);return d.repairTicket&&l&&ip(MP,l.lng,l.lat);});
var YR=devices.filter(function(d){var l=gl(d);return d.repairTicket&&l&&ip(YP,l.lng,l.lat);});
var BI=devices.filter(function(d){return d.batteryTicket;}).length;
var mg=C(MB,'GF'), yg=C(YB,'GF'), ts=Date.now();
var h='zone=both'
  +'&mgf='+mg+'&mot='+(MB.length-mg)+'&mt='+MB.length
  +'&mha='+C(MB,'HA')+'&mia='+C(MB,'IA')+'&mja='+C(MB,'JA')+'&mka='+C(MB,'KA')+'&mma='+C(MB,'MA')+'&mda='+C(MB,'DA')
  +'&mf='+F(MR,'F')+'&mu='+F(MR,'U')+'&mw='+F(MR,'W')
  +'&ygf='+yg+'&yot='+(YB.length-yg)+'&yt='+YB.length
  +'&yha='+C(YB,'HA')+'&yia='+C(YB,'IA')+'&yja='+C(YB,'JA')+'&yka='+C(YB,'KA')+'&yma='+C(YB,'MA')+'&yda='+C(YB,'DA')
  +'&yf='+F(YR,'F')+'&yu='+F(YR,'U')+'&yw='+F(YR,'W')
  +'&bi='+BI+'&ts='+ts;
b.textContent='✓ 미추홀 '+MB.length+'대 | 연수 '+YB.length+'대 → 이동...';
b.style.background='#059669';
setTimeout(function(){document.body.removeChild(b);location.href=U+'#'+h;},800);
}catch(e){b.textContent='실패: '+e.message;b.style.background='#DC2626';setTimeout(function(){document.body.removeChild(b);},3000);}
})();
})();
