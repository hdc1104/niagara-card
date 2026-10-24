#!/usr/bin/env python3
"""Bundle the reference stylesheet into a single HACS JavaScript module."""
from pathlib import Path


def build(root):
    js = (root/'src/niagara-card.js').read_text()
    css = (root/'src/reference-style.css').read_text()
    escaped = css.replace('\\', '\\\\').replace('`', '\\`').replace('${', '\\${')
    link = '<link rel="stylesheet" href="${new URL(\'./reference-style.css\', import.meta.url)}">'
    if js.count(link) != 1:
        raise ValueError('Expected exactly one reference stylesheet link')
    notices = '\n\n'.join((root/name).read_text() for name in ('LICENSE', 'THIRD_PARTY_NOTICES.md', 'ADAPTATION.md'))
    if '*/' in notices:
        raise ValueError('License notice cannot contain a JavaScript comment terminator')
    bundled = '/*!\n'+notices+'\n*/\n'+js.replace(link, '<style>'+escaped+'</style>')
    (root/'dist').mkdir(exist_ok=True)
    (root/'dist/niagara-card.js').write_text(bundled)


if __name__ == '__main__':
    build(Path(__file__).resolve().parents[1])
