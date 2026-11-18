"""Médiane et quantile p95 au rang le plus proche, dans l'ordre temporel des deux démarrages."""
import json,math,statistics,sys
from pathlib import Path
rows=[json.loads(r) for r in Path(sys.argv[1]).read_text().splitlines() if r.startswith('{')]
summary=[]
for r in rows:
    starts=r['starts'];dt=[b-a for a,b in zip(starts,starts[1:])]
    assert dt and min(dt)>0 and sum(r['silence'].values())==0
    n=len(dt);q=sorted(dt)[math.ceil(n*.95)-1]
    summary.append(dict(year=r['year'],viewport=[r['width'],r['height']],frames=len(starts),intervals=n,
        window=round(sum(dt),2),first_after_click=round(r['firstExecution']-r['touch'],2),
        p50=round(statistics.median(dt),2),p95=round(q,2),max=round(max(dt),2),
        slow_over_50=sum(x>50 for x in dt),p95_callback=round(sorted(r['costs'])[math.ceil(len(starts)*.95)-1],2),
        max_callback=max(r['costs'])))
assert summary
print(json.dumps(summary,indent=2,ensure_ascii=False))
