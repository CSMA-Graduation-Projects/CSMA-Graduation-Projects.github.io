"""Shared navigation and explicit UI translations for the two static editions."""
import html
import hashlib
import json
import re
from pathlib import Path

BASE = Path(__file__).resolve().parents[1]
SITE = 'https://csma-graduation-projects.github.io/'
NAV = [('index.html','首页','Home'),('news.html','新闻','News'),('bachelor.html','学士','Undergraduate'),('master.html','硕士',"Master's"),('doctor.html','博士','Doctoral'),('resources.html','资源','Resources'),('outcomes.html','成果','Outcomes'),('students.html','榜样','Stories'),('essays.html','导引','Mentoring'),('about.html','关于','About')]
PARENTS = {'undergraduate-research.html':'bachelor.html','competition.html':'bachelor.html','templates.html':'resources.html','archive.html':'resources.html','milestones.html':'resources.html','planner.html':'resources.html','management.html':'resources.html','integrity.html':'resources.html','policies.html':'resources.html','workflows.html':'resources.html','tools.html':'resources.html','projects.html':'outcomes.html','faq.html':'about.html'}

def localize(value, language):
    if language != 'en': return value
    messages = json.loads((BASE/'scripts/i18n/en.json').read_text())
    for source in sorted(messages, key=len, reverse=True):
        value = value.replace(source, messages[source])
    return re.sub(re.escape(SITE) + r'(?!en/)', SITE+'en/', value)

def navigation(page, language):
    parent = 'resources.html' if page in ['international.html','learning.html'] else PARENTS.get(page, page)
    if page.startswith('essays/'): parent = 'essays.html'
    if page.startswith('news/'): parent = 'news.html'
    prefix = '/en/' if language == 'en' else '/'
    return '\n'.join('<a' + (' class="active" aria-current="'+('page' if page==target else 'true')+'"' if target==parent else '') + ' href="'+prefix+target+'">'+html.escape(en if language=='en' else zh,quote=False)+'</a>' for target,zh,en in NAV)

def page_language(source, page, language):
    """Add matching URLs without changing stable stage or template IDs."""
    english = language == 'en'
    source = re.sub(r'<html lang="[^"]+">', '<html lang="'+language+'">', source)
    source = re.sub(r'(<nav class="main-nav"[^>]*>)[\s\S]*?(</nav>)', lambda m:m[1]+navigation(page,language)+m[2], source)
    source = re.sub(r'\s*<link rel="alternate" hreflang="[^"]+" href="[^"]+">', '', source)
    alternatives = '\n  <link rel="alternate" hreflang="zh-CN" href="'+SITE+page+'">\n  <link rel="alternate" hreflang="en" href="'+SITE+'en/'+page+'">'
    source = source.replace('</head>', alternatives+'\n</head>')
    source = re.sub(r'<div class="language-switch"[^>]*>[\s\S]*?</div>', '', source)
    href = '/'+page if english else '/en/'+page
    switch = '<div class="language-switch"><a data-language-switch href="'+href+'" hreflang="'+('zh-CN' if english else 'en')+'" lang="'+('zh-CN' if english else 'en')+'" title="'+('中文' if english else 'English')+'" aria-label="'+('Read this page in Chinese' if english else 'Read this page in English')+'">'+('ZH' if english else 'EN')+'</a></div>'
    source = re.sub(r'(<nav class="main-nav"[^>]*>[\s\S]*?</nav>)', lambda m:m[1]+switch, source, count=1)
    if english:
        source = source.replace('content="zh_CN"','content="en_US"')
        source = source.replace(SITE+'en/assets/hero-workflow.png',SITE+'assets/hero-workflow.png')
        source = source.replace('"inLanguage": "zh-CN"','"inLanguage": "en"')
        for asset in ['style.css','assets/training.css','assets/workflows.css','assets/research-tools.css','assets/essays.css','assets/bilingual.css','assets/favicon.svg']:
            source = source.replace('href="'+asset+'"','href="/'+asset+'"')
        source = source.replace('src="script.js"','src="/script.js"').replace('src="assets/training.js"','src="/assets/training-en.js"')
    # Refresh shared navigation behavior when a returning reader has cached an older script.
    script_revision = hashlib.sha256((BASE/'script.js').read_bytes()).hexdigest()[:12]
    source = re.sub(r'src="(/?)script\.js(?:\?[^"]*)?"', lambda m: 'src="'+('/' if english else m[1])+'script.js?v='+script_revision+'"', source)
    training_asset = 'assets/training-en.js' if english else 'assets/training.js'
    training_revision = hashlib.sha256((BASE/training_asset).read_bytes()).hexdigest()[:12]
    source = re.sub(r'src="/?assets/training(?:-en)?\.js(?:\?[^"]*)?"', 'src="/'+training_asset+'?v='+training_revision+'"', source)
    for asset in ['assets/essays.css','assets/bilingual.css']:
        if not re.search(r'href="/?'+re.escape(asset)+r'(?:\?[^"]*)?"', source):
            source = source.replace('</head>','  <link rel="stylesheet" href="/'+asset+'">\n</head>')
    style_revision = hashlib.sha256((BASE/'assets/bilingual.css').read_bytes()).hexdigest()[:12]
    source = re.sub(r'href="/?assets/bilingual\.css(?:\?[^"]*)?"', 'href="/assets/bilingual.css?v='+style_revision+'"', source)
    return source
