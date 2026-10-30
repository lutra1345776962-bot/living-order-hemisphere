from pathlib import Path

root=Path(__file__).resolve().parent.parent
source=root/'src'
html=(source/'page.template.html').read_text(encoding='utf-8')
for marker,name in [('/*__ENGINE__*/','engine.js'),('/*__APP__*/','app.js')]:
    if html.count(marker)!=1:
        raise ValueError(f'Expected one marker: {marker}')
    html=html.replace(marker,(source/name).read_text(encoding='utf-8'))
(root/'index.html').write_text(html,encoding='utf-8')
print('Built index.html')
