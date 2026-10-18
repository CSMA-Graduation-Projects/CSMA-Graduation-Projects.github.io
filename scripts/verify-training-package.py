#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Check the actual downloadable archive against source files and its hashes."""
import hashlib
import json
import pathlib
import zipfile

root = pathlib.Path(__file__).resolve().parents[1]
catalog = json.loads((root / 'assets/data/templates.json').read_text())
paths = [root / item['file'] for item in catalog['templates']]
paths += [root / 'assets/templates/README.md', root / 'assets/downloads/training-handbook.md']
expected = {path.name: path.read_bytes() for path in paths}
with zipfile.ZipFile(root / 'assets/downloads/csma-training-templates.zip') as archive:
    assert archive.testzip() is None, 'ZIP CRC validation failed'
    assert set(archive.namelist()) == set(expected) | {'SHA256SUMS'}, 'Unexpected or missing ZIP entries'
    assert len(archive.namelist()) == len(expected) + 1, 'Duplicate ZIP entries'
    for name, content in expected.items():
        assert archive.read(name) == content, f'Archive does not match source: {name}'
    lines = archive.read('SHA256SUMS').decode().splitlines()
    assert len(lines) == len(expected), 'Hash manifest count mismatch'
    seen = set()
    for line in lines:
        digest, name = line.split('  ', 1)
        assert name not in seen and name in expected, 'Invalid hash manifest entry'
        assert hashlib.sha256(expected[name]).hexdigest() == digest, f'Hash mismatch: {name}'
        seen.add(name)
    assert archive.read('SHA256SUMS') == (root/'assets/downloads/SHA256SUMS').read_bytes()
handbook = expected['training-handbook.md'].decode()
for title in ['日常管理与协作', '学术规范与提交检查', '数据资料归档与交接', '依据与校本要求核对']:
    assert '## ' + title in handbook, f'Missing shared guide: {title}'
assert '<section' not in handbook and '<table' not in handbook, 'Unconverted HTML in handbook'
print(f'ZIP verified: {len(catalog["templates"])} templates, README, complete handbook and SHA256SUMS; {len(expected)} hashes match.')
