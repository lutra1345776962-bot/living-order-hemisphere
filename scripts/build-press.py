from pathlib import Path
root=Path(__file__).resolve().parent.parent
source=root/'src/press-interaction'
html=(source/'page.template.html').read_text(encoding='utf-8')
for marker,name in [('/*__ENGINE__*/','engine.js'),('/*__APP__*/','app.js')]:
    assert html.count(marker)==1,marker
    html=html.replace(marker,(source/name).read_text(encoding='utf-8'))
(root/'press-interaction.html').write_text(html,encoding='utf-8')
print('Built press-interaction.html')
