from pathlib import Path

root=Path(__file__).resolve().parent.parent
source=root/'src'
html=(source/'page.template.html').read_text(encoding='utf-8')
for marker,name in [('/*__ENGINE__*/','engine.js'),('/*__APP__*/','app.js')]:
    if html.count(marker)!=1:
        raise ValueError(f'Expected one marker: {marker}')
    html=html.replace(marker,(source/name).read_text(encoding='utf-8'))
(root/'relay.html').write_text(html,encoding='utf-8')
overview=source/'overview'
page=(overview/'page.template.html').read_text(encoding='utf-8')
for marker,name in [('<link rel="stylesheet" href="style.css">','style.css'),('/*__APP__*/','app.js')]:
    assert page.count(marker)==1,marker
    content=(overview/name).read_text(encoding='utf-8')
    page=page.replace(marker,'<style>'+content+'</style>' if name=='style.css' else content)
beads=''.join(f'<circle cx="0" cy="0" r="4" transform="translate({346+(i%9-4)*10} {283+(i//9)*10})"/>' for i in range(27))
assert page.count('/*__BEADS__*/')==1
page=page.replace('/*__BEADS__*/',beads)
(root/'index.html').write_text(page,encoding='utf-8')
print('Built project overview index.html and preserved complete demonstration at relay.html')
