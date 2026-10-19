"""Shared article layouts, publication lists and bilingual sitemap."""
import re
from pathlib import Path
from i18n import localize, page_language, SITE

ROOT = Path(__file__).resolve().parents[1]
PAGES = ['index','news','bachelor','undergraduate-research','master','doctor','milestones','projects','outcomes','resources','students','templates','archive','faq','about','competition','planner','management','integrity','policies','workflows','tools','essays','international','learning']

def build_editorial(shell):
    for english in [False,True]:
        language = 'en' if english else 'zh-CN'
        prefix = '/en/' if english else '/'
        suffix = '-en' if english else ''
        collection = 'essays_en' if english else 'essays'
        listing = '''{% assign essay_items = site.COLLECTION | where: 'published', true | sort: 'date' | reverse %}
{% assign now = site.time | date: '%s' | plus: 0 %}
{% assign essay_limit = include.limit | default: essay_items.size %}
{% assign shown = 0 %}
<div class="essay-list">
{% for item in essay_items %}{% assign item_time = item.date | date: '%s' | plus: 0 %}{% if item_time <= now and shown < essay_limit %}
{% assign shown = shown | plus: 1 %}
<article class="essay-card"><div class="essay-meta"><span class="essay-topic">{{ item.topic | escape }}</span><time datetime="{{ item.date | date_to_xmlschema }}">{{ item.date | date: '%Y-%m-%d' }}</time><span>{{ item.author | escape }}</span></div><h3><a href="{{ item.url | relative_url }}">{{ item.title | escape }}</a></h3><p>{{ item.summary | escape }}</p><a class="text-link" href="{{ item.url | relative_url }}">READ →</a></article>
{% endif %}{% endfor %}
{% if shown == 0 %}<p class="collection-empty">EMPTY</p>{% endif %}
</div>
'''.replace('COLLECTION',collection).replace('READ','Read the article' if english else '阅读全文').replace('EMPTY','Mentoring articles will appear here after publication.' if english else '文章整理完成后将在这里发布。')
        (ROOT/'_includes'/('essay-list'+suffix+'.html')).write_text(listing)
        for kind in ['essay','news']:
            parent = 'essays' if kind=='essay' else 'news'
            name = ('Mentoring' if kind=='essay' else 'News') if english else ('导引' if kind=='essay' else '新闻')
            home = 'Home' if english else '首页'
            article_label = 'Article' if english else '正文'
            back = ('Back to all mentoring articles' if kind=='essay' else 'Back to all news') if english else ('返回全部导引' if kind=='essay' else '返回全部新闻')
            meta = '<span class="essay-topic">{{ page.topic | escape }}</span><span>{{ page.author | escape }}</span>' if kind=='essay' else '<span>{{ page.kind | escape }}</span><span>{{ page.audience | escape }}</span>'
            body = '<section class="essay-hero" id="top"><div class="container"><nav class="breadcrumb" aria-label="'+('Breadcrumb' if english else '面包屑')+'"><ol><li><a href="'+prefix+'index.html">'+home+'</a></li><li><a href="'+prefix+parent+'.html">'+name+'</a></li><li aria-current="page">'+article_label+'</li></ol></nav><h1>__TITLE__</h1><p class="essay-summary">__SUMMARY__</p><div class="essay-meta"><time datetime="{{ page.date | date_to_xmlschema }}">{{ page.date | date: "%Y-%m-%d" }}</time>'+meta+'</div></div></section><section class="section"><div class="container"><article class="essay-reading" aria-label="'+article_label+'">{{ content }}<div class="essay-related article-back"><a href="'+prefix+parent+'.html">← '+back+'</a><a href="'+prefix+'resources.html">'+('Explore the guides' if english else '查看培养指南')+' →</a></div></article></div></section>'
            source = shell(parent+'/__ARTICLE__.html','__TITLE__','__SUMMARY__',body)
            source = page_language(localize(source,language),parent+'/__ARTICLE__.html',language)
            source = source.replace('---\n---\n','',1).replace('__TITLE__','{{ page.title | escape }}').replace('__SUMMARY__','{{ page.summary | escape }}')
            source = re.sub(r'(?:href|content)="[^\"]*__ARTICLE__\.html"',lambda m:('href' if m[0].startswith('href') else 'content')+'="{{ page.url | absolute_url }}"',source)
            cn = "{{ page.url | remove_first: '/en' | absolute_url }}" if english else '{{ page.url | absolute_url }}'
            en = '{{ page.url | absolute_url }}' if english else "{{ page.url | prepend: '/en' | absolute_url }}"
            source = re.sub(r'(<link rel="alternate" hreflang="zh-CN" href=")[^"]+',lambda m:m[1]+cn,source)
            source = re.sub(r'(<link rel="alternate" hreflang="en" href=")[^"]+',lambda m:m[1]+en,source)
            counterpart = "{{ page.url | remove_first: '/en' | relative_url }}" if english else "{{ page.url | prepend: '/en' | relative_url }}"
            source = re.sub(r'(<a data-language-switch href=")[^"]+',lambda m:m[1]+counterpart,source)
            # Nested article routes use shared root assets and edition-relative page links.
            source = re.sub(r'(href|src)="(?!/|#|https?:|\{)([^"]+)"',lambda m:m[1]+'="'+('/' if m[2].startswith(('assets/','style.css','script.js')) else prefix)+m[2]+'"',source)
            source = source.replace('content="website"','content="article"')
            (ROOT/'_layouts'/(kind+suffix+'.html')).write_text('\n'.join(line.rstrip() for line in source.splitlines())+'\n')
    news = (ROOT/'_includes/news-list.html').read_text().replace('site.posts','site.news_en | where: \'published\', true')
    news = news.replace('截止：','Due: ').replace('暂无新闻。组内安排与最新要求将在这里发布。','No news has been published yet. Group notices and updated requirements will appear here.')
    # Collection dates need an explicit publication-time gate, just like essays.
    news = news.replace('<div class="news-list">',"{% assign now = site.time | date: '%s' | plus: 0 %}\n<div class=\"news-list\">")
    news = news.replace('{% for item in news_items limit:news_limit %}',"{% for item in news_items limit:news_limit %}{% assign item_time = item.date | date: '%s' | plus: 0 %}{% if item_time <= now %}")
    news = news.replace('  {% else %}','  {% endif %}\n  {% else %}')
    (ROOT/'_includes/news-list-en.html').write_text(news)
    urls = ['  <url><loc>'+SITE+prefix+('' if p=='index' else p+'.html')+'</loc></url>' for prefix in ['', 'en/'] for p in PAGES]
    urls += ["{% assign now = site.time | date: '%s' | plus: 0 %}","{% for post in site.posts %}<url><loc>{{ post.url | absolute_url | xml_escape }}</loc><lastmod>{{ post.date | date_to_xmlschema }}</lastmod></url>{% endfor %}"]
    for collection in ['news_en','essays','essays_en']:
        urls += ["{% for item in site."+collection+" %}{% assign item_time = item.date | date: '%s' | plus: 0 %}{% if item.published == true and item_time <= now %}<url><loc>{{ item.url | absolute_url | xml_escape }}</loc><lastmod>{{ item.date | date_to_xmlschema }}</lastmod></url>{% endif %}{% endfor %}"]
    (ROOT/'sitemap.xml').write_text('---\n---\n<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'+'\n'.join(urls)+'\n</urlset>\n')
