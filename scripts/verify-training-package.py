#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Verify both downloadable template bundles, including offline navigation.

Read-only: does not generate the site, rewrite archives, or access the network.
Relative Markdown links are resolved against actual archive members. HTML links
are allowed when their target is packaged; online guidance must use an explicit
web URL when the corresponding page is not included in the offline bundle.
"""
import hashlib
import html
import json
import pathlib
import posixpath
import re
import sys
from urllib.parse import unquote, urlsplit
import zipfile

root = pathlib.Path(__file__).resolve().parents[1]
results = []


def check(label, passed, details=None):
    results.append((label, bool(passed)))
    print(('PASS ' if passed else 'FAIL ') + label)
    for detail in details or []:
        print('  - ' + str(detail))


def markdown_links(content):
    """Yield active inline/image and reference-definition destinations with lines.

    Keep line numbers while excluding fenced and inline code examples. This
    parser covers the link forms used by the authored templates without treating
    a literal example or a checklist item as an operational file link.
    """
    lines = []
    fence = None
    for line in content.splitlines(keepends=True):
        marker = re.match(r'^ {0,3}(`{3,}|~{3,})', line)
        if marker:
            token = marker.group(1)
            if fence is None:
                fence = (token[0], len(token))
            elif token[0] == fence[0] and len(token) >= fence[1]:
                fence = None
            lines.append('\n' if line.endswith('\n') else '')
        elif fence:
            lines.append('\n' if line.endswith('\n') else '')
        else:
            lines.append(re.sub(r'(`+).*?\1', lambda m: ' ' * len(m.group(0)), line))
    source = ''.join(lines)
    inline = r'!?\[[^\]\n]*\]\(\s*(?:<(?P<angle>[^>\n]+)>|(?P<plain>[^\s)]+))(?:\s+(?:"[^"\n]*"|\'[^\'\n]*\'|\([^\n]*?\)))?\s*\)'
    reference = r'^ {0,3}\[[^\]\n]+\]:\s*(?:<(?P<angle>[^>\n]+)>|(?P<plain>\S+))'
    for pattern in (inline, reference):
        for match in re.finditer(pattern, source, re.MULTILINE):
            destination = html.unescape(match.group('angle') or match.group('plain'))
            yield destination, source.count('\n', 0, match.start()) + 1


def bundle_target(member, destination):
    """Return an archive-relative path, or None for an external/same-file link."""
    parsed = urlsplit(destination)
    if parsed.scheme or parsed.netloc or not parsed.path:
        return None
    target = unquote(parsed.path).replace('\\', '/')
    if target.startswith('/'):
        return target  # An OS/site-root link is not relative to this ZIP.
    return posixpath.normpath(posixpath.join(posixpath.dirname(member), target))


def verify_edition(prefix, language):
    edition = root / prefix
    catalog = json.loads((edition / 'assets/data/templates.json').read_text())
    template_paths = [edition / item['file'] for item in catalog['templates']]
    template_names = {path.name for path in template_paths}
    paths = template_paths + [edition / 'assets/templates/README.md', edition / 'assets/downloads/training-handbook.md']
    expected = {path.name: path.read_bytes() for path in paths}
    check(language + ': unique template and archive filenames', len(template_names) == len(template_paths) and len(expected) == len(paths))
    archive_path = edition / 'assets/downloads/csma-training-templates.zip'
    with zipfile.ZipFile(archive_path) as archive:
        names = archive.namelist()
        members = set(names)
        check(language + ': ZIP CRC', archive.testzip() is None)
        missing = (set(expected) | {'SHA256SUMS'}) - members
        extra = members - set(expected) - {'SHA256SUMS'}
        check(language + ': exact archive membership without duplicates', not missing and not extra and len(names) == len(members), ['missing: ' + ', '.join(sorted(missing))] if missing else (['unexpected: ' + ', '.join(sorted(extra))] if extra else []))
        source_mismatches = [name for name, content in expected.items() if name not in members or archive.read(name) != content]
        check(language + ': all packaged bytes match current source files', not source_mismatches, source_mismatches)

        hashes = []
        malformed = []
        for line in archive.read('SHA256SUMS').decode().splitlines():
            match = re.fullmatch(r'([0-9a-f]{64})  (.+)', line)
            if match:
                hashes.append(match.groups())
            else:
                malformed.append(line)
        hashed_names = [name for _, name in hashes]
        bad_hashes = [name for digest, name in hashes if name not in members or hashlib.sha256(archive.read(name)).hexdigest() != digest]
        valid_manifest = not malformed and len(hashes) == len(expected) and len(set(hashed_names)) == len(hashes) and set(hashed_names) == set(expected) and not bad_hashes
        check(language + ': complete and accurate SHA-256 manifest', valid_manifest, ['malformed: ' + x for x in malformed] + ['hash mismatch: ' + x for x in bad_hashes])
        check(language + ': archive and published checksum manifests agree', archive.read('SHA256SUMS') == (edition / 'assets/downloads/SHA256SUMS').read_bytes())

        readme = archive.read('README.md').decode()
        linked_templates = {bundle_target('README.md', destination) for destination, _ in markdown_links(readme)}
        unlisted = sorted(template_names - linked_templates)
        check(language + ': README directly indexes every bundled template', not unlisted, ['not indexed: ' + name for name in unlisted])

        broken_links = []
        relative_count = 0
        for member in names:
            if not member.endswith('.md'):
                continue
            for destination, line in markdown_links(archive.read(member).decode()):
                resolved = bundle_target(member, destination)
                if resolved is None:
                    continue
                relative_count += 1
                if resolved.startswith('/') or resolved == '..' or resolved.startswith('../') or resolved not in members:
                    explanation = 'target is not a file in the bundle'
                    if urlsplit(destination).path.lower().endswith(('.html', '.htm')):
                        explanation = 'web-page target is not packaged; use its explicit online URL or include the actual page'
                    broken_links.append(f'{member}:{line}: {destination} -> {resolved} ({explanation})')
        check(f'{language}: {relative_count} relative Markdown file links resolve inside the ZIP', not broken_links, broken_links)

        handbook = archive.read('training-handbook.md').decode()
        titles = (['学习与成长', '科研与竞赛合作', '联合培养', '国际学生指南', '日常管理与协作', '学术规范与提交检查', '数据资料归档与交接', '依据与校本要求核对'] if language == 'zh-CN' else ['Learning and Growth', 'Research & Competition Collaboration', 'Joint Training', 'International Student Guide', 'Routine management and collaboration', 'Academic practice and submission checks', 'Data archiving and handover', 'Sources and institutional requirements'])
        headings = [heading.strip().casefold() for heading in re.findall(r'^## (.+)$', handbook, re.MULTILINE)]
        absent = [title for title in titles if title.casefold() not in headings]
        check(language + ': complete shared guidance in offline handbook', not absent, ['missing section: ' + title for title in absent])
        check(language + ': handbook contains converted Markdown rather than source HTML', not re.search(r'<(?:section|table)\b', handbook))
    print(f'{language}: inspected {len(template_paths)} templates, {len(names)} ZIP entries and {len(expected)} expected hashes.\n')


def main():
    for prefix, language in [('', 'zh-CN'), ('en', 'en')]:
        try:
            verify_edition(prefix, language)
        except (OSError, KeyError, ValueError, zipfile.BadZipFile) as error:
            check(language + ': package verification completed', False, [str(error)])
    passed = sum(ok for _, ok in results)
    print(f'Bilingual template packages: {passed}/{len(results)} checks passed.')
    print('Scope: current archive integrity and offline file navigation; external URLs and formal approvals are not tested.')
    return 0 if passed == len(results) else 1


if __name__ == '__main__':
    sys.exit(main())
