#!/usr/bin/env python3
"""Check translation coverage, paired identifiers, exports and rendered English."""
import hashlib
import html
import json
import re
import zipfile
import sys
from pathlib import Path
from html.parser import HTMLParser
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
results = []
def check(label, test):
    results.append({'label':label,'passed':bool(test)})
    print(('PASS ' if test else 'FAIL ')+label)
def read(file): return (ROOT/file).read_text()
def data(file): return json.loads(read(file))
def structure(a,b):
    if type(a)!=type(b): return False
    if isinstance(a,dict): return a.keys()==b.keys() and all(bool(re.fullmatch(r'\d{4}-\d{2}-\d{2}',b[k])) if k=='updated' else structure(v,b[k]) for k,v in a.items())
    if isinstance(a,list): return len(a)==len(b) and all(structure(x,y) for x,y in zip(a,b))
    if isinstance(a,str) and re.search('[\u3400-\u9fff]',a): return bool(b.strip()) and a!=b
    return a==b
class Text(HTMLParser):
    def __init__(self): super().__init__(); self.parts=[]; self.skip=0
    def handle_starttag(self,tag,attrs):
        if tag in ['script','style']: self.skip+=1
    def handle_endtag(self,tag):
        if tag in ['script','style']: self.skip-=1
    def handle_data(self,value):
        if not self.skip:self.parts.append(value)
def visible(source):
    parser=Text();parser.feed(source);return ''.join(parser.parts)

for name in ['pathways','templates','workflows','research-tools']:
    original=data('assets/data/'+name+'.json');translated=data('assets/data/en/'+name+'.json')
    check(name+': translated content preserves every key, list length and stable reference',structure(original,translated))
    check(name+': generated English data matches authored translation',translated==data('en/assets/data/'+name+'.json'))
tracks=data('assets/data/en/pathways.json')['tracks']
for track in tracks:
    source=read('en/'+track['page'])
    content=visible(source)
    all_fields=[value for stage in track['stages'] for key in ['title','goal','entry','actions','deliverables','review','failure','next'] for value in (stage[key] if isinstance(stage[key],list) else [stage[key]])]
    check(track['id']+': every translated action, deliverable, review and correction appears online',all(html.unescape(value).replace('查非','cha-fei') in content.replace('查非','cha-fei') for value in all_fields))
    handbook=read('en/assets/downloads/training-handbook.md')
    check(track['id']+': complete stage guidance appears in offline handbook',all(value.replace('查非','cha-fei') in handbook.replace('查非','cha-fei') for value in all_fields))
    growth=[value for field in track['growth'].values() for value in (field if isinstance(field,list) else [field])]
    check(track['id']+': complete growth guidance appears online and offline',all(html.unescape(value) in content and value in handbook for value in growth))
manifest=data('assets/data/en/templates.json')['templates']
for item in manifest:
    en=read('en/'+item['file']);zh=read(item['file'])
    check(item['id']+': usable English template with matching section coverage',en==read('assets/templates/en/'+Path(item['file']).name) and len(en)>600 and len(re.findall('^## ',en,re.M))>=len(re.findall('^## ',zh,re.M)) and '[ ]' in en and not re.search('[\u3400-\u9fff]',en))
for prefix in ['', 'en/']:
    for bundle,count in [('csma-training-templates.zip',len(manifest)+3),('csma-workflow-diagrams.zip',len(data(prefix+'assets/data/workflows.json')['flows'])*2+2)]:
        with zipfile.ZipFile(ROOT/(prefix+'assets/downloads/'+bundle)) as archive:
            names=archive.namelist()
            sums=[line.split('  ',1) for line in archive.read('SHA256SUMS').decode().splitlines()]
            check(prefix+bundle+': exact membership and all SHA-256 checksums',len(names)==count and len(set(names))==count and len(sums)==count-1 and all(hashlib.sha256(archive.read(name)).hexdigest()==digest for digest,name in sums))
    flows=data(prefix+'assets/data/workflows.json')['flows']
    valid=True
    for flow in flows:
        svg=ET.fromstring(read(prefix+'assets/diagrams/'+flow['id']+'.svg'))
        drawing=ET.fromstring(read(prefix+'assets/diagrams/'+flow['id']+'.drawio'))
        node_ids={n.get('data-node-id') for n in svg.iter() if n.get('class')=='flow-node'}
        links=[n.get('href') for n in svg.iter() if n.get('href')]
        valid=valid and node_ids=={n['id'] for n in flow['nodes']} and len([n for n in drawing.iter('object')])==len(node_ids) and all('github.io/'+prefix in link for link in links)
    check(prefix+'diagrams: all SVG/draw.io graphs preserve every node and correct language links',valid)
built=ROOT/'_site/en'
pages=list(built.rglob('*.html')) if built.exists() else []
chinese=[]
for page in pages:
    text=visible(page.read_text()).replace('中文','').replace('查非','')
    if re.search('[\u3400-\u9fff]',text):chinese.append(str(page.relative_to(ROOT)))
check('English built pages have no untranslated Chinese prose (except the language switch and explained cha-fei term)',len(pages)>=29 and not chinese)
if chinese:print('Remaining Chinese:',', '.join(chinese))
check('English planner uses a separate storage namespace and revalidates its current data',"'csma-training-stage-v1:en:'" in read('assets/training-en.js') and "fetch('assets/data/pathways.json', { cache: 'no-cache' })" in read('assets/training-en.js'))
international_ids = []
for prefix, fragment in [('', 'scripts/training-pages/international.html'), ('en/', 'scripts/training-pages/en/international.html')]:
    authored = read(fragment)
    international_ids.append(re.findall(r'\bid="([^"]+)"', authored))
    parser = Text(); parser.feed(authored)
    passages = [re.sub(r'\s+', ' ', part).strip() for part in parser.parts if len(part.strip()) > 40]
    online = re.sub(r'\s+', ' ', visible(read('_site/'+prefix+'international.html')))
    offline = re.sub(r'\s+', ' ', read(prefix+'assets/downloads/training-handbook.md').replace('**', ''))
    check(prefix+'international guide: substantive passages appear online and in the offline handbook', bool(passages) and all(passage in online and passage in offline for passage in passages))
check('International guides preserve matching section anchors for language switching', international_ids[0] == international_ids[1] and set(international_ids[0]) == {'start','bachelor','master','doctor','checklist','support','sources'})
learning_ids=[]
for prefix, fragment in [('', 'scripts/training-pages/learning.html'), ('en/', 'scripts/training-pages/en/learning.html')]:
    authored=read(fragment)
    learning_ids.append(re.findall(r'\bid="([^"]+)"',authored))
    parser=Text();parser.feed(authored)
    passages=[re.sub(r'\s+',' ',part).strip() for part in parser.parts if len(part.strip())>40]
    online=re.sub(r'\s+',' ',visible(read('_site/'+prefix+'learning.html')))
    offline=re.sub(r'\s+',' ',read(prefix+'assets/downloads/training-handbook.md').replace('**',''))
    check(prefix+'learning guide: full substantive guidance is available online and offline',bool(passages) and all(p in online and p in offline for p in passages))
check('Learning guides preserve section anchors across language switching',learning_ids[0]==learning_ids[1] and set(learning_ids[0])=={'start','levels','cycle','feedback','review','next'})
summary={'checks':results,'passed':sum(x['passed'] for x in results),'total':len(results),'scope':'Translation completeness and file integrity, not institutional approval or live research results.'}
print(str(summary['passed'])+'/'+str(summary['total'])+' bilingual checks passed.')
if '--report' in sys.argv:
    report=Path(sys.argv[sys.argv.index('--report')+1]);report.parent.mkdir(parents=True,exist_ok=True)
    report.write_text(json.dumps(summary,ensure_ascii=False,indent=2)+'\n')
raise SystemExit(0 if summary['passed']==summary['total'] else 1)
